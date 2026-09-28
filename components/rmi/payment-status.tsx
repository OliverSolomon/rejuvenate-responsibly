"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import { Button, ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

type State = "checking" | "paid" | "pending" | "failed" | "unknown";

/**
 * Where Pesapal returns the person. The IPN is what settles the
 * payment, and it can land after this page loads, so we poll for a short while
 * rather than reading the redirect and calling it done.
 */
export function PaymentStatus({
  orderTrackingId,
  merchantReference,
}: {
  orderTrackingId?: string;
  merchantReference?: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [state, setState] = useState<State>("checking");
  const [session] = useState<{ id: string; token: string } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("rmi:last");
      return raw ? (JSON.parse(raw) as { id: string; token: string }) : null;
    } catch {
      return null;
    }
  });
  const attempts = useRef(0);

  const check = useCallback(async () => {
    if (!session) return;
    const url = new URL("/api/rmi/pay/status", window.location.origin);
    url.searchParams.set("id", session.id);
    url.searchParams.set("t", session.token);
    if (orderTrackingId) url.searchParams.set("OrderTrackingId", orderTrackingId);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "paid") setState("paid");
      else if (data.status === "failed") setState("failed");
      else setState("pending");
    } catch {
      setState("unknown");
    }
  }, [session, orderTrackingId]);

  useEffect(() => {
    if (!session) return;
    let live = true;
    const tick = async () => {
      if (!live) return;
      await check();
      attempts.current += 1;
    };
    void tick();
    const timer = window.setInterval(() => {
      if (attempts.current >= 10) {
        window.clearInterval(timer);
        return;
      }
      void tick();
    }, 3000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [session, check]);

  if (!hydrated) {
    return (
      <div className="grid min-h-[30vh] place-items-center text-forest-900/45">
        <p className="text-sm">Checking your payment...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-xl">
        <Eyebrow>Payment</Eyebrow>
        <h1 className="display mt-6 text-[clamp(2rem,4.6vw,3rem)]">
          We have lost track of this browser
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-forest-900/65">
          The payment may well have gone through. Your reference and a link back in were
          emailed to you when you started, so open that email, or enter the reference and we
          will send it again.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/rmi/resume" size="lg">
            Enter my reference
          </ButtonLink>
        </div>
      </div>
    );
  }

  const copy: Record<State, { title: string; body: string }> = {
    checking: {
      title: "Checking with the gateway",
      body: "This takes a few seconds. Stay on this page.",
    },
    paid: {
      title: "Payment received",
      body: "Your assessment is open. Everything saves as you go, and your reference is in your inbox.",
    },
    pending: {
      title: "Payment is still settling",
      body: "Some methods take a minute to confirm. We will email you the moment it clears, and you can start the assessment now either way.",
    },
    failed: {
      title: "That payment did not go through",
      body: "Nothing has been charged. Try again, or contact us and we will invoice you directly.",
    },
    unknown: {
      title: "We could not reach the gateway",
      body: "Your reference is safe. Try again in a moment, or contact us and we will check it by hand.",
    },
  };

  const { title, body } = copy[state];

  return (
    <div className="mx-auto max-w-xl">
      <Eyebrow>Payment</Eyebrow>
      <h1 className="display mt-6 text-[clamp(2rem,4.6vw,3rem)]">{title}</h1>
      <p className="mt-4 text-[1.0625rem] leading-relaxed text-forest-900/65">{body}</p>

      <div className="mt-8 rounded-card border border-forest-900/12 bg-bone-50 p-5">
        <p className="eyebrow text-forest-900/45">Your reference</p>
        <p className="mt-2 font-[family-name:var(--font-serif)] text-3xl tracking-wide">
          {session.id}
        </p>
        {merchantReference && (
          <p className="mt-2 text-[0.75rem] text-forest-900/40">
            Gateway reference {merchantReference}
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={`/rmi/assessment?id=${session.id}&t=${session.token}`} size="lg">
          {state === "paid" ? "Start my assessment" : "Open my assessment"}
        </ButtonLink>
        {(state === "failed" || state === "unknown") && (
          <Button variant="ghost" size="lg" onClick={() => router.push("/rmi#start")}>
            Try paying again
          </Button>
        )}
      </div>
    </div>
  );
}
