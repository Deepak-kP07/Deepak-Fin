package com.personalfin.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.personalfin.app.sms.SmsListenerPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(SmsListenerPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
