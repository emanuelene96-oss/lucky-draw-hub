import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchProducts, formatMoney } from "@/lib/session";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Goldticket — Win Premium Tech With Limited Raffle Tickets" },
      {
        name: "description",
        content:
          "Grab a limited ticket for an iPhone, PlayStation, MacBook and more. Every ticket gets its own number — when the draw closes, one number wins.",
      },
      { property: "og:title", content: "Goldticket — Limited Ticket Prize Draws" },
      {
        property: "og:description",
        content: "Limited ticket raffles for premium tech. Sign in with Google and pick your numbers.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <section className="py-16 md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" /> Limited tickets · fixed odds
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] md:text-6xl">
            Every ticket is a <span className="text-gold">number</span>. One number takes the prize.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Choose a prize, take your tickets, and we assign you random numbers from the pool
            instantly. No queues, no hidden odds — you always see how many tickets are left.
          </p>
        </section>

        <section>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">Live prize draws</h2>
            <span className="text-sm text-muted-foreground">{data?.length ?? 0} open</span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-80 rounded-2xl" />
                ))
              : data?.map((p) => {
                  const left = p.total_tickets - p.sold;
                  const pct = (p.sold / p.total_tickets) * 100;
                  return (
                    <Link
                      key={p.id}
                      to="/prize/$slug"
                      params={{ slug: p.slug }}
                      className="group surface-card overflow-hidden rounded-2xl transition-transform hover:-translate-y-1"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-secondary">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            loading="lazy"
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : null}
                      </div>
                      <div className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">{p.name}</h3>
                            <p className="text-sm text-muted-foreground">{p.tagline}</p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-primary/15 px-2 py-1 text-sm font-semibold text-primary">
                            {formatMoney(p.ticket_price_cents)}
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {left.toLocaleString()} of {p.total_tickets.toLocaleString()} tickets left
                          </span>
                          <span className="inline-flex items-center gap-1 text-primary">
                            Enter <ArrowRight className="size-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </section>
      </main>
    </div>
  );
}
