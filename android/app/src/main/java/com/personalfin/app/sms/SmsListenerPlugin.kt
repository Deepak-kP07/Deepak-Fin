package com.personalfin.app.sms

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import android.net.Uri
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
    const val EXTRA_SENDER = "sender"
    const val EXTRA_BODY = "body"
    const val EXTRA_TIMESTAMP = "timestamp"
  }

  private var relayReceiver: BroadcastReceiver? = null

  override fun load() {
    super.load()
    relayReceiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        val data = JSObject().apply {
          put("sender", intent.getStringExtra(EXTRA_SENDER) ?: "")
          put("body", intent.getStringExtra(EXTRA_BODY) ?: "")
          put("timestamp", intent.getLongExtra(EXTRA_TIMESTAMP, System.currentTimeMillis()))
        }
        notifyListeners("smsReceived", data)
      }
    }
    LocalBroadcastManager.getInstance(context).registerReceiver(relayReceiver!!, IntentFilter(ACTION_SMS_RECEIVED))
  }

  override fun handleOnDestroy() {
    relayReceiver?.let { LocalBroadcastManager.getInstance(context).unregisterReceiver(it) }
    super.handleOnDestroy()
  }

  @PluginMethod
  fun checkSmsPermission(call: PluginCall) {
    call.resolve(getSmsPermissionState())
  }

  @PluginMethod
  fun requestSmsPermission(call: PluginCall) {
    requestPermissionForAlias("sms", call, "smsPermissionCallback")
  }

  @PermissionCallback
  private fun smsPermissionCallback(call: PluginCall) {
    call.resolve(getSmsPermissionState())
  }

  private fun getSmsPermissionState(): JSObject {
    return JSObject().apply { put("granted", getPermissionState("sms").toString() == "GRANTED") }
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
