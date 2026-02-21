/*
  # Add Deceased Beneficiary Tracking System
  
  ## Overview
  Implements a workflow for BHWs to report deceased beneficiaries and MSWDO to verify and confirm.
  
  ## Changes to beneficiaries table
  
  1. **New Columns**
     - `date_of_death` (date) - Date when the beneficiary passed away
     - `death_reported_by` (uuid) - BHW who reported the death
     - `death_reported_at` (timestamptz) - When the death was reported
     - `death_notes` (text) - Notes from BHW about the death
     - `death_verified_by` (uuid) - MSWDO staff who verified the death
     - `death_verified_at` (timestamptz) - When the death was verified
     - `death_certificate_url` (text) - URL to uploaded death certificate
  
  2. **Status Updates**
     - Add 'reported_deceased' and 'deceased' to status check constraint
  
  ## Workflow
  1. BHW reports death → status becomes 'reported_deceased'
  2. MSWDO verifies with death certificate → status becomes 'deceased'
  3. System automatically cancels active applications
*/

-- Add new columns to beneficiaries table
DO $$
BEGIN
  -- Add date_of_death column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'date_of_death'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN date_of_death date;
  END IF;
  
  -- Add death_reported_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'death_reported_by'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN death_reported_by uuid REFERENCES profiles(id);
  END IF;
  
  -- Add death_reported_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'death_reported_at'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN death_reported_at timestamptz;
  END IF;
  
  -- Add death_notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'death_notes'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN death_notes text;
  END IF;
  
  -- Add death_verified_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'death_verified_by'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN death_verified_by uuid REFERENCES profiles(id);
  END IF;
  
  -- Add death_verified_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'death_verified_at'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN death_verified_at timestamptz;
  END IF;
  
  -- Add death_certificate_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'death_certificate_url'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN death_certificate_url text;
  END IF;
END $$;

-- Update status constraint to include deceased statuses
ALTER TABLE beneficiaries DROP CONSTRAINT IF EXISTS beneficiaries_status_check;
ALTER TABLE beneficiaries ADD CONSTRAINT beneficiaries_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'reported_deceased', 'deceased'));

-- Create function to auto-cancel applications when beneficiary is marked as deceased
CREATE OR REPLACE FUNCTION cancel_deceased_beneficiary_applications()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to 'deceased', cancel all active applications
  IF NEW.status = 'deceased' AND OLD.status != 'deceased' THEN
    -- Update all non-final applications to denied with reason
    UPDATE applications 
    SET 
      status = 'denied',
      denial_reason = 'Beneficiary has been confirmed as deceased',
      updated_at = now()
    WHERE 
      beneficiary_id = NEW.id 
      AND status IN ('pending', 'bhw_verified', 'mswdo_approved', 'scheduled');
    
    -- Notify beneficiary's family (if user account still exists)
    IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id) THEN
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        'Account Status Updated',
        'This account has been marked as deceased. All pending applications have been cancelled. Please contact MSWDO for survivor support services.',
        'info'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-cancelling applications
DROP TRIGGER IF EXISTS auto_cancel_deceased_applications ON beneficiaries;
CREATE TRIGGER auto_cancel_deceased_applications
  AFTER UPDATE ON beneficiaries
  FOR EACH ROW
  WHEN (NEW.status = 'deceased' AND OLD.status IS DISTINCT FROM 'deceased')
  EXECUTE FUNCTION cancel_deceased_beneficiary_applications();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_beneficiaries_death_status ON beneficiaries(status) WHERE status IN ('reported_deceased', 'deceased');
CREATE INDEX IF NOT EXISTS idx_beneficiaries_death_reported_by ON beneficiaries(death_reported_by);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_death_verified_by ON beneficiaries(death_verified_by);