import os
import json
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "triage_xgb.json")

# Emergency Severity Index (ESI) mapping
# 0: RED (Immediate)
# 1: ORANGE (High risk, <10 mins)
# 2: YELLOW (Urgent, 1 hour)
# 3: GREEN (Less urgent, 2 hours)
# 4: BLUE (Non-urgent, 4 hours)

def generate_synthetic_data(num_samples=2000):
    """
    Generate synthetic triage data based on vital signs.
    """
    np.random.seed(42)
    data = []
    
    for _ in range(num_samples):
        hr = int(np.random.normal(80, 20))
        sys_bp = int(np.random.normal(120, 25))
        dia_bp = int(np.random.normal(80, 15))
        spo2 = int(np.random.randint(85, 100))
        temp = round(np.random.normal(98.6, 1.5), 1)
        
        priority = 4 # Default BLUE
        
        # RED (Life-threatening)
        if hr > 150 or hr < 40 or sys_bp < 80 or spo2 < 90 or temp > 105:
            priority = 0
        # ORANGE (High Risk)
        elif (130 < hr <= 150) or (40 <= hr < 50) or (80 <= sys_bp < 90) or (200 < sys_bp) or (90 <= spo2 < 94) or temp > 103:
            priority = 1
        # YELLOW (Urgent)
        elif (110 < hr <= 130) or (50 <= hr < 60) or (90 <= sys_bp < 100) or (160 < sys_bp <= 200) or (94 <= spo2 < 96) or temp > 100.4:
            priority = 2
        # GREEN (Less urgent)
        elif (100 < hr <= 110) or (sys_bp > 140) or temp > 99.5:
            priority = 3
            
        data.append({
            'heart_rate': hr,
            'systolic_bp': sys_bp,
            'diastolic_bp': dia_bp,
            'spo2': spo2,
            'temperature': temp,
            'priority': priority
        })
        
    df = pd.DataFrame(data)
    os.makedirs(MODEL_DIR, exist_ok=True)
    df.to_csv(os.path.join(MODEL_DIR, "synthetic_triage_data.csv"), index=False)
    return df

def train_triage_model(force_retrain=False):
    """
    Train the XGBoost model if it doesn't exist, or if force_retrain is True.
    """
    if os.path.exists(MODEL_PATH) and not force_retrain:
        return True
        
    df = generate_synthetic_data()
    X = df[['heart_rate', 'systolic_bp', 'diastolic_bp', 'spo2', 'temperature']]
    y = df['priority']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = xgb.XGBClassifier(
        objective='multi:softprob',
        num_class=5,
        max_depth=4,
        learning_rate=0.1,
        n_estimators=100,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    os.makedirs(MODEL_DIR, exist_ok=True)
    model.save_model(MODEL_PATH)
    return True

_model = None

def _load_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            train_triage_model()
            
        _model = xgb.XGBClassifier()
        _model.load_model(MODEL_PATH)
    return _model

def extract_vital_number(vital_str, default_val=None):
    if not vital_str or vital_str == "-":
        return default_val
    import re
    match = re.search(r'\d+(\.\d+)?', str(vital_str))
    if match:
        return float(match.group())
    return default_val

def predict_priority(vitals_dict=None, **kwargs):
    """
    Predict triage priority given a dictionary of vitals or keyword parameters.
    Returns: (priority_label: str, confidence_score: int)
    """
    try:
        model = _load_model()
        
        params = vitals_dict if isinstance(vitals_dict, dict) else {}
        params.update(kwargs)

        hr_raw = params.get('heart_rate', params.get('hr', 80))
        hr = extract_vital_number(hr_raw, 80)

        sys_bp = 120
        dia_bp = 80
        if 'systolic_bp' in params and 'diastolic_bp' in params:
            sys_bp = float(params.get('systolic_bp') or 120)
            dia_bp = float(params.get('diastolic_bp') or 80)
        else:
            bp_str = params.get('bp', '120/80')
            if '/' in str(bp_str):
                parts = str(bp_str).split('/')
                sys_bp = extract_vital_number(parts[0], 120)
                dia_bp = extract_vital_number(parts[1], 80)
            else:
                sys_bp = extract_vital_number(bp_str, 120)

        spo2_raw = params.get('spo2', 98)
        spo2 = extract_vital_number(spo2_raw, 98)

        temp_raw = params.get('temp_celsius', params.get('temp', 98.6))
        temp = extract_vital_number(temp_raw, 98.6)
        # Convert C to F if input looks like Celsius (< 45)
        if temp and temp < 45.0:
            temp = (temp * 9.0 / 5.0) + 32.0

        # Validate physiological bounds
        hr = max(20.0, min(250.0, float(hr)))
        sys_bp = max(40.0, min(260.0, float(sys_bp)))
        dia_bp = max(20.0, min(160.0, float(dia_bp)))
        spo2 = max(50.0, min(100.0, float(spo2)))
        temp = max(90.0, min(110.0, float(temp)))

        input_data = pd.DataFrame([{
            'heart_rate': hr,
            'systolic_bp': sys_bp,
            'diastolic_bp': dia_bp,
            'spo2': spo2,
            'temperature': temp
        }])

        booster = model.get_booster()
        probs = booster.predict(xgb.DMatrix(input_data))[0]
        max_prob_idx = int(np.argmax(probs))
        confidence = int(probs[max_prob_idx] * 100)

        priority_map = {0: "RED", 1: "ORANGE", 2: "YELLOW", 3: "GREEN", 4: "BLUE"}
        priority_label = priority_map.get(max_prob_idx, "BLUE")

        # Urgency override if severe symptoms mentioned in chief_complaint
        chief_complaint = str(params.get('chief_complaint', '')).lower()
        if any(term in chief_complaint for term in ['chest pain', 'unconscious', 'cardiac arrest', 'severe bleeding', 'not breathing']):
            if priority_label not in ("RED", "ORANGE"):
                priority_label = "RED"
                confidence = max(confidence, 90)

        return priority_label, confidence

    except Exception as e:
        print(f"⚠️ Error running XGBoost prediction: {e}")
        return "YELLOW", 50
