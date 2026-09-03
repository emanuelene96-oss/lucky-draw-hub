import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  effectiveDrawAt,
  effectiveEndsAt,
  fetchProducts,
  formatDateTime,
  formatMoney,
  isClosed,
  isExtended,
  isSoldOut,
  timeLeft,
  useSession,
} from "@/lib/session";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/prize/$slug")({
  head: ({ params }) => {
    const title = `Enter the ${params.slug.replace(/-/g, " ")} draw — Goldticket`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: "Pick how many tickets you want and get random numbers assigned instantly.",
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: "Limited ticket prize draw on Goldticket.",
        },
      ],
    };
  },
  component: PrizePage,
});

function PrizePage() {
  const { slug } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(1);

  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const product = data?.find((p) => p.slug === slug);

  const buy = useMutation({
    mutationFn: async () => {
      const { data: numbers, error } = await supabase.rpc("buy_tickets", {
        _product_id: product!.id,
        _quantity: qty,
      });
      if (error) throw error;
      return (numbers ?? []) as number[];
    },
    onSuccess: (numbers) => {
      toast.success(`You got ticket${numbers.length > 1 ? "s" : ""} #${numbers.join(", #")}`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-5 py-12">
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-5 py-24 text-center">
          <h1 className="text-2xl font-semibold">Prize not found</h1>
          <Link to="/" className="mt-4 inline-block text-primary">
            Back to all prizes
          </Link>
        </div>
      </div>
    );
  }

  const left = product.total_tickets - product.sold;
  const pct = (product.sold / product.total_tickets) * 100;
  const closed = isClosed(product);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All prizes
        </Link>

        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <div className="surface-card overflow-hidden rounded-2xl">
            <div className="aspect-square bg-secondary">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="size-full object-cover" />
              ) : null}
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-semibold md:text-4xl">{product.name}</h1>
            <p className="mt-2 text-muted-foreground">{product.tagline}</p>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="surface-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Prize value</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatMoney(product.prize_value_cents)}
                </p>
              </div>
              <div className="surface-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Per ticket</p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {formatMoney(product.ticket_price_cents)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Progress value={pct} className="h-2" />
              <p className="mt-2 text-sm text-muted-foreground">
                {product.sold.toLocaleString()} sold · {left.toLocaleString()} of{" "}
                {product.total_tickets.toLocaleString()} tickets left
              </p>
              <p className="mt-2 text-sm">
                {closed ? (
                  <span className="text-gold">
                    {isSoldOut(product) ? "Sold out" : "Time limit reached"} · live draw{" "}
                    {formatDateTime(product.draw_at)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Closes in <span className="text-gold">{timeLeft(product.ends_at)}</span> · live
                    draw {formatDateTime(product.draw_at)}
                  </span>
                )}
              </p>
            </div>

            <div className="mt-8 surface-card rounded-2xl p-5">
              {closed ? (
                <>
                  <p className="text-sm font-medium">Entries are closed</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The live draw takes place on {formatDateTime(product.draw_at)}.
                  </p>
                  <Link
                    to="/next-draw"
                    className="mt-4 inline-block text-sm text-primary"
                  >
                    See the draw schedule
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tickets</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                      >
                        −
                      </Button>
                      <span className="w-10 text-center text-lg font-semibold">{qty}</span>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() =>
                          setQty((q) => Math.min(50, Math.max(1, Math.min(left, q + 1))))
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Total</span>
                    <span className="text-base font-semibold text-foreground">
                      {formatMoney(product.ticket_price_cents * qty)}
                    </span>
                  </div>

                  {user ? (
                    <Button
                      className="mt-5 w-full"
                      size="lg"
                      disabled={buy.isPending || left < qty}
                      onClick={() => buy.mutate()}
                    >
                      {buy.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Ticket className="size-4" />
                      )}
                      {left < qty ? "Sold out" : `Buy ${qty} ticket${qty > 1 ? "s" : ""}`}
                    </Button>
                  ) : (
                    <Button
                      className="mt-5 w-full"
                      size="lg"
                      onClick={() => navigate({ to: "/auth" })}
                    >
                      Sign in to buy tickets
                    </Button>
                  )}
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Your numbers are drawn at random from the remaining pool.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
