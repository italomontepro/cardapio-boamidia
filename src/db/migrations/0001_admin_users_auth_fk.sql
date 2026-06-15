ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_role_restaurant_chk
  CHECK (
    (role = 'super_admin' AND restaurant_id IS NULL)
    OR (role = 'restaurant_admin' AND restaurant_id IS NOT NULL)
  );
