create extension if not exists pgcrypto;

create table if not exists public.member_profiles (
    id uuid primary key default gen_random_uuid(),
    kakao_user_id text not null unique,
    provider text not null default 'kakao',
    nickname text,
    profile_image_url text,
    thumbnail_image_url text,
    raw_user_json jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    last_login_at timestamptz not null default timezone('utc', now()),
    signup_completed_at timestamptz,
    signup_count integer not null default 0,
    login_count integer not null default 0,
    last_auth_mode text
);

alter table public.member_profiles
    add column if not exists signup_completed_at timestamptz,
    add column if not exists signup_count integer not null default 0,
    add column if not exists login_count integer not null default 0,
    add column if not exists last_auth_mode text;

create index if not exists member_profiles_last_login_at_idx
    on public.member_profiles (last_login_at desc);

create or replace function public.set_member_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists set_member_profiles_updated_at on public.member_profiles;
create trigger set_member_profiles_updated_at
before update on public.member_profiles
for each row
execute procedure public.set_member_profiles_updated_at();
