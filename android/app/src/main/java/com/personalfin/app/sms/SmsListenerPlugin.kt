package com.personalfin.app.sms

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.provider.Settings
import android.net.Uri
import androidx.core.content.ContextCompat
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * Bridges SmsReceiver (a manifest-registered BroadcastReceiver, see that file) to the JS layer.
 * Deliberately thin — no parsing, no network calls happen here. The plugin's only jobs are:
 * permission request/check (RECEIVE_SMS + READ_SMS, both runtime-dangerous permissions), and
 * relaying each detected SMS to JS via notifyListeners so lib/sms/nativeBridge.js can parse it
 * (lib/sms/parseEngine.js) and POST it to /api/finance/pending_transactions itself — that fetch
 * has to happen in the WebView's own JS to carry its session cookies (see SmsReceiver.kt's
 * comment), so this plugin never makes that call on Kotlin's side.
 */
@CapacitorPlugin(
  name = "SmsListener",
  permissions = [
    Permission(
      alias = "sms",
      strings = [Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS]
    )
  ]
)
class SmsListenerPlugin : Plugin() {
  companion object {
    const val ACTION_SMS_RECEIVED = "com.personalfin.app.sms.SMS_RECEIVED"
    const val EXTRA_ID = "id"
    const val EXTRA_SENDER = "sender"
    const val EXTRA_BODY = "body"
    const val EXTRA_TIMESTAMP = "timestamp"
  }

  private var relayReceiver: BroadcastReceiver? = null

  override fun load() {
    super.load()
    relayReceiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(EXTRA_ID)
        if (id != null) SmsQueueStore.remove(context, id)
        val data = JSObject().apply {
          put("sender", intent.getStringExtra(EXTRA_SENDER) ?: "")
          put("body", intent.getStringExtra(EXTRA_BODY) ?: "")
          put("timestamp", intent.getLongExtra(EXTRA_TIMESTAMP, System.currentTimeMillis()))
        }
        // retainUntilConsumed=true — the JS side's addListener('smsReceived', ...) call happens
        // after React mounts, which can land a beat after this plugin loads; without retaining,
        // an event that fires in that gap would be dropped the same way the closed-app case was.
        notifyListeners("smsReceived", data, true)
      }
    }
    LocalBroadcastManager.getInstance(context).registerReceiver(relayReceiver!!, IntentFilter(ACTION_SMS_RECEIVED))

    // Anything still in the queue at this point necessarily arrived while the app wasn't running
    // to catch the live relay above — see SmsQueueStore's doc comment. Flush it now so those SMS
    // aren't lost, which is what was happening for every transaction received while the app was
    // fully closed (i.e. normal, non-debugging use).
    for (item in SmsQueueStore.drainAll(context)) {
      notifyListeners("smsReceived", JSObject().apply {
        put("sender", item.sender)
        put("body", item.body)
        put("timestamp", item.timestamp)
      }, true)
    }
  }

  override fun handleOnDestroy() {
    relayReceiver?.let { LocalBroadcastManager.getInstance(context).unregisterReceiver(it) }
    super.handleOnDestroy()
  }

  // Checks both underlying permission strings directly via ContextCompat instead of Capacitor's
  // own alias-aggregate getPermissionState("sms") — that helper was reporting DENIED even when
  // Android's own Settings screen (and a direct checkSelfPermission query) showed both RECEIVE_SMS
  // and READ_SMS as genuinely granted, which is exactly what made "Enable" loop forever showing
  // "permission was denied" no matter how many times it was tapped. This is a simpler, more
  // direct check that can't disagree with what the OS itself reports.
  private fun hasSmsPermission(): Boolean {
    return ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
  }

  @PluginMethod
  fun checkSmsPermission(call: PluginCall) {
    call.resolve(JSObject().apply { put("granted", hasSmsPermission()) })
  }

  @PluginMethod
  fun requestSmsPermission(call: PluginCall) {
    if (hasSmsPermission()) { call.resolve(JSObject().apply { put("granted", true) }); return }
    requestPermissionForAlias("sms", call, "smsPermissionCallback")
  }

  @PermissionCallback
  private fun smsPermissionCallback(call: PluginCall) {
    call.resolve(JSObject().apply { put("granted", hasSmsPermission()) })
  }

  // Android has no direct API to query/toggle battery-optimization exemption status — only to
  // launch the system settings screen that lets the user do it. See lib/sms/nativeBridge.js /
  // the onboarding UI for when this is offered, per the PRD's step asking users to disable
  // battery optimization for more reliable background detection.
  @PluginMethod
  fun openBatteryOptimizationSettings(call: PluginCall) {
    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
      data = Uri.parse("package:" + context.packageName)
    }
    activity.startActivity(intent)
    call.resolve()
  }
}
