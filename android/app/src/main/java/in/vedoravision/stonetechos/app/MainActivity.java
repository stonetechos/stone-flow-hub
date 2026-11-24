package in.vedoravision.stonetechos.app;

import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        if (window != null) {
            int turquoise = ContextCompat.getColor(this, R.color.colorPrimaryDark);
            window.setNavigationBarColor(turquoise);
            window.setStatusBarColor(turquoise);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarContrastEnforced(false);
            }
        }
    }
}

