import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, useSession } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My tickets — Goldticket" },
      { name: "description", content: "Every ticket number you own, grouped by prize draw." },
      { property: "og:title", content: "My tickets — Goldticket" },
      { property: "og:description", content: "Track your Goldticket entries and numbers." },
    ],
  }),
  component: AccountPage,
});

type TicketRow = {
  id: string;
  ticket_number: number;
  created_at: string;
  products: {
    id: string;
    slug: string;
    name: string;
    image_url: string | null;
    total_tickets: number;
    ticket_price_cents: number;
  } | null;
};

function AccountPage() {
  const { user } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          "id, ticket_number, created_at, products(id, slug, name, image_url, total_tickets, ticket_price_cents)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TicketRow[];
    },
  });

  const groups = new Map<string, { product: NonNullable<TicketRow["products"]>; numbers: number[] }>();
  for (const t of data ?? []) {
    if (!t.products) continue;
    const g = groups.get(t.products.id) ?? { product: t.products, numbers: [] };
    g.numbers.push(t.ticket_number);
    groups.set(t.products.id, g);
  }
  const grouped = [...groups.values()].map((g) => ({
    ...g,
    numbers: g.numbers.sort((a, b) => a - b),
  }));
  const total = data?.length ?? 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10">
        <h1 className="text-3xl font-semibold">My tickets</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {total} ticket{total === 1 ? "" : "s"} across {grouped.length} draw
          {grouped.length === 1 ? "" : "s"}
          {user?.email ? ` · ${user.email}` : ""}
        </p>

        <div className="mt-8 space-y-5">
          {isLoading ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : grouped.length === 0 ? (
            <div className="surface-card rounded-2xl p-10 text-center">
              <Ticket className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-4 font-medium">You don't own any tickets yet</p>
              <Link to="/" className="mt-2 inline-block text-sm text-primary">
                Browse the open prize draws
              </Link>
            </div>
          ) : (
            grouped.map(({ product, numbers }) => (
              <div key={product.id} className="surface-card rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="size-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/prize/$slug"
                      params={{ slug: product.slug }}
                      className="font-semibold hover:text-primary"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {numbers.length} ticket{numbers.length === 1 ? "" : "s"} ·{" "}
                      {formatMoney(product.ticket_price_cents * numbers.length)} · pool of{" "}
                      {product.total_tickets.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {numbers.map((n) => (
                    <span
                      key={n}
                      className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-sm text-primary"
                    >
                      #{n}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
