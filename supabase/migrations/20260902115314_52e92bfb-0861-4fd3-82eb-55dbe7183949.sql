ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ends_at timestamptz NOT NULL DEFAULT (now() + interval '10 days'),
  ADD COLUMN IF NOT EXISTS draw_at timestamptz;

UPDATE public.products SET ends_at = now() + interval '10 days' WHERE ends_at IS NULL;

DROP FUNCTION IF EXISTS public.products_with_sold();

CREATE OR REPLACE FUNCTION public.products_with_sold()
 RETURNS TABLE(id uuid, slug text, name text, tagline text, description text, image_url text, prize_value_cents integer, ticket_price_cents integer, total_tickets integer, is_active boolean, ends_at timestamptz, draw_at timestamptz, sold integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.slug, p.name, p.tagline, p.description, p.image_url,
         p.prize_value_cents, p.ticket_price_cents, p.total_tickets, p.is_active,
         p.ends_at,
         COALESCE(p.draw_at, p.ends_at + interval '1 day') AS draw_at,
         (SELECT COUNT(*)::int FROM public.tickets t WHERE t.product_id = p.id) AS sold
  FROM public.products p
  WHERE p.is_active
  ORDER BY p.created_at DESC;
$function$;