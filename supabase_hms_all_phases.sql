-- ============================================================================
-- MyHealthChain Enterprise HMS / HIS - Master Database Migration
-- Includes All 6 Phases (Phases 1 through 6)
-- Run this script in your Supabase SQL Editor to initialize all enterprise tables.
-- ============================================================================

-- ============================================================================
-- PHASE 1: Patient Access, OPD Queue & Inpatient ADT Bed Lifecycle
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.doctor_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  doctor_name text NOT NULL,
  department text NOT NULL,
  day_of_week text NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 15,
  max_patients_per_slot integer NOT NULL DEFAULT 1,
  room_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.opd_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uhid text NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  patient_phone text,
  doctor_id text NOT NULL,
  doctor_name text NOT NULL,
  department text NOT NULL,
  appointment_date date NOT NULL,
  slot_time time NOT NULL,
  token_number integer NOT NULL,
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show')),
  triage_priority text NOT NULL DEFAULT 'GREEN' CHECK (triage_priority IN ('RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE')),
  chief_complaint text,
  vital_signs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ipd_admissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uhid text NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  admitted_at timestamptz NOT NULL DEFAULT now(),
  discharged_at timestamptz,
  admitting_doctor_id text NOT NULL,
  admitting_doctor_name text NOT NULL,
  ward_type text NOT NULL,
  bed_number text NOT NULL,
  admitting_diagnosis text NOT NULL,
  status text NOT NULL DEFAULT 'admitted' CHECK (status IN ('admitted', 'discharge_pending', 'discharged', 'transferred', 'lama')),
  pharmacy_cleared boolean NOT NULL DEFAULT false,
  pharmacy_cleared_at timestamptz,
  pharmacy_cleared_by text,
  lab_cleared boolean NOT NULL DEFAULT false,
  lab_cleared_at timestamptz,
  lab_cleared_by text,
  nursing_cleared boolean NOT NULL DEFAULT false,
  nursing_cleared_at timestamptz,
  nursing_cleared_by text,
  billing_cleared boolean NOT NULL DEFAULT false,
  billing_cleared_at timestamptz,
  billing_cleared_by text,
  discharge_summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- PHASE 2: Clinical EMR, CPOE & Bedside Nursing eMAR
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clinical_encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uhid text NOT NULL,
  doctor_id text NOT NULL,
  doctor_name text NOT NULL,
  encounter_type text NOT NULL CHECK (encounter_type IN ('OPD_CONSULTATION', 'IPD_ROUNDS', 'EMERGENCY_TRIAGE', 'TELECONSULT')),
  subjective text,
  objective text,
  assessment text,
  plan text,
  icd10_codes jsonb DEFAULT '[]'::jsonb,
  vital_signs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cpoe_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uhid text NOT NULL,
  doctor_id text NOT NULL,
  doctor_name text NOT NULL,
  order_type text NOT NULL CHECK (order_type IN ('MEDICATION', 'LAB', 'RADIOLOGY', 'NURSING_CARE', 'DIET')),
  item_name text NOT NULL,
  dosage text,
  frequency text,
  route text,
  duration_days integer DEFAULT 1,
  urgency text NOT NULL DEFAULT 'ROUTINE' CHECK (urgency IN ('ROUTINE', 'URGENT', 'STAT')),
  instructions text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'DISCONTINUED')),
  cdss_alert_triggered boolean NOT NULL DEFAULT false,
  cdss_alert_acknowledged boolean NOT NULL DEFAULT false,
  physician_override_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emar_administrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpoe_order_id uuid NOT NULL REFERENCES public.cpoe_orders(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uhid text NOT NULL,
  nurse_id text NOT NULL,
  nurse_name text NOT NULL,
  scanned_patient_barcode text NOT NULL,
  scanned_medication_barcode text NOT NULL,
  verified_right_patient boolean NOT NULL DEFAULT false,
  verified_right_drug boolean NOT NULL DEFAULT false,
  verified_right_dose boolean NOT NULL DEFAULT false,
  verified_right_route boolean NOT NULL DEFAULT false,
  verified_right_time boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'GIVEN' CHECK (status IN ('GIVEN', 'HELD', 'REFUSED', 'MISSED')),
  vitals_at_administration jsonb DEFAULT '{}'::jsonb,
  notes text,
  administered_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- PHASE 3: Diagnostics & Ancillary Services (LIS & Web DICOM PACS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lis_specimens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpoe_order_id uuid REFERENCES public.cpoe_orders(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uhid text NOT NULL,
  patient_name text NOT NULL,
  test_name text NOT NULL,
  specimen_type text NOT NULL DEFAULT 'Whole Blood' CHECK (specimen_type IN ('Whole Blood', 'Serum', 'Plasma', 'Urine', 'Sputum', 'CSF', 'Biopsy')),
  barcode text UNIQUE NOT NULL,
  collection_status text NOT NULL DEFAULT 'ordered' CHECK (collection_status IN ('ordered', 'collected', 'in_analyzer', 'reviewed', 'released')),
  collected_by text,
  collected_at timestamptz,
  results_json jsonb DEFAULT '{}'::jsonb,
  delta_check_flag text NOT NULL DEFAULT 'NORMAL' CHECK (delta_check_flag IN ('NORMAL', 'DELTA_WARNING', 'CRITICAL_PANIC')),
  delta_details text,
  pathologist_name text,
  pathologist_signature text,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pacs_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpoe_order_id uuid REFERENCES public.cpoe_orders(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uhid text NOT NULL,
  patient_name text NOT NULL,
  modality text NOT NULL CHECK (modality IN ('CR', 'DX', 'CT', 'MR', 'US', 'DERM')),
  study_description text NOT NULL,
  image_url text,
  dicom_url text,
  ipfs_cid text,
  window_preset text DEFAULT 'LUNG' CHECK (window_preset IN ('LUNG', 'BONE', 'SOFT_TISSUE', 'BRAIN', 'MEDIASTINUM')),
  radiologist_impression text,
  radiologist_name text,
  status text NOT NULL DEFAULT 'acquired' CHECK (status IN ('scheduled', 'acquired', 'reported', 'verified')),
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- PHASE 4: Financial & Revenue Cycle Management (RCM)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.charge_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code text UNIQUE NOT NULL,
  service_category text NOT NULL CHECK (service_category IN ('BED_RENT', 'CONSULTATION', 'LAB', 'RADIOLOGY', 'SURGERY', 'PHARMACY', 'NURSING')),
  service_name text NOT NULL,
  standard_price numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.charge_master (service_code, service_category, service_name, standard_price)
VALUES
  ('BED-ICU-01', 'BED_RENT', 'Intensive Care Unit (ICU) Daily Bed Tariff', 6500.00),
  ('BED-GEN-01', 'BED_RENT', 'General Inpatient Ward Daily Bed Tariff', 1500.00),
  ('BED-EMG-01', 'BED_RENT', 'Emergency Observation Daily Bed Tariff', 2500.00),
  ('DOC-OPD-01', 'CONSULTATION', 'Senior Consultant OPD Specialist Fee', 800.00),
  ('DOC-IPD-01', 'CONSULTATION', 'Daily Inpatient Attending Rounds Fee', 1000.00),
  ('LAB-CBC-01', 'LAB', 'Complete Blood Count (CBC) with Differential', 450.00),
  ('LAB-CMP-01', 'LAB', 'Comprehensive Metabolic Panel (CMP)', 850.00),
  ('LAB-ABG-01', 'LAB', 'Arterial Blood Gas (ABG) Analysis', 600.00),
  ('LAB-INR-01', 'LAB', 'Prothrombin Time / INR Coagulation Panel', 400.00),
  ('RAD-CXR-01', 'RADIOLOGY', 'Digital Radiography (Chest X-Ray PA & Lateral)', 750.00),
  ('RAD-CT-01', 'RADIOLOGY', 'High-Resolution CT Chest (HRCT)', 3800.00),
  ('NUR-CARE-01', 'NURSING', 'Daily Bedside Nursing Care & Vital Monitoring', 500.00)
ON CONFLICT (service_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.patient_billing_ledgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uhid text NOT NULL,
  admission_id uuid REFERENCES public.ipd_admissions(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('BED', 'LAB', 'RADIOLOGY', 'PHARMACY', 'CONSULTATION', 'NURSING', 'SURGERY')),
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'unbilled' CHECK (status IN ('unbilled', 'invoiced', 'settled')),
  posted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uhid text NOT NULL,
  patient_name text NOT NULL,
  admission_id uuid REFERENCES public.ipd_admissions(id) ON DELETE SET NULL,
  payer_name text NOT NULL,
  tpa_name text,
  policy_number text NOT NULL,
  preauth_amount numeric NOT NULL DEFAULT 0.0,
  claimed_amount numeric NOT NULL DEFAULT 0.0,
  approved_amount numeric NOT NULL DEFAULT 0.0,
  claim_status text NOT NULL DEFAULT 'preauth_submitted' CHECK (claim_status IN ('draft', 'preauth_submitted', 'preauth_approved', 'claim_submitted', 'settled', 'rejected', 'query_raised')),
  claim_bundle jsonb DEFAULT '{}'::jsonb,
  query_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cashier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uhid text NOT NULL,
  patient_name text NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'INSURANCE_SETTLEMENT', 'BANK_TRANSFER')),
  payment_type text NOT NULL CHECK (payment_type IN ('ADVANCE_DEPOSIT', 'FINAL_BILL_PAYMENT', 'OPD_FEE', 'LAB_FEE')),
  transaction_ref text,
  receipt_number text UNIQUE NOT NULL,
  cashier_name text NOT NULL DEFAULT 'Front-Desk Cashier',
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- PHASE 5: Surgical Suite (OT), Blood Bank & CSSD Sterilization
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ot_surgeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uhid text NOT NULL,
  patient_name text NOT NULL,
  procedure_name text NOT NULL,
  ot_room text NOT NULL DEFAULT 'OT Room 1 (Cardiac/General)',
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz,
  lead_surgeon text NOT NULL,
  anesthetist text NOT NULL,
  asa_status text NOT NULL DEFAULT 'ASA_II' CHECK (asa_status IN ('ASA_I', 'ASA_II', 'ASA_III', 'ASA_IV', 'ASA_V', 'ASA_VI', 'ASA_E')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'pre_op_ready', 'intra_op', 'pacu_recovery', 'completed', 'cancelled')),
  who_sign_in boolean NOT NULL DEFAULT false,
  who_time_out boolean NOT NULL DEFAULT false,
  who_sign_out boolean NOT NULL DEFAULT false,
  sponge_instrument_count_verified boolean NOT NULL DEFAULT false,
  aldrete_score integer DEFAULT 10,
  surgical_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blood_bank_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_barcode text UNIQUE NOT NULL,
  blood_group text NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  component_type text NOT NULL CHECK (component_type IN ('PRBC', 'FFP', 'PLATELETS', 'WHOLE_BLOOD', 'CRYOPRECIPITATE')),
  volume_ml integer NOT NULL DEFAULT 350,
  collection_date date NOT NULL,
  expiry_date date NOT NULL,
  status text NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'CROSS_MATCHED', 'TRANSFUSED', 'DISCARDED')),
  screening_passed boolean NOT NULL DEFAULT true,
  reserved_for_uhid text,
  reserved_for_patient text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cssd_trays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tray_barcode text UNIQUE NOT NULL,
  tray_name text NOT NULL,
  sterilization_method text NOT NULL DEFAULT 'STEAM_AUTOCLAVE' CHECK (sterilization_method IN ('STEAM_AUTOCLAVE', 'ETO_GAS', 'PLASMA_HYDROGEN_PEROXIDE')),
  autoclave_cycle_no text NOT NULL,
  biological_indicator_passed boolean NOT NULL DEFAULT true,
  sterilized_at timestamptz NOT NULL DEFAULT now(),
  expiry_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  status text NOT NULL DEFAULT 'STERILE_STORAGE' CHECK (status IN ('WASHING', 'PACKING', 'AUTOCLAVING', 'STERILE_STORAGE', 'DISPATCHED_TO_OT', 'USED')),
  dispatched_to_ot text,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- PHASE 6: Interoperability (HL7 FHIR v4.0), ABDM (ABHA) & Compliance Audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.abha_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uhid text NOT NULL UNIQUE,
  abha_number text UNIQUE NOT NULL,
  abha_address text UNIQUE NOT NULL,
  full_name text NOT NULL,
  gender text NOT NULL,
  date_of_birth text NOT NULL,
  mobile text NOT NULL,
  hip_id text NOT NULL DEFAULT 'IN2710001891',
  hip_name text NOT NULL DEFAULT 'MyHealthChain SuperSpeciality Hospital',
  consent_status text NOT NULL DEFAULT 'GRANTED' CHECK (consent_status IN ('REQUESTED', 'GRANTED', 'DENIED', 'EXPIRED', 'REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hms_compliance_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_id text NOT NULL,
  user_role text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  details_json jsonb DEFAULT '{}'::jsonb,
  ip_address text DEFAULT '127.0.0.1',
  integrity_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- Row Level Security (RLS) Enablement & Permissive Policies
-- ============================================================================

ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opd_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpoe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emar_administrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lis_specimens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacs_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charge_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_billing_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_bank_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cssd_trays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abha_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hms_compliance_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated on doctor_schedules" ON public.doctor_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on opd_appointments" ON public.opd_appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on ipd_admissions" ON public.ipd_admissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on clinical_encounters" ON public.clinical_encounters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on cpoe_orders" ON public.cpoe_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on emar_administrations" ON public.emar_administrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on lis_specimens" ON public.lis_specimens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on pacs_studies" ON public.pacs_studies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on charge_master" ON public.charge_master FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on patient_billing_ledgers" ON public.patient_billing_ledgers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on insurance_claims" ON public.insurance_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on cashier_payments" ON public.cashier_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on ot_surgeries" ON public.ot_surgeries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on blood_bank_units" ON public.blood_bank_units FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on cssd_trays" ON public.cssd_trays FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on abha_profiles" ON public.abha_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated on hms_compliance_audit_logs" ON public.hms_compliance_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
