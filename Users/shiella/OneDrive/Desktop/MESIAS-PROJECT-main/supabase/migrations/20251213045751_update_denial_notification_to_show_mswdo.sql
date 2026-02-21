/*
  # Update Denial Notification to Show MSWDO Source
  
  ## Changes
  Updates the automatic notification system to clearly indicate that application
  denials come from MSWDO officers.
  
  ## Modifications
  - Changes notification title from "Application Denied" to "Application Denied by MSWDO"
  - Updates message to explicitly state "MSWDO has denied your application"
  - Maintains existing functionality for beneficiary and BHW notifications
  
  ## Impact
  - Beneficiaries will clearly see that the denial came from MSWDO
  - BHW staff will also see the MSWDO source in their notifications
  - Improves transparency in the application workflow
*/

-- Update the notification function to show MSWDO in denial messages
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
      'Application Approved by MSWDO',
      'MSWDO has approved your application for ' || program_name || '. Please check your dashboard for next steps.',
      'success',
      NEW.id
    );
    
    -- Notify BHW who verified (if exists)
    IF NEW.bhw_verified_by IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, related_application_id)
      VALUES (
        NEW.bhw_verified_by,
        'Application Approved by MSWDO',
        'MSWDO has approved ' || beneficiary_name || '''s application for ' || program_name || '.',
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
      'Application Denied by MSWDO',
      'MSWDO has denied your application for ' || program_name || '. Reason: ' || COALESCE(NEW.denial_reason, 'Not specified'),
      'error',
      NEW.id
    );
    
    -- Notify BHW who verified (if exists)
    IF NEW.bhw_verified_by IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, related_application_id)
      VALUES (
        NEW.bhw_verified_by,
        'Application Denied by MSWDO',
        'MSWDO has denied ' || beneficiary_name || '''s application for ' || program_name || '.',
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
      'Release Schedule Set by MSWDO',
      'MSWDO has set a release schedule for your ' || program_name || ' benefit. Please check your dashboard for details.',
      'success',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;