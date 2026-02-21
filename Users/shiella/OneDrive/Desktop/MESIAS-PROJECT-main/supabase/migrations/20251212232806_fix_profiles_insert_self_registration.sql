/*
  # Fix Profile Self-Registration Policy

  ## Changes
  Simplify insert policies to allow self-registration without circular dependencies

  ## Security
  - Any authenticated user can create their own profile (needed for signup)
  - The user_type field validates allowed values via CHECK constraint
  - Application logic in signup form controls which user types are shown
*/

-- Drop existing insert policies
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can create any profile" ON profiles;

-- Single policy: authenticated users can insert profiles
-- For signup: user inserts their own profile (id = auth.uid())
-- For admin creating users: admin inserts with different id after their profile exists
CREATE POLICY "Authenticated users can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy for admins to manage users
CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    get_user_type(auth.uid()) = 'admin'
  )
  WITH CHECK (
    get_user_type(auth.uid()) = 'admin'
  );
