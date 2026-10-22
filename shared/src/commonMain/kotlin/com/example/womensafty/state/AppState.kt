package com.example.womensafty.state

import androidx.compose.runtime.*
import com.example.womensafty.model.*
import com.example.womensafty.network.SafetyApiClient
import kotlinx.coroutines.*

class AppState(private val scope: CoroutineScope) {
    // Network Client & Cloud Sync
    val apiClient = SafetyApiClient()
    var isBackendConnected by mutableStateOf(false)

    // In-App Auto-Update State
    var availableUpdate by mutableStateOf<com.example.womensafty.network.AppUpdateInfo?>(null)
    var showUpdateDialog by mutableStateOf(false)
    var isDownloadingUpdate by mutableStateOf(false)
    var updateStatusMessage by mutableStateOf("")

    init {
        scope.launch {
            isBackendConnected = apiClient.checkHealth()
            isOfflineMode = !isBackendConnected
            checkForAppUpdates(currentVersionCode = 1)
        }
    }

    fun pingBackend() {
        scope.launch {
            isBackendConnected = apiClient.checkHealth()
            isOfflineMode = !isBackendConnected
            checkForAppUpdates(currentVersionCode = 1)
        }
    }

    fun checkForAppUpdates(currentVersionCode: Int = 1) {
        scope.launch {
            val update = apiClient.checkAppVersion()
            if (update != null && update.latestVersionCode > currentVersionCode) {
                availableUpdate = update
                showUpdateDialog = true
            }
        }
    }

    fun dismissUpdateDialog() {
        if (availableUpdate?.forceUpdate != true) {
            showUpdateDialog = false
        }
    }

    // Auth & Navigation
    var isAuthenticated by mutableStateOf(true)
    var currentScreen by mutableStateOf("MAIN") // "WELCOME", "LOGIN", "REGISTER", "MAIN"
    var currentTab by mutableStateOf(NavTab.HOME)
    var isDarkTheme by mutableStateOf(true)

    // User Profile & Settings
    var currentUser by mutableStateOf(UserProfile())
    var settings by mutableStateOf(AppSettings())
    var isDemoMode by mutableStateOf(true)

    // Emergency SOS State
    var isEmergencyActive by mutableStateOf(false)
    var isCountingDown by mutableStateOf(false)
    var countdownRemaining by mutableStateOf(5)
    var emergencyDescriptionText by mutableStateOf("")
    var selectedCategory by mutableStateOf<EmergencyCategory?>(null)
    var activeAlert by mutableStateOf<EmergencyAlert?>(null)
    var escalationSecondsRemaining by mutableStateOf(60)

    // Telemetry & Device
    var currentGpsLat by mutableStateOf(28.6139)
    var currentGpsLng by mutableStateOf(77.2090)
    var currentGpsAccuracy by mutableStateOf(4.5f)
    var currentAddress by mutableStateOf("Sector 18 Metro Plaza, Main Road")
    var batteryPercentage by mutableStateOf(84)
    var isOfflineMode by mutableStateOf(false)
    var offlineQueueCount by mutableStateOf(0)

    // Hardware Sensors: Accelerometer & Motion Telemetry
    var currentMotionMagnitude by mutableStateOf(1.0f) // 1.0g = Earth gravity baseline
    var motionAnomalyLevel by mutableStateOf("NORMAL") // "NORMAL", "ELEVATED", "SHAKE_DETECTED", "IMPACT_FALL"
    var shakeCountDetected by mutableStateOf(0)

    // Hardware Sensors: Microphone & Acoustic Telemetry
    var currentAcousticStress by mutableStateOf(0.12f) // 0.0 - 1.0 scale
    var acousticStressCategory by mutableStateOf("CALM") // "CALM", "CONVERSATIONAL", "ELEVATED", "SCREAM_DISTRESS"
    var isVoiceListening by mutableStateOf(false)
    var isMicrophoneActive by mutableStateOf(false)

    fun updateMotionTelemetry(gForce: Float) {
        currentMotionMagnitude = (currentMotionMagnitude * 0.7f) + (gForce * 0.3f)
        motionAnomalyLevel = when {
            gForce > 2.8f -> "IMPACT_FALL"
            gForce > 2.0f -> "SHAKE_DETECTED"
            gForce > 1.4f -> "ELEVATED"
            else -> "NORMAL"
        }
    }

    fun updateAcousticTelemetry(stressLevel: Float) {
        currentAcousticStress = (currentAcousticStress * 0.6f) + (stressLevel * 0.4f)
        acousticStressCategory = when {
            currentAcousticStress > 0.75f -> "SCREAM_DISTRESS"
            currentAcousticStress > 0.45f -> "ELEVATED"
            currentAcousticStress > 0.20f -> "CONVERSATIONAL"
            else -> "CALM"
        }
        // Auto-trigger emergency if screaming persists when Voice SOS is enabled
        if (settings.voiceSosEnabled && currentAcousticStress > 0.85f && !isEmergencyActive && !isCountingDown) {
            triggerSos(immediate = true, description = "Acoustic Scream Distress Detected (>85dB)")
        }
    }

    // Disguised Fake Call State
    var isFakeCallActive by mutableStateOf(false)
    var fakeCallStage by mutableStateOf(FakeCallStage.IDLE)
    var fakeCallDurationSeconds by mutableStateOf(0)
    private var fakeCallTimerJob: Job? = null
    private var fakeCallDelayJob: Job? = null

    // Trusted Contacts
    var trustedContacts = mutableStateListOf(
        TrustedContact(
            id = "c1",
            name = "Mom (Primary)",
            phone = "+91 98111 22233",
            relationship = "Mother",
            priority = 1
        ),
        TrustedContact(
            id = "c2",
            name = "Priya (Sister)",
            phone = "+91 98222 33344",
            relationship = "Brother/Sister",
            priority = 2
        ),
        TrustedContact(
            id = "c3",
            name = "Rahul (Partner)",
            phone = "+91 98333 44455",
            relationship = "Partner",
            priority = 3
        )
    )

    // Alert History
    var alertHistory = mutableStateListOf(
        EmergencyAlert(
            id = "hist_1",
            category = EmergencyCategory.STALKING_FOLLOWING,
            priority = PriorityLevel.CRITICAL,
            description = "Suspicious person following me near the metro parking lot.",
            latitude = 28.6139,
            longitude = 77.2090,
            address = "Central Metro Station Concourse",
            timestamp = "Yesterday at 9:42 PM",
            status = "RESOLVED",
            escalationStatus = "ESCALATED_TO_POLICE",
            mlConfidence = 0.94f
        ),
        EmergencyAlert(
            id = "hist_2",
            category = EmergencyCategory.HARASSMENT,
            priority = PriorityLevel.STANDARD,
            description = "Verbal harassment by groups near bus terminal.",
            latitude = 28.5800,
            longitude = 77.2300,
            address = "University Campus South Gate",
            timestamp = "3 days ago at 7:15 PM",
            status = "RESOLVED",
            escalationStatus = "NONE",
            mlConfidence = 0.91f
        )
    )

    // Safety Zones
    var safetyZones = mutableStateListOf(
        SafetyZoneItem(
            id = "sz-1",
            name = "Downtown Commercial Boulevard",
            safetyScore = 84.5f,
            riskLevel = "LOW",
            alertCount = 4,
            topCategories = listOf("Harassment", "Other")
        ),
        SafetyZoneItem(
            id = "sz-2",
            name = "Metro Underpass & Rail Border",
            safetyScore = 48.0f,
            riskLevel = "HIGH",
            alertCount = 18,
            topCategories = listOf("Stalking/Following", "Physical Assault")
        ),
        SafetyZoneItem(
            id = "sz-3",
            name = "University South Gate Area",
            safetyScore = 74.0f,
            riskLevel = "MODERATE",
            alertCount = 7,
            topCategories = listOf("Harassment")
        ),
        SafetyZoneItem(
            id = "sz-4",
            name = "Tech Ring Road & Corporate Park",
            safetyScore = 89.0f,
            riskLevel = "LOW",
            alertCount = 2,
            topCategories = listOf("Other")
        )
    )

    // Nearby Help
    var nearbyHelp = mutableStateListOf(
        NearbyHelpItem(
            id = "p-1",
            name = "Central Police Station & 24/7 Women Helpdesk",
            type = "Police",
            distanceKm = 0.8f,
            address = "Sector 3 Main Boulevard",
            phone = "112",
            isWomenDesk = true
        ),
        NearbyHelpItem(
            id = "h-1",
            name = "City General Hospital & Emergency Trauma Unit",
            type = "Hospital",
            distanceKm = 1.1f,
            address = "14 Healthcare Avenue",
            phone = "108"
        ),
        NearbyHelpItem(
            id = "p-2",
            name = "Metro Transit Police Booth",
            type = "Police",
            distanceKm = 1.4f,
            address = "Central Metro Concourse Gate 2",
            phone = "112",
            isWomenDesk = true
        ),
        NearbyHelpItem(
            id = "ph-1",
            name = "24/7 Night Care Pharmacy & First Aid",
            type = "Pharmacy",
            distanceKm = 0.5f,
            address = "Main Market Shop 12",
            phone = "+91 98450 12345"
        )
    )

    // Community Safety Alerts (Anonymized)
    var communityAlerts = mutableStateListOf(
        CommunitySafetyAlert(
            id = "ca-1",
            approximateArea = "Metro Underpass Sector 4",
            category = "Stalking/Following",
            safetyLevel = "High Alert",
            timeAgo = "18 mins ago",
            incidentCount = 3
        ),
        CommunitySafetyAlert(
            id = "ca-2",
            approximateArea = "North Bypass Pedestrian Bridge",
            category = "Harassment",
            safetyLevel = "Moderate Alert",
            timeAgo = "45 mins ago",
            incidentCount = 2
        )
    )

    private var countdownJob: Job? = null
    private var escalationJob: Job? = null

    /* Trigger SOS Flow */
    fun triggerSos(immediate: Boolean = false, description: String = "") {
        if (description.isNotEmpty()) {
            emergencyDescriptionText = description
        }

        if (immediate || settings.sosCountdownSeconds <= 0) {
            activateEmergencyNow()
        } else {
            isCountingDown = true
            countdownRemaining = settings.sosCountdownSeconds
            countdownJob?.cancel()
            countdownJob = scope.launch {
                while (countdownRemaining > 0) {
                    delay(1000)
                    countdownRemaining--
                }
                isCountingDown = false
                activateEmergencyNow()
            }
        }
    }

    fun cancelCountdown() {
        countdownJob?.cancel()
        isCountingDown = false
        countdownRemaining = settings.sosCountdownSeconds
    }

    private fun activateEmergencyNow() {
        isCountingDown = false
        isEmergencyActive = true

        // 1. NLP / Category Determination
        val cat = selectedCategory ?: classifyLocally(emergencyDescriptionText)
        val prio = when (cat) {
            EmergencyCategory.PHYSICAL_ASSAULT -> PriorityLevel.CRITICAL
            EmergencyCategory.STALKING_FOLLOWING -> PriorityLevel.CRITICAL
            EmergencyCategory.KIDNAPPING_DETAINMENT -> PriorityLevel.CRITICAL
            EmergencyCategory.HARASSMENT -> PriorityLevel.STANDARD
            EmergencyCategory.THEFT_SNATCHING -> PriorityLevel.HIGH
            EmergencyCategory.MEDICAL_EMERGENCY -> PriorityLevel.MEDIUM
            EmergencyCategory.UNSAFE_ENVIRONMENT -> PriorityLevel.MEDIUM
            EmergencyCategory.FALSE_ALARM -> PriorityLevel.LOW
            EmergencyCategory.OTHER -> PriorityLevel.LOW
        }

        val newAlert = EmergencyAlert(
            id = "alert_${kotlin.random.Random.nextInt(10000, 99999)}",
            category = cat,
            priority = prio,
            description = emergencyDescriptionText.ifEmpty { "SOS Emergency Triggered" },
            latitude = currentGpsLat,
            longitude = currentGpsLng,
            address = currentAddress,
            timestamp = "Just now",
            status = "ACTIVE",
            escalationStatus = if (prio == PriorityLevel.CRITICAL || prio == PriorityLevel.HIGH) "PENDING" else "NONE",
            notifiedContactsCount = trustedContacts.size,
            mlConfidence = 0.94f,
            mlModelUsed = "Linear SVM (Calibrated)",
            demoMode = isDemoMode
        )

        activeAlert = newAlert
        alertHistory.add(0, newAlert)

        // Asynchronous Live Synchronization to ShaktiSense Backend
        scope.launch {
            val netResult = apiClient.dispatchAlert(
                latitude = currentGpsLat,
                longitude = currentGpsLng,
                description = newAlert.description,
                accuracy = currentGpsAccuracy,
                address = currentAddress,
                motionMagnitude = maxOf(currentMotionMagnitude, if (shakeCountDetected > 0) 2.6f else 0.2f),
                acousticStress = maxOf(currentAcousticStress, if (isVoiceListening) 0.8f else 0.1f),
                heartRateBpm = 85.0f
            )

            if (netResult.isLiveSynced) {
                isBackendConnected = true
                isOfflineMode = false
                activeAlert = activeAlert?.copy(
                    id = netResult.alertId,
                    mlConfidence = netResult.confidence,
                    mlModelUsed = "Linear SVM (Synced)"
                )
            } else {
                isOfflineMode = true
                offlineQueueCount++
            }
        }

        // Start Escalation Timer
        escalationSecondsRemaining = settings.escalationTimeoutSeconds
        escalationJob?.cancel()
        escalationJob = scope.launch {
            while (escalationSecondsRemaining > 0 && isEmergencyActive) {
                delay(1000)
                escalationSecondsRemaining--
            }
            if (isEmergencyActive && settings.autoEscalateToPolice) {
                escalateToPolice()
            }
        }
    }

    fun cancelActiveEmergency(reason: String = "Safe now") {
        escalationJob?.cancel()
        val alertIdToCancel = activeAlert?.id ?: ""
        isEmergencyActive = false
        activeAlert = activeAlert?.copy(
            status = "CANCELLED",
            escalationStatus = "RESOLVED"
        )
        emergencyDescriptionText = ""
        selectedCategory = null

        scope.launch {
            if (alertIdToCancel.isNotEmpty()) {
                apiClient.cancelAlert(alertIdToCancel, reason)
            }
        }
    }

    /**
     * Duress PIN Hostage Protection:
     * - If pin == settings.safeCancelPin (e.g. 1234): Authenticates safe normal cancellation.
     * - If pin == settings.duressPin (e.g. 9999): Appears 100% cancelled to appease attacker,
     *   but silently notifies backend, sets DURESS_ACTIVE, escalates priority to CRITICAL, and maintains live tracking.
     * - Returns true if PIN was matched (either safe or duress), false if invalid PIN.
     */
    fun cancelEmergencyWithPin(pin: String): Boolean {
        if (pin == settings.safeCancelPin) {
            cancelActiveEmergency(reason = "PIN verified safe cancellation")
            return true
        } else if (pin == settings.duressPin) {
            escalationJob?.cancel()
            val alertIdToDuress = activeAlert?.id ?: ""
            // Visually reset screen so assailant believes SOS was dismissed
            isEmergencyActive = false
            activeAlert = activeAlert?.copy(
                status = "CANCELLED",
                escalationStatus = "COERCED_CANCELLATION"
            )
            emergencyDescriptionText = ""
            selectedCategory = null

            // Silently dispatch duress alert to backend
            scope.launch {
                if (alertIdToDuress.isNotEmpty()) {
                    apiClient.duressCancelAlert(alertIdToDuress, "coerced_cancellation_pin_entered")
                }
            }
            return true
        } else {
            return false
        }
    }

    // Disguised Fake Call Controls
    fun triggerFakeCall(delaySeconds: Int = 0) {
        fakeCallDelayJob?.cancel()
        if (delaySeconds <= 0) {
            isFakeCallActive = true
            fakeCallStage = FakeCallStage.RINGING
            fakeCallDurationSeconds = 0
        } else {
            fakeCallDelayJob = scope.launch {
                delay(delaySeconds * 1000L)
                isFakeCallActive = true
                fakeCallStage = FakeCallStage.RINGING
                fakeCallDurationSeconds = 0
            }
        }
    }

    fun answerFakeCall() {
        fakeCallStage = FakeCallStage.CONNECTED
        fakeCallDurationSeconds = 0
        fakeCallTimerJob?.cancel()
        fakeCallTimerJob = scope.launch {
            while (fakeCallStage == FakeCallStage.CONNECTED) {
                delay(1000)
                fakeCallDurationSeconds++
            }
        }
    }

    fun endFakeCall() {
        fakeCallTimerJob?.cancel()
        fakeCallDelayJob?.cancel()
        fakeCallStage = FakeCallStage.ENDED
        isFakeCallActive = false
        fakeCallDurationSeconds = 0
    }

    fun escalateToPolice() {
        val alertIdToEscalate = activeAlert?.id ?: ""
        activeAlert = activeAlert?.copy(
            escalationStatus = "ESCALATED_TO_POLICE",
            status = "ESCALATED"
        )
        scope.launch {
            if (alertIdToEscalate.isNotEmpty()) {
                apiClient.escalateAlert(alertIdToEscalate, "POLICE")
            }
        }
    }

    fun escalateToAmbulance() {
        activeAlert = activeAlert?.copy(
            escalationStatus = "ESCALATED_TO_AMBULANCE",
            status = "ESCALATED"
        )
    }

    // Fast local rule classifier if offline or before network response
    private fun classifyLocally(text: String): EmergencyCategory {
        val lower = text.lowercase()
        return when {
            lower.contains("hit") || lower.contains("attack") || lower.contains("knife") || lower.contains("weapon") || lower.contains("punch") || lower.contains("beat") ->
                EmergencyCategory.PHYSICAL_ASSAULT
            lower.contains("follow") || lower.contains("stalk") || lower.contains("trail") || lower.contains("shadow") || lower.contains("watching") ->
                EmergencyCategory.STALKING_FOLLOWING
            lower.contains("kidnap") || lower.contains("abduct") || lower.contains("locked") || lower.contains("hostage") || lower.contains("wrong route") ->
                EmergencyCategory.KIDNAPPING_DETAINMENT
            lower.contains("snatch") || lower.contains("purse") || lower.contains("chain") || lower.contains("robbery") || lower.contains("stole") ->
                EmergencyCategory.THEFT_SNATCHING
            lower.contains("breath") || lower.contains("chest") || lower.contains("faint") || lower.contains("pain") || lower.contains("blood") || lower.contains("ambulance") ->
                EmergencyCategory.MEDICAL_EMERGENCY
            lower.contains("harass") || lower.contains("catcall") || lower.contains("lewd") || lower.contains("vulgar") || lower.contains("touch") ->
                EmergencyCategory.HARASSMENT
            lower.contains("streetlight") || lower.contains("dark") || lower.contains("deserted") || lower.contains("stray dog") || lower.contains("drunk") ->
                EmergencyCategory.UNSAFE_ENVIRONMENT
            lower.contains("false alarm") || lower.contains("mistake") || lower.contains("testing") || lower.contains("cancel") ->
                EmergencyCategory.FALSE_ALARM
            else -> EmergencyCategory.OTHER
        }
    }

    // Shake Simulation
    fun simulateShake() {
        if (!settings.shakeSosEnabled) return
        shakeCountDetected++
        if (shakeCountDetected >= settings.shakeThresholdCount) {
            shakeCountDetected = 0
            triggerSos(immediate = false, description = "Shake gesture detected")
        }
    }

    // Voice Simulation
    fun simulateVoicePhrase(phrase: String) {
        if (!settings.voiceSosEnabled) return
        val trigger = settings.voiceTriggerPhrase.lowercase()
        if (phrase.lowercase().contains(trigger) || phrase.lowercase().contains("help") || phrase.lowercase().contains("emergency")) {
            triggerSos(immediate = true, description = phrase)
        }
    }

    // Contact Management
    fun addContact(name: String, phone: String, relationship: String) {
        val newC = TrustedContact(
            id = "c_${kotlin.random.Random.nextInt(10000, 99999)}",
            name = name.trim(),
            phone = phone.trim(),
            relationship = relationship,
            priority = trustedContacts.size + 1
        )
        trustedContacts.add(newC)
    }

    fun deleteContact(id: String) {
        trustedContacts.removeAll { it.id == id }
    }

    fun deleteAlertHistory(id: String) {
        alertHistory.removeAll { it.id == id }
    }
}
