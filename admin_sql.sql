-- ============================================================
--  FRESH FARM CONNECT — ADMIN DELIVERY SQL
--  Run this in your Supabase SQL Editor
-- ============================================================

-- Add delivery coordinates to orders table
alter table orders add column if not exists delivery_lat decimal;
alter table orders add column if not exists delivery_lng decimal;

-- Add admin flag to buyers table
alter table buyers add column if not exists is_admin boolean default false;

-- ⚠️ REPLACE with YOUR actual email address
update buyers set is_admin = true where email = 'your@email.com';

-- Allow admin to view ALL orders (not just their own)
-- First drop the existing buyer policy
drop policy if exists "Buyers can view own orders" on orders;

-- Recreate with admin access
create policy "Buyers can view own orders"
  on orders for select
  using (
    auth.uid() = buyer_id
    or
    exists (
      select 1 from buyers
      where buyers.id = auth.uid()
      and buyers.is_admin = true
    )
  );

-- Allow admin to update order status
create policy "Admin can update orders"
  on orders for update
  using (
    exists (
      select 1 from buyers
      where buyers.id = auth.uid()
      and buyers.is_admin = true
    )
  );

-- Allow admin to view all farmers
drop policy if exists "Public can view farmers" on farmers;
create policy "Public can view farmers"
  on farmers for select using (true);
