import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { HomePage } from "./pages/HomePage";
import { RecognitionPage } from "./pages/RecognitionPage";
import { ResultPage } from "./pages/ResultPage";
import { YieldPage } from "./pages/YieldPage";
import { WeatherPage } from "./pages/WeatherPage";
import { MandiPage } from "./pages/MandiPage";
import { SoilPage } from "./pages/SoilPage";
import { SchemesPage } from "./pages/SchemesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LibraryPage } from "./pages/LibraryPage";
import { FarmsPage } from "./pages/FarmsPage";
import { AuthPage } from "./pages/AuthPage";
import { OutbreakRadarPage } from "./pages/OutbreakRadarPage";
import { setupOfflineSyncListeners, flushPendingSyncQueue } from "./services/offlineSync";

export const App: React.FC = () => {
  useEffect(() => {
    // Setup offline network event listeners
    setupOfflineSyncListeners(() => {
      console.log("[App] Sync completed on network restoration.");
    });

    // Try initial queue flush on startup if online
    if (navigator.onLine) {
      flushPendingSyncQueue().then((res) => {
        if (res.synced > 0) {
          console.log(`[App] Initial startup synced ${res.synced} items.`);
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-agri-bg text-agri-text">
      <Routes>
        {/* 1. Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* 2. Farmer Onboarding */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* 3. Farmer Dashboard */}
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />

        {/* 4. Disease Detection */}
        <Route path="/recognize" element={<RecognitionPage />} />
        <Route path="/disease" element={<RecognitionPage />} />
        <Route path="/result" element={<ResultPage />} />

        {/* 5. Yield Forecasting */}
        <Route path="/yield" element={<YieldPage />} />

        {/* 6. Weather & Agro-Risk */}
        <Route path="/weather" element={<WeatherPage />} />

        {/* 7. Mandi Intelligence */}
        <Route path="/mandi" element={<MandiPage />} />

        {/* 8. Soil Health & Planning */}
        <Route path="/soil" element={<SoilPage />} />

        {/* 9. Government Schemes Directory */}
        <Route path="/schemes" element={<SchemesPage />} />

        {/* 10. Reports & Farmer History */}
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/history" element={<ReportsPage />} />

        {/* 11. Settings & Privacy */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* Additional Features */}
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route path="/outbreak" element={<OutbreakRadarPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/profile" element={<AuthPage />} />

        {/* Fallback */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </div>
  );
};

export default App;
