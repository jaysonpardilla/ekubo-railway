/*
  # Add Program Filtering by Classification and Disability Type

  1. Changes to beneficiaries table
    - Add `disability_type` column for PWD beneficiaries
    - Values: physical, visual, hearing, speech, intellectual, psychosocial, autism, chronic_illness, multiple

  2. Changes to programs table
    - Add `target_classifications` column (array of classifications)
    - Add `target_disability_types` column (array of disability types for PWD programs)
    - Add `waiting_period_days` column (for re-application control)
    - Add `is_one_time` column (if program can only be applied once)

  3. Security
    - Update RLS policies to support new columns
*/

-- Add disability_type to beneficiaries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beneficiaries' AND column_name = 'disability_type'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN disability_type text;
    COMMENT ON COLUMN beneficiaries.disability_type IS 'Type of disability for PWD: physical, visual, hearing, speech, intellectual, psychosocial, autism, chronic_illness, multiple';
  END IF;
END $$;

-- Add program filtering columns to programs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'target_classifications'
  ) THEN
    ALTER TABLE programs ADD COLUMN target_classifications text[] DEFAULT ARRAY['senior_citizen', 'pwd', 'solo_parent'];
    COMMENT ON COLUMN programs.target_classifications IS 'Array of beneficiary classifications this program is available for';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'target_disability_types'
  ) THEN
    ALTER TABLE programs ADD COLUMN target_disability_types text[];
    COMMENT ON COLUMN programs.target_disability_types IS 'For PWD programs: specific disability types eligible (null = all PWD types)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'waiting_period_days'
  ) THEN
    ALTER TABLE programs ADD COLUMN waiting_period_days integer DEFAULT 0;
    COMMENT ON COLUMN programs.waiting_period_days IS 'Days before beneficiary can re-apply after approval (0 = no waiting period)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'is_one_time'
  ) THEN
    ALTER TABLE programs ADD COLUMN is_one_time boolean DEFAULT false;
    COMMENT ON COLUMN programs.is_one_time IS 'If true, beneficiary can only apply once (no re-application allowed)';
  END IF;
END $$;