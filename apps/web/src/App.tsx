import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { RecognitionPage } from "./pages/RecognitionPage";
import { ResultPage } from "./pages/ResultPage";
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
        <Route path="/" element={<HomePage />} />
        <Route path="/recognize" element={<RecognitionPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route path="/outbreak" element={<OutbreakRadarPage />} />
        <Route path="/profile" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </div>
  );
};

export default App;
