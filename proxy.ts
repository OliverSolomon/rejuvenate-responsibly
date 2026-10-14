import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only the dashboard and the sign-in round trip need a session check. Leaving
  // the marketing pages and the assessment out keeps them fast and keeps the
  // proxy off the critical path for clients answering questions.
  matcher: ["/dashboard/:path*", "/signin", "/auth/:path*"],
};
