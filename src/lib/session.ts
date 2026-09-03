import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const user: User | null = session?.user ?? null;
  return { session, user, loading };
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  image_url: string | null;
  prize_value_cents: number;
  ticket_price_cents: number;
  total_tickets: number;
  is_active: boolean;
  ends_at: string;
  draw_at: string;
  sold: number;
};

export async function fetchProducts(): Promise<ProductRow[]> {
  const { data, error } = await supabase.rpc("products_with_sold");
  if (error) throw error;
  return (data ?? []) as ProductRow[];
}

export function isSoldOut(p: ProductRow) {
  return p.sold >= p.total_tickets;
}

/** Minimum share of tickets that must sell before a draw can close on time. */
export const MIN_CLOSE_RATIO = 0.8;
const WINDOW_MS = 10 * 86_400_000;

export function reachedThreshold(p: ProductRow) {
  return p.sold / p.total_tickets >= MIN_CLOSE_RATIO;
}

/**
 * If a draw hits its deadline with under 80% of tickets sold, it rolls into
 * another 10-day window (repeatedly) instead of closing.
 */
export function effectiveEndsAt(p: ProductRow): string {
  const base = new Date(p.ends_at).getTime();
  if (isSoldOut(p) || reachedThreshold(p)) return p.ends_at;
  const now = Date.now();
  if (base > now) return p.ends_at;
  const windows = Math.floor((now - base) / WINDOW_MS) + 1;
  return new Date(base + windows * WINDOW_MS).toISOString();
}

export function effectiveDrawAt(p: ProductRow): string {
  const end = effectiveEndsAt(p);
  if (end === p.ends_at) return p.draw_at;
  return new Date(new Date(end).getTime() + 86_400_000).toISOString();
}

/** Extended when the deadline passed without reaching the 80% threshold. */
export function isExtended(p: ProductRow) {
  return effectiveEndsAt(p) !== p.ends_at;
}

/** A draw is "closed" once every ticket is gone or its effective window ended. */
export function isClosed(p: ProductRow) {
  return isSoldOut(p) || new Date(effectiveEndsAt(p)).getTime() <= Date.now();
}


export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Closed";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

