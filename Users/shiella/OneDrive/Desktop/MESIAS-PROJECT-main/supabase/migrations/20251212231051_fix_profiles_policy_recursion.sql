/*
  # Fix Infinite Recursion in Profiles Policies

  ## Changes
  Remove circular dependency by creating a security definer function
  that bypasses RLS to check user type, then update policies to use it.

  ## Security
  The function is SECURITY DEFINER but only returns the user type,
  not sensitive data, making it safe to use in policies.
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;

-- Create a security definer function to get user type without RLS
CREATE OR REPLACE FUNCTION get_user_type(user_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (SELECT user_type FROM profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using the security definer function
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    get_user_type(auth.uid()) = 'admin'
  );

CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_type(auth.uid()) = 'admin'
  );

-- Also update the bhw_assignments policies that might have similar issues
DROP POLICY IF EXISTS "BHW can view own assignments" ON bhw_assignments;
DROP POLICY IF EXISTS "Admin can manage BHW assignments" ON bhw_assignments;
DROP POLICY IF EXISTS "Admin can delete BHW assignments" ON bhw_assignments;

CREATE POLICY "BHW can view own assignments"
  ON bhw_assignments FOR SELECT
  TO authenticated
  USING (
    bhw_user_id = auth.uid() OR
    get_user_type(auth.uid()) IN ('admin', 'mswdo')
  );

CREATE POLICY "Admin can manage BHW assignments"
  ON bhw_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_type(auth.uid()) = 'admin'
  );

CREATE POLICY "Admin can delete BHW assignments"
  ON bhw_assignments FOR DELETE
  TO authenticated
  USING (
    get_user_type(auth.uid()) = 'admin'
  );

-- Update beneficiaries policies
DROP POLICY IF EXISTS "Beneficiaries can view own data" ON beneficiaries;

CREATE POLICY "Beneficiaries can view own data"
  ON beneficiaries FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    get_user_type(auth.uid()) IN ('admin', 'mswdo') OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN bhw_assignments ba ON ba.bhw_user_id = p.id
      JOIN profiles bp ON bp.id = beneficiaries.user_id
      WHERE p.id = auth.uid()
      AND get_user_type(p.id) = 'bhw'
      AND ba.barangay = bp.address
    )
  );

-- Update programs policies
DROP POLICY IF EXISTS "Admin and MSWDO can manage programs" ON programs;
DROP POLICY IF EXISTS "Admin and MSWDO can update programs" ON programs;

CREATE POLICY "Admin and MSWDO can manage programs"
  ON programs FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_type(auth.uid()) IN ('admin', 'mswdo')
  );

CREATE POLICY "Admin and MSWDO can update programs"
  ON programs FOR UPDATE
  TO authenticated
  USING (
    get_user_type(auth.uid()) IN ('admin', 'mswdo')
  )
  WITH CHECK (
    get_user_type(auth.uid()) IN ('admin', 'mswdo')
  );

-- Update applications policies
DROP POLICY IF EXISTS "Beneficiaries can view own applications" ON applications;
DROP POLICY IF EXISTS "BHW can update applications for verification" ON applications;

CREATE POLICY "Beneficiaries can view own applications"
  ON applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM beneficiaries
      WHERE beneficiaries.id = applications.beneficiary_id
      AND beneficiaries.user_id = auth.uid()
    ) OR
    get_user_type(auth.uid()) IN ('admin', 'mswdo') OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN bhw_assignments ba ON ba.bhw_user_id = p.id
      JOIN beneficiaries b ON b.id = applications.beneficiary_id
      JOIN profiles bp ON bp.id = b.user_id
      WHERE p.id = auth.uid()
      AND get_user_type(p.id) = 'bhw'
      AND ba.barangay = bp.address
    )
  );

CREATE POLICY "BHW can update applications for verification"
  ON applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN bhw_assignments ba ON ba.bhw_user_id = p.id
      JOIN beneficiaries b ON b.id = applications.beneficiary_id
      JOIN profiles bp ON bp.id = b.user_id
      WHERE p.id = auth.uid()
      AND get_user_type(p.id) = 'bhw'
      AND ba.barangay = bp.address
    ) OR
    get_user_type(auth.uid()) IN ('admin', 'mswdo')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN bhw_assignments ba ON ba.bhw_user_id = p.id
      JOIN beneficiaries b ON b.id = applications.beneficiary_id
      JOIN profiles bp ON bp.id = b.user_id
      WHERE p.id = auth.uid()
      AND get_user_type(p.id) = 'bhw'
      AND ba.barangay = bp.address
    ) OR
    get_user_type(auth.uid()) IN ('admin', 'mswdo')
  );

-- Update release_schedules policies
DROP POLICY IF EXISTS "MSWDO can manage release schedules" ON release_schedules;
DROP POLICY IF EXISTS "MSWDO can update release schedules" ON release_schedules;

CREATE POLICY "MSWDO can manage release schedules"
  ON release_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_type(auth.uid()) IN ('admin', 'mswdo')
  );

CREATE POLICY "MSWDO can update release schedules"
  ON release_schedules FOR UPDATE
  TO authenticated
  USING (
    get_user_type(auth.uid()) IN ('admin', 'mswdo')
  )
  WITH CHECK (
    get_user_type(auth.uid()) IN ('admin', 'mswdo')
  );
