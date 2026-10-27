import "server-only";

import { send, teamInviteEmail } from "./mailer";
import type { Invitation } from "./team";
import { siteUrl } from "./urls";

/**
 * Turning an invitation into something a person can click.
 *
 * The link points at this site, not at Supabase, so the token is verified by
 * our own route and the email goes out through Mailtrap under the same switch
 * as everything else the site sends.
 */

/** The link that signs someone in once so they can choose a password. */
export function invitationLink(invitation: Invitation, firstTime: boolean): string {
  const next = `/dashboard/set-password${firstTime ? "?first=1" : ""}`;
  const url = new URL(`${siteUrl()}/auth/confirm`);
  url.searchParams.set("token_hash", invitation.tokenHash);
  url.searchParams.set("type", invitation.type);
  url.searchParams.set("next", next);
  return url.toString();
}

/** Email the invitation, and say plainly whether it actually went. */
export async function deliverInvitation(
  invitation: Invitation,
  invitedBy: string,
): Promise<{ link: string; emailed: boolean; error?: string }> {
  const returning = invitation.type === "recovery";
  const link = invitationLink(invitation, !returning);

  const delivery = await send({
    kind: "team",
    to: invitation.email,
    ...teamInviteEmail({ invitedBy, link, returning }),
  }).catch((error: unknown) => ({
    ok: false,
    queued: false,
    error: error instanceof Error ? error.message : "the mail provider refused it",
  }));

  return {
    link,
    emailed: delivery.queued,
    ...(delivery.queued ? {} : { error: delivery.error }),
  };
}
