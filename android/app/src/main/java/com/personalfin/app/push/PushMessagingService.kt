package com.personalfin.app.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.capacitorjs.plugins.pushnotifications.MessagingService
import com.google.firebase.messaging.RemoteMessage
import com.personalfin.app.MainActivity
import com.personalfin.app.R

/**
 * Replaces Capacitor's stock MessagingService (see AndroidManifest.xml's tools:node="remove" on
 * that entry) so a push can show up with the app's actual full-color logo, not just the
 * monochrome status-bar silhouette Android forces on the small icon (res/drawable-*dpi/
 * ic_stat_notification.png — an OS-wide rule, no app can bypass it for that specific slot). The
 * *large* icon next to the notification text has no such restriction, so this loads the real
 * bundled launcher icon (R.mipmap.ic_launcher — the same file used for the app icon itself,
 * already the correct branded logo) for that slot instead.
 *
 * Extends Capacitor's own service and calls super.onMessageReceived() first specifically to keep
 * its existing JS-bridging behavior (pushNotificationReceived / onNewToken) working unchanged —
 * this class only adds the actual notification display on top.
 *
 * Requires FCM messages to be sent as data-only (see lib/server/services/pushFcm.js) rather than
 * with a `notification` payload block — a `notification` payload gets auto-displayed by Play
 * Services directly, without ever invoking onMessageReceived(), which is what left no way to
 * control the large icon before this existed.
 */
class PushMessagingService : MessagingService() {
  companion object {
    private const val CHANNEL_ID = "default"
  }

  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    super.onMessageReceived(remoteMessage)

    val title = remoteMessage.data["title"] ?: return
    val body = remoteMessage.data["body"] ?: ""
    val url = remoteMessage.data["url"]

    ensureChannel()

    val largeIcon = BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)

    val launchIntent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      if (url != null) putExtra("push_url", url)
    }
    val pendingIntent = PendingIntent.getActivity(
      this, 0, launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_notification)
      .setLargeIcon(largeIcon)
      .setColor(ContextCompat.getColor(this, R.color.notification_accent_color))
      .setContentTitle(title)
      .setContentText(body)
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .build()

    NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    manager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "General", NotificationManager.IMPORTANCE_DEFAULT)
    )
  }
}
