/*
  # Add Missing Columns to Profiles and Beneficiaries Tables

  ## Overview
  Adds essential columns that are referenced in the application UI but missing from the database schema.

  ## Changes to profiles table
  1. **New Columns**
     - `middle_name` (text, nullable) - Beneficiary's middle name
     - `contact_number` (text, nullable) - Contact phone number
     - `date_of_birth` (date, nullable) - Date of birth for age verification

  ## Changes to beneficiaries table
  1. **New Columns**
     - `date_of_birth` (date, nullable) - Beneficiary's date of birth
     - `pwd_id_number` (text, nullable) - PWD ID number for PWD beneficiaries
     - `guardian_name` (text, nullable) - Guardian/representative name
     - `guardian_contact` (text, nullable) - Guardian contact number
     - `guardian_relationship` (text, nullable) - Relationship to beneficiary

  ## Security
  - All new columns respect existing RLS policies
  - No changes to authentication or permissions
*/

-- Add new columns to profiles table
DO $$
BEGIN
  -- Add middle_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'middle_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN middle_name text;
  END IF;
  
  -- Add contact_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'contact_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN contact_number text;
  END IF;
  
  -- Add date_of_birth column to profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE profiles ADD COLUMN date_of_birth date;
  END IF;
END $$;

-- Add new columns to beneficiaries table
DO $$
BEGIN
  -- Add date_of_birth column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN date_of_birth date;
  END IF;
  
  -- Add pwd_id_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'pwd_id_number'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN pwd_id_number text;
  END IF;
  
  -- Add guardian_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'guardian_name'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN guardian_name text;
  END IF;
  
  -- Add guardian_contact column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'guardian_contact'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN guardian_contact text;
  END IF;
  
  -- Add guardian_relationship column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'guardian_relationship'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN guardian_relationship text;
  END IF;
END $$;

-- Create indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_profiles_contact_number ON profiles(contact_number) WHERE contact_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beneficiaries_pwd_id_number ON beneficiaries(pwd_id_number) WHERE pwd_id_number IS NOT NULL;
