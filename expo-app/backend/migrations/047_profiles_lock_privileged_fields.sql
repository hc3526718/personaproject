-- Prevent self-service elevation: users cannot change master_control on their own profile row.
-- Extends profiles_lock_dalton_verified_for_self (dalton_verified already locked).

CREATE OR REPLACE FUNCTION public.profiles_lock_dalton_verified_for_self()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    IF OLD.dalton_verified IS DISTINCT FROM NEW.dalton_verified THEN
      NEW.dalton_verified := OLD.dalton_verified;
    END IF;
    IF OLD.master_control IS DISTINCT FROM NEW.master_control THEN
      NEW.master_control := OLD.master_control;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Lock privileged auth metadata (role, dalton_verified) when users call auth.updateUser on themselves.
CREATE OR REPLACE FUNCTION public.auth_user_lock_privileged_metadata_for_self()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  merged jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM OLD.id THEN
    RETURN NEW;
  END IF;

  merged := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  IF (OLD.raw_user_meta_data ->> 'role') IS DISTINCT FROM (merged ->> 'role') THEN
    merged := merged || jsonb_build_object('role', COALESCE(OLD.raw_user_meta_data ->> 'role', 'member'));
  END IF;

  IF (OLD.raw_user_meta_data ->> 'dalton_verified') IS DISTINCT FROM (merged ->> 'dalton_verified') THEN
    merged := jsonb_set(
      merged,
      '{dalton_verified}',
      to_jsonb(COALESCE((OLD.raw_user_meta_data ->> 'dalton_verified')::boolean, false))
    );
  END IF;

  NEW.raw_user_meta_data := merged;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_user_lock_privileged_metadata ON auth.users;

CREATE TRIGGER auth_user_lock_privileged_metadata
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auth_user_lock_privileged_metadata_for_self();

REVOKE ALL ON FUNCTION public.auth_user_lock_privileged_metadata_for_self() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_lock_privileged_metadata_for_self() TO service_role;
