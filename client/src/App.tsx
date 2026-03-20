import { useState, ReactNode, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Spinner, C } from "./components/shared/UI";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import AiChat from "./components/shared/AiChat";
import { ProgressProvider } from "./components/shared/ProgressModal";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import LoginPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Lazy load heavy pages
const Planner = lazy(() => import("./pages/Planner"));
const Storyboard = lazy(() => import("./pages/Storyboard"));
const Editor = lazy(() => import("./pages/Editor"));
const Checklist = lazy(() => import("./pages/Checklist"));
const Seo = lazy(() => import("./pages/Seo"));
const Metas = lazy(() => import("./pages/Metas"));
const Templates = lazy(() => import("./pages/Templates"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Research = lazy(() => import("./pages/Research"));
const Shorts = lazy(() => import("./pages/Shorts"));
const ThumbEditor = lazy(() => import("./pages/ThumbEditor"));
const Analyzer = lazy(() => import("./pages/Analyzer"));
const Orcamento = lazy(() => import("./pages/Orcamento"));
const Ativos = lazy(() => import("./pages/Ativos"));
const Equipe = lazy(() => import("./pages/Equipe"));
const Settings = lazy(() => import("./pages/Settings"));
const Ideas = lazy(() => import("./pages/Ideas"));
const Admin = lazy(() => import("./pages/Admin"));
function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content" style={{ marginLeft: 220, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", transition: "margin 0.2s" }}>
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="page-padding" style={{ padding: "24px 32px", flex: 1, background: `radial-gradient(ellipse at 30% 0%, rgba(239,68,68,0.03) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(59,130,246,0.02) 0%, transparent 60%)` }}>
          <ProgressProvider><Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,padding:40}}><Spinner/></div>}><ErrorBoundary>{children}</ErrorBoundary></Suspense></ProgressProvider>
        </div>
      </main>
      <AiChat />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}><Spinner /></div>;
  if (!user) return <Routes><Route path="/login" element={<LoginPage />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/planner" element={<Layout><Planner /></Layout>} />
      <Route path="/storyboard" element={<Layout><Storyboard /></Layout>} />
      <Route path="/editor" element={<Layout><Editor /></Layout>} />
      <Route path="/checklist" element={<Layout><Checklist /></Layout>} />
      <Route path="/seo" element={<Layout><Seo /></Layout>} />
      <Route path="/metas" element={<Layout><Metas /></Layout>} />
      <Route path="/templates" element={<Layout><Templates /></Layout>} />
      <Route path="/calendario" element={<Layout><Calendario /></Layout>} />
      <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
      <Route path="/research" element={<Layout><Research /></Layout>} />
      <Route path="/shorts" element={<Layout><Shorts /></Layout>} />
      <Route path="/thumbs" element={<Layout><ThumbEditor /></Layout>} />
      <Route path="/analyzer" element={<Layout><Analyzer /></Layout>} />
      <Route path="/orcamento" element={<Layout><Orcamento /></Layout>} />
      <Route path="/ativos" element={<Layout><Ativos /></Layout>} />
      <Route path="/equipe" element={<Layout><Equipe /></Layout>} />
      <Route path="/settings" element={<Layout><Settings /></Layout>} />
            <Route path="/admin" element={<Layout><Admin /></Layout>} />
      <Route path="/ideas" element={<Layout><Ideas /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
