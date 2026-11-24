package in.vedoravision.stonetechos.app;

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
            window.setNavigationBarColor(ContextCompat.getColor(this, R.color.colorPrimaryDark));
        }
    }
}

