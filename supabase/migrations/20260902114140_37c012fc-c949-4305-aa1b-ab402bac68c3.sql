CREATE OR REPLACE FUNCTION public.products_with_sold()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  tagline TEXT,
  description TEXT,
  image_url TEXT,
  prize_value_cents INTEGER,
  ticket_price_cents INTEGER,
  total_tickets INTEGER,
  is_active BOOLEAN,
  sold INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.slug, p.name, p.tagline, p.description, p.image_url,
         p.prize_value_cents, p.ticket_price_cents, p.total_tickets, p.is_active,
         (SELECT COUNT(*)::int FROM public.tickets t WHERE t.product_id = p.id) AS sold
  FROM public.products p
  WHERE p.is_active
  ORDER BY p.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.products_with_sold() TO anon, authenticated;