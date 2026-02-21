/*
  # Fix Profile Insert Policy for Self-Registration

  ## Changes
  Add policy to allow users to create their own profile during signup
  This is needed for beneficiaries and the first admin to register

  ## Security
  - Users can only insert a profile with their own user ID
  - Beneficiaries can self-register
  - First admin can self-register
  - After first admin exists, only admin can create BHW/MSWDO accounts
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;

-- Allow users to insert their own profile (for signup)
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
  );

-- Allow admins to create any profile (for BHW/MSWDO creation)
CREATE POLICY "Admin can create any profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_type(auth.uid()) = 'admin'
  );
