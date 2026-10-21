import csv
import os
import random
import re
import zipfile
import pandas as pd

dataset_dir = os.path.join(os.path.dirname(__file__), "dataset")
os.makedirs(dataset_dir, exist_ok=True)
csv_file = os.path.join(dataset_dir, "emergency_alerts.csv")

# Uploaded Dataset Paths
path_911 = os.path.join(dataset_dir, "911.csv")
path_jigsaw = os.path.join(dataset_dir, "train.csv")
path_safecity_dir = os.path.join(dataset_dir, "safecity-master", "multilabel_classification")
path_edos = os.path.join(dataset_dir, "edos_processed.csv")
path_abuse = os.path.join(dataset_dir, "unified_abuse_hate_dataset.csv")

# -------------------------------------------------------------
# 9 Granular Emergency & Safety Categories (ShaktiSense Framework)
# 1. Physical Assault        (CRITICAL)
# 2. Stalking/Following       (CRITICAL)
# 3. Kidnapping/Detainment    (CRITICAL)
# 4. Harassment               (STANDARD)
# 5. Theft/Snatching          (HIGH)
# 6. Medical Emergency        (MEDIUM)
# 7. Unsafe Environment       (MEDIUM)
# 8. False Alarm              (LOW)
# 9. Other                    (LOW)
# -------------------------------------------------------------

locations = [
    "AKGEC college main gate", "Ghaziabad railway underpass", "Sector 62 metro station",
    "RDC Raj Nagar market", "Crossings Republik boulevard", "Indirapuram service road",
    "Central metro station concourse", "MG Road bus stop", "parking lot behind supermarket",
    "city park jogging trail", "Sector 14 market", "residential complex entrance",
    "highway service lane", "ATM booth near district hospital", "pedestrian skywalk bridge",
    "downtown shopping lane", "tech park back exit", "university central library",
    "bus terminal platform 3", "silent alley off 5th avenue", "petrol pump on ring road",
    "commercial plaza basement", "taxi stand near railway station", "outer ring road flyover",
    "Nehru Place electronic market", "Cyber Hub pedestrian walkway", "Koramangala 5th block",
    "Connaught Place inner circle", "Hauz Hkas village alley", "Sector 18 Noida metro gate 2",
    "Bandra Kurla Complex south avenue", "Salt Lake sector 5 tech hub", "Pune university circle",
    "Hinjewadi phase 1 crossing", "Whitefield main road bus shelter", "Andheri west link road",
    "Gachibowli flyover service lane", "DLF phase 3 cyber city", "Chandni Chowk main bazaar",
    "Vaishali metro parking", "Kaushambi bus depot", "Noida expressway foot overbridge",
    "Electronic City toll plaza", "Jayanagar 4th block complex", "Civil Lines residential lane",
    "Botanical Garden interchange", "Huda City Centre exit gate", "Viman Nagar jogging lane"
]

def clean_social_text(text: str) -> str:
    t = str(text)
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"\[URL\]", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\[USER\]", "", t, flags=re.IGNORECASE)
    t = re.sub(r"RT\s+@\w+:", "", t)
    t = re.sub(r"@\w+", "", t)
    t = re.sub(r"&amp;", "and", t)
    t = re.sub(r"&lt;|&gt;", "", t)
    t = re.sub(r"#\w+", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

assembled_rows = []

# =========================================================================
# 1. PROCESS SAFECITY (Real-world Indian Women Safety Reports)
# =========================================================================
if os.path.exists(path_safecity_dir):
    print("[Dataset Ingestion] Processing SafeCity dataset...")
    safecity_dfs = []
    for zname in ["train.csv.zip", "dev.csv.zip", "test.csv.zip"]:
        zpath = os.path.join(path_safecity_dir, zname)
        if os.path.exists(zpath):
            with zipfile.ZipFile(zpath, 'r') as z:
                with z.open(z.namelist()[0]) as f:
                    safecity_dfs.append(pd.read_csv(f))

    if safecity_dfs:
        df_safe = pd.concat(safecity_dfs, ignore_index=True).dropna(subset=["Description"])
        df_safe = df_safe.drop_duplicates(subset=["Description"])
        
        stalking_kw = ["follow", "trailing", "stalk", "chase", "behind me", "came after", "shadow", "tracking", "pacing"]
        theft_kw = ["snatch", "chain", "purse", "stole", "theft", "bag", "wallet", "mobile"]
        kidnap_kw = ["locked the door", "wrong route", "detour", "kidnap", "abduct", "forced into", "trapped", "wont let me out"]
        assault_kw = ["beat", "punched", "slapped", "hit me", "bleeding", "weapon", "knife", "physical attack"]
        
        for _, row in df_safe.iterrows():
            desc = clean_social_text(row["Description"])
            if len(desc.split()) < 3:
                continue
            d_lower = desc.lower()
            
            if any(k in d_lower for k in kidnap_kw):
                assembled_rows.append({"description": desc, "category": "Kidnapping/Detainment"})
            elif any(k in d_lower for k in theft_kw):
                assembled_rows.append({"description": desc, "category": "Theft/Snatching"})
            elif any(k in d_lower for k in stalking_kw):
                assembled_rows.append({"description": desc, "category": "Stalking/Following"})
            elif any(k in d_lower for k in assault_kw):
                assembled_rows.append({"description": desc, "category": "Physical Assault"})
            elif row.get("Touching /Groping", 0) == 1 or row.get("Commenting", 0) == 1 or row.get("Ogling/Facial Expressions/Staring", 0) == 1:
                assembled_rows.append({"description": desc, "category": "Harassment"})
        print(f"[Dataset Ingestion] SafeCity contributed {len(assembled_rows)} rows.")

# =========================================================================
# 2. PROCESS 911 CALLS (Real Emergency Dispatch Calls)
# =========================================================================
if os.path.exists(path_911):
    print("[Dataset Ingestion] Processing 911 emergency dispatch calls (660k+ records)...")
    df_911 = pd.read_csv(path_911, usecols=["title", "desc", "addr"])
    
    # Physical Assault & Weapon attacks
    assault_911 = df_911[df_911["title"].str.contains("ASSAULT|STAB|SHOOT|FIGHT", case=False, na=False)].dropna(subset=["addr"])
    for _, r in assault_911.head(2300).iterrows():
        title = str(r["title"]).replace("EMS: ", "").replace(" -", "").strip()
        addr = str(r["addr"]).strip()
        text = f"Emergency 911 dispatch: {title} reported near {addr}. Urgent response required."
        assembled_rows.append({"description": text, "category": "Physical Assault"})

    # Medical Emergency (Cardiac, Respiratory, Trauma, Seizures)
    med_titles = ["CARDIAC EMERGENCY", "RESPIRATORY EMERGENCY", "UNCONSCIOUS SUBJECT", "HEAD INJURY", "SEIZURES", "SYNCOPAL EPISODE", "HEMORRHAGING", "OVERDOSE", "CVA/STROKE"]
    med_pattern = "|".join(med_titles)
    med_911 = df_911[df_911["title"].str.contains(med_pattern, case=False, na=False)].dropna(subset=["addr"])
    for _, r in med_911.sample(n=2500, random_state=42).iterrows():
        title = str(r["title"]).replace("EMS: ", "").replace(" -", "").strip()
        addr = str(r["addr"]).strip()
        text = f"Emergency medical call: {title} near {addr}. Immediate ambulance dispatch needed."
        assembled_rows.append({"description": text, "category": "Medical Emergency"})

    # Road hazards, disabled vehicles, gas leaks -> Unsafe Environment
    hazard_911 = df_911[df_911["title"].str.contains("DISABLED VEHICLE|ROAD OBSTRUCTION|HAZARDOUS ROAD|GAS-ODOR|ELECTRICAL FIRE", case=False, na=False)].dropna(subset=["addr"])
    for _, r in hazard_911.sample(n=2200, random_state=42).iterrows():
        title = str(r["title"]).replace("Traffic: ", "").replace("Fire: ", "").replace(" -", "").strip()
        addr = str(r["addr"]).strip()
        text = f"Road hazard alert: {title} reported near {addr}. Area hazardous for commuters."
        assembled_rows.append({"description": text, "category": "Unsafe Environment"})

    # Automated alarm sensors -> False Alarm
    alarm_911 = df_911[df_911["title"].str.contains("FIRE ALARM|MEDICAL ALERT ALARM", case=False, na=False)].dropna(subset=["addr"])
    for _, r in alarm_911.sample(n=1800, random_state=42).iterrows():
        title = str(r["title"]).replace("Fire: ", "").replace("EMS: ", "").strip()
        addr = str(r["addr"]).strip()
        text = f"Automated sensor trigger: {title} activated near {addr}. Verification confirmed false alarm, no dispatch needed."
        assembled_rows.append({"description": text, "category": "False Alarm"})
    print("[Dataset Ingestion] 911 Calls processed successfully.")

# =========================================================================
# 3. PROCESS JIGSAW TOXIC DATASET (Threats & Toxic Harassment)
# =========================================================================
if os.path.exists(path_jigsaw):
    print("[Dataset Ingestion] Processing Jigsaw Toxic Comment dataset...")
    df_jigsaw = pd.read_csv(path_jigsaw, usecols=["comment_text", "toxic", "threat", "obscene", "insult"])
    
    # Threats -> Physical Assault
    threats_jigsaw = df_jigsaw[df_jigsaw["threat"] == 1]
    for t in threats_jigsaw["comment_text"]:
        c = clean_social_text(t)
        if 10 < len(c) < 300:
            assembled_rows.append({"description": c, "category": "Physical Assault"})
            
    # Toxic insults & obscenity -> Harassment
    harass_jigsaw = df_jigsaw[(df_jigsaw["toxic"] == 1) & (df_jigsaw["insult"] == 1) & (df_jigsaw["threat"] == 0)].sample(n=1400, random_state=42)
    for t in harass_jigsaw["comment_text"]:
        c = clean_social_text(t)
        if 10 < len(c) < 250:
            assembled_rows.append({"description": c, "category": "Harassment"})
            
    # Clean neutral text -> Other (helps model learn non-emergency boundaries)
    neutral_jigsaw = df_jigsaw[(df_jigsaw["toxic"] == 0) & (df_jigsaw["threat"] == 0) & (df_jigsaw["insult"] == 0)].sample(n=1800, random_state=42)
    for t in neutral_jigsaw["comment_text"]:
        c = clean_social_text(t)
        if 15 < len(c) < 250 and not any(w in c.lower() for w in ["kill", "die", "attack", "bitch", "fuck"]):
            assembled_rows.append({"description": c, "category": "Other"})
    print("[Dataset Ingestion] Jigsaw dataset processed successfully.")

# =========================================================================
# 4. PROCESS EDOS & UNIFIED DATASETS
# =========================================================================
if os.path.exists(path_edos):
    print("[Dataset Ingestion] Processing EDOS dataset...")
    edos = pd.read_csv(path_edos)
    threats = edos[edos["label_category"] == "1. threats, plans to harm and incitement"].copy()
    harm_words = ["kill", "beat", "hit", "strike", "hurt", "chok", "punch", "assault", "strangle", "slap", "stab"]
    for t in threats["text"]:
        c = clean_social_text(t)
        if len(c.split()) >= 3:
            if any(w in c.lower() for w in harm_words):
                assembled_rows.append({"description": c, "category": "Physical Assault"})
            else:
                assembled_rows.append({"description": c, "category": "Harassment"})
    
    benign_edos = edos[edos["label_category"] == "none"].sample(n=400, random_state=42)
    for t in benign_edos["text"]:
        c = clean_social_text(t)
        if len(c.split()) >= 3 and not any(w in c.lower() for w in ["bitch", "kill", "rape"]):
            assembled_rows.append({"description": c, "category": "Other"})

if os.path.exists(path_abuse):
    print("[Dataset Ingestion] Processing Unified Medical Dialogue dataset...")
    abuse = pd.read_csv(path_abuse)
    med = abuse[abuse["unified_label"] == "medical_dialogue"]
    for t in med["text"]:
        c = clean_social_text(t)
        if len(c.split()) >= 3:
            assembled_rows.append({"description": c, "category": "Medical Emergency"})
            
    neutrals = abuse[abuse["unified_label"].isin(["normal", "neither"])].dropna().sample(n=800, random_state=42)
    for t in neutrals["text"]:
        c = clean_social_text(t)
        if len(c.split()) >= 3 and not any(w in c.lower() for w in ["kill", "bitch", "die"]):
            assembled_rows.append({"description": c, "category": "Other"})

# =========================================================================
# 5. DOMAIN SAFETY ALERTS (Balancing Kidnapping, Theft, Stalking, False Alarm)
# =========================================================================
print("[Dataset Ingestion] Generating domain safety alerts for class balance...")
kidnapping_templates = [
    "My cab driver locked all the doors and took a deserted detour off the route near {loc}.",
    "Driver refuses to let me out of the car and is speeding down an isolated highway near {loc}.",
    "Auto driver turned off GPS route and is taking me towards an unlit jungle road near {loc}.",
    "Two men forced me into a black van and are holding me captive near {loc}.",
    "Help, I am locked inside an unfamiliar room and being detained against my will near {loc}.",
    "Cab driver turned off the meter, locked child locks and won't stop near {loc}.",
    "A stranger pushed me into their vehicle and sped away from {loc}.",
    "Held hostage in an isolated building near {loc}, send emergency police dispatch.",
    "Rickshaw driver took a dark unfamiliar turn and refuses to unlock the door near {loc}.",
    "Someone locked me inside the basement parking office at {loc} and took my keys.",
    "Kidnapping in progress! Vehicle license plate unknown, moving away from {loc}.",
    "Driver is driving in the opposite direction of my destination and ignoring my cries near {loc}.",
    "Help, forced into a vehicle by unknown men near {loc}.",
    "Driver has child-lock on and will not let me step out at {loc}.",
    "Abduction attempt in progress, forced into a car near {loc}.",
    "I am locked inside a secluded warehouse near {loc}, cannot escape.",
    "Cab driver took a desolate bypass and locked the windows near {loc}.",
    "Trapped inside a moving car with strangers near {loc}.",
    "Cab driver ne doors lock kar diye aur sunsaan raste pe le ja raha hai near {loc}.",
    "Auto wala galat sunsaan jungle wale raste pe mod liya hai aur gaadi nahi rok raha near {loc}.",
    "Bachao! Cab wala gaadi nahi rok raha aur rasta bhatka diya near {loc}.",
    "Do ladko ne zabardasti car me kheench liya near {loc}, kidnapping help!",
    "Driver ne child lock laga diya hai aur bahar nahi nikalne de raha near {loc}.",
    "Mujhe ek kamre me band kar diya hai aur bahar se lock laga diya at {loc}.",
    "Cab wala map ke opposite sunsaan area me le gaya hai near {loc}.",
    "Zabardasti gaadi me daal ke le ja rahe hain near {loc}.",
    "Gadi lock kar di hai aur sunsaan road pe bhaga raha hai near {loc}.",
    "cab locked doors wrong route wont stop help near {loc}",
    "driver abduction locked inside car speeding away near {loc}",
    "forced into car kidnapped near {loc} emergency 112"
]

theft_templates = [
    "A biker just snatched my handbag and sped off near {loc}.",
    "Two guys on a motorcycle snatched my gold chain and phone near {loc}.",
    "My purse was violently snatched while I was hailing an auto near {loc}.",
    "Someone snatched my smartphone from my hand and ran away near {loc}.",
    "Mugger at knifepoint took my wallet and laptop bag near {loc}.",
    "Chain snatching incident happened right in front of {loc}.",
    "Biker without helmet snatched my shoulder bag near {loc}, fleeing towards main road.",
    "A man grabbed my shopping bag and phone, fled into the alley near {loc}.",
    "Two men on Pulsar bike snatched my mother's necklace near {loc}.",
    "Pickpocket took my phone and cash inside the crowded concourse at {loc}.",
    "Armed robbery, guy demanded all cash and purse near {loc}.",
    "Snatched my backpack with all identification cards and phone near {loc}.",
    "Biker snatchers fled towards the flyover after grabbing my bag near {loc}.",
    "Strangers cornered me and snatched my purse at {loc}.",
    "Mobile snatching by two boys on a black motorcycle near {loc}.",
    "A guy snatched my gold earrings and injured my ear near {loc}.",
    "Robbery at gunpoint, they took my phone and watch near {loc}.",
    "A man snatched my wallet while I was withdrawing money at the ATM near {loc}.",
    "Bike wale ne mera bag cheen liya aur bhaag gaya near {loc}.",
    "Do ladke motorcycle par aaye aur gale se chain kheench ke bhaag gaye near {loc}.",
    "Mera mobile phone cheen ke bhag gaye do ladke near {loc}.",
    "Auto me baithte waqt kisi ne mera purse cheen liya at {loc}.",
    "Chaku dikha kar wallet aur phone loot liya near {loc}.",
    "Chain snatching hui hai bike sawaron ne chain kheench li near {loc}.",
    "Biker ne haath se phone jhapatt liya near {loc}.",
    "Mera bag chheen kar gali me bhaag gaya ek aadmi near {loc}.",
    "Lootpat hui hai bike walo ne phone aur paise cheen liye at {loc}.",
    "bag snatched by biker fled towards highway near {loc}",
    "phone snatching by motorcycle riders near {loc}",
    "chain snatched knifepoint robbery at {loc}"
]

stalking_templates = [
    "A suspicious man in a black hoodie has been following me for 15 minutes near {loc}.",
    "Someone is tracking my steps and hiding behind pillars near {loc}.",
    "A car with tinted windows is slowly trailing behind me near {loc}.",
    "A man is following me down this dark alley near {loc}, I feel deeply unsafe.",
    "Someone has been tailing me since I left {loc}, matching every turn I make.",
    "Creepy guy standing outside my building near {loc}, staring and waiting.",
    "A biker is circling around me repeatedly near {loc}.",
    "Someone is watching me and following me closely near {loc}.",
    "A man followed me off the bus and is still walking behind me at {loc}.",
    "Stalker alert: same person from yesterday is trailing me near {loc}.",
    "I tried changing directions but this individual continues following me near {loc}.",
    "Suspicious guy waiting at {loc}, keeping pace right behind me.",
    "A person is shadowing my route and taking pictures of me near {loc}.",
    "Being stalked along the dark pathway by two individuals near {loc}.",
    "A stranger is lingering right behind my back and murmuring near {loc}.",
    "Car following my walking speed with lights off near {loc}.",
    "Man persistently following me into the station at {loc}.",
    "Help, someone is stalking me and refuses to keep distance near {loc}.",
    "Person following me from the transit stop to {loc}.",
    "I feel deeply threatened by a guy following me through {loc}.",
    "Unknown guy pacing behind me for 4 blocks near {loc}.",
    "Two men on a scooter driving slowly alongside me near {loc}.",
    "Ek ladka kaafi der se mera peecha kar raha hai near {loc}.",
    "Koi suspicious bike wala continuously mere peeche aa raha hai near {loc}.",
    "Ek aadmi piche chup chup ke aa raha hai and watching me near {loc}.",
    "Creepy guy following me since metro station, dark stretch near {loc}.",
    "Ye banda har turn pe mere piche chal raha hai at {loc}.",
    "Car wala gaadi dheere karke peecha kar raha hai near {loc}.",
    "Bhaiya koi stalk kar raha hai mujhe gate se lekar {loc} tak.",
    "Suspicious person shadowing every step I take near {loc}.",
    "Two boys on a bike are following me persistently near {loc}.",
    "Koi piche piche aa raha hai and whispering near {loc}.",
    "Peecha kar raha hai ek banda continuously raste pe near {loc}.",
    "someone following me in dark street near {loc} very scared",
    "stalker alert guy trailing me matching turns at {loc}",
    "car trailing my walking pace lights off near {loc}"
]

false_alarm_base = [
    "Accidentally pressed the SOS button while taking phone out of pocket.",
    "False alarm, I am completely safe and testing the app features.",
    "Sorry, my little brother was playing with my phone and triggered the emergency.",
    "Accidental trigger, please ignore this alert. Everything is fine.",
    "Mistakenly clicked the SOS button during verification test.",
    "Testing emergency alert notification system for college presentation.",
    "False alarm! Dropped my phone and the shake sensor activated SOS.",
    "I am safe at home, please disregard the previous panic alert.",
    "Sorry for the inconvenience, pressed the panic button by mistake.",
    "Test trigger to check if trusted contacts receive SMS notifications.",
    "Cancel emergency! I misclicked while checking the safety route map.",
    "No emergency here, just testing the application response speed.",
    "Mistakenly triggered SOS while cleaning the mobile screen.",
    "I have safely reached my apartment, canceling active alert.",
    "False alert, pressed by error, no help needed thank you.",
    "Checking SOS countdown timer behavior, please do not dispatch police.",
    "Safe at destination, please cancel the alert.",
    "Accidental pocket dial of the emergency button.",
    "Everything is okay, my child tapped the red button accidentally.",
    "False emergency, phone slipped from my hands and initiated SOS.",
    "I hit the panic trigger unintentionally while putting phone on charger.",
    "No danger present, testing the geofencing and alert dispatch.",
    "Accidental touch on lock screen widget, please stand down.",
    "Cancel dispatch please, I am safe with my family.",
    "Galti se SOS button dab gaya tha, main bilkul theek hoon.",
    "Testing chal rahi thi app ki, kripya alert cancel karein.",
    "Chote bhai ne phone se khelte hue galti se SOS trigger kar diya.",
    "False alarm hai, main surakshit ghar pahunch gayi hoon.",
    "Phone gir gaya tha hath se jis wajah se alert chala gaya, all safe.",
    "Galti se click ho gaya, koi emergency nahi hai.",
    "App test kar rahe the presentation ke liye, cancel emergency.",
    "Main bilkul safe hoon, mistake se button press hua.",
    "Ghar pahunch gayi hoon surakshit, emergency cancel kar dijiye.",
    "Bachhe ne phone leke button press kar diya, sab theek hai."
]

# Generate balanced domain rows
for t in kidnapping_templates:
    for loc in locations:
        assembled_rows.append({"description": t.format(loc=loc), "category": "Kidnapping/Detainment"})
        assembled_rows.append({"description": f"URGENT: {t.format(loc=loc)}", "category": "Kidnapping/Detainment"})

for t in theft_templates:
    for loc in locations:
        assembled_rows.append({"description": t.format(loc=loc), "category": "Theft/Snatching"})

unsafe_environment_templates = [
    "Streetlights are completely broken and the entire stretch is pitch dark near {loc}.",
    "A pack of aggressive stray dogs has surrounded pedestrians near {loc}.",
    "Group of drunk men loitering, drinking alcohol and creating nuisance near {loc}.",
    "Isolated pathway with no security guards, CCTV cameras or lights near {loc}.",
    "Car broke down late at night on a completely deserted dark highway near {loc}.",
    "Area feels extremely unsafe, deserted street and suspicious men lingering near {loc}.",
    "Underpass lights are non-functional, creating a blind dark spot near {loc}.",
    "Rowdy crowd gathered, smashing bottles and causing disturbance near {loc}.",
    "Isolated bus stop late at night with no public transport and eerie silence near {loc}.",
    "Dangerous road blockage with exposed electric cables hanging low near {loc}.",
    "Several shady individuals drinking on parked motorbikes in the unlit alley near {loc}.",
    "Deserted parking lot with flickering lights, feeling vulnerable near {loc}.",
    "Abandoned construction site nearby where people are consuming drugs near {loc}.",
    "Completely desolate stretch, no people around and phone network is flickering near {loc}.",
    "Sunsaan sadak hai aur sari streetlights band hain near {loc}.",
    "Gaadi kharab ho gayi hai raat me deserted stretch near {loc}.",
    "Kutte peeche pad gaye hain aur rasta band hai near {loc}.",
    "Sharaabi log sadak pe bheed laga ke baithe hain near {loc}, unsafe feel ho raha hai.",
    "Andhera rasta hai koi streetlight ya police booth nahi hai near {loc}.",
    "Underpass me light nahi hai pura pitch dark hai near {loc}.",
    "Rasta pura sunsaan hai aur kuch log suspicious ghum rahe hain near {loc}.",
    "pitch dark street broken lights feels unsafe near {loc}",
    "stranded car late night isolated road near {loc}"
]

for t in unsafe_environment_templates:
    for loc in random.sample(locations, 35):
        assembled_rows.append({"description": t.format(loc=loc), "category": "Unsafe Environment"})

for t in stalking_templates:
    for loc in random.sample(locations, 35):
        assembled_rows.append({"description": t.format(loc=loc), "category": "Stalking/Following"})

prefixes_fa = ["", "URGENT: ", "Please note: ", "Update: ", "Notice: ", "Attention: ", ""]
suffixes_fa = ["", " Thank you.", " Everything is fine.", " All safe now.", " Have a nice day.", " Disregard please."]
for base in false_alarm_base:
    for _ in range(25):
        p = random.choice(prefixes_fa)
        s = random.choice(suffixes_fa)
        assembled_rows.append({"description": f"{p}{base}{s}".strip(), "category": "False Alarm"})

# =========================================================================
# 6. DEDUPLICATE AND BALANCE TO 20,000+ SAMPLES
# =========================================================================
print("[Dataset Assembly] Merging, cleaning, and balancing master dataset...")
df_all = pd.DataFrame(assembled_rows)
df_all.dropna(subset=["description", "category"], inplace=True)
df_all["clean_len"] = df_all["description"].astype(str).str.strip().str.len()
df_all = df_all[df_all["clean_len"] > 8]
df_all.drop(columns=["clean_len"], inplace=True)
df_all.drop_duplicates(subset=["description"], inplace=True)

# Balance each category up to 2600 samples
balanced_dfs = []
for cat, group in df_all.groupby("category"):
    if len(group) > 2600:
        balanced_dfs.append(group.sample(n=2600, random_state=42))
    else:
        balanced_dfs.append(group)

master_df = pd.concat(balanced_dfs, ignore_index=True)
master_df = master_df.sample(frac=1.0, random_state=42).reset_index(drop=True)

master_df.to_csv(csv_file, index=False, encoding="utf-8")
print(f"\n[Master Dataset Ready] Saved {len(master_df)} rows to {csv_file}")
print("\nMaster Class Distribution:")
print(master_df["category"].value_counts())
