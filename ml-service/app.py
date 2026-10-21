import os
import re
import json
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "best_model.joblib")
METRICS_PATH = os.path.join(BASE_DIR, "evaluation_metrics.json")

PRIORITY_MAP = {
    "Physical Assault": "CRITICAL",
    "Stalking/Following": "CRITICAL",
    "Kidnapping/Detainment": "CRITICAL",
    "Harassment": "STANDARD",
    "Theft/Snatching": "HIGH",
    "Medical Emergency": "MEDIUM",
    "Unsafe Environment": "MEDIUM",
    "False Alarm": "LOW",
    "Other": "LOW"
}

model_bundle = None
avg_svm_coef = None
feature_names = None

def load_model():
    global model_bundle, avg_svm_coef, feature_names
    if os.path.exists(MODEL_PATH):
        try:
            model_bundle = joblib.load(MODEL_PATH)
            clf = model_bundle.get("classifier")
            vec = model_bundle.get("vectorizer")
            
            if hasattr(clf, "calibrated_classifiers_"):
                estimators = [c.estimator for c in clf.calibrated_classifiers_]
                avg_svm_coef = np.mean([e.coef_ for e in estimators], axis=0)
            elif hasattr(clf, "coef_"):
                avg_svm_coef = clf.coef_
                
            if vec is not None:
                feature_names = vec.get_feature_names_out()
                
            print(f"[ML Service] Loaded model: {model_bundle.get('model_name', 'Unknown')}")
            print(f"[ML Service] XAI Attribution Engine initialized ({len(feature_names) if feature_names is not None else 0} features).")
        except Exception as e:
            print(f"[ML Service] Error loading model: {e}")
            model_bundle = None
    else:
        print("[ML Service] Model bundle not found. Run train.py first.")

load_model()

def clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

KEYWORD_RULES = [
    (r"\b(hit\w*|beat\w*|attack\w*|knife|gun|chok\w*|grab\w*|drag\w*|punch\w*|blood\w*|weapon|strangle\w*|chaku|mara|peet|dhamki|dande|hamla)\b", "Physical Assault"),
    (r"\b(follow\w*|stalk\w*|trail\w*|creepy|shadow\w*|track\w*|watching me|peecha|piche|chup|kheench|chalta)\b", "Stalking/Following"),
    (r"\b(kidnap\w*|abduct\w*|child lock|locked|detain\w*|hostage|wrong route|jungle|band kar diya|wont let me out|gaadi nahi rok)\b", "Kidnapping/Detainment"),
    (r"\b(harass\w*|catcall\w*|vulgar|indecent|lewd|touch\w*|obscene|flash\w*|abuse\w*|badtameez|chheda|gaaliyan|eve teasing)\b", "Harassment"),
    (r"\b(snatch\w*|purse|chain|robber\w*|mugger|stole|cheen\w*|loot\w*|jhapatt|wallet|phone)\b", "Theft/Snatching"),
    (r"\b(breath\w*|chest|faint\w*|unconscious|pain|seizure|heart|bleed\w*|injur\w*|ambulance|collaps\w*|asthma|chakkar|behosh|khoon|dard|saans)\b", "Medical Emergency"),
    (r"\b(streetlight\w*|pitch dark|dark street|stray dog\w*|broken light\w*|deserted|isolated road|andhera|sunsaan|sharaabi)\b", "Unsafe Environment"),
    (r"\b(false alarm|mistake|accident\w*|test\w*|cancel alert|ignore alert|safe now|galti se|all good)\b", "False Alarm"),
]

def rule_based_classify(text: str):
    cleaned = clean_text(text)
    matched_tokens = []
    for pattern, cat in KEYWORD_RULES:
        matches = re.findall(pattern, cleaned)
        if matches:
            matched_tokens.extend(matches)
            return cat, 0.88, matched_tokens
    return "Other", 0.60, ["general_context"]

def compute_xai_attribution(vec_csr, pred_class, classes):
    """
    Computes exact linear decision function feature attribution (XAI)
    Contribution = W[c, j] * X[0, j]
    """
    if avg_svm_coef is None or feature_names is None:
        return []
        
    try:
        class_idx = classes.index(pred_class)
        row = vec_csr.tocoo()
        contributions = []
        for col, val in zip(row.col, row.data):
            weight = float(avg_svm_coef[class_idx, col])
            contrib = weight * float(val)
            if contrib > 0:
                contributions.append({
                    "token": str(feature_names[col]),
                    "importance": round(contrib, 4),
                    "coefficient": round(weight, 4)
                })
        contributions.sort(key=lambda x: x["importance"], reverse=True)
        return contributions[:6]
    except Exception as e:
        print(f"XAI attribution calculation error: {e}")
        return []

def compute_multimodal_score(nlp_threat_prob, motion_mag=0.0, acoustic_stress=0.0, zone_risk=50.0, bpm=75.0):
    """
    Fuses multimodal contextual inputs into an Explainable Threat Score (0 - 100)
    per ShaktiSense patent architecture.
    """
    # 1. Motion anomaly (g-force above gravity threshold)
    s_motion = min(1.0, max(0.0, (float(motion_mag) - 1.0) / 1.5)) if motion_mag > 1.0 else 0.0
    
    # 2. Acoustic stress (0.0 to 1.0)
    s_acoustic = min(1.0, max(0.0, float(acoustic_stress)))
    
    # 3. Zone danger (0.0 to 1.0)
    s_zone = min(1.0, max(0.0, float(zone_risk) / 100.0))
    
    # 4. Physiological heart rate spike
    s_heart = min(1.0, max(0.0, (float(bpm) - 80.0) / 60.0)) if bpm > 85.0 else 0.0
    
    # Fused threat calculation (weighted sum)
    fused = 100.0 * (
        0.40 * float(nlp_threat_prob) +
        0.25 * s_motion +
        0.15 * s_acoustic +
        0.15 * s_zone +
        0.05 * s_heart
    )
    fused_score = round(min(100.0, max(0.0, fused)), 1)
    
    if fused_score >= 70.0:
        risk_level = "HIGH_RISK"
        action = "AUTOMATIC_CONDITION_ALERT"
    elif fused_score >= 45.0:
        risk_level = "MEDIUM_RISK"
        action = "PROACTIVE_USER_CONFIRMATION"
    else:
        risk_level = "LOW_RISK"
        action = "MONITORING_SAFE"
        
    return {
        "fused_threat_score": fused_score,
        "risk_level": risk_level,
        "proactive_action": action,
        "weights": {
            "nlp_threat_weight": 0.40,
            "motion_weight": 0.25,
            "acoustic_weight": 0.15,
            "zone_weight": 0.15,
            "physiological_weight": 0.05
        },
        "indicators": {
            "nlp_threat_prob": round(float(nlp_threat_prob), 2),
            "motion_anomaly_score": round(s_motion, 2),
            "acoustic_stress_score": round(s_acoustic, 2),
            "zone_risk_score": round(s_zone, 2),
            "heart_rate_spike_score": round(s_heart, 2)
        }
    }

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "ShaktiSense Multimodal AI & NLP Classifier",
        "xai_engine_ready": avg_svm_coef is not None,
        "model_loaded": model_bundle is not None,
        "model_name": model_bundle.get("model_name") if model_bundle else "Fallback Rule Engine"
    })

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    motion_mag = float(data.get("motion_magnitude", 0.0))
    acoustic_stress = float(data.get("acoustic_stress", 0.0))
    zone_risk = float(data.get("zone_risk", 50.0))
    bpm = float(data.get("heart_rate_bpm", 75.0))

    if not text:
        multimodal = compute_multimodal_score(0.20, motion_mag, acoustic_stress, zone_risk, bpm)
        return jsonify({
            "category": "Other",
            "confidence": 0.5,
            "priority": "LOW" if multimodal["risk_level"] == "LOW_RISK" else "HIGH",
            "model_used": "Default / Multimodal Sensor Fusion",
            "explanation": "No text description provided. Multimodal telemetry evaluated.",
            "xai_explanation": {
                "method": "Sensor-only Heuristic",
                "contributing_tokens": [],
                "rationale": "Evaluation driven by ambient location risk and device sensors."
            },
            "multimodal_assessment": multimodal
        })

    cleaned = clean_text(text)

    if model_bundle and "vectorizer" in model_bundle and "classifier" in model_bundle:
        try:
            vec = model_bundle["vectorizer"].transform([cleaned])
            clf = model_bundle["classifier"]
            
            # Predict category
            pred = clf.predict(vec)[0]
            classes = list(clf.classes_)
            
            # Probability / confidence
            if hasattr(clf, "predict_proba"):
                probs = clf.predict_proba(vec)[0]
                conf = float(probs[classes.index(pred)])
            else:
                conf = 0.92

            priority = PRIORITY_MAP.get(pred, "STANDARD")

            # Explainable AI (XAI) Attribution
            xai_tokens = compute_xai_attribution(vec, pred, classes)
            if xai_tokens:
                token_names = [f"'{t['token']}' (+{t['importance']})" for t in xai_tokens[:3]]
                rationale = f"Categorized as {pred} ({round(conf*100, 1)}% confidence) driven by decisive risk tokens: {', '.join(token_names)}."
            else:
                rationale = f"Categorized as {pred} based on high-dimensional text semantic similarity."

            # Multimodal fusion threat calculation
            threat_scale = 1.0 if priority == "CRITICAL" else 0.7 if priority == "HIGH" else 0.4 if priority == "MEDIUM" else 0.2
            nlp_threat_prob = conf * threat_scale
            multimodal = compute_multimodal_score(nlp_threat_prob, motion_mag, acoustic_stress, zone_risk, bpm)

            return jsonify({
                "category": pred,
                "confidence": round(conf, 4),
                "priority": priority,
                "model_used": model_bundle.get("model_name", "Linear SVM (Calibrated)"),
                "cleaned_text": cleaned,
                "xai_explanation": {
                    "method": "Linear Decision Attribution (SVM Weights)",
                    "contributing_tokens": xai_tokens,
                    "rationale": rationale
                },
                "multimodal_assessment": multimodal
            })
        except Exception as e:
            print(f"Error during ML inference: {e}")

    # Fallback to rule engine with XAI details
    cat, conf, matches = rule_based_classify(text)
    prio = PRIORITY_MAP.get(cat, "STANDARD")
    threat_scale = 1.0 if prio == "CRITICAL" else 0.7 if prio == "HIGH" else 0.4 if prio == "MEDIUM" else 0.2
    multimodal = compute_multimodal_score(conf * threat_scale, motion_mag, acoustic_stress, zone_risk, bpm)
    
    return jsonify({
        "category": cat,
        "confidence": round(conf, 4),
        "priority": prio,
        "model_used": "Heuristic Rule Engine (Fallback)",
        "cleaned_text": cleaned,
        "xai_explanation": {
            "method": "Exact Keyword Pattern Match",
            "contributing_tokens": [{"token": m, "importance": 0.88, "coefficient": 1.0} for m in matches],
            "rationale": f"Matched critical safety regex keywords: {', '.join(matches)}."
        },
        "multimodal_assessment": multimodal
    })

@app.route("/metrics", methods=["GET"])
def get_metrics():
    if os.path.exists(METRICS_PATH):
        try:
            with open(METRICS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            return jsonify(data)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Metrics not generated yet. Run train.py."}), 404

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    print(f"Starting ShaktiSense Multimodal AI & NLP service on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)

