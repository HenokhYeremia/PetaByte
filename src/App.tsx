import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { DashboardPage } from "@/pages/DashboardPage";
import { ScannerPage } from "@/pages/ScannerPage";
import { DuplicatesPage } from "@/pages/DuplicatesPage";
import { CleanerPage } from "@/pages/CleanerPage";
import { MovePage } from "@/pages/MovePage";
import { HealthScorePage } from "@/pages/HealthScorePage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/duplicates" element={<DuplicatesPage />} />
            <Route path="/cleaner" element={<CleanerPage />} />
            <Route path="/move" element={<MovePage />} />
            <Route path="/health" element={<HealthScorePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </ErrorBoundary>
      </AppShell>
    </BrowserRouter>
  );
}
