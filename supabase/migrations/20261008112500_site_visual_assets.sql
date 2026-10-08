alter table public.site_settings
  add column if not exists hero_image_url text,
  add column if not exists worship_image_url text,
  add column if not exists kids_image_url text,
  add column if not exists youth_image_url text,
  add column if not exists women_image_url text,
  add column if not exists men_image_url text,
  add column if not exists campaign_image_url text,
  add column if not exists header_logo_url text,
  add column if not exists footer_logo_url text;
