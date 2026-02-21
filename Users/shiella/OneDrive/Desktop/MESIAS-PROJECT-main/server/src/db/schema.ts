import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../database.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    -- Users table (replaces auth.users and profiles)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      middle_name TEXT,
      username TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      contact_number TEXT,
      date_of_birth TEXT,
      user_type TEXT NOT NULL CHECK (user_type IN ('beneficiary', 'admin', 'bhw', 'mswdo')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Beneficiaries table
    CREATE TABLE IF NOT EXISTS beneficiaries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      classification TEXT NOT NULL CHECK (classification IN ('senior_citizen', 'pwd', 'solo_parent')),
      latitude REAL,
      longitude REAL,
      date_of_birth TEXT,
      pwd_id_number TEXT,
      guardian_name TEXT,
      guardian_contact TEXT,
      guardian_relationship TEXT,
      senior_id_url TEXT,
      psa_url TEXT,
      postal_id_url TEXT,
      voters_id_url TEXT,
      national_id_url TEXT,
      medical_cert_url TEXT,
      govt_id_url TEXT,
      pwd_form_url TEXT,
      barangay_cert_url TEXT,
      death_cert_url TEXT,
      medical_records_url TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id)
    );

    -- BHW assignments table
    CREATE TABLE IF NOT EXISTS bhw_assignments (
      id TEXT PRIMARY KEY,
      bhw_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      barangay TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(bhw_user_id, barangay)
    );

    -- Programs table
    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      classification TEXT NOT NULL,
      requirements TEXT NOT NULL,
      program_type TEXT NOT NULL CHECK (program_type IN ('cash_assistance', 'medical', 'educational', 'livelihood')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Applications table
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      beneficiary_id TEXT NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
      program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'bhw_verified', 'mswdo_approved', 'scheduled', 'claimed', 'denied')),
      form_data TEXT DEFAULT '{}',
      bhw_verified_at TEXT,
      bhw_verified_by TEXT REFERENCES users(id),
      bhw_notes TEXT,
      mswdo_approved_at TEXT,
      mswdo_approved_by TEXT REFERENCES users(id),
      mswdo_notes TEXT,
      denial_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Application documents table
    CREATE TABLE IF NOT EXISTS application_documents (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL,
      document_url TEXT NOT NULL,
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    -- Release schedules table
    CREATE TABLE IF NOT EXISTS release_schedules (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      release_date TEXT NOT NULL,
      release_time TEXT,
      venue TEXT NOT NULL,
      instructions TEXT,
      claimed_at TEXT,
      claimed_by_staff TEXT REFERENCES users(id),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
      related_application_id TEXT REFERENCES applications(id),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
    CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries(user_id);
    CREATE INDEX IF NOT EXISTS idx_beneficiaries_classification ON beneficiaries(classification);
    CREATE INDEX IF NOT EXISTS idx_bhw_assignments_bhw_user_id ON bhw_assignments(bhw_user_id);
    CREATE INDEX IF NOT EXISTS idx_bhw_assignments_barangay ON bhw_assignments(barangay);
    CREATE INDEX IF NOT EXISTS idx_applications_beneficiary_id ON applications(beneficiary_id);
    CREATE INDEX IF NOT EXISTS idx_applications_program_id ON applications(program_id);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

    -- Create trigger for updated_at
    CREATE TRIGGER IF NOT EXISTS update_users_updated_at
      AFTER UPDATE ON users
      FOR EACH ROW
      BEGIN
        UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
      END;

    CREATE TRIGGER IF NOT EXISTS update_applications_updated_at
      AFTER UPDATE ON applications
      FOR EACH ROW
      BEGIN
        UPDATE applications SET updated_at = datetime('now') WHERE id = NEW.id;
      END;
  `);

  console.log('Database initialized successfully');
}
