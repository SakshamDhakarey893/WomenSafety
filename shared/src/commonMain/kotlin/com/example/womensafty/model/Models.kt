package com.example.womensafty.model

enum class EmergencyCategory(val displayName: String, val defaultPriority: String) {
    PHYSICAL_ASSAULT("Physical Assault", "CRITICAL"),
    STALKING_FOLLOWING("Stalking/Following", "CRITICAL"),
    KIDNAPPING_DETAINMENT("Kidnapping/Detainment", "CRITICAL"),
    HARASSMENT("Harassment", "STANDARD"),
    THEFT_SNATCHING("Theft/Snatching", "HIGH"),
    MEDICAL_EMERGENCY("Medical Emergency", "MEDIUM"),
    UNSAFE_ENVIRONMENT("Unsafe Environment", "MEDIUM"),
    FALSE_ALARM("False Alarm", "LOW"),
    OTHER("Other", "LOW")
}

enum class PriorityLevel(val label: String, val colorHex: Long) {
    CRITICAL("CRITICAL", 0xFFE11D48),
    HIGH("HIGH", 0xFFF43F5E),
    MEDIUM("MEDIUM", 0xFFF59E0B),
    STANDARD("STANDARD", 0xFF38BDF8),
    LOW("LOW", 0xFF10B981)
}

data class UserProfile(
    val id: String = "user_demo",
    val name: String = "Ananya Sharma",
    val email: String = "ananya@safety.org",
    val phone: String = "+91 98765 43210",
    val role: String = "user",
    val demoMode: Boolean = true
)

data class TrustedContact(
    val id: String,
    val name: String,
    val phone: String,
    val relationship: String, // Mother, Father, Friend, Partner, etc.
    val priority: Int = 1,
    val email: String = "",
    val isNotified: Boolean = false
)

data class EmergencyAlert(
    val id: String,
    val category: EmergencyCategory,
    val priority: PriorityLevel,
    val description: String,
    val latitude: Double,
    val longitude: Double,
    val address: String,
    val timestamp: String,
    val status: String = "ACTIVE", // ACTIVE, ESCALATED, RESOLVED, CANCELLED
    val escalationStatus: String = "PENDING", // NONE, PENDING, ESCALATED_TO_POLICE, ESCALATED_TO_AMBULANCE
    val notifiedContactsCount: Int = 2,
    val mlConfidence: Float = 0.94f,
    val mlModelUsed: String = "Linear SVM (Calibrated)",
    val demoMode: Boolean = true
)

data class SafetyZoneItem(
    val id: String,
    val name: String,
    val safetyScore: Float, // 0 to 100
    val riskLevel: String, // LOW, MODERATE, HIGH
    val alertCount: Int,
    val topCategories: List<String>
)

data class SafeRouteOption(
    val id: String,
    val name: String,
    val isRecommended: Boolean,
    val distanceKm: Float,
    val estimatedMinutes: Int,
    val safetyScore: Float,
    val riskLevel: String,
    val characteristics: List<String>
)

data class NearbyHelpItem(
    val id: String,
    val name: String,
    val type: String, // Police, Hospital, Pharmacy
    val distanceKm: Float,
    val address: String,
    val phone: String,
    val isWomenDesk: Boolean = false,
    val statusText: String = "24/7 Active"
)

data class CommunitySafetyAlert(
    val id: String,
    val approximateArea: String,
    val category: String,
    val safetyLevel: String,
    val timeAgo: String,
    val incidentCount: Int
)

enum class FakeCallStage {
    IDLE,
    RINGING,
    CONNECTED,
    ENDED
}

data class AppSettings(
    val sosCountdownSeconds: Int = 5,
    val autoEscalateToPolice: Boolean = true,
    val escalationTimeoutSeconds: Int = 60,
    val shakeSosEnabled: Boolean = true,
    val shakeSensitivity: String = "Medium", // Low, Medium, High
    val shakeThresholdCount: Int = 3,
    val voiceSosEnabled: Boolean = true,
    val voiceTriggerPhrase: String = "Help me",
    val liveLocationSharing: Boolean = true,
    val smsNotifications: Boolean = true,
    val demoMode: Boolean = true,
    // Disguised Fake Call Settings
    val fakeCallCallerName: String = "Mom (Home)",
    val fakeCallPhoneNumber: String = "+91 98111 22233",
    val fakeCallPromptScript: String = "Hey beta! Where are you? Dad and I are waiting right outside in the car, hurry up!",
    // Duress PIN Protection
    val safeCancelPin: String = "1234",
    val duressPin: String = "9999"
)

enum class NavTab(val label: String) {
    HOME("Home"),
    MAP("Safe Route"),
    ALERTS("Alerts"),
    CONTACTS("Contacts"),
    PROFILE("Settings")
}
