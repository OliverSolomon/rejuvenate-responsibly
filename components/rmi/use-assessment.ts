"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { questionsFor, type Question } from "@/lib/rmi/questions";
import type { Answers } from "@/lib/rmi/scoring";

export type Profile = {
  organisation: string;
  contactName: string;
  email: string;
  role: string;
  sector: string;
};

export type Session = { id: string; token: string; resumeUrl: string };

const EMPTY_PROFILE: Profile = {
  organisation: "",
  contactName: "",
  email: "",
  role: "",
  sector: "",
};

type Persisted = {
  version: 2;
  profile: Profile;
  answers: Answers;
  session: Session | null;
  savedAt: string;
};

function readSaved(key: string): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted & { version: number };
    // v1 had a question cursor and no session. Its answers still load.
    if (parsed.version !== 2 && parsed.version !== 1) return null;
    return {
      version: 2,
      profile: { ...EMPTY_PROFILE, ...(parsed.profile ?? {}) },
      answers: parsed.answers ?? {},
      session: parsed.session ?? null,
      savedAt: parsed.savedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export type SyncState = "idle" | "saving" | "saved" | "offline";

export function useAssessment(
  audience: "client" | "stakeholder",
  storageKey: string,
  /** Resume target from the emailed link, if the page was opened with one. */
  resumeWith?: { id: string; token: string },
) {
  const questions = useMemo(() => questionsFor(audience), [audience]);
  const hydrated = useHydrated();
  const serverBacked = audience === "client";

  const [saved] = useState(() => readSaved(storageKey));
  const [profile, setProfile] = useState<Profile>(() => ({
    ...EMPTY_PROFILE,
    ...(readSaved(storageKey)?.profile ?? {}),
  }));
  const [answers, setAnswers] = useState<Answers>(() => readSaved(storageKey)?.answers ?? {});
  const [session, setSession] = useState<Session | null>(
    () => readSaved(storageKey)?.session ?? null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [sync, setSync] = useState<SyncState>("idle");
  const [resuming, setResuming] = useState(Boolean(resumeWith));
  const [resumeError, setResumeError] = useState<string | null>(null);

  const firstSave = useRef(true);
  const creating = useRef<Promise<Session | null> | null>(null);
  // Callbacks and timers read the newest values from here rather than closing
  // over whatever was current when they were created.
  const latest = useRef({ profile, answers, session });
  useEffect(() => {
    latest.current = { profile, answers, session };
  }, [profile, answers, session]);

  /* ----------------------------- local autosave ---------------------------- */
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    try {
      const payload: Persisted = {
        version: 2,
        profile,
        answers,
        session,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Quota or private mode. The server copy still carries the work.
    }
  }, [profile, answers, session, storageKey]);

  /* ------------------------------- resume ---------------------------------- */
  useEffect(() => {
    if (!resumeWith) return;
    let cancelled = false;

    (async () => {
      setResuming(true);
      try {
        const res = await fetch(
          `/api/rmi/assessment?id=${encodeURIComponent(resumeWith.id)}&t=${encodeURIComponent(resumeWith.token)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "We could not open that assessment.");
        if (cancelled) return;
        setProfile({ ...EMPTY_PROFILE, ...data.profile });
        setAnswers(data.answers ?? {});
        setSession({ id: data.id, token: data.token, resumeUrl: data.resumeUrl });
      } catch (err) {
        if (!cancelled) {
          setResumeError(err instanceof Error ? err.message : "We could not open that assessment.");
        }
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resumeWith]);

  /* ---------------------------- server session ----------------------------- */
  const profileReady =
    profile.organisation.trim().length > 1 &&
    profile.contactName.trim().length > 1 &&
    /.+@.+\..+/.test(profile.email);

  const ensureSession = useCallback(async (): Promise<Session | null> => {
    if (!serverBacked) return null;
    if (latest.current.session) return latest.current.session;
    if (creating.current) return creating.current;

    const p = latest.current.profile;
    if (
      p.organisation.trim().length < 2 ||
      p.contactName.trim().length < 2 ||
      !/.+@.+\..+/.test(p.email)
    ) {
      return null;
    }

    creating.current = (async () => {
      try {
        const res = await fetch("/api/rmi/assessment", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profile: p }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Could not start the assessment.");
        const next: Session = { id: data.id, token: data.token, resumeUrl: data.resumeUrl };
        setSession(next);
        return next;
      } catch {
        setSync("offline");
        return null;
      } finally {
        creating.current = null;
      }
    })();

    return creating.current;
  }, [serverBacked]);

  // Open the server record as soon as we know who is filling it in.
  useEffect(() => {
    if (!hydrated || !serverBacked || session || resuming) return;
    if (!profileReady) return;
    void ensureSession();
  }, [hydrated, serverBacked, session, resuming, profileReady, ensureSession]);

  // Push changes up, coalesced so typing does not fire a request per keystroke.
  useEffect(() => {
    if (!hydrated || !serverBacked || !session || resuming) return;
    const timer = window.setTimeout(async () => {
      setSync("saving");
      try {
        const res = await fetch("/api/rmi/assessment", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: session.id,
            token: session.token,
            profile: latest.current.profile,
            answers: latest.current.answers,
          }),
        });
        setSync(res.ok ? "saved" : "offline");
      } catch {
        setSync("offline");
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [profile, answers, session, hydrated, serverBacked, resuming]);

  /* ------------------------------- answers --------------------------------- */
  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id]?.base != null).length,
    [questions, answers],
  );

  const setBase = useCallback((q: Question, value: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { base: value, followUp: value ? (prev[q.id]?.followUp ?? null) : null },
    }));
  }, []);

  const setFollowUp = useCallback((q: Question, value: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { base: prev[q.id]?.base ?? true, followUp: value },
    }));
  }, []);

  /** Wipes answers here and on the server, keeping the reference alive. */
  const clearAll = useCallback(async () => {
    setAnswers({});
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // nothing to clean up
    }
    const s = latest.current.session;
    if (s) {
      await fetch(
        `/api/rmi/assessment?id=${encodeURIComponent(s.id)}&t=${encodeURIComponent(s.token)}`,
        { method: "DELETE" },
      ).catch(() => undefined);
    }
  }, [storageKey]);

  const restoredCount = saved
    ? Object.values(saved.answers ?? {}).filter((a) => a.base !== null).length
    : 0;
  const restored =
    !dismissed && !resumeWith && saved && restoredCount > 0
      ? { at: saved.savedAt, answered: restoredCount }
      : null;

  return {
    questions,
    profile,
    setProfile,
    answers,
    setBase,
    setFollowUp,
    answeredCount,
    session,
    ensureSession,
    sync,
    resuming,
    resumeError,
    restored,
    dismissRestored: () => setDismissed(true),
    hydrated,
    clearAll,
  };
}
