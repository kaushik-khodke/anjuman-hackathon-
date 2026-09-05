// Federated Medical Imaging Marketplace — model catalog.
// Each model is a collaboratively trained classifier that hospitals contribute
// to depending on the imaging data they hold. Definitions describe the model,
// the data a hospital must supply to participate, and how to train it.
// No raw images are ever centralized — hospitals train locally and share only
// privacy-noised weight deltas (DP-SGD), per the zero-raw-image invariant.

export type Modality =
  | "Chest X-ray"
  | "Chest CT Scan"
  | "Cardiac MRI"
  | "Dermatoscopy"
  | "Breast Ultrasound"
  | "Retinal Fundus"
  | "Blood Microscopy"
  | "Abdominal CT";

export type ModelStatus = "recruiting" | "training" | "converged";

export interface ContributingHospital {
  id: string;
  name: string;
  code: string; // short scanner/site code shown on avatars
  region: string;
  scanner: string;
  samples: number;
  /** Seeded adversarial site used to demonstrate the Byzantine defense. */
  adversarial?: boolean;
}

export interface DataRequirement {
  label: string;
  value: string;
}

export interface ModelDefinition {
  id: string;
  name: string;
  shortName: string;
  modality: Modality;
  task: string;
  summary: string;
  description: string;
  architecture: string;
  parameters: string;
  classes: string[];
  /** Input tensor spec the local trainer expects. */
  input: {
    resolution: string;
    channels: string;
    format: string;
  };
  /** What a hospital needs on hand to join this model's training. */
  dataRequirements: DataRequirement[];
  /** Local preprocessing the client runs before each round. */
  preprocessing: string[];
  /** Ordered, human-readable steps a hospital follows to contribute. */
  trainingSteps: { title: string; detail: string }[];
  baseAccuracy: number;
  targetAccuracy: number;
  epsilonMax: number;
  status: ModelStatus;
  hospitals: ContributingHospital[];
  /** Minimum labeled samples a site must hold to be eligible. */
  minSamples: number;
  accent: string; // text/border accent hint
}

export const MODELS: ModelDefinition[] = [
  {
    id: "ct-clip-3d",
    name: "CT-CLIP 3D Chest CT Scanner",
    shortName: "CT-CLIP",
    modality: "Chest CT Scan",
    task: "18-Pathology Volumetric 3D Chest CT Classification",
    summary: "3D Vision Transformer foundation model for chest CT volume pathology detection.",
    description:
      "Uses 3D CTViT and text-aligned contrastive learning across 18 clinical findings (Emphysema, Nodules, Consolidation, Effusion, etc.). Trained locally on volumetric scans without exfiltrating raw 3D data.",
    architecture: "CTViT + CT-CLIP (3D Vision Transformer)",
    parameters: "140M",
    classes: [
      "Medical material", "Arterial wall calcification", "Cardiomegaly",
      "Pericardial effusion", "Coronary artery wall calcification", "Hiatal hernia",
      "Lymphadenopathy", "Emphysema", "Atelectasis", "Lung nodule", "Lung opacity",
      "Pulmonary fibrotic sequela", "Pleural effusion", "Mosaic attenuation pattern",
      "Peribronchial thickening", "Consolidation", "Bronchiectasis", "Interlobular septal thickening"
    ],
    input: { resolution: "Isotropic 3D Volume / Axial Slices", channels: "1 (HU Windowed)", format: "NIfTI (.nii, .nii.gz) or ZIP" },
    dataRequirements: [
      { label: "Modality", value: "Volumetric 3D Chest CT / Axial Slices" },
      { label: "Labels", value: "18 standard CT-RATE clinical findings" },
      { label: "Min. labeled studies", value: "10 per site" },
      { label: "Base Checkpoint", value: "CT-CLIP_v2.pt" },
      { label: "Provenance", value: "Pinata / IPFS Immutable CID" },
    ],
    preprocessing: [
      "HU windowing (Lung W:1500 L:-600 / Mediastinal W:350 L:40)",
      "Isotropic voxel spacing resampling",
      "Intensity standardization",
      "Local DP-SGD gradient masking",
    ],
    trainingSteps: [
      { title: "Stage CT dataset archive", detail: "Provide 3D NIfTI volumes (.nii, .nii.gz) or axial slice image archives in a .zip file." },
      { title: "Pre-flight validation", detail: "Verifies volumetric formats and scans internal study structures locally." },
      { title: "Load CT-CLIP foundation model", detail: "Loads immutable pretrained CT-CLIP_v2.pt checkpoint weights." },
      { title: "Local DP-SGD epochs", detail: "Fine-tunes 3D vision encoder on local hospital scanner volumes." },
      { title: "Pinata IPFS versioning", detail: "Trained candidate checkpoint is pinned to IPFS via Pinata with cryptographic SHA-256 proof." },
    ],
    baseAccuracy: 0.8840,
    targetAccuracy: 0.970,
    epsilonMax: 5.5,
    status: "training",
    minSamples: 10,
    accent: "sky",
    hospitals: [
      { id: "c1", name: "Charité Radiology", code: "SIE", region: "Berlin, DE", scanner: "Siemens SOMATOM", samples: 1800 },
      { id: "c2", name: "Toronto General", code: "GE", region: "Toronto, CA", scanner: "GE Revolution", samples: 1550 },
    ],
  },
  {
    id: "cmr-ai-vst",
    name: "CMR-AI Cardiac MRI CVD Diagnostic",
    shortName: "CMR-AI",
    modality: "Cardiac MRI",
    task: "11-Cardiovascular Disease Multi-class Diagnosis",
    summary: "Video Swin Transformer for screening and diagnosis of 11 cardiovascular diseases.",
    description:
      "Nature Medicine foundation model combining multi-view cine sequences (SAX, 4CH) to diagnose HCM, DCM, CAD, Myocarditis, Amyloidosis, and more. Hospital data stays strictly on-premises.",
    architecture: "Video Swin Transformer (SwinTransformer3D)",
    parameters: "88M",
    classes: [
      "HCM (Hypertrophic)", "DCM (Dilated)", "CAD (Coronary Artery)",
      "ARVC (Arrhythmogenic)", "PAH (Pulmonary Hypertension)", "Myocarditis",
      "RCM (Restrictive)", "Ebstein's Anomaly", "HHD (Hypertensive)", "CAM (Amyloidosis)", "LVNC"
    ],
    input: { resolution: "224 × 224 Cine Frames", channels: "Multi-view Temporal Series", format: "NIfTI (.nii, .nii.gz) or ZIP" },
    dataRequirements: [
      { label: "Modality", value: "Short-Axis (SAX) & 4-Chamber (4CH) Cine CMR" },
      { label: "Labels", value: "11-class CVD expert diagnosis" },
      { label: "Min. labeled studies", value: "10 per site" },
      { label: "Base Checkpoint", value: "swin_base_patch244_window877_kinetics600_22k.pth" },
      { label: "Provenance", value: "Pinata / IPFS Immutable CID" },
    ],
    preprocessing: [
      "Cine temporal frame alignment (25 frames per view)",
      "Heart ROI bounding box crop",
      "Dynamic intensity contrast standardization",
      "Differential privacy gradient clipping",
    ],
    trainingSteps: [
      { title: "Stage Cardiac MRI archive", detail: "Upload cardiac cine scans in .zip format containing SAX / 4CH NIfTI or DICOM studies." },
      { title: "Pre-flight validation", detail: "Scans cine series and verifies temporal frame structures locally." },
      { title: "Load CMR-AI base model", detail: "Loads immutable Video Swin Transformer checkpoint (swin_base_patch244_window877...)." },
      { title: "Local DP-SGD fine-tuning", detail: "Trains across 11 CVD classes with trust-aware consensus gating." },
      { title: "Pinata IPFS model publish", detail: "Pins approved model weights to IPFS via Pinata and registers SHA-256 provenance hash." },
    ],
    baseAccuracy: 0.8710,
    targetAccuracy: 0.968,
    epsilonMax: 5.0,
    status: "training",
    minSamples: 10,
    accent: "purple",
    hospitals: [
      { id: "m1", name: "Royal Brompton Heart", code: "SIE", region: "London, UK", scanner: "Siemens Magnetom", samples: 1400 },
      { id: "m2", name: "Cleveland Clinic Heart", code: "GE", region: "Cleveland, US", scanner: "GE Signa", samples: 1250 },
    ],
  },
  {
    id: "derma-lesion",
    name: "Skin Lesion Classifier",
    shortName: "DermaNet",
    modality: "Dermatoscopy",
    task: "7-class classification · Pigmented skin lesions",
    summary: "Dermatoscopic classification across seven common lesion types.",
    description:
      "Multi-class dermatoscopy model distinguishing melanoma from benign pigmented lesions. Federated training lets dermatology clinics pool rare-class signal without sharing patient photos.",
    architecture: "EfficientNet-B0",
    parameters: "5.3M",
    classes: ["Melanoma", "Melanocytic nevus", "Basal cell carcinoma", "Actinic keratosis", "Benign keratosis", "Dermatofibroma", "Vascular lesion"],
    input: { resolution: "224 × 224", channels: "3 (RGB)", format: "JPEG / PNG" },
    dataRequirements: [
      { label: "Modality", value: "Dermatoscope RGB images" },
      { label: "Labels", value: "Biopsy or expert-consensus lesion type" },
      { label: "Min. labeled images", value: "300 per site" },
      { label: "Color", value: "Calibrated color card recommended" },
      { label: "PHI", value: "Crop to lesion, strip EXIF/GPS" },
    ],
    preprocessing: [
      "Hair-artifact inpainting (DullRazor)",
      "Shades-of-gray color constancy",
      "Resize to 224×224, RGB normalize",
      "Class-balanced augmentation (rare lesions)",
    ],
    trainingSteps: [
      { title: "Stage lesion images", detail: "Organize by class folder or provide labels.csv. EXIF/GPS is stripped on import." },
      { title: "Color-normalize locally", detail: "Shades-of-gray constancy runs on-site to harmonize dermatoscope color casts." },
      { title: "Local DP-SGD epochs", detail: "Rare classes are oversampled locally; noise is added to protect per-patient signal." },
      { title: "Submit weight delta", detail: "Cosine-similarity screening rejects label-flipped or off-consensus updates." },
      { title: "Receive global checkpoint", detail: "Aggregated model improves rare-class recall for every participating clinic." },
    ],
    baseAccuracy: 0.702,
    targetAccuracy: 0.912,
    epsilonMax: 6.0,
    status: "recruiting",
    minSamples: 300,
    accent: "rose",
    hospitals: [
      { id: "d1", name: "Vienna Dermatology", code: "SIE", region: "Vienna, AT", scanner: "FotoFinder", samples: 720 },
      { id: "d2", name: "Sydney Skin Institute", code: "CAN", region: "Sydney, AU", scanner: "Canon EOS-derm", samples: 540 },
      { id: "d3", name: "UCSF Dermatology", code: "GE", region: "San Francisco, US", scanner: "DermLite", samples: 610 },
    ],
  },
  {
    id: "breast-us",
    name: "Breast Ultrasound Triage",
    shortName: "MammoSono",
    modality: "Breast Ultrasound",
    task: "Binary classification · Benign vs. Malignant",
    summary: "B-mode ultrasound triage for suspicious breast masses.",
    description:
      "Screens B-mode breast ultrasound for malignant masses. Federation is critical here because malignant examples are scarce at any single site.",
    architecture: "DenseNet-121",
    parameters: "7.0M",
    classes: ["Benign / Normal", "Malignant"],
    input: { resolution: "256 × 256", channels: "1 (grayscale)", format: "DICOM / PNG" },
    dataRequirements: [
      { label: "Modality", value: "B-mode breast ultrasound stills" },
      { label: "Labels", value: "Pathology-confirmed benign / malignant" },
      { label: "Min. labeled studies", value: "250 per site" },
      { label: "ROI", value: "Mass ROI mask preferred, not required" },
      { label: "PHI", value: "Burn-in text must be masked" },
    ],
    preprocessing: [
      "Detect and mask burned-in annotations",
      "Speckle-reduction filtering",
      "Resize to 256×256 grayscale",
      "Intensity normalization",
    ],
    trainingSteps: [
      { title: "Stage ultrasound stills", detail: "Provide PNG/DICOM with pathology labels. Burned-in PHI text is auto-masked on import." },
      { title: "Despeckle & normalize", detail: "Speckle reduction and intensity normalization run locally to reduce vendor variance." },
      { title: "Local DP-SGD epochs", detail: "Focal loss handles class imbalance; DP noise protects the rare malignant cases." },
      { title: "Submit weight delta", detail: "Multi-Krum + cosine screening protect the small-sample aggregate from poisoning." },
      { title: "Receive global checkpoint", detail: "Pooled malignant signal lifts sensitivity beyond any single site's ceiling." },
    ],
    baseAccuracy: 0.734,
    targetAccuracy: 0.898,
    epsilonMax: 5.0,
    status: "recruiting",
    minSamples: 250,
    accent: "violet",
    hospitals: [
      { id: "b1", name: "MD Anderson", code: "GE", region: "Houston, US", scanner: "GE LOGIQ", samples: 430 },
      { id: "b2", name: "Samsung Medical", code: "SAM", region: "Seoul, KR", scanner: "Samsung RS85", samples: 520 },
    ],
  },
  {
    id: "retina-dr",
    name: "Diabetic Retinopathy Grader",
    shortName: "RetinaGrade",
    modality: "Retinal Fundus",
    task: "5-class ordinal grading · DR severity",
    summary: "Fundus photograph grading of diabetic retinopathy severity.",
    description:
      "Grades diabetic retinopathy from color fundus photographs on the standard 0–4 severity scale. Federated across screening programs to cover diverse populations and cameras.",
    architecture: "Inception-v3",
    parameters: "23.8M",
    classes: ["No DR", "Mild", "Moderate", "Severe", "Proliferative"],
    input: { resolution: "299 × 299", channels: "3 (RGB)", format: "JPEG / PNG" },
    dataRequirements: [
      { label: "Modality", value: "Color fundus photographs (45° field)" },
      { label: "Labels", value: "Grader-adjudicated 0–4 severity" },
      { label: "Min. labeled images", value: "800 per site" },
      { label: "Quality", value: "Gradable images (reject blur/artifact)" },
      { label: "PHI", value: "De-identify, remove overlay text" },
    ],
    preprocessing: [
      "Circular retina crop + black-border removal",
      "Ben Graham color normalization",
      "Resize to 299×299",
      "Quality gate (reject ungradable)",
    ],
    trainingSteps: [
      { title: "Stage fundus images", detail: "Provide graded images; the quality gate rejects ungradable frames locally." },
      { title: "Normalize illumination", detail: "Ben Graham normalization harmonizes camera and lighting differences on-site." },
      { title: "Local DP-SGD epochs", detail: "Ordinal loss respects severity ordering; DP noise bounds per-patient leakage." },
      { title: "Submit weight delta", detail: "Screened against consensus before it can influence the global grader." },
      { title: "Receive global checkpoint", detail: "Cross-population training reduces camera and demographic bias." },
    ],
    baseAccuracy: 0.688,
    targetAccuracy: 0.889,
    epsilonMax: 6.5,
    status: "training",
    minSamples: 800,
    accent: "amber",
    hospitals: [
      { id: "r1", name: "Aravind Eye Care", code: "CAN", region: "Madurai, IN", scanner: "Canon CR-2", samples: 2100 },
      { id: "r2", name: "Moorfields Eye", code: "TOP", region: "London, UK", scanner: "Topcon TRC", samples: 1450 },
      { id: "r3", name: "Joslin Diabetes", code: "ZEI", region: "Boston, US", scanner: "Zeiss Visucam", samples: 980 },
    ],
  },
  {
    id: "blood-cell",
    name: "Blood Cell Classifier",
    shortName: "HemaNet",
    modality: "Blood Microscopy",
    task: "8-class classification · Peripheral blood cells",
    summary: "Microscopy classification of peripheral blood cell types.",
    description:
      "Classifies individual peripheral blood cells into eight types from stained microscopy crops, assisting automated differential counts across hematology labs.",
    architecture: "MobileNetV3-Large",
    parameters: "5.4M",
    classes: ["Neutrophil", "Eosinophil", "Basophil", "Lymphocyte", "Monocyte", "Immature granulocyte", "Erythroblast", "Platelet"],
    input: { resolution: "128 × 128", channels: "3 (RGB)", format: "PNG / TIFF" },
    dataRequirements: [
      { label: "Modality", value: "Single-cell microscopy crops" },
      { label: "Stain", value: "May-Grünwald–Giemsa preferred" },
      { label: "Min. labeled cells", value: "1,000 per site" },
      { label: "Magnification", value: "100× oil immersion" },
      { label: "PHI", value: "Slide-level de-identification" },
    ],
    preprocessing: [
      "Single-cell segmentation / crop",
      "Stain color normalization (Macenko)",
      "Resize to 128×128 RGB",
      "Per-channel normalization",
    ],
    trainingSteps: [
      { title: "Stage cell crops", detail: "Provide single-cell crops with type labels or a labels.csv manifest." },
      { title: "Stain-normalize locally", detail: "Macenko normalization harmonizes staining protocols between labs." },
      { title: "Local DP-SGD epochs", detail: "Balanced sampling across eight classes; DP noise protects slide provenance." },
      { title: "Submit weight delta", detail: "Byzantine screening rejects mislabeled or adversarial batches." },
      { title: "Receive global checkpoint", detail: "Shared model generalizes across stains, scanners, and labs." },
    ],
    baseAccuracy: 0.812,
    targetAccuracy: 0.973,
    epsilonMax: 4.5,
    status: "converged",
    minSamples: 1000,
    accent: "emerald",
    hospitals: [
      { id: "c1", name: "Hospital Clínic BCN", code: "OLY", region: "Barcelona, ES", scanner: "Olympus BX", samples: 3200 },
      { id: "c2", name: "Karolinska Hema", code: "ZEI", region: "Stockholm, SE", scanner: "Zeiss Axio", samples: 2750 },
      { id: "c3", name: "Mayo Clinic Lab", code: "LEI", region: "Rochester, US", scanner: "Leica DM", samples: 4100 },
    ],
  },
  {
    id: "organ-ct",
    name: "Abdominal Organ Classifier",
    shortName: "OrganNet",
    modality: "Abdominal CT",
    task: "11-class classification · Abdominal organs",
    summary: "Axial CT slice classification across eleven abdominal organs.",
    description:
      "Identifies which abdominal organ is centered in an axial CT slice, a building block for downstream segmentation and retrieval pipelines across radiology departments.",
    architecture: "ResNet-34",
    parameters: "21.3M",
    classes: ["Liver", "Kidney-R", "Kidney-L", "Spleen", "Pancreas", "Gallbladder", "Bladder", "Femur-L", "Femur-R", "Heart", "Lung"],
    input: { resolution: "224 × 224", channels: "1 (grayscale)", format: "DICOM / NIfTI" },
    dataRequirements: [
      { label: "Modality", value: "Axial abdominal CT slices" },
      { label: "Labels", value: "Organ-of-interest per slice" },
      { label: "Min. labeled slices", value: "1,500 per site" },
      { label: "Window", value: "Provide HU window metadata" },
      { label: "PHI", value: "Strip DICOM headers on export" },
    ],
    preprocessing: [
      "Apply abdominal HU window (W:400 L:40)",
      "Resample to isotropic spacing",
      "Resize to 224×224 grayscale",
      "Standardize intensities",
    ],
    trainingSteps: [
      { title: "Stage CT slices", detail: "Export de-identified slices with organ labels; DICOM headers are stripped on import." },
      { title: "Window & resample", detail: "HU windowing and isotropic resampling run locally for scanner harmonization." },
      { title: "Local DP-SGD epochs", detail: "FedBN keeps per-site batch-norm stats local to absorb scanner domain shift." },
      { title: "Submit weight delta", detail: "Screened deltas aggregate; batch-norm params stay on-site (FedBN)." },
      { title: "Receive global checkpoint", detail: "Shared backbone with site-local norm layers handles vendor variance." },
    ],
    baseAccuracy: 0.756,
    targetAccuracy: 0.941,
    epsilonMax: 5.5,
    status: "recruiting",
    minSamples: 1500,
    accent: "sky",
    hospitals: [
      { id: "o1", name: "Charité Radiology", code: "SIE", region: "Berlin, DE", scanner: "Siemens SOMATOM", samples: 1800 },
      { id: "o2", name: "Toronto General", code: "GE", region: "Toronto, CA", scanner: "GE Revolution", samples: 1550 },
    ],
  },
];

export function getModel(id: string): ModelDefinition | undefined {
  return MODELS.find((m) => m.id === id);
}
