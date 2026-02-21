/*
  # Enhance Programs Table for Complete Program Management
  
  ## Overview
  Adds comprehensive fields to the programs table to support full MSWDO program creation
  and management, including dates, eligibility criteria, and document storage.
  
  ## New Columns Added to Programs Table
  
  1. **created_by** (uuid) - References the MSWDO staff who created the program
  2. **target_classification** (text) - Single classification (senior_citizen/pwd/solo_parent)
  3. **application_start_date** (date) - When applications open
  4. **application_end_date** (date) - When applications close
  5. **eligibility_criteria** (text) - Detailed eligibility requirements
  6. **additional_instructions** (text) - Extra instructions for applicants
  7. **program_document_url** (text) - Optional program file/document
  8. **updated_at** (timestamptz) - Last update timestamp
  
  ## Changes Made
  
  1. Adds new columns to programs table
  2. Drops the old classification array column and replaces with target_classification
  3. Adds foreign key relationship to profiles for created_by
  4. Updates existing policies
  5. Adds trigger for updated_at timestamp
  6. Creates index for performance
  
  ## Security
  - Maintains existing RLS policies
  - Only MSWDO and admin can create/update programs
  - All authenticated users can view active programs
*/

-- Add new columns to programs table
DO $$
BEGIN
  -- Drop the old classification column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'programs' AND column_name = 'classification'
  ) THEN
    ALTER TABLE programs DROP COLUMN classification;
  END IF;
  
  -- Add target_classification if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'programs' AND column_name = 'target_classification'
  ) THEN
    ALTER TABLE programs ADD COLUMN target_classification text NOT NULL DEFAULT 'senior_citizen' 
      CHECK (target_classification IN ('senior_citizen', 'pwd', 'solo_parent'));
  END IF;
  
  -- Add created_by if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'programs' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE programs ADD COLUMN created_by uuid REFERENCES profiles(id);
  END IF;
  
  -- Add application_start_date if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'programs' AND column_name = 'application_start_date'
  ) THEN
    ALTER TABLE programs ADD COLUMN application_start_date date;
  END IF;
  
  -- Add application_end_date if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'programs' AND column_name = 'application_end_date'
  ) THEN
    ALTER TABLE programs ADD COLUMN application_end_date date;
  END IF;
  
  -- Add eligibility_criteria if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'programs' AND column_name = 'eligibility_criteria'
  ) THEN
    ALTER TABLE programs ADD COLUMN eligibility_criteria text;
  END IF;
  
  -- Add additional_instructions if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'programs' AND column_name = 'additional_instructions'
  ) THEN
    ALTER TABLE programs ADD COLUMN additional_instructions text;
  END IF;
  
  -- Add program_document_url if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'programs' AND column_name = 'program_document_url'
  ) THEN
    ALTER TABLE programs ADD COLUMN program_document_url text;
  END IF;
  
  -- Add updated_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'programs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE programs ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger for updated_at on programs table
DROP TRIGGER IF EXISTS update_programs_updated_at ON programs;
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for target_classification for better filtering
CREATE INDEX IF NOT EXISTS idx_programs_target_classification ON programs(target_classification);
CREATE INDEX IF NOT EXISTS idx_programs_is_active ON programs(is_active);
CREATE INDEX IF NOT EXISTS idx_programs_created_by ON programs(created_by);

-- Add policy for MSWDO to delete programs
DROP POLICY IF EXISTS "Admin and MSWDO can delete programs" ON programs;
CREATE POLICY "Admin and MSWDO can delete programs"
  ON programs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'mswdo')
    )
  );