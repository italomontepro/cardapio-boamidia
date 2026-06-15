-- 1. Helper functions -- MUST be plpgsql to avoid inlining + recursion (Pitfall 1)
create or replace function is_super_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1 from admin_users
    where user_id = (select auth.uid())
      and role = 'super_admin'
  );
end;
$$;

create or replace function current_admin_restaurant_id()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  rid uuid;
begin
  select restaurant_id into rid
  from admin_users
  where user_id = (select auth.uid())
    and role = 'restaurant_admin';
  return rid;
end;
$$;

-- 2. admin_users RLS
alter table admin_users enable row level security;

create policy "admins read own row or super_admin reads all"
on admin_users for select
using (
  user_id = (select auth.uid())
  or is_super_admin()
);

-- 3. restaurants RLS (D-03: OR role = 'super_admin' pattern via is_super_admin())
alter table restaurants enable row level security;

create policy "super_admin full access, restaurant_admin reads own restaurant"
on restaurants for select
using (
  is_super_admin()
  or id = current_admin_restaurant_id()
);

create policy "only super_admin manages restaurants"
on restaurants for all
using (is_super_admin())
with check (is_super_admin());

-- 4. units (direct restaurant_id FK)
alter table units enable row level security;

create policy "scoped to own restaurant or super_admin"
on units for all
using (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
)
with check (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
);

-- 5. categories (direct restaurant_id FK)
alter table categories enable row level security;

create policy "scoped to own restaurant or super_admin"
on categories for all
using (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
)
with check (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
);

-- 6. products (direct restaurant_id FK)
alter table products enable row level security;

create policy "scoped to own restaurant or super_admin"
on products for all
using (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
)
with check (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
);

-- 7. product_availability (no direct restaurant_id -- resolve via products join)
alter table product_availability enable row level security;

create policy "scoped via product's restaurant or super_admin"
on product_availability for all
using (
  is_super_admin()
  or exists (
    select 1 from products p
    where p.id = product_availability.product_id
      and p.restaurant_id = current_admin_restaurant_id()
  )
)
with check (
  is_super_admin()
  or exists (
    select 1 from products p
    where p.id = product_availability.product_id
      and p.restaurant_id = current_admin_restaurant_id()
  )
);
