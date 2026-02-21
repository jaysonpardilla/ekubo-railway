/*
  # Automatic Notification System for Application Workflow

  ## Overview
  This migration creates an automatic notification system that triggers at key stages
  in the beneficiary application workflow.

  ## Notification Triggers
  
  1. **New Application Submitted**
     - Notifies: BHW assigned to beneficiary's barangay + All MSWDO users
     - Message: "A new beneficiary application has been submitted for [Program Name]"

  2. **BHW Verification Completed**
     - Notifies: All MSWDO users + Beneficiary (optional)
     - Message: "BHW has completed verification for [Beneficiary Name]'s application"

  3. **MSWDO Approval/Denial**
     - Notifies: Beneficiary + BHW who verified
     - Message: "Your application has been approved/denied"

  ## Functions Created
  - `notify_application_submitted()` - Sends notifications when application is created
  - `notify_application_status_change()` - Sends notifications when status changes

  ## Security
  - All notifications follow RLS policies
  - Only authorized users receive notifications for their jurisdiction
*/

-- Function to get beneficiary's barangay from their address
CREATE OR REPLACE FUNCTION get_beneficiary_barangay(beneficiary_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  beneficiary_address TEXT;
BEGIN
  SELECT p.address INTO beneficiary_address
  FROM beneficiaries b
  JOIN profiles p ON p.id = b.user_id
  WHERE b.id = beneficiary_uuid;
  
  RETURN beneficiary_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify when a new application is submitted
CREATE OR REPLACE FUNCTION notify_application_submitted()
RETURNS TRIGGER AS $$
DECLARE
  beneficiary_name TEXT;
  program_name TEXT;
  beneficiary_barangay TEXT;
  bhw_user_record RECORD;
  mswdo_user_record RECORD;
BEGIN
  -- Get beneficiary name
  SELECT p.first_name || ' ' || p.last_name INTO beneficiary_name
  FROM beneficiaries b
  JOIN profiles p ON p.id = b.user_id
  WHERE b.id = NEW.beneficiary_id;
  
  -- Get program name
  SELECT name INTO program_name
  FROM programs
  WHERE id = NEW.program_id;
  
  -- Get beneficiary's barangay
  beneficiary_barangay := get_beneficiary_barangay(NEW.beneficiary_id);
  
  -- Notify BHW assigned to beneficiary's barangay
  FOR bhw_user_record IN
    SELECT ba.bhw_user_id
    FROM bhw_assignments ba
    WHERE ba.barangay = beneficiary_barangay
  LOOP
    INSERT INTO notifications (user_id, title, message, type, related_application_id)
    VALUES (
      bhw_user_record.bhw_user_id,
      'New Application Submitted',
      'A new beneficiary application has been submitted by ' || beneficiary_name || ' for ' || program_name || '. Please verify the documents.',
      'info',
      NEW.id
    );
  END LOOP;
  
  -- Notify all MSWDO users for monitoring
  FOR mswdo_user_record IN
    SELECT id
    FROM profiles
    WHERE user_type = 'mswdo'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, related_application_id)
    VALUES (
      mswdo_user_record.id,
      'New Application Submitted',
      'A new beneficiary application has been submitted by ' || beneficiary_name || ' for ' || program_name || '.',
      'info',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify when application status changes
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  beneficiary_name TEXT;
  beneficiary_user_id UUID;
  program_name TEXT;
  mswdo_user_record RECORD;
BEGIN
  -- Only process if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get beneficiary info
  SELECT p.first_name || ' ' || p.last_name, p.id INTO beneficiary_name, beneficiary_user_id
  FROM beneficiaries b
  JOIN profiles p ON p.id = b.user_id
  WHERE b.id = NEW.beneficiary_id;
  
  -- Get program name
  SELECT name INTO program_name
  FROM programs
  WHERE id = NEW.program_id;
  
  -- BHW Verification Completed (pending -> bhw_verified)
  IF OLD.status = 'pending' AND NEW.status = 'bhw_verified' THEN
    -- Notify all MSWDO users
    FOR mswdo_user_record IN
      SELECT id
      FROM profiles
      WHERE user_type = 'mswdo'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, related_application_id)
      VALUES (
        mswdo_user_record.id,
        'Application Ready for Review',
        'BHW has completed verification for ' || beneficiary_name || '''s application for ' || program_name || '. Ready for your review.',
        'success',
        NEW.id
      );
    END LOOP;
    
    -- Notify beneficiary (optional - for transparency)
    INSERT INTO notifications (user_id, title, message, type, related_application_id)
    VALUES (
      beneficiary_user_id,
      'Application Verified',
      'Your application for ' || program_name || ' has been verified by BHW and is awaiting MSWDO approval.',
      'info',
      NEW.id
    );
  END IF;
  
  -- MSWDO Approval (bhw_verified -> mswdo_approved)
  IF NEW.status = 'mswdo_approved' THEN
    -- Notify beneficiary
    INSERT INTO notifications (user_id, title, message, type, related_application_id)
    VALUES (
      beneficiary_user_id,
      'Application Approved',
      'Your application for ' || program_name || ' has been approved by MSWDO. Please check your dashboard for next steps.',
      'success',
      NEW.id
    );
    
    -- Notify BHW who verified (if exists)
    IF NEW.bhw_verified_by IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, related_application_id)
      VALUES (
        NEW.bhw_verified_by,
        'Application Approved',
        beneficiary_name || '''s application for ' || program_name || ' has been approved by MSWDO.',
        'success',
        NEW.id
      );
    END IF;
  END IF;
  
  -- MSWDO Denial
  IF NEW.status = 'denied' THEN
    -- Notify beneficiary
    INSERT INTO notifications (user_id, title, message, type, related_application_id)
    VALUES (
      beneficiary_user_id,
      'Application Denied',
      'Your application for ' || program_name || ' has been denied. Reason: ' || COALESCE(NEW.denial_reason, 'Not specified'),
      'error',
      NEW.id
    );
    
    -- Notify BHW who verified (if exists)
    IF NEW.bhw_verified_by IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, related_application_id)
      VALUES (
        NEW.bhw_verified_by,
        'Application Denied',
        beneficiary_name || '''s application for ' || program_name || ' has been denied by MSWDO.',
        'warning',
        NEW.id
      );
    END IF;
  END IF;
  
  -- Release Schedule Created (mswdo_approved -> scheduled)
  IF OLD.status = 'mswdo_approved' AND NEW.status = 'scheduled' THEN
    -- Notify beneficiary
    INSERT INTO notifications (user_id, title, message, type, related_application_id)
    VALUES (
      beneficiary_user_id,
      'Release Schedule Set',
      'A release schedule has been set for your ' || program_name || ' benefit. Please check your dashboard for details.',
      'success',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new application submissions
DROP TRIGGER IF EXISTS trigger_notify_application_submitted ON applications;
CREATE TRIGGER trigger_notify_application_submitted
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_submitted();

-- Create trigger for application status changes
DROP TRIGGER IF EXISTS trigger_notify_application_status_change ON applications;
CREATE TRIGGER trigger_notify_application_status_change
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_status_change();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_beneficiary_barangay(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_application_submitted() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_application_status_change() TO authenticated;
