-- Миграция: дни в сервиз + документи на колата
-- Пусни в Supabase → SQL Editor. Само добавя колони (нищо не трие).

-- 1. Дата на излизане от сервиз (празно = още в сервиз → колата е блокирана)
alter table service_records add column if not exists date_out text default '';

-- 2. Документи и годишни такси на всяка кола
alter table vehicles add column if not exists vignette_until text default '';
alter table vehicles add column if not exists vignette_price numeric default 0;
alter table vehicles add column if not exists inspection_until text default '';
alter table vehicles add column if not exists inspection_price numeric default 0;
alter table vehicles add column if not exists insurance_go_until text default '';
alter table vehicles add column if not exists insurance_go_price numeric default 0;
alter table vehicles add column if not exists insurance_go_installments jsonb default '[]';
alter table vehicles add column if not exists insurance_kasko_until text default '';
alter table vehicles add column if not exists insurance_kasko_price numeric default 0;
alter table vehicles add column if not exists insurance_kasko_installments jsonb default '[]';

-- Презареди schema cache-а на PostgREST
notify pgrst, 'reload schema';
