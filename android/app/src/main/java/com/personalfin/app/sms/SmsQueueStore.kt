package com.personalfin.app.sms

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Durable local queue for SMS events. SmsReceiver runs in a throwaway process Android spins up
 * just for onReceive() when the app is fully closed — no Activity/WebView/Capacitor plugin exists
 * in that process, so the LocalBroadcastManager relay in SmsListenerPlugin has nothing to deliver
 * to and the event would otherwise be lost forever. Persisting here lets
 * SmsListenerPlugin.load() flush anything still queued to JS the next time the app is actually
 * opened, instead of the message silently vanishing.
 */
object SmsQueueStore {
  private const val PREFS_NAME = "sms_relay_queue"
  private const val KEY_QUEUE = "queue"

  data class Item(val id: String, val sender: String, val body: String, val timestamp: Long)

  @Synchronized
  fun enqueue(context: Context, id: String, sender: String, body: String, timestamp: Long) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val array = JSONArray(prefs.getString(KEY_QUEUE, "[]"))
    array.put(JSONObject().apply {
      put("id", id)
      put("sender", sender)
      put("body", body)
      put("timestamp", timestamp)
    })
    prefs.edit().putString(KEY_QUEUE, array.toString()).apply()
  }

  @Synchronized
  fun remove(context: Context, id: String) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val array = JSONArray(prefs.getString(KEY_QUEUE, "[]"))
    val filtered = JSONArray()
    for (i in 0 until array.length()) {
      val entry = array.getJSONObject(i)
      if (entry.getString("id") != id) filtered.put(entry)
    }
    prefs.edit().putString(KEY_QUEUE, filtered.toString()).apply()
  }

  // Returns everything still queued and clears the store — called once per plugin load, so any
  // entry still here at that point necessarily arrived while the app wasn't running to catch it.
  @Synchronized
  fun drainAll(context: Context): List<Item> {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val array = JSONArray(prefs.getString(KEY_QUEUE, "[]"))
    val items = mutableListOf<Item>()
    for (i in 0 until array.length()) {
      val entry = array.getJSONObject(i)
      items.add(Item(entry.getString("id"), entry.getString("sender"), entry.getString("body"), entry.getLong("timestamp")))
    }
    prefs.edit().putString(KEY_QUEUE, "[]").apply()
    return items
  }
}
