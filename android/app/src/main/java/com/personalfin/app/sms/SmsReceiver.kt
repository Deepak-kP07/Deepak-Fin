package com.personalfin.app.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
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
 * Deliberately does the absolute minimum here: extract sender + body, relay via
 * LocalBroadcastManager to SmsListenerPlugin (only reachable while the app process is alive) and
 * return. All real work — parsing, matching against sms_parse_patterns, and the authenticated
 * fetch() to /api/finance/pending_transactions — happens in JS inside the WebView (see
 * lib/sms/nativeBridge.js), specifically BECAUSE that's the only place the WebView's own session
 * cookies are available; a plain Kotlin/OkHttp call from here would not carry them and would 401.
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
    if (messages.isNullOrEmpty()) return

    // A single SMS can arrive as multiple concatenated PDU parts — same sender, one logical
    // message body split across parts. Group by sender, join bodies in arrival order.
    val bySender = LinkedHashMap<String, StringBuilder>()
    for (message in messages) {
      val sender = message.originatingAddress ?: continue
      bySender.getOrPut(sender) { StringBuilder() }.append(message.messageBody ?: "")
    }

    for ((sender, body) in bySender) {
      val relay = Intent(SmsListenerPlugin.ACTION_SMS_RECEIVED).apply {
        putExtra(SmsListenerPlugin.EXTRA_SENDER, sender)
        putExtra(SmsListenerPlugin.EXTRA_BODY, body.toString())
        putExtra(SmsListenerPlugin.EXTRA_TIMESTAMP, System.currentTimeMillis())
      }
      LocalBroadcastManager.getInstance(context).sendBroadcast(relay)
    }
  }
}
