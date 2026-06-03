-- Introduce unregistered status for local anonymous users.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'user_app_status'
      and e.enumlabel = 'unregistered'
  ) then
    alter type public.user_app_status add value 'unregistered';
  end if;
end
$$;