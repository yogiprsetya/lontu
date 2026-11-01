-- Copies the legacy per-category budgets into budget_versions as history (SPEC-budgets.md
-- § Migrasi + cutover). Each category with a budget becomes one budget named after it. Months
-- are counted as year * 12 + month - 1, and M is the cutover month in Asia/Jakarta.
-- Versions carry forward until a newer one, so a month without a legacy budget gets an ended
-- version, and the cutover month is ended too: past months read as before, M starts empty.
-- Soft-deleted rows and rows after M are not copied.
with cutover as (
  select extract(year from now() at time zone 'Asia/Jakarta')::int * 12
       + extract(month from now() at time zone 'Asia/Jakarta')::int - 1 as m
),
legacy as (
  select b.user_id, b.category_id, b.year * 12 + b.month - 1 as m, b.amount, b.created_at,
         c.name, c.spending_type
  from budgets b
  join categories c on c.id = b.category_id and c.user_id = b.user_id
  where b.deleted_at is null
    and c.kind = 'spending'
    and b.year * 12 + b.month - 1 <= (select m from cutover)
),
ids as materialized (
  select user_id, category_id, gen_random_uuid() as budget_id
  from legacy
  group by user_id, category_id
),
versions as (
  select l.user_id, l.category_id, l.m, l.amount, l.created_at, l.name, l.spending_type,
         case when l.m = (select m from cutover) then now() end as deleted_at
  from legacy l
  union all
  select l.user_id, l.category_id, l.m + 1, l.amount, now(), l.name, l.spending_type, now()
  from legacy l
  where l.m + 1 <= (select m from cutover)
    and not exists (
      select 1 from legacy n
      where n.user_id = l.user_id and n.category_id = l.category_id and n.m = l.m + 1
    )
)
insert into budget_versions
  (user_id, budget_id, name, spending_type, year, month, amount, category_ids, created_at, deleted_at)
select v.user_id, i.budget_id, v.name, v.spending_type, v.m / 12, v.m % 12 + 1, v.amount,
       array[v.category_id], v.created_at, v.deleted_at
from versions v
join ids i using (user_id, category_id);
