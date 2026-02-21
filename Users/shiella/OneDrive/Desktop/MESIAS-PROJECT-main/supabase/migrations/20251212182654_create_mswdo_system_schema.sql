/*
  # MSWDO Social Welfare Management System Schema

  ## Overview
  Complete database schema for Municipal Social Welfare and Development Office management system
  supporting multiple user types (Beneficiaries, Admin, BHW, MSWDO) with application workflow.

  ## 1. New Tables

  ### profiles
  Extended user information for all user types
  - `id` (uuid, FK to auth.users)
  - `first_name` (text)
  - `last_name` (text)
  - `username` (text, unique)
  - `email` (text)
  - `address` (text) - Barangay name
  - `user_type` (text) - beneficiary/admin/bhw/mswdo
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### beneficiaries
  Beneficiary-specific information and classification
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `classification` (text) - senior_citizen/pwd/solo_parent
  - `latitude` (numeric) - Map location
  - `longitude` (numeric) - Map location
  - `senior_id_url` (text) - Document URLs
  - `psa_url` (text)
  - `postal_id_url` (text)
  - `voters_id_url` (text)
  - `national_id_url` (text)
  - `medical_cert_url` (text)
  - `govt_id_url` (text)
  - `pwd_form_url` (text)
  - `barangay_cert_url` (text)
  - `death_cert_url` (text)
  - `medical_records_url` (text)
  - `status` (text) - pending/approved/rejected
  - `created_at` (timestamptz)

  ### bhw_assignments
  Barangay Health Worker assignments to barangays
  - `id` (uuid, PK)
  - `bhw_user_id` (uuid, FK to profiles)
  - `barangay` (text)
  - `created_at` (timestamptz)

  ### programs
  Available social welfare programs
  - `id` (uuid, PK)
  - `name` (text)
  - `description` (text)
  - `classification` (text[]) - Array: senior_citizen, pwd, solo_parent
  - `requirements` (text[]) - Array of required documents
  - `program_type` (text) - cash_assistance/medical/educational/livelihood
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### applications
  Beneficiary applications for programs
  - `id` (uuid, PK)
  - `beneficiary_id` (uuid, FK to beneficiaries)
  - `program_id` (uuid, FK to programs)
  - `status` (text) - pending/bhw_verified/mswdo_approved/scheduled/claimed/denied
  - `form_data` (jsonb) - Application form responses
  - `bhw_verified_at` (timestamptz)
  - `bhw_verified_by` (uuid, FK to profiles)
  - `bhw_notes` (text)
  - `mswdo_approved_at` (timestamptz)
  - `mswdo_approved_by` (uuid, FK to profiles)
  - `mswdo_notes` (text)
  - `denial_reason` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### application_documents
  Documents uploaded for specific applications
  - `id` (uuid, PK)
  - `application_id` (uuid, FK to applications)
  - `document_type` (text)
  - `document_url` (text)
  - `uploaded_at` (timestamptz)

  ### release_schedules
  Scheduled releases for approved applications
  - `id` (uuid, PK)
  - `application_id` (uuid, FK to applications)
  - `release_date` (date)
  - `release_time` (time)
  - `venue` (text)
  - `instructions` (text)
  - `claimed_at` (timestamptz)
  - `claimed_by_staff` (uuid, FK to profiles)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### notifications
  System notifications for users
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `title` (text)
  - `message` (text)
  - `type` (text) - info/success/warning/error
  - `related_application_id` (uuid, FK to applications)
  - `is_read` (boolean)
  - `created_at` (timestamptz)

  ## 2. Security
  Enable RLS on all tables with appropriate policies for each user type
  - Beneficiaries can view/update own data
  - BHW can view assigned barangay data
  - MSWDO can view/update all applications
  - Admin has full access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  username text UNIQUE NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('beneficiary', 'admin', 'bhw', 'mswdo')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create beneficiaries table
CREATE TABLE IF NOT EXISTS beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classification text NOT NULL CHECK (classification IN ('senior_citizen', 'pwd', 'solo_parent')),
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  senior_id_url text,
  psa_url text,
  postal_id_url text,
  voters_id_url text,
  national_id_url text,
  medical_cert_url text,
  govt_id_url text,
  pwd_form_url text,
  barangay_cert_url text,
  death_cert_url text,
  medical_records_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Create bhw_assignments table
CREATE TABLE IF NOT EXISTS bhw_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bhw_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  barangay text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bhw_user_id, barangay)
);

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  classification text[] NOT NULL,
  requirements text[] NOT NULL,
  program_type text NOT NULL CHECK (program_type IN ('cash_assistance', 'medical', 'educational', 'livelihood')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'bhw_verified', 'mswdo_approved', 'scheduled', 'claimed', 'denied')),
  form_data jsonb DEFAULT '{}'::jsonb,
  bhw_verified_at timestamptz,
  bhw_verified_by uuid REFERENCES profiles(id),
  bhw_notes text,
  mswdo_approved_at timestamptz,
  mswdo_approved_by uuid REFERENCES profiles(id),
  mswdo_notes text,
  denial_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create application_documents table
CREATE TABLE IF NOT EXISTS application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Create release_schedules table
CREATE TABLE IF NOT EXISTS release_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  release_date date NOT NULL,
  release_time time,
  venue text NOT NULL,
  instructions text,
  claimed_at timestamptz,
  claimed_by_staff uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  related_application_id uuid REFERENCES applications(id),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bhw_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Beneficiaries policies
CREATE POLICY "Beneficiaries can view own data"
  ON beneficiaries FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN bhw_assignments ba ON ba.bhw_user_id = p.id
      JOIN profiles bp ON bp.id = beneficiaries.user_id
      WHERE p.id = auth.uid()
      AND p.user_type = 'bhw'
      AND ba.barangay = bp.address
    )
  );

CREATE POLICY "Beneficiaries can insert own data"
  ON beneficiaries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Beneficiaries can update own data"
  ON beneficiaries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- BHW assignments policies
CREATE POLICY "BHW can view own assignments"
  ON bhw_assignments FOR SELECT
  TO authenticated
  USING (
    bhw_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    )
  );

CREATE POLICY "Admin can manage BHW assignments"
  ON bhw_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admin can delete BHW assignments"
  ON bhw_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Programs policies
CREATE POLICY "All authenticated users can view active programs"
  ON programs FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('admin', 'mswdo')
  ));

CREATE POLICY "Admin and MSWDO can manage programs"
  ON programs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    )
  );

CREATE POLICY "Admin and MSWDO can update programs"
  ON programs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    )
  );

-- Applications policies
CREATE POLICY "Beneficiaries can view own applications"
  ON applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM beneficiaries
      WHERE beneficiaries.id = applications.beneficiary_id
      AND beneficiaries.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN bhw_assignments ba ON ba.bhw_user_id = p.id
      JOIN beneficiaries b ON b.id = applications.beneficiary_id
      JOIN profiles bp ON bp.id = b.user_id
      WHERE p.id = auth.uid()
      AND p.user_type = 'bhw'
      AND ba.barangay = bp.address
    )
  );

CREATE POLICY "Beneficiaries can insert own applications"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM beneficiaries
      WHERE beneficiaries.id = applications.beneficiary_id
      AND beneficiaries.user_id = auth.uid()
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
      AND p.user_type = 'bhw'
      AND ba.barangay = bp.address
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN bhw_assignments ba ON ba.bhw_user_id = p.id
      JOIN beneficiaries b ON b.id = applications.beneficiary_id
      JOIN profiles bp ON bp.id = b.user_id
      WHERE p.id = auth.uid()
      AND p.user_type = 'bhw'
      AND ba.barangay = bp.address
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    )
  );

-- Application documents policies
CREATE POLICY "Users can view related application documents"
  ON application_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN beneficiaries b ON b.id = a.beneficiary_id
      WHERE a.id = application_documents.application_id
      AND b.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN bhw_assignments ba ON ba.bhw_user_id = p.id
      JOIN applications a ON a.id = application_documents.application_id
      JOIN beneficiaries b ON b.id = a.beneficiary_id
      JOIN profiles bp ON bp.id = b.user_id
      WHERE p.id = auth.uid()
      AND p.user_type = 'bhw'
      AND ba.barangay = bp.address
    )
  );

CREATE POLICY "Beneficiaries can insert own application documents"
  ON application_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN beneficiaries b ON b.id = a.beneficiary_id
      WHERE a.id = application_documents.application_id
      AND b.user_id = auth.uid()
    )
  );

-- Release schedules policies
CREATE POLICY "Users can view related release schedules"
  ON release_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN beneficiaries b ON b.id = a.beneficiary_id
      WHERE a.id = release_schedules.application_id
      AND b.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo', 'bhw')
    )
  );

CREATE POLICY "MSWDO can manage release schedules"
  ON release_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    )
  );

CREATE POLICY "MSWDO can update release schedules"
  ON release_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_classification ON beneficiaries(classification);
CREATE INDEX IF NOT EXISTS idx_bhw_assignments_bhw_user_id ON bhw_assignments(bhw_user_id);
CREATE INDEX IF NOT EXISTS idx_bhw_assignments_barangay ON bhw_assignments(barangay);
CREATE INDEX IF NOT EXISTS idx_applications_beneficiary_id ON applications(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_applications_program_id ON applications(program_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Create function to check if first admin exists
CREATE OR REPLACE FUNCTION check_first_admin_exists()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE user_type = 'admin' LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
