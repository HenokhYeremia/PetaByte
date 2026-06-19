import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { ScannerPage } from "@/pages/ScannerPage";
import { DuplicatesPage } from "@/pages/DuplicatesPage";
import { CleanerPage } from "@/pages/CleanerPage";
import { MovePage } from "@/pages/MovePage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/duplicates" element={<DuplicatesPage />} />
          <Route path="/cleaner" element={<CleanerPage />} />
          <Route path="/move" element={<MovePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
