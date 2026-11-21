-- BLOXYMAX initial Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null default 'fruit',
  rarity text,
  price_toman bigint not null check (price_toman >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  roblox_username text not null,
  total_toman bigint not null check (total_toman >= 0),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','paid','processing','completed','cancelled','refunded')),
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now()
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  product_name text not null,
  unit_price_toman bigint not null,
  quantity integer not null check (quantity > 0),
  line_total_toman bigint not null
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Profiles are readable by owner" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Profiles are insertable by owner" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Profiles are updatable by owner" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Active products are public" on public.products for select to anon, authenticated using (active = true);
create policy "Users read own orders" on public.orders for select to authenticated using (user_id = auth.uid());
create policy "Users read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Admin access must be assigned server-side in auth.users.raw_app_meta_data:
-- {"role":"admin"}. Never let a browser client assign its own admin role.
create policy "Admins manage products" on public.products for all to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins manage all orders" on public.orders for all to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins manage all order items" on public.order_items for all to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

create or replace function public.create_bloxymax_order(p_roblox_username text, p_items jsonb)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order uuid;
  v_total bigint := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_roblox_username,''))) < 3 then raise exception 'Invalid Roblox username'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(0, least(99, (v_item->>'quantity')::integer));
    select * into v_product from public.products where id = v_item->>'product_id' and active = true for update;
    if not found or v_qty < 1 then raise exception 'Invalid product or quantity'; end if;
    if v_product.stock < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;
    v_total := v_total + (v_product.price_toman * v_qty);
  end loop;
  insert into public.orders(user_id,roblox_username,total_toman) values(v_uid,trim(p_roblox_username),v_total) returning id into v_order;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id = v_item->>'product_id' and active = true for update;
    update public.products set stock = stock - v_qty where id = v_product.id;
    insert into public.order_items(order_id,product_id,product_name,unit_price_toman,quantity,line_total_toman)
    values(v_order,v_product.id,v_product.name,v_product.price_toman,v_qty,v_product.price_toman*v_qty);
  end loop;
  return v_order;
end;
$$;
revoke all on function public.create_bloxymax_order(text,jsonb) from public;
grant execute on function public.create_bloxymax_order(text,jsonb) to authenticated;

-- Seed product records from the current catalog separately after reviewing prices and stock.
