-- Add payment attribution columns used by the resetedu.kr admin Supabase ledger.
-- This migration is additive only: it does not delete, reset, or rewrite existing payment data.

alter table public.payments add column if not exists traffic_source text;
alter table public.payments add column if not exists traffic_medium text;
alter table public.payments add column if not exists traffic_campaign text;
alter table public.payments add column if not exists traffic_keyword text;
alter table public.payments add column if not exists traffic_content text;

alter table public.payments add column if not exists google_gclid text;
alter table public.payments add column if not exists google_gbraid text;
alter table public.payments add column if not exists google_wbraid text;

alter table public.payments add column if not exists naver_keyword text;
alter table public.payments add column if not exists naver_query text;
alter table public.payments add column if not exists naver_campaign text;
alter table public.payments add column if not exists naver_ad_group text;
alter table public.payments add column if not exists naver_ad text;
alter table public.payments add column if not exists naver_media text;

alter table public.payments add column if not exists landing_page text;
alter table public.payments add column if not exists referrer text;

create index if not exists payments_traffic_source_idx on public.payments (traffic_source);
create index if not exists payments_traffic_campaign_idx on public.payments (traffic_campaign);
create index if not exists payments_traffic_keyword_idx on public.payments (traffic_keyword);
