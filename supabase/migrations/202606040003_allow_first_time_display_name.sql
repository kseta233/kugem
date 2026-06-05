-- Allow registered users to set their display name for the first time.
-- Previously the trigger blocked ANY display name change for registered users,
-- which prevented Google sign-in users (who land as 'registered' with no custom
-- name) from ever setting one.
-- Now immutability only applies once the user already has a custom name saved
-- (i.e. not null and not the default placeholder 'Guest').

create or replace function public.enforce_registered_display_name_rules()
returns trigger
language plpgsql
as $$
declare
  old_name_trimmed text;
begin
  if new.app_status = 'registered' then
    new.display_name := nullif(btrim(new.display_name), '');

    if new.display_name is null then
      raise exception 'DISPLAY_NAME_REQUIRED_FOR_REGISTERED';
    end if;
  end if;

  old_name_trimmed := btrim(coalesce(old.display_name, ''));

  -- Only lock the name if the user already has a real custom name saved.
  -- A null, empty, or default 'Guest' name means first-time setup is still allowed.
  if old.app_status = 'registered'
    and old_name_trimmed <> ''
    and lower(old_name_trimmed) <> 'guest'
    and lower(coalesce(new.display_name, '')) <> lower(old_name_trimmed) then
    raise exception 'DISPLAY_NAME_IMMUTABLE_AFTER_REGISTRATION';
  end if;

  return new;
end;
$$;
