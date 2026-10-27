import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActivityEvent, Feed } from "@/lib/rmi/activity";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Recent activity, and what is left to do.
 *
 * Three lists, in the order a person coming back would want them: what needs
 * doing now, what has happened since they signed in, and what they missed
 * between their last visit and this one. When the last two are empty the card
 * falls back to the most recent activity, so it is never blank on a quiet day.
 */
export function ActivityCard({ feed }: { feed: Feed }) {
  const todo = feed.attention;
  const hasFresh = feed.sinceSignIn.length > 0 || feed.catchUp.length > 0;
  const recent = hasFresh ? [] : feed.events.slice(0, 8);

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display text-[1.375rem]">Notifications and recent activity</h2>
        {feed.catchupFrom && (
          <p className="text-[0.75rem] text-forest-900/45">
            Your last visit before this one ended {when(feed.catchupFrom)}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="needs-you">
          <h3
            id="needs-you"
            className="text-[0.75rem] tracking-wide text-forest-900/50 uppercase"
          >
            To catch up on
          </h3>
          {todo.length === 0 ? (
            <p className="mt-3 text-[0.875rem] text-forest-900/55">
              Nothing is waiting on you.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {todo.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <Badge tone={item.tone === "warn" ? "pending" : "quiet"} className="mt-0.5">
                    {item.tone === "warn" ? "Needs you" : "To do"}
                  </Badge>
                  <div className="min-w-0 text-[0.875rem]">
                    <p className="font-medium text-forest-900">{item.title}</p>
                    <p className="mt-0.5 leading-snug text-forest-900/60">{item.detail}</p>
                    {item.href && (
                      <Link
                        href={item.href}
                        className="mt-1 inline-block text-[0.8125rem] font-medium text-forest-900 underline underline-offset-4"
                      >
                        {item.action ?? "Open"}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="whats-new" className="flex flex-col gap-6">
          {feed.sinceSignIn.length > 0 && (
            <EventList id="whats-new" heading="Since you signed in" events={feed.sinceSignIn} />
          )}
          {feed.catchUp.length > 0 && (
            <EventList
              id="missed"
              heading="While you were away"
              events={feed.catchUp}
            />
          )}
          {!hasFresh && (
            <EventList
              id="whats-new"
              heading={recent.length ? "Recent activity" : "Activity"}
              events={recent}
              empty="Nothing has happened in the last 30 days. New assessments, payments and responses will show up here."
            />
          )}
        </section>
      </div>
    </Card>
  );
}

function EventList({
  id,
  heading,
  events,
  empty,
}: {
  id: string;
  heading: string;
  events: ActivityEvent[];
  empty?: string;
}) {
  return (
    <div>
      <h3 id={id} className="text-[0.75rem] tracking-wide text-forest-900/50 uppercase">
        {heading}
      </h3>
      {events.length === 0 ? (
        <p className="mt-3 text-[0.875rem] text-forest-900/55">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {events.slice(0, 10).map((event) => (
            <li key={event.id} className="flex items-start gap-3 text-[0.875rem]">
              <span
                aria-hidden
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  event.tone === "warn"
                    ? "bg-clay-500"
                    : event.tone === "good"
                      ? "bg-forest-700"
                      : "bg-forest-900/30"
                }`}
              />
              <div className="min-w-0">
                {event.href ? (
                  <Link
                    href={event.href}
                    className="text-forest-900 underline-offset-4 hover:underline"
                  >
                    {event.title}
                  </Link>
                ) : (
                  <span className="text-forest-900">{event.title}</span>
                )}
                <p className="text-[0.75rem] text-forest-900/50">
                  {when(event.at)}
                  {event.detail ? ` · ${event.detail}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
