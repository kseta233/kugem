-- Enforce unique immutable display names for registered users.

create unique index if not exists uq_profiles_display_name_registered_ci
  on public.profiles (lower(display_name))
  where app_status = 'registered' and display_name is not null;

create or replace function public.enforce_registered_display_name_rules()
returns trigger
language plpgsql
as $$
begin
  if new.app_status = 'registered' then
    new.display_name := nullif(btrim(new.display_name), '');

    if new.display_name is null then
      raise exception 'DISPLAY_NAME_REQUIRED_FOR_REGISTERED';
    end if;
  end if;

  if old.app_status = 'registered'
    and lower(coalesce(new.display_name, '')) <> lower(coalesce(old.display_name, '')) then
    raise exception 'DISPLAY_NAME_IMMUTABLE_AFTER_REGISTRATION';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_display_name_rules on public.profiles;
create trigger trg_profiles_display_name_rules
before insert or update on public.profiles
for each row
execute function public.enforce_registered_display_name_rules();
