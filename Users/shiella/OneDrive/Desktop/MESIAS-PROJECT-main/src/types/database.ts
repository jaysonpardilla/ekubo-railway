export type UserType = 'beneficiary' | 'admin' | 'bhw' | 'mswdo';
export type Classification = 'senior_citizen' | 'pwd' | 'solo_parent';
export type DisabilityType = 'physical' | 'visual' | 'hearing' | 'speech' | 'intellectual' | 'psychosocial' | 'autism' | 'chronic_illness' | 'multiple';
export type BeneficiaryStatus = 'pending' | 'approved' | 'rejected';
export type ApplicationStatus = 'pending' | 'bhw_verified' | 'mswdo_approved' | 'scheduled' | 'claimed' | 'denied';
export type ProgramType = 'cash_assistance' | 'medical' | 'educational' | 'livelihood';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  username: string;
  email: string;
  contact_number?: string;
  address: string;
  date_of_birth?: string;
  user_type: UserType;
  created_at: string;
  updated_at: string;
}

export interface Beneficiary {
  id: string;
  user_id: string;
  classification: Classification;
  disability_type?: DisabilityType;
  date_of_birth?: string;
  pwd_id_number?: string;
  guardian_name?: string;
  guardian_contact?: string;
  guardian_relationship?: string;
  latitude?: number;
  longitude?: number;
  senior_id_url?: string;
  psa_url?: string;
  postal_id_url?: string;
  voters_id_url?: string;
  national_id_url?: string;
  medical_cert_url?: string;
  govt_id_url?: string;
  pwd_form_url?: string;
  barangay_cert_url?: string;
  death_cert_url?: string;
  medical_records_url?: string;
  status: BeneficiaryStatus;
  created_at: string;
}

export interface BHWAssignment {
  id: string;
  bhw_user_id: string;
  barangay: string;
  created_at: string;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  target_classifications: Classification[];
  target_classification?: Classification;
  target_disability_types?: DisabilityType[];
  requirements: string[];
  program_type: ProgramType;
  is_active: boolean;
  waiting_period_days: number;
  is_one_time: boolean;
  created_by?: string;
  application_start_date?: string;
  application_end_date?: string;
  eligibility_criteria?: string;
  additional_instructions?: string;
  program_document_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Application {
  id: string;
  beneficiary_id: string;
  program_id: string;
  status: ApplicationStatus;
  form_data: Record<string, any>;
  bhw_verified_at?: string;
  bhw_verified_by?: string;
  bhw_notes?: string;
  mswdo_approved_at?: string;
  mswdo_approved_by?: string;
  mswdo_notes?: string;
  denial_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_type: string;
  document_url: string;
  uploaded_at: string;
}

export interface ReleaseSchedule {
  id: string;
  application_id: string;
  release_date: string;
  release_time?: string;
  venue: string;
  instructions?: string;
  claimed_at?: string;
  claimed_by_staff?: string;
  notes?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  related_application_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      beneficiaries: {
        Row: Beneficiary;
        Insert: Omit<Beneficiary, 'id' | 'created_at' | 'status'>;
        Update: Partial<Omit<Beneficiary, 'id' | 'created_at'>>;
      };
      bhw_assignments: {
        Row: BHWAssignment;
        Insert: Omit<BHWAssignment, 'id' | 'created_at'>;
        Update: Partial<Omit<BHWAssignment, 'id' | 'created_at'>>;
      };
      programs: {
        Row: Program;
        Insert: Omit<Program, 'id' | 'created_at' | 'is_active'>;
        Update: Partial<Omit<Program, 'id' | 'created_at'>>;
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, 'id' | 'created_at' | 'updated_at' | 'status'>;
        Update: Partial<Omit<Application, 'id' | 'created_at'>>;
      };
      application_documents: {
        Row: ApplicationDocument;
        Insert: Omit<ApplicationDocument, 'id' | 'uploaded_at'>;
        Update: Partial<Omit<ApplicationDocument, 'id' | 'uploaded_at'>>;
      };
      release_schedules: {
        Row: ReleaseSchedule;
        Insert: Omit<ReleaseSchedule, 'id' | 'created_at'>;
        Update: Partial<Omit<ReleaseSchedule, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at' | 'is_read'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
    };
  };
}

export const DISABILITY_TYPES = [
  { value: 'physical', label: 'Physical / Orthopedic / Mobility Disability' },
  { value: 'visual', label: 'Visual Disability' },
  { value: 'hearing', label: 'Hearing Disability' },
  { value: 'speech', label: 'Speech or Communication Disability' },
  { value: 'intellectual', label: 'Intellectual Disability' },
  { value: 'psychosocial', label: 'Psychosocial Disability (Mental Health)' },
  { value: 'autism', label: 'Autism Spectrum Disorder' },
  { value: 'chronic_illness', label: 'Chronic Illness' },
  { value: 'multiple', label: 'Multiple Disabilities' },
] as const;

export const BARANGAYS = [
  'Agpangi',
  'Anislagan',
  'Atipolo',
  'Borac',
  'Cabungaan',
  'Calumpang',
  'Capiñahan',
  'Caraycaray',
  'Catmon',
  'Haguikhikan',
  'Imelda',
  'Larrazabal',
  'Libertad',
  'Libtong',
  'Lico',
  'Lucsoon',
  'Mabini',
  'Padre Inocentes Garcia (Pob.)',
  'Padre Sergio Eamiguel',
  'Sabang',
  'San Pablo',
  'Santissimo Rosario (Pob.) (Santo Rosa)',
  'Santo Niño',
  'Talustusan',
  'Villa Caneja',
  'Villa Consuelo'
] as const;
