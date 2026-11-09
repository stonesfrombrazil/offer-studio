-- Execute in Supabase SQL Editor. Invite users from Authentication > Users.
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, created_at timestamptz default now());
create table if not exists public.contacts (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), company text not null, name text not null, phone text not null, country text, language text not null default 'ES' check(language in ('ES','EN','PT')), consent boolean not null default false, created_at timestamptz default now());
create table if not exists public.offers (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), title text not null, material text not null, block_code text, price numeric(12,2), offer_url text, notes text, created_at timestamptz default now());
create table if not exists public.campaigns (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), name text not null, offer_id uuid not null references public.offers(id) on delete cascade, created_at timestamptz default now());
create table if not exists public.campaign_recipients (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade, contact_id uuid not null references public.contacts(id) on delete cascade, status text not null default 'pending' check(status in ('pending','opened','confirmed','skipped')), opened_at timestamptz, confirmed_at timestamptz, unique(campaign_id,contact_id));
create or replace function public.is_campaign_owner(cid uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.campaigns where id=cid and owner_id=auth.uid()) $$;
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.offers enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_recipients enable row level security;
create policy "profile own" on public.profiles for all to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "contacts own" on public.contacts for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "offers own" on public.offers for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "campaigns own" on public.campaigns for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "recipients own" on public.campaign_recipients for all to authenticated using (public.is_campaign_owner(campaign_id)) with check (public.is_campaign_owner(campaign_id) and exists(select 1 from public.contacts where id=contact_id and owner_id=auth.uid()));
