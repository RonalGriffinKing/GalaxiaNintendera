package com.galaxianintendera.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Activa el tratamiento moderno de recortes y barras. SystemBars coloca
        // despues la WebView completa dentro del area segura del dispositivo.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
