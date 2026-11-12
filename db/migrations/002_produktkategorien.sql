-- Produktkategorien (Milch, Eier, Honig, Fleisch & Wurst, Käse) und Standortart „Imkerei“

alter type location_type add value if not exists 'beekeeper';

alter table locations add column if not exists categories text[] not null default '{milk}';
create index if not exists locations_categories_idx on locations using gin (categories) where is_active;
