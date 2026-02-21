/*
  # Fix Profiles RLS for BHW and MSWDO Access
  
  ## Problem
  BHW and MSWDO users cannot view beneficiary applications because the profiles
  table RLS policy blocks them from seeing beneficiary profile data in JOINs.
  
  ## Solution
  Add RLS policies to allow:
  1. BHW users to view profiles of beneficiaries in their assigned barangay
  2. MSWDO users to view all beneficiary profiles
  3. BHW users to view other BHW and MSWDO profiles (for collaboration)
  4. MSWDO users to view BHW profiles (for monitoring)
  
  ## Security
  - BHW can only see beneficiaries in their jurisdiction
  - MSWDO can see all beneficiaries (they approve all applications)
  - Maintains data privacy while enabling workflow
*/

-- Drop existing restrictive policies and recreate with proper access
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;

-- Recreate base policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_user_type(auth.uid()) = 'admin');

-- Allow MSWDO to view all profiles (they need to review all applications)
CREATE POLICY "MSWDO can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_user_type(auth.uid()) = 'mswdo');

-- Allow BHW to view beneficiary profiles in their assigned barangay
CREATE POLICY "BHW can view beneficiaries in assigned barangay"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    get_user_type(auth.uid()) = 'bhw'
    AND EXISTS (
      SELECT 1 FROM bhw_assignments ba
      WHERE ba.bhw_user_id = auth.uid()
      AND ba.barangay = profiles.address
    )
  );

-- Allow BHW to view other BHW and MSWDO profiles for collaboration
CREATE POLICY "BHW can view staff profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    get_user_type(auth.uid()) = 'bhw'
    AND get_user_type(profiles.id) IN ('bhw', 'mswdo')
  );
