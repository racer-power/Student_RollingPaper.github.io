import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ConfigMissing } from './components/ConfigMissing';
import { isSupabaseConfigured } from './lib/supabase';
import { LandingPage } from './pages/LandingPage';
import { CreatePage } from './pages/CreatePage';
import { JoinPage } from './pages/JoinPage';
import { SelectNamePage } from './pages/SelectNamePage';
import { StudentHomePage } from './pages/StudentHomePage';
import { WritePage } from './pages/WritePage';
import { MyRollingPaperPage } from './pages/MyRollingPaperPage';
import { HostPage } from './pages/HostPage';
import { DisplayPage } from './pages/DisplayPage';
import { ExportPage } from './pages/ExportPage';

export default function App() {
  if (!isSupabaseConfigured) {
    return <ConfigMissing />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/join/:code/select" element={<SelectNamePage />} />
        <Route path="/room/:code" element={<StudentHomePage />} />
        <Route path="/room/:code/write" element={<WritePage />} />
        <Route path="/room/:code/me" element={<MyRollingPaperPage />} />
        <Route path="/room/:code/host" element={<HostPage />} />
        <Route path="/room/:code/display" element={<DisplayPage />} />
        <Route path="/room/:code/export" element={<ExportPage />} />
      </Routes>
    </BrowserRouter>
  );
}
