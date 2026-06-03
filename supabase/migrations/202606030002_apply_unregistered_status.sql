-- Apply unregistered as the default app status after enum value exists.

update public.profiles
set app_status = 'unregistered'
where app_status = 'anonymous';

alter table public.profiles
  alter column app_status set default 'unregistered';
