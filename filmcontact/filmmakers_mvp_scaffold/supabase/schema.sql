-- Schema for Filmmakers CRM MVP
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists genres (
  id serial primary key,
  name text unique not null
);

create table if not exists mediums (
  id serial primary key,
  name text unique not null  -- 'Film', 'TV'
);

create table if not exists budget_ranges (
  id serial primary key,
  medium_id int references mediums(id) not null,
  unit text not null check (unit in ('total','per_episode')),
  label text not null,
  min_amount bigint,  -- USD cents
  max_amount bigint,  -- USD cents
  currency char(3) default 'USD',
  unique (medium_id, unit, label)
);

create table if not exists commercial_attributes (
  id serial primary key,
  label text unique not null
);

create table if not exists users (
  id uuid primary key,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  website text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  company_id uuid references companies(id),
  first_name text not null,
  last_name text not null,
  role text,
  email text,
  phone text,
  linkedin text,
  remit_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contact_mediums (
  contact_id uuid references contacts(id) on delete cascade,
  medium_id int references mediums(id),
  primary key (contact_id, medium_id)
);

create table if not exists contact_genres (
  contact_id uuid references contacts(id) on delete cascade,
  genre_id int references genres(id),
  primary key (contact_id, genre_id)
);

create table if not exists contact_budget_ranges (
  contact_id uuid references contacts(id) on delete cascade,
  budget_range_id int references budget_ranges(id),
  primary key (contact_id, budget_range_id)
);

create table if not exists contact_attributes (
  contact_id uuid references contacts(id) on delete cascade,
  attribute_id int references commercial_attributes(id),
  primary key (contact_id, attribute_id)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  format text check (format in ('Feature','TV','Short','Web','Other')) not null,
  medium_id int references mediums(id),
  logline text,
  budget_range_id int references budget_ranges(id),
  status text default 'in_development',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_genres (
  project_id uuid references projects(id) on delete cascade,
  genre_id int references genres(id),
  primary key (project_id, genre_id)
);

create table if not exists project_attributes (
  project_id uuid references projects(id) on delete cascade,
  attribute_id int references commercial_attributes(id),
  primary key (project_id, attribute_id)
);

do $$ begin
  create type submission_status as enum ('submitted','read','passed','optioned','in_development','bought','produced');
exception
  when duplicate_object then null;
end $$;

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  status submission_status not null default 'submitted',
  submitted_at timestamptz default now(),
  updated_at timestamptz default now(),
  notes text
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  contact_id uuid references contacts(id),
  company_id uuid references companies(id),
  occurred_at timestamptz not null,
  meeting_type text check (meeting_type in ('General','Pitch','Notes','Other')) default 'General',
  notes text,
  follow_up_due timestamptz
);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_contacts_updated_at on contacts;
create trigger trg_contacts_updated_at before update on contacts
for each row execute function set_updated_at();

drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at before update on projects
for each row execute function set_updated_at();

drop trigger if exists trg_submissions_updated_at on submissions;
create trigger trg_submissions_updated_at before update on submissions
for each row execute function set_updated_at();

-- Seeds
insert into genres (name) values
('Action'),('Adventure'),('Animation'),('Biography'),('Comedy'),('Crime'),
('Documentary'),('Drama'),('Family'),('Fantasy'),('Historical'),('Horror'),
('Music'),('Musical'),('Mystery'),('Romance'),('Sci-Fi'),('Sport'),
('Thriller'),('War'),('Western')
on conflict do nothing;

insert into mediums (name) values ('Film'), ('TV')
on conflict do nothing;

-- Film budgets (total), USD cents
insert into budget_ranges (medium_id, unit, label, min_amount, max_amount, currency) values
((select id from mediums where name='Film'),'total','<$250k', 0, 25000000, 'USD'),
((select id from mediums where name='Film'),'total','$250k–$1m', 25000000, 100000000, 'USD'),
((select id from mediums where name='Film'),'total','$1m–$3m', 100000000, 300000000, 'USD'),
((select id from mediums where name='Film'),'total','$3m–$10m', 300000000, 1000000000, 'USD'),
((select id from mediums where name='Film'),'total','$10m–$20m', 1000000000, 2000000000, 'USD'),
((select id from mediums where name='Film'),'total','$20m–$50m', 2000000000, 5000000000, 'USD'),
((select id from mediums where name='Film'),'total','$50m–$100m', 5000000000, 10000000000, 'USD'),
((select id from mediums where name='Film'),'total','$100m+', 10000000000, null, 'USD')
on conflict do nothing;

-- TV budgets (per episode), USD cents
insert into budget_ranges (medium_id, unit, label, min_amount, max_amount, currency) values
((select id from mediums where name='TV'),'per_episode','<$100k ep', 0, 10000000, 'USD'),
((select id from mediums where name='TV'),'per_episode','$100k–$500k ep', 10000000, 50000000, 'USD'),
((select id from mediums where name='TV'),'per_episode','$500k–$1.5m ep', 50000000, 150000000, 'USD'),
((select id from mediums where name='TV'),'per_episode','$1.5m–$3m ep', 150000000, 300000000, 'USD'),
((select id from mediums where name='TV'),'per_episode','$3m+ ep', 300000000, null, 'USD')
on conflict do nothing;

insert into commercial_attributes (label) values
('Contained'),
('Four-quadrant'),
('IP-based'),
('True story'),
('Elevated genre'),
('Franchise potential'),
('Limited series'),
('Returnable series'),
('Anthology'),
('Director-led'),
('Talent attached'),
('International co-pro friendly')
on conflict do nothing;

create or replace function match_contacts_for_project(p_project_id uuid)
returns table (
  contact_id uuid,
  score int,
  matched_genres int,
  budget_overlap boolean,
  attribute_overlap int
)
language sql
stable
as $$
  with proj as (
    select p.id, p.user_id, p.medium_id, p.budget_range_id
    from projects p
    where p.id = p_project_id
  ),
  proj_genres as (
    select pg.genre_id from project_genres pg where pg.project_id = p_project_id
  ),
  proj_attrs as (
    select pa.attribute_id from project_attributes pa where pa.project_id = p_project_id
  ),
  pr as (
    select br.* from budget_ranges br
    join proj on proj.budget_range_id = br.id
  ),
  c as (
    select c.* from contacts c
    join proj on proj.user_id = c.user_id
  ),
  medium_ok as (
    select cm.contact_id
    from contact_mediums cm
    join proj on cm.medium_id = proj.medium_id
  ),
  genre_counts as (
    select cg.contact_id, count(*)::int as matched_genres
    from contact_genres cg
    join proj_genres pg on pg.genre_id = cg.genre_id
    group by cg.contact_id
  ),
  attr_counts as (
    select ca.contact_id, count(*)::int as attribute_overlap
    from contact_attributes ca
    join proj_attrs pa on pa.attribute_id = ca.attribute_id
    group by ca.contact_id
  ),
  budget_ok as (
    select cbr.contact_id, true as budget_overlap
    from contact_budget_ranges cbr
    join pr on true
    join budget_ranges br on br.id = cbr.budget_range_id
    where br.medium_id = pr.medium_id
      and (
        pr.max_amount is null or br.min_amount <= pr.max_amount
      )
      and (
        br.max_amount is null or pr.min_amount <= br.max_amount
      )
  )
  select
    c.id as contact_id,
    coalesce(gc.matched_genres, 0) * 2
      + coalesce(ac.attribute_overlap, 0)
      + case when bo.budget_overlap then 3 else 0 end as score,
    coalesce(gc.matched_genres, 0) as matched_genres,
    coalesce(bo.budget_overlap, false) as budget_overlap,
    coalesce(ac.attribute_overlap, 0) as attribute_overlap
  from c
  join medium_ok mo on mo.contact_id = c.id
  left join genre_counts gc on gc.contact_id = c.id
  left join attr_counts ac on ac.contact_id = c.id
  left join budget_ok bo on bo.contact_id = c.id
  order by score desc, c.created_at desc;
$$;
