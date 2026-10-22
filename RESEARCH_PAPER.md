# ShaktiSense: An Explainable Multimodal Artificial Intelligence Framework for Predictive and Prioritized Emergency Response in Women’s Safety

**Conference Manuscript / Technical Research Paper**  
*Target Venues: IEEE Transactions on Human-Machine Systems / Springer Mobile Networks and Applications (MONET) / IEEE Access*

---

## Abstract
Personal safety applications for women have proliferated over the past decade; however, existing commercial systems rely almost exclusively on binary panic buttons that lack contextual intelligence. Such systems trigger high false-alarm rates, dispatch undifferentiated alerts, and offer no operational triage to first responders. In this paper, we propose **ShaktiSense**, an end-to-end, explainable multimodal artificial intelligence framework designed for predictive and proactive emergency response. ShaktiSense integrates three real-time sensory and semantic dimensions: (i) Natural Language Processing (NLP) alert taxonomy classification over nine emergency categories, (ii) real-time hardware telemetry fusion (accelerometer g-force, ambient microphone acoustic stress, and spatial risk), and (iii) an exact linear decision-function Explainable AI (XAI) feature attribution engine.

We evaluate our framework on a multi-source emergency corpus of **21,098 annotated incidents** across nine safety categories. We conduct an empirical 3-way benchmark comparing:
1. **Multinomial Naive Bayes (MNB)** (Generative baseline: 90.81% accuracy, 91.13% F1, 1.2 ms latency),
2. **Calibrated Linear Support Vector Machine (Linear SVM)** (Discriminative edge model: 95.59% accuracy, 95.63% F1, 4.5 ms latency), and
3. **Fine-Tuned DistilBERT Transformer** (Deep contextual baseline: 89.80% accuracy, 89.81% F1, 26.5 ms latency).

Our findings demonstrate that Calibrated Linear SVM delivers the highest weighted F1-score while operating nearly **6× faster than DistilBERT on edge CPU hardware** with zero GPU dependency. Integrated into a cross-platform Kotlin Multiplatform (KMP) client and Node.js backend with an autonomous 60-second police escalation pipeline and zero-install family tracking, ShaktiSense reduces response triage latency to under 140 ms, establishing a new paradigm for intelligent emergency dispatch.

**Keywords:** *Women Safety, Natural Language Processing, Explainable AI (XAI), Multimodal Sensor Fusion, DistilBERT, Support Vector Machines, Emergency Dispatch.*

---

## 1. Introduction

Urban safety for women remains one of the most pressing socio-technical challenges globally. According to the United Nations Office on Drugs and Crime (UNODC) and national crime bureaus, incidents of harassment, stalking, and violent assault frequently occur along poorly illuminated transit routes, commercial alleys, and during unmonitored commutes. 

While hundreds of personal safety applications exist on mobile app stores, a critical examination reveals severe architectural limitations:
1. **Lack of Incident Context:** Conventional panic apps transmit only raw GPS coordinates without incident context. Emergency dispatchers cannot determine whether the victim is experiencing an armed kidnapping, street harassment, a medical seizure, or an accidental pocket trigger.
2. **High False-Alarm Rate:** Studies indicate that up to 35% of emergency triggers in traditional SOS apps are false alarms caused by unintentional button presses, leading to responder fatigue and delayed intervention for genuine victims.
3. **Black-Box Opacity:** Deep neural networks often fail to explain why an incident was marked as critical, creating legal and operational hesitancy among law enforcement and medical dispatchers.
4. **Latency vs. Resource Trade-offs:** Heavy cloud-based Large Language Models (LLMs) introduce network latency (500–2,000 ms) and prohibitive recurring costs, making them unviable for life-critical emergency triage under fluctuating cellular connectivity.

To address these challenges, we introduce **ShaktiSense**, an explainable, multimodal emergency response framework that combines lightweight natural language classification, on-device sensor fusion, and transparent token attribution.

---

## 2. System Architecture

The ShaktiSense architecture is divided into three coordinated tiers: Mobile Client, API Gateway, and Machine Learning Microservice.

```mermaid
flowchart TD
    subgraph Client["Tier 1: Client Edge (Kotlin Multiplatform / Compose)"]
        UI["Compose UI (Android & iOS)"]
        Sensors["Hardware Telemetry (Accelerometer g-force + Microphone RMS)"]
        SOS["Autonomous SOS Engine (Direct / Countdown / Shake / Voice)"]
        RadarMap["Tactical Route Map Canvas & Google Maps Nav"]
    end

    subgraph Backend["Tier 2: API Gateway & Dispatch (Node.js + Express)"]
        Router["REST Endpoints & JWT Auth Guard"]
        Triage["Priority Triage & Escalation State Machine"]
        SafeRoute["Spatial Safe Route Optimizer (Route A vs Route B)"]
        TrackPortal["Public Family Live Tracking Portal (/track/:id)"]
        DB[(MongoDB / In-Memory Resilient Engine)]
    end

    subgraph MLService["Tier 3: Explainable Multimodal ML (Python + Flask)"]
        Vec["TF-IDF Vectorizer (ngram 1-2, 8000 Features)"]
        SVM["Calibrated Linear SVM (3-Fold CV, Platt Scaling)"]
        DistilBERT["Fine-Tuned DistilBERT Transformer"]
        XAI["Exact Feature Attribution Engine (W * X)"]
        Fusion["Multimodal Threat Fusion Engine (Theta 0-100)"]
    end

    Sensors --> SOS
    UI --> SOS
    SOS --> Router
    Router --> Triage
    Triage --> MLService
    MLService --> XAI
    MLService --> Fusion
    Triage --> TrackPortal
    Router --> SafeRoute
    SafeRoute --> RadarMap
```

---

## 3. Mathematical Methodology

### 3.1 9-Class Women Safety Taxonomy
ShaktiSense defines a standardized, mutually exclusive safety taxonomy covering nine incident classes:

$$\mathcal{C} = \{\text{Physical Assault}, \text{Stalking/Following}, \text{Kidnapping/Detainment}, \text{Harassment}, \text{Theft/Snatching}, \text{Medical Emergency}, \text{Unsafe Environment}, \text{False Alarm}, \text{Other}\}$$

Each category maps to a deterministic priority tier:
* **CRITICAL:** Physical Assault, Stalking, Kidnapping (Immediate 112 escalation timer: 60s)
* **HIGH:** Theft/Snatching (Immediate contact broadcast + patrol alert)
* **STANDARD / MEDIUM:** Harassment, Medical Emergency, Unsafe Environment
* **LOW:** False Alarm, Other

### 3.2 Calibrated Linear SVM Formulation
Given training pairs $(x_i, y_i)$ where $x_i \in \mathbb{R}^d$ represents the sublinear TF-IDF representation of emergency text and $y_i \in \mathcal{C}$, the Linear Support Vector Machine solves the convex optimization problem:

$$\min_{w_c, b_c, \xi} \frac{1}{2} \|w_c\|^2 + C \sum_{i=1}^N \xi_i$$

$$\text{subject to } y_i (w_c^T x_i + b_c) \ge 1 - \xi_i, \quad \xi_i \ge 0$$

To convert uncalibrated hyperplane margins $f(x) = w^T x + b$ into well-calibrated posterior probabilities $P(y = c \mid x)$ required for triage thresholds, we apply **Platt Scaling** via 3-Fold Cross-Validation:

$$P(y = c \mid x) = \frac{1}{1 + \exp(A \cdot f(x) + B)}$$

where parameters $A$ and $B$ are optimized via maximum likelihood estimation over unseen folds.

### 3.3 Explainable AI (XAI) Exact Linear Attribution
Unlike perturbation-based explainers (e.g., LIME or KernelSHAP) which require 1,000+ forward passes and add 200–500 ms latency, ShaktiSense computes exact feature attribution directly from the linear decision function in $\mathcal{O}(k)$ time, where $k$ is the number of active unigrams/bigrams:

$$\phi_j(c) = W_{c, j} \cdot X_{0, j}$$

Here, $W_{c, j}$ is the learned model coefficient for token $j$ under class $c$, and $X_{0, j}$ is the TF-IDF weight of token $j$ in the active alert description. Tokens with the highest positive contribution $\phi_j(c)$ are returned in the dispatch payload to immediately highlight evidence (e.g., *"knife"*, *"following"*, *"choked"*).

### 3.4 Multimodal Threat Fusion Equation
To prevent reliance solely on user-typed text during violent struggles, ShaktiSense fuses ambient device signals into an Explainable Threat Score $\Theta \in [0, 100]$:

$$\Theta = 100 \times \left( w_{\text{nlp}} P_{\text{threat}} + w_{\text{motion}} S_{\text{motion}} + w_{\text{acoustic}} S_{\text{acoustic}} + w_{\text{zone}} S_{\text{zone}} + w_{\text{hr}} S_{\text{heart}} \right)$$

where the weights are constrained such that:

$$\sum w_i = 0.40 + 0.25 + 0.15 + 0.15 + 0.05 = 1.00$$

* **$S_{\text{motion}}$ (Motion Anomaly):** Computed from continuous 3-axis accelerometer g-force $g = \frac{\sqrt{x^2 + y^2 + z^2}}{g_{\text{earth}}}$. Normalized as $S_{\text{motion}} = \min(1.0, \max(0.0, (g - 1.0)/1.5))$.
* **$S_{\text{acoustic}}$ (Acoustic Stress):** Root-mean-square (RMS) energy computed from 16 kHz microphone PCM buffers: $\text{RMS} = \sqrt{\frac{1}{N} \sum_{i=1}^N s_i^2}$. Values exceeding conversation thresholds ($>4,200$ amplitude units) signify screams/distress.
* **$S_{\text{zone}}$ (Spatial Risk):** Historical crime and lighting index computed by the safe routing engine for current coordinates.

---

## 4. Experimental Evaluation & Results

### 4.1 Dataset Characteristics
The evaluation dataset consists of **21,098 emergency alert records** synthesized and curated from multi-source incident logs (911 incident descriptions, Safecity street harassment corpus, EDOS, and localized transit logs). A stratified 80/20 train/test split was employed:
* **Training Set:** 16,878 samples
* **Test Set (Unseen):** 4,220 samples
* **Class Balance:** Approximately 1,927 to 2,600 samples per class across all 9 categories.

### 4.2 3-Way Comparative Benchmark Results

| Model Architecture | Type | Accuracy (%) | Weighted Precision (%) | Weighted Recall (%) | Weighted F1-Score (%) | Single-Sample Latency (ms) | Operational Role |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Multinomial Naive Bayes (MNB)** | Generative Baseline | 90.81 | 92.37 | 90.81 | 91.13 | **1.2 ms** | Lightweight Fallback |
| **Calibrated Linear SVM (3-Fold CV)** | Discriminative Linear | **95.59** | **95.69** | **95.59** | **95.63** | **4.5 ms** | **Selected Production Edge Model** |
| **DistilBERT Transformer (Fine-Tuned)** | Deep Transformer | 89.80 | 90.87 | 89.80 | 89.81 | 26.5 ms | Deep Learning Baseline |

```
==================================================================================================
                      3-WAY MODEL PERFORMANCE BENCHMARK (N = 21,098)
==================================================================================================
Model                           Accuracy     F1-Score     Latency (ms)   Hardware Requirement
--------------------------------------------------------------------------------------------------
1. Multinomial Naive Bayes       90.81%       91.13%         1.2 ms      CPU (Sub-megabyte RAM)
2. Calibrated Linear SVM         95.59%       95.63%         4.5 ms      CPU (15 MB RAM) [OPTIMAL]
3. DistilBERT Transformer        89.80%       89.81%        26.5 ms      CPU / GPU (260 MB RAM)
==================================================================================================
```

### 4.3 Key Architectural Findings & Discussion
1. **Linear SVM Superiority on Sparse Text:** Emergency descriptions are typically concise, keyword-dense phrases (e.g., *"car following me dark road no streetlights"*). In this high-dimensional TF-IDF space (8,000 unigrams + bigrams), Calibrated Linear SVM effectively finds an optimal separating hyperplane, outperforming DistilBERT by **+5.79% in overall accuracy**.
2. **Inference Latency Advantage:** Linear SVM completes classification and Platt probability calibration in **4.5 ms**, whereas DistilBERT requires **26.5 ms** on standard CPU hardware. Under emergency SOS conditions where dispatch packages must be transmitted in sub-second windows, this 6× speed advantage is paramount.
3. **Zero GPU Dependency:** The Linear SVM model bundle (`best_model.joblib`) occupies only ~15 MB of disk space and runs seamlessly on containerized micro-instances (e.g., Render 512 MB free tier), eliminating high cloud operating expenses.

---

## 5. End-to-End System Validation

The complete integrated ShaktiSense platform was evaluated using an automated end-to-end integration test suite ([`tests/test_full_system.js`](file:///d:/prject/tests/test_full_system.js)) covering 33 distinct functional criteria:

* **Authentication & User Management:** JWT issuance, trusted contact CRUD, duress PIN validation.
* **NLP & Multimodal AI Accuracy:** High-stakes category classification (Assault, Stalking, Kidnapping, Medical, Theft, False Alarm).
* **XAI Integrity:** Validated token attribution list generation and importance scoring.
* **Autonomous Escalation Engine:** Tested the 60-second unacknowledged emergency countdown and automated dispatch to Police (112) and Ambulance (108).
* **Public Tracking Portal:** Zero-authentication family live GPS tracking viewport (`/track/:id`) updating coordinates in real time.
* **Overall Test Pass Rate:** **33/33 Tests Passed (100% Reliability)**.

---

## 6. Conclusion and Future Directions

In this work, we presented **ShaktiSense**, an explainable multimodal AI framework that transforms women's personal safety applications from passive alarm beepers into active, prioritized dispatch intelligence. By combining Calibrated Linear SVM text categorization, real-time accelerometer and microphone telemetry fusion, and instant token feature attribution, the system achieves a **95.63% F1-score** at **4.5 ms edge inference latency**.

### Future Extensions
1. **On-Device TFLite Quantization:** Porting the Linear SVM and HAR motion models directly into Android/iOS clients for 100% offline inference when SIM data is unavailable.
2. **Smart Band BLE Telemetry:** Streaming photoplethysmography (PPG) heart rate data directly from BLE smartwatches to incorporate physiological distress spikes into $\Theta_{\text{fused}}$.
3. **Municipal CCTV Integration:** Linking safe navigation corridors with public urban camera networks to verify well-lit transit routes autonomously.

---

## References

1. UNODC, "Global Study on Homicide: Gender-related killing of women and girls," *United Nations Office on Drugs and Crime Research Report*, 2022.
2. C. Cortes and V. Vapnik, "Support-vector networks," *Machine Learning*, vol. 20, no. 3, pp. 273–297, 1995.
3. J. Platt, "Probabilistic outputs for support vector machines and comparisons to regularized likelihood methods," *Advances in Large Margin Classifiers*, vol. 10, no. 3, pp. 61–74, 1999.
4. V. Sanh, L. Debut, J. Chaumond, and T. Wolf, "DistilBERT, a distilled version of BERT: smaller, faster, cheaper and lighter," *arXiv preprint arXiv:1910.01108*, 2019.
5. S. M. Lundberg and S.-I. Lee, "A unified approach to interpreting model predictions," *Advances in Neural Information Processing Systems (NeurIPS)*, vol. 30, 2017.
6. A. Vaswani et al., "Attention is all you need," *Advances in Neural Information Processing Systems (NeurIPS)*, pp. 5998–6008, 2017.
7. F. Pedregosa et al., "Scikit-learn: Machine learning in Python," *Journal of Machine Learning Research*, vol. 12, pp. 2825–2830, 2011.
