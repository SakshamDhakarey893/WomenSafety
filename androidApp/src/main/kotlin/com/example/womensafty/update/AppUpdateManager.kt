package com.example.womensafty.update

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.widget.Toast
import androidx.core.content.FileProvider
import java.io.File

/**
 * Production-ready in-app self-updater for ShaktiSense.
 * 100% Free OTA distribution via GitHub Releases or private CDN.
 */
class AppUpdateManager(private val context: Context) {

    fun downloadAndInstall(
        apkUrl: String,
        versionName: String,
        onStatusUpdate: (String) -> Unit = {}
    ) {
        try {
            if (apkUrl.isBlank()) {
                Toast.makeText(context, "Invalid update download URL", Toast.LENGTH_SHORT).show()
                onStatusUpdate("Error: Invalid download URL")
                return
            }

            onStatusUpdate("Preparing download for v$versionName...")
            Toast.makeText(context, "Downloading ShaktiSense v$versionName...", Toast.LENGTH_SHORT).show()

            val fileName = "ShaktiSense-v$versionName.apk"
            val downloadDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
            if (downloadDir != null && !downloadDir.exists()) {
                downloadDir.mkdirs()
            }
            val destinationFile = File(downloadDir, fileName)
            if (destinationFile.exists()) {
                destinationFile.delete()
            }

            val request = DownloadManager.Request(Uri.parse(apkUrl)).apply {
                setTitle("ShaktiSense v$versionName Update")
                setDescription("Downloading enhanced safety modules...")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationUri(Uri.fromFile(destinationFile))
                setMimeType("application/vnd.android.package-archive")
            }

            val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
            if (downloadManager == null) {
                onStatusUpdate("DownloadManager service unavailable")
                return
            }

            val downloadId = downloadManager.enqueue(request)
            onStatusUpdate("Downloading update in background...")

            val receiver = object : BroadcastReceiver() {
                override fun onReceive(recvContext: Context?, intent: Intent?) {
                    val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L) ?: -1L
                    if (id == downloadId) {
                        try {
                            context.unregisterReceiver(this)
                        } catch (_: Exception) {}

                        onStatusUpdate("Download complete! Launching package installer...")
                        installApk(destinationFile)
                    }
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(
                    receiver,
                    IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                    Context.RECEIVER_EXPORTED
                )
            } else {
                context.registerReceiver(
                    receiver,
                    IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
                )
            }
        } catch (e: Exception) {
            val errMsg = "Update failed: ${e.message}"
            Toast.makeText(context, errMsg, Toast.LENGTH_LONG).show()
            onStatusUpdate(errMsg)
        }
    }

    fun installApk(apkFile: File) {
        try {
            if (!apkFile.exists()) {
                Toast.makeText(context, "Installation file not found", Toast.LENGTH_SHORT).show()
                return
            }

            // Verify permission on Android 8.0 (API 26) and above
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.packageManager.canRequestPackageInstalls()) {
                    Toast.makeText(
                        context,
                        "Please allow 'Install unknown apps' permission to update ShaktiSense",
                        Toast.LENGTH_LONG
                    ).show()

                    val settingsIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:${context.packageName}")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(settingsIntent)
                    return
                }
            }

            val contentUri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.provider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }

            context.startActivity(installIntent)
        } catch (e: Exception) {
            Toast.makeText(context, "Failed to launch installer: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
}
