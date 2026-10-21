package com.example.womensafty

import com.example.womensafty.model.EmergencyCategory
import com.example.womensafty.model.PriorityLevel
import com.example.womensafty.state.AppState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class AppStateTest {

    private fun createTestScope(): CoroutineScope = CoroutineScope(Dispatchers.Unconfined)

    @Test
    fun testSosCountdownInitiation() {
        val state = AppState(createTestScope())
        state.settings = state.settings.copy(sosCountdownSeconds = 5)

        // Trigger normal SOS with 5-second countdown
        state.triggerSos(immediate = false, description = "Help me someone is tailing me")

        assertTrue(state.isCountingDown, "SOS should initiate countdown state")
        assertEquals(5, state.countdownRemaining, "Countdown should start at 5 seconds")
        assertFalse(state.isEmergencyActive, "Emergency should not be active until countdown elapses")
    }

    @Test
    fun testSosCountdownCancellation() {
        val state = AppState(createTestScope())
        state.settings = state.settings.copy(sosCountdownSeconds = 5)

        state.triggerSos(immediate = false)
        assertTrue(state.isCountingDown)

        // User hits cancel countdown button
        state.cancelCountdown()
        assertFalse(state.isCountingDown, "Countdown must be cancelled")
        assertFalse(state.isEmergencyActive, "Emergency must remain inactive")
        assertEquals(5, state.countdownRemaining, "Countdown should reset to default")
    }

    @Test
    fun testImmediateSosBypass() {
        val state = AppState(createTestScope())

        // Immediate SOS bypass (e.g. user taps "Skip Countdown / Trigger Now")
        state.triggerSos(immediate = true, description = "He attacked me with a weapon")

        assertFalse(state.isCountingDown, "Countdown should be bypassed")
        assertTrue(state.isEmergencyActive, "Emergency must be immediately active")
        assertNotNull(state.activeAlert, "Active alert object must be generated")
        assertEquals(EmergencyCategory.PHYSICAL_ASSAULT, state.activeAlert?.category)
        assertEquals(PriorityLevel.CRITICAL, state.activeAlert?.priority)
    }

    @Test
    fun testShakeSensorDetection() {
        val state = AppState(createTestScope())
        state.settings = state.settings.copy(shakeSosEnabled = true, shakeThresholdCount = 3)

        // Simulate 1st shake
        state.simulateShake()
        assertEquals(1, state.shakeCountDetected)
        assertFalse(state.isCountingDown)

        // Simulate 2nd shake
        state.simulateShake()
        assertEquals(2, state.shakeCountDetected)
        assertFalse(state.isCountingDown)

        // Simulate 3rd shake (trigger threshold reached!)
        state.simulateShake()
        assertEquals(0, state.shakeCountDetected, "Shake count should reset on trigger")
        assertTrue(state.isCountingDown, "SOS countdown should activate upon reaching 3 shakes")
    }

    @Test
    fun testVoicePhraseTrigger() {
        val state = AppState(createTestScope())
        state.settings = state.settings.copy(voiceSosEnabled = true, voiceTriggerPhrase = "help me")

        // Simulate matched spoken voice trigger phrase
        state.simulateVoicePhrase("please help me urgently cab driver locked doors")

        assertTrue(state.isEmergencyActive, "Emergency should be active immediately upon voice trigger")
        assertEquals(EmergencyCategory.KIDNAPPING_DETAINMENT, state.activeAlert?.category)
        assertEquals(PriorityLevel.CRITICAL, state.activeAlert?.priority)
    }

    @Test
    fun testOfflineCategoryClassification() {
        val state = AppState(createTestScope())

        // Test Medical
        state.triggerSos(immediate = true, description = "unconscious chest pain breathing trouble")
        assertEquals(EmergencyCategory.MEDICAL_EMERGENCY, state.activeAlert?.category)
        assertEquals(PriorityLevel.MEDIUM, state.activeAlert?.priority)

        // Test Stalking
        state.triggerSos(immediate = true, description = "stranger is following and stalking me")
        assertEquals(EmergencyCategory.STALKING_FOLLOWING, state.activeAlert?.category)
        assertEquals(PriorityLevel.CRITICAL, state.activeAlert?.priority)

        // Test Theft
        state.triggerSos(immediate = true, description = "biker snatched my chain and bag")
        assertEquals(EmergencyCategory.THEFT_SNATCHING, state.activeAlert?.category)
        assertEquals(PriorityLevel.HIGH, state.activeAlert?.priority)

        // Test Unsafe Environment
        state.triggerSos(immediate = true, description = "pitch dark streetlights broken isolated road")
        assertEquals(EmergencyCategory.UNSAFE_ENVIRONMENT, state.activeAlert?.category)

        // Test False Alarm
        state.triggerSos(immediate = true, description = "false alarm sorry pressed by mistake")
        assertEquals(EmergencyCategory.FALSE_ALARM, state.activeAlert?.category)
        assertEquals(PriorityLevel.LOW, state.activeAlert?.priority)
    }

    @Test
    fun testCancelActiveEmergency() {
        val state = AppState(createTestScope())
        state.triggerSos(immediate = true, description = "Emergency test")
        assertTrue(state.isEmergencyActive)

        // User safely cancels
        state.cancelActiveEmergency("Safely reached home")
        assertFalse(state.isEmergencyActive, "Emergency must be marked inactive")
        assertEquals("CANCELLED", state.activeAlert?.status)
    }

    @Test
    fun testFakeCallLifecycle() {
        val state = AppState(createTestScope())
        assertFalse(state.isFakeCallActive)
        assertEquals(com.example.womensafty.model.FakeCallStage.IDLE, state.fakeCallStage)

        // 1. Trigger fake call immediately
        state.triggerFakeCall(delaySeconds = 0)
        assertTrue(state.isFakeCallActive, "Fake call overlay must be active")
        assertEquals(com.example.womensafty.model.FakeCallStage.RINGING, state.fakeCallStage)

        // 2. Accept / Answer call
        state.answerFakeCall()
        assertEquals(com.example.womensafty.model.FakeCallStage.CONNECTED, state.fakeCallStage)

        // 3. Hang up / End call
        state.endFakeCall()
        assertFalse(state.isFakeCallActive, "Fake call overlay must close")
        assertEquals(com.example.womensafty.model.FakeCallStage.ENDED, state.fakeCallStage)
    }

    @Test
    fun testDuressPinHostageProtection() {
        val state = AppState(createTestScope())
        state.triggerSos(immediate = true, description = "Intruder holding me")
        assertTrue(state.isEmergencyActive)

        // 1. Invalid PIN should fail
        val wrongPinResult = state.cancelEmergencyWithPin("0000")
        assertFalse(wrongPinResult, "Wrong PIN must return false")
        assertTrue(state.isEmergencyActive, "Emergency must stay active on wrong PIN")

        // 2. Duress PIN (9999) entered under coercion:
        val duressResult = state.cancelEmergencyWithPin("9999")
        assertTrue(duressResult, "Duress PIN must be accepted so assailant sees success")
        assertFalse(state.isEmergencyActive, "Emergency screen must close to deceive assailant")
        assertEquals("COERCED_CANCELLATION", state.activeAlert?.escalationStatus, "Escalation must be silently marked COERCED_CANCELLATION")
    }

    @Test
    fun testSafePinCancellation() {
        val state = AppState(createTestScope())
        state.triggerSos(immediate = true, description = "Accidental trigger")
        assertTrue(state.isEmergencyActive)

        // Safe PIN (1234)
        val safeResult = state.cancelEmergencyWithPin("1234")
        assertTrue(safeResult, "Safe PIN must succeed")
        assertFalse(state.isEmergencyActive)
        assertEquals("RESOLVED", state.activeAlert?.escalationStatus)
        assertEquals("CANCELLED", state.activeAlert?.status)
    }
}
