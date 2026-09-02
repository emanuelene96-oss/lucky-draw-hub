-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  image_url TEXT,
  prize_value_cents INTEGER NOT NULL DEFAULT 0,
  ticket_price_cents INTEGER NOT NULL DEFAULT 0,
  total_tickets INTEGER NOT NULL CHECK (total_tickets > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);

-- TICKETS
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  ticket_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, ticket_number)
);
CREATE INDEX tickets_user_idx ON public.tickets (user_id);
GRANT SELECT ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tickets" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Public sold counts without exposing owners
CREATE OR REPLACE FUNCTION public.tickets_sold(_product_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.tickets WHERE product_id = _product_id;
$$;
GRANT EXECUTE ON FUNCTION public.tickets_sold(UUID) TO anon, authenticated;

-- BUY TICKETS
CREATE OR REPLACE FUNCTION public.buy_tickets(_product_id UUID, _quantity INTEGER)
RETURNS INTEGER[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _total INTEGER;
  _numbers INTEGER[];
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to buy tickets';
  END IF;
  IF _quantity IS NULL OR _quantity < 1 OR _quantity > 50 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 50';
  END IF;

  SELECT total_tickets INTO _total
  FROM public.products
  WHERE id = _product_id AND is_active
  FOR UPDATE;

  IF _total IS NULL THEN
    RAISE EXCEPTION 'Product not available';
  END IF;

  SELECT array_agg(n) INTO _numbers
  FROM (
    SELECT n FROM generate_series(1, _total) AS n
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.product_id = _product_id AND t.ticket_number = n
    )
    ORDER BY random()
    LIMIT _quantity
  ) picked;

  IF _numbers IS NULL OR array_length(_numbers, 1) < _quantity THEN
    RAISE EXCEPTION 'Not enough tickets left';
  END IF;

  INSERT INTO public.tickets (product_id, user_id, ticket_number)
  SELECT _product_id, _uid, n FROM unnest(_numbers) AS n;

  RETURN _numbers;
END;
$$;
GRANT EXECUTE ON FUNCTION public.buy_tickets(UUID, INTEGER) TO authenticated;

-- SEED
INSERT INTO public.products (slug, name, tagline, description, image_url, prize_value_cents, ticket_price_cents, total_tickets) VALUES
('iphone-15-pro', 'iPhone 15 Pro', 'Titanium. 256GB. Unlocked.', 'Win a brand new iPhone 15 Pro with 256GB storage, A17 Pro chip and the 48MP Pro camera system. Shipped free, anywhere.', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80', 119900, 500, 2000),
('playstation-5', 'PlayStation 5', 'Slim edition + extra controller', 'The PS5 Slim disc edition bundled with a second DualSense controller. Ray tracing, 4K120 and near-instant load times.', 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80', 54900, 300, 1500),
('macbook-air-m3', 'MacBook Air M3', '13-inch, 16GB RAM, 512GB SSD', 'A featherweight powerhouse: M3 chip, 18-hour battery and a Liquid Retina display. Perfect for work, study and play.', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80', 149900, 700, 1200);