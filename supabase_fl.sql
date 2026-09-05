-- ============================================================
-- Migration: Federated Learning (H-03) Clinical AI Infrastructure
-- Privacy-Preserving Collaborative Medical Imaging Network
-- Safe & Idempotent (IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- 1. FL Models Registry Table (Initially Empty)
CREATE TABLE IF NOT EXISTS public.fl_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  modality TEXT NOT NULL,
  task TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  architecture TEXT NOT NULL,
  parameters_count TEXT NOT NULL,
  classes JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  preprocessing_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  training_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  base_accuracy FLOAT NOT NULL DEFAULT 0.70,
  target_accuracy FLOAT NOT NULL DEFAULT 0.95,
  current_accuracy FLOAT NOT NULL DEFAULT 0.70,
  current_round INT NOT NULL DEFAULT 0,
  max_rounds INT NOT NULL DEFAULT 50,
  epsilon_max FLOAT NOT NULL DEFAULT 5.0,
  current_epsilon FLOAT NOT NULL DEFAULT 0.0,
  current_loss FLOAT NOT NULL DEFAULT 0.90,
  current_mmd FLOAT NOT NULL DEFAULT 0.14,
  status TEXT NOT NULL DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'training', 'converged')),
  min_samples INT NOT NULL DEFAULT 100,
  accent TEXT DEFAULT 'indigo',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Hospital Node Participation & Cohort Table (Strict 1:1 Isolation)
CREATE TABLE IF NOT EXISTS public.fl_hospital_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES public.fl_models(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_name TEXT NOT NULL,
  hospital_code TEXT NOT NULL, -- e.g. 'GE', 'SIE', 'PHI'
  region TEXT DEFAULT 'Local Node',
  scanner_model TEXT DEFAULT 'Standard DICOM Scanner',
  local_samples_count INT NOT NULL DEFAULT 0,
  dataset_name TEXT,
  dataset_size_mb FLOAT,
  node_status TEXT NOT NULL DEFAULT 'ready' CHECK (node_status IN ('ready', 'synced', 'harmonized', 'quarantined', 'training', 'idle')),
  is_adversarial BOOLEAN NOT NULL DEFAULT false,
  last_round_participated INT DEFAULT 0,
  local_loss FLOAT,
  local_accuracy FLOAT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fl_hospital_model_unique UNIQUE (model_id, hospital_id)
);

-- 3. Global Training Rounds Telemetry
CREATE TABLE IF NOT EXISTS public.fl_training_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES public.fl_models(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  global_accuracy FLOAT NOT NULL,
  global_loss FLOAT NOT NULL,
  epsilon_spent FLOAT NOT NULL,
  mmd_drift FLOAT NOT NULL DEFAULT 0.14,
  participating_nodes_count INT NOT NULL DEFAULT 0,
  accepted_nodes_count INT NOT NULL DEFAULT 0,
  rejected_nodes_count INT NOT NULL DEFAULT 0,
  checkpoint_hash TEXT NOT NULL,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aggregated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fl_model_round_unique UNIQUE (model_id, round_number)
);

-- 4. Hospital Local Weight Delta Updates (Zero Raw Data Storage - Strict Hospital Isolation)
CREATE TABLE IF NOT EXISTS public.fl_local_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.fl_training_rounds(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL REFERENCES public.fl_models(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  weight_delta_hash TEXT NOT NULL,
  gradient_norm FLOAT,
  dp_noise_scale FLOAT,
  byzantine_score FLOAT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'harmonized', 'quarantined', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Cryptographic Provenance & Security Audit Ledger
CREATE TABLE IF NOT EXISTS public.fl_audit_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES public.fl_models(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  source_node TEXT NOT NULL,
  provenance_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Success' CHECK (status IN ('Success', 'Harmonized', 'Blocked', 'Warning')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Hospital Training Jobs & Benchmark Evaluation Traces
CREATE TABLE IF NOT EXISTS public.fl_training_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES public.fl_models(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_name TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  sample_count INT NOT NULL DEFAULT 0,
  epochs INT NOT NULL DEFAULT 10,
  batch_size INT NOT NULL DEFAULT 16,
  baseline_accuracy FLOAT NOT NULL DEFAULT 0.70,
  candidate_accuracy FLOAT,
  candidate_f1 FLOAT,
  candidate_precision FLOAT,
  candidate_recall FLOAT,
  candidate_loss FLOAT,
  gate_decision TEXT NOT NULL DEFAULT 'TRAINING' CHECK (gate_decision IN ('ACCEPTED', 'REJECTED', 'TRAINING', 'FAILED')),
  gate_reason TEXT,
  duration_seconds FLOAT,
  epoch_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  provenance_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. ENABLE REALTIME PUBLICATION
-- ============================================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fl_models; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fl_hospital_nodes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fl_training_rounds; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fl_audit_ledger; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fl_local_updates; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fl_training_jobs; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- fl_models
ALTER TABLE public.fl_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public and authenticated can view models" ON public.fl_models;
CREATE POLICY "Public and authenticated can view models" ON public.fl_models FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Authenticated can insert/update fl_models" ON public.fl_models;
CREATE POLICY "Authenticated can insert/update fl_models" ON public.fl_models FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- fl_hospital_nodes
ALTER TABLE public.fl_hospital_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hospitals can view participant node rosters" ON public.fl_hospital_nodes;
CREATE POLICY "Hospitals can view participant node rosters" ON public.fl_hospital_nodes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Hospital can only manage own node" ON public.fl_hospital_nodes;
CREATE POLICY "Hospital can only manage own node" ON public.fl_hospital_nodes FOR ALL TO authenticated
  USING (auth.uid() = hospital_id)
  WITH CHECK (auth.uid() = hospital_id);

-- fl_local_updates (Strict Isolation: zero cross-hospital leakage)
ALTER TABLE public.fl_local_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hospital can only access their own local weight updates" ON public.fl_local_updates;
CREATE POLICY "Hospital can only access their own local weight updates" ON public.fl_local_updates FOR ALL TO authenticated
  USING (auth.uid() = hospital_id)
  WITH CHECK (auth.uid() = hospital_id);

-- fl_training_rounds
ALTER TABLE public.fl_training_rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view training rounds" ON public.fl_training_rounds;
CREATE POLICY "Authenticated can view training rounds" ON public.fl_training_rounds FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert training rounds" ON public.fl_training_rounds;
CREATE POLICY "Authenticated can insert training rounds" ON public.fl_training_rounds FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- fl_audit_ledger
ALTER TABLE public.fl_audit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view audit ledger" ON public.fl_audit_ledger;
CREATE POLICY "Authenticated can view audit ledger" ON public.fl_audit_ledger FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert audit ledger entries" ON public.fl_audit_ledger;
CREATE POLICY "Authenticated can insert audit ledger entries" ON public.fl_audit_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- fl_training_jobs (Strict Isolation: Hospital can only view its own training jobs & evaluation traces)
ALTER TABLE public.fl_training_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hospital can view and manage own training jobs" ON public.fl_training_jobs;
CREATE POLICY "Hospital can view and manage own training jobs" ON public.fl_training_jobs FOR ALL TO authenticated
  USING (auth.uid() = hospital_id)
  WITH CHECK (auth.uid() = hospital_id);
