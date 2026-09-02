"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { questionsFor, type Question } from "@/lib/rmi/questions";
import type { Answers } from "@/lib/rmi/scoring";

export type Profile = {
  organisation: string;
  contactName: string;
  email: string;
  role: string;
  sector: string;
};

const EMPTY_PROFILE: Profile = {
  organisation: "",
  contactName: "",
  email: "",
  role: "",
  sector: "",
};

type Persisted = {
  version: 1;
  profile: Profile;
  answers: Answers;
  index: number;
  savedAt: string;
};

const noopSubscribe = () => () => {};

/**
 * True only after hydration. The server and the first client render both see
 * false, so reading localStorage during render cannot cause a mismatch.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function readSaved(key: string): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    // Corrupted JSON, or storage blocked in private mode. Start clean.
    return null;
  }
}

export function useAssessment(audience: "client" | "stakeholder", storageKey: string) {
  const questions = useMemo(() => questionsFor(audience), [audience]);
  const hydrated = useHydrated();

  // Lazy initialisers run once. On the server they see no window and fall back
  // to empty values, which is exactly what the first client render draws too.
  const [saved] = useState(() => readSaved(storageKey));
  const [profile, setProfile] = useState<Profile>(() => ({
    ...EMPTY_PROFILE,
    ...(readSaved(storageKey)?.profile ?? {}),
  }));
  const [answers, setAnswers] = useState<Answers>(
    () => readSaved(storageKey)?.answers ?? {},
  );
  const [index, setIndexRaw] = useState(() => readSaved(storageKey)?.index ?? 0);
  const [dismissed, setDismissed] = useState(false);
  const firstSave = useRef(true);

  const setIndex = useCallback(
    (next: number) => setIndexRaw(Math.max(0, Math.min(questions.length - 1, next))),
    [questions.length],
  );

  const restoredAnswerCount = saved
    ? Object.values(saved.answers ?? {}).filter((a) => a.base !== null).length
    : 0;
  const restored =
    !dismissed && saved && restoredAnswerCount > 0
      ? { at: saved.savedAt, answered: restoredAnswerCount }
      : null;

  useEffect(() => {
    // Skip the write triggered by mounting, so an untouched form does not
    // stamp a new savedAt over the one the person left behind.
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    try {
      const payload: Persisted = {
        version: 1,
        profile,
        answers,
        index,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Quota exceeded or storage blocked. The form still works, it just
      // will not resume on a later visit.
    }
  }, [profile, answers, index, storageKey]);

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

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // nothing to clean up
    }
    setAnswers({});
    setIndexRaw(0);
  }, [storageKey]);

  return {
    questions,
    profile,
    setProfile,
    answers,
    setBase,
    setFollowUp,
    index,
    setIndex,
    answeredCount,
    restored,
    dismissRestored: () => setDismissed(true),
    hydrated,
    clear,
  };
}
