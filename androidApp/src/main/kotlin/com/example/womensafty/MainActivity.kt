package com.example.womensafty

import android.Manifest
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.example.womensafty.sensor.AudioStressMonitor
import com.example.womensafty.state.AppState
import com.example.womensafty.update.AppUpdateManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlin.math.sqrt

class MainActivity : ComponentActivity(), SensorEventListener {
    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private var lastShakeTimestamp = 0L
    private val appScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private lateinit var appState: AppState
    private lateinit var updateManager: AppUpdateManager
    private lateinit var audioStressMonitor: AudioStressMonitor

    private val recordAudioPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            audioStressMonitor.startMonitoring()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        appState = AppState(appScope)
        updateManager = AppUpdateManager(this)
        audioStressMonitor = AudioStressMonitor(this, appState, appScope)

        // Retrieve current installed build version code
        val currentVersionCode = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageManager.getPackageInfo(packageName, 0).longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(packageName, 0).versionCode
            }
        } catch (_: Exception) {
            1
        }

        // Check for Free OTA In-App Updates from GitHub Releases
        appState.checkForAppUpdates(currentVersionCode)

        // Initialize Android Hardware Accelerometer Sensor
        sensorManager = getSystemService(SENSOR_SERVICE) as? SensorManager
        accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

        // Initialize Live Microphone Audio Stress Sentinel
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            audioStressMonitor.startMonitoring()
        } else {
            recordAudioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }

        setContent {
            App(
                providedAppState = appState,
                onTriggerUpdate = { apkUrl, versionName ->
                    updateManager.downloadAndInstall(apkUrl, versionName) { status ->
                        appState.updateStatusMessage = status
                    }
                }
            )
        }
    }

    override fun onResume() {
        super.onResume()
        accelerometer?.let {
            sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            audioStressMonitor.startMonitoring()
        }
    }

    override fun onPause() {
        super.onPause()
        sensorManager?.unregisterListener(this)
        audioStressMonitor.stopMonitoring()
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_ACCELEROMETER) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]

            // Calculate g-force acceleration
            val gX = x / SensorManager.GRAVITY_EARTH
            val gY = y / SensorManager.GRAVITY_EARTH
            val gZ = z / SensorManager.GRAVITY_EARTH
            val gForce = sqrt(gX * gX + gY * gY + gZ * gZ)

            // Feed continuous physical telemetry into AppState
            appState.updateMotionTelemetry(gForce)

            // Trigger shake SOS when physical threshold exceeded (> 2.4g)
            if (gForce > 2.4f) {
                val now = System.currentTimeMillis()
                if (now - lastShakeTimestamp > 450) {
                    lastShakeTimestamp = now
                    appState.simulateShake()
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
}

@Preview
@Composable
fun AppAndroidPreview() {
    App()
}