import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Radio } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  effectiveDrawAt,
  fetchProducts,
  formatDateTime,
  formatMoney,
  isClosed,
  isSoldOut,
} from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/next-draw")({
  head: () => ({
    meta: [
      { title: "Next Draw — Live Draw Dates for Sold-Out Prizes | Goldticket" },
      {
        name: "description",
        content:
          "Every Goldticket prize that reached 100% of its tickets, with the exact date and hour of its live draw.",
      },
      { property: "og:title", content: "Next Draw — Goldticket Live Draw Schedule" },
      {
        property: "og:description",
        content: "See which prize draws are closed and when the live draw takes place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NextDrawPage,
});

function NextDrawPage() {
  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const closed = (data ?? [])
    .filter(isClosed)
    .sort((a, b) => new Date(effectiveDrawAt(a)).getTime() - new Date(effectiveDrawAt(b)).getTime());

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Radio className="size-3.5" /> Live draws
        </span>
        <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
          Next <span className="text-gold">Draw</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Once a prize sells all of its tickets — or reaches its deadline with at least 80% of
          tickets sold — it moves here with the date and hour of its live draw. Under 80%, the draw
          rolls into a fresh 10-day window instead.
        </p>

        <div className="mt-10 space-y-4">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          ) : closed.length === 0 ? (
            <div className="surface-card rounded-2xl p-10 text-center">
              <p className="text-lg font-medium">No draws are closed yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Prizes appear here the moment they hit 100% or reach their time limit.
              </p>
              <Link to="/" className="mt-5 inline-block text-primary">
                Browse live prizes
              </Link>
            </div>
          ) : (
            closed.map((p) => (
              <article
                key={p.id}
                className="surface-card flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center"
              >
                <div className="size-28 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{p.name}</h2>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      {isSoldOut(p) ? "Sold out" : "Time limit reached"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {p.sold.toLocaleString()} of {p.total_tickets.toLocaleString()} tickets ·
                    prize value {formatMoney(p.prize_value_cents)}
                  </p>
                </div>

                <div className="sm:w-64 sm:text-right">
                  <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <CalendarClock className="size-3.5" /> Live draw
                  </p>
                  <p className="mt-1 font-semibold text-gold">{formatDateTime(effectiveDrawAt(p))}</p>
                  <Link
                    to="/prize/$slug"
                    params={{ slug: p.slug }}
                    className="mt-2 inline-block text-sm text-primary"
                  >
                    View prize
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
