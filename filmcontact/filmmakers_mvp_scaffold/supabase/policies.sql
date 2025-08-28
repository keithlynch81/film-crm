
alter table users enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table contact_mediums enable row level security;
alter table contact_genres enable row level security;
alter table contact_budget_ranges enable row level security;
alter table contact_attributes enable row level security;
alter table projects enable row level security;
alter table project_genres enable row level security;
alter table project_attributes enable row level security;
alter table submissions enable row level security;
alter table meetings enable row level security;

alter table genres enable row level security;
alter table mediums enable row level security;
alter table budget_ranges enable row level security;
alter table commercial_attributes enable row level security;

create policy "read genres" on genres for select using (true);
create policy "read mediums" on mediums for select using (true);
create policy "read budget_ranges" on budget_ranges for select using (true);
create policy "read commercial_attributes" on commercial_attributes for select using (true);

create policy "users select own" on users for select using (id = auth.uid());
create policy "users insert own" on users for insert with check (id = auth.uid());
create policy "users update own" on users for update using (id = auth.uid()) with check (id = auth.uid());
create policy "users delete own" on users for delete using (id = auth.uid());

create policy "contacts select own" on contacts for select using (user_id = auth.uid());
create policy "contacts insert own" on contacts for insert with check (user_id = auth.uid());
create policy "contacts update own" on contacts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "contacts delete own" on contacts for delete using (user_id = auth.uid());

create policy "companies select own" on companies for select using (user_id = auth.uid());
create policy "companies insert own" on companies for insert with check (user_id = auth.uid());
create policy "companies update own" on companies for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "companies delete own" on companies for delete using (user_id = auth.uid());

create policy "contact_mediums own" on contact_mediums for all
using (exists (select 1 from contacts c where c.id = contact_mediums.contact_id and c.user_id = auth.uid()))
with check (exists (select 1 from contacts c where c.id = contact_mediums.contact_id and c.user_id = auth.uid()));

create policy "contact_genres own" on contact_genres for all
using (exists (select 1 from contacts c where c.id = contact_genres.contact_id and c.user_id = auth.uid()))
with check (exists (select 1 from contacts c where c.id = contact_genres.contact_id and c.user_id = auth.uid()));

create policy "contact_budget_ranges own" on contact_budget_ranges for all
using (exists (select 1 from contacts c where c.id = contact_budget_ranges.contact_id and c.user_id = auth.uid()))
with check (exists (select 1 from contacts c where c.id = contact_budget_ranges.contact_id and c.user_id = auth.uid()));

create policy "contact_attributes own" on contact_attributes for all
using (exists (select 1 from contacts c where c.id = contact_attributes.contact_id and c.user_id = auth.uid()))
with check (exists (select 1 from contacts c where c.id = contact_attributes.contact_id and c.user_id = auth.uid()));

create policy "projects select own" on projects for select using (user_id = auth.uid());
create policy "projects insert own" on projects for insert with check (user_id = auth.uid());
create policy "projects update own" on projects for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "projects delete own" on projects for delete using (user_id = auth.uid());

create policy "project_genres own" on project_genres for all
using (exists (select 1 from projects p where p.id = project_genres.project_id and p.user_id = auth.uid()))
with check (exists (select 1 from projects p where p.id = project_genres.project_id and p.user_id = auth.uid()));

create policy "project_attributes own" on project_attributes for all
using (exists (select 1 from projects p where p.id = project_attributes.project_id and p.user_id = auth.uid()))
with check (exists (select 1 from projects p where p.id = project_attributes.project_id and p.user_id = auth.uid()));

create policy "submissions own" on submissions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "meetings own" on meetings for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
