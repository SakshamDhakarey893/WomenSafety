package com.example.womensafty.sensor

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import com.example.womensafty.state.AppState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.sqrt

/**
 * Real-time Hardware Acoustic Sensor & Scream Stress Sentinel:
 * Continuously samples microphone PCM audio amplitude to compute root-mean-square (RMS) acoustic stress.
 * Normalizes acoustic energy into a 0.0 - 1.0 parameter for ShaktiSense Multimodal Threat Fusion.
 */
class AudioStressMonitor(
    private val context: Context,
    private val appState: AppState,
    private val scope: CoroutineScope
) {
    private var audioRecord: AudioRecord? = null
    private var recordingJob: Job? = null
    private val sampleRate = 16000
    private val channelConfig = AudioFormat.CHANNEL_IN_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT

    fun startMonitoring() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            return
        }

        if (recordingJob?.isActive == true) return

        try {
            val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
            val bufferSize = maxOf(minBufferSize, 2048)

            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                channelConfig,
                audioFormat,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                return
            }

            audioRecord?.startRecording()
            appState.isMicrophoneActive = true

            recordingJob = scope.launch(Dispatchers.Default) {
                val buffer = ShortArray(1024)
                while (isActive) {
                    val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (read > 0) {
                        var sumSquares = 0.0
                        for (i in 0 until read) {
                            sumSquares += buffer[i] * buffer[i]
                        }
                        val rms = sqrt(sumSquares / read)
                        // Normalize RMS (ambient whisper ~300, normal speech ~1200, scream/distress > 4000)
                        val normalizedStress = (rms.toFloat() / 4200.0f).coerceIn(0.05f, 1.0f)

                        withContext(Dispatchers.Main) {
                            appState.updateAcousticTelemetry(normalizedStress)
                        }
                    }
                    delay(120) // ~8 audio telemetry updates per second
                }
            }
        } catch (_: Exception) {
            stopMonitoring()
        }
    }

    fun stopMonitoring() {
        recordingJob?.cancel()
        recordingJob = null
        try {
            audioRecord?.stop()
            audioRecord?.release()
        } catch (_: Exception) {}
        audioRecord = null
        appState.isMicrophoneActive = false
    }
}
