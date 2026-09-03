package com.personalfin.app.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import androidx.localbroadcastmanager.content.LocalBroadcastManager

/**
 * Registered in AndroidManifest.xml (not dynamically) for android.provider.Telephony.SMS_RECEIVED
 * — SMS_RECEIVED is a protected system broadcast, exempt from the implicit-broadcast restrictions
 * Android 8+ places on most other manifest-declared receivers, so this still fires even when the
 * app isn't in the foreground. It does NOT fire if the app has been force-stopped by the user or
 * killed by an aggressive OEM battery optimizer (Xiaomi/Oppo/Vivo) — see the PRD's onboarding
 * step asking the user to exempt this app from battery optimization; some messages will still be
 * missed on those devices no matter what, which is why manual entry stays a permanent fallback.
 *
 * Deliberately does the absolute minimum here: extract sender + body, persist to SmsQueueStore
 * (durable — survives this process being torn down right after, which is the common case when the
 * app wasn't already open) and relay live via LocalBroadcastManager for instant delivery when
 * SmsListenerPlugin already happens to be loaded. All real work — parsing, matching against
 * sms_parse_patterns, and the authenticated fetch() to /api/finance/pending_transactions — happens
 * in JS inside the WebView (see lib/sms/nativeBridge.js), specifically BECAUSE that's the only
 * place the WebView's own session cookies are available; a plain Kotlin/OkHttp call from here
 * would not carry them and would 401.
 */
class SmsReceiver : BroadcastReceiver() {
  companion object {
    private const val TAG = "PersonalFin-SMS"
  }

  override fun onReceive(context: Context, intent: Intent) {
    Log.d(TAG, "onReceive fired, action=${intent.action}")
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
    if (messages.isNullOrEmpty()) { Log.d(TAG, "getMessagesFromIntent returned nothing"); return }

    // A single SMS can arrive as multiple concatenated PDU parts — same sender, one logical
    // message body split across parts. Group by sender, join bodies in arrival order.
    val bySender = LinkedHashMap<String, StringBuilder>()
    for (message in messages) {
      val sender = message.originatingAddress ?: continue
      bySender.getOrPut(sender) { StringBuilder() }.append(message.messageBody ?: "")
    }

    for ((sender, body) in bySender) {
      Log.d(TAG, "queuing SMS from sender=$sender bodyLen=${body.length}")
      val id = java.util.UUID.randomUUID().toString()
      val timestamp = System.currentTimeMillis()
      SmsQueueStore.enqueue(context, id, sender, body.toString(), timestamp)
      val relay = Intent(SmsListenerPlugin.ACTION_SMS_RECEIVED).apply {
        putExtra(SmsListenerPlugin.EXTRA_ID, id)
        putExtra(SmsListenerPlugin.EXTRA_SENDER, sender)
        putExtra(SmsListenerPlugin.EXTRA_BODY, body.toString())
        putExtra(SmsListenerPlugin.EXTRA_TIMESTAMP, timestamp)
      }
      LocalBroadcastManager.getInstance(context).sendBroadcast(relay)
    }
  }
}
