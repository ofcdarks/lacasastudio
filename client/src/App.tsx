import { useState, ReactNode, lazy, Suspense, useCallback, useMemo } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useOnline } from "./lib/useOnline";
import { useKeyboard } from "./lib/useKeyboard";
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
const Checklist = lazy(() => import("./pages/Checklist"));
const Seo = lazy(() => import("./pages/Seo"));
const Metas = lazy(() => import("./pages/Metas"));
const Templates = lazy(() => import("./pages/Templates"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Research = lazy(() => import("./pages/Research"));
const Shorts = lazy(() => import("./pages/Shorts"));
const ThumbEditor = lazy(() => import("./pages/ThumbEditor"));
const Analyzer = lazy(() => import("./pages/Analyzer"));
const Hooks = lazy(() => import("./pages/Hooks"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const FullScript = lazy(() => import("./pages/FullScript"));
const ViralPredict = lazy(() => import("./pages/ViralPredict"));
const Monetize360 = lazy(() => import("./pages/Monetize360"));
const Repurpose = lazy(() => import("./pages/Repurpose"));
const AlgoTools = lazy(() => import("./pages/AlgoTools"));
const Orcamento = lazy(() => import("./pages/Orcamento"));
const Ativos = lazy(() => import("./pages/Ativos"));
const Equipe = lazy(() => import("./pages/Equipe"));
const Settings = lazy(() => import("./pages/Settings"));
const Ideas = lazy(() => import("./pages/Ideas"));
const Admin = lazy(() => import("./pages/Admin"));
const Keywords = lazy(() => import("./pages/Keywords"));
const TagSpy = lazy(() => import("./pages/TagSpy"));
const SeoAudit = lazy(() => import("./pages/SeoAudit"));
const Compare = lazy(() => import("./pages/Compare"));
const DailyIdeas = lazy(() => import("./pages/DailyIdeas"));
const RetentionAnalyzer = lazy(() => import("./pages/RetentionAnalyzer"));
const ShortsClipper = lazy(() => import("./pages/ShortsClipper"));
const MyAnalytics = lazy(() => import("./pages/MyAnalytics"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const ABTesting = lazy(() => import("./pages/ABTesting"));
const StreakTracker = lazy(() => import("./pages/StreakTracker"));
const CommunityPlanner = lazy(() => import("./pages/CommunityPlanner"));
const ShortsOptimizer = lazy(() => import("./pages/ShortsOptimizer"));
const CatalogOptimizer = lazy(() => import("./pages/CatalogOptimizer"));
const HypeStrategy = lazy(() => import("./pages/HypeStrategy"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Editor = lazy(() => import("./pages/Editor"));
const MultiLang = lazy(() => import("./pages/MultiLang"));
const PrePublish = lazy(() => import("./pages/PrePublish"));
const GestaoCanais = lazy(() => import("./pages/GestaoCanais"));
const CanalDetalhe = lazy(() => import("./pages/CanalDetalhe"));
const Referencias = lazy(() => import("./pages/Referencias"));
const TextTools = lazy(() => import("./pages/TextTools"));
const VideosVirais = lazy(() => import("./pages/VideosVirais"));
const NichosVirais = lazy(() => import("./pages/NichosVirais"));
const CanaisRemovidos = lazy(() => import("./pages/CanaisRemovidos"));
const InsightsCanal = lazy(() => import("./pages/InsightsCanal"));
const FrameCut = lazy(() => import("./pages/FrameCut"));

function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const online = useOnline();
  const navigate = useNavigate();

  const shortcuts = useMemo(() => ({
    "mod+k": () => document.dispatchEvent(new CustomEvent("open-search")),
    "mod+n": () => navigate("/planner"),
    "mod+d": () => navigate("/"),
  }), [navigate]);

  useKeyboard(shortcuts);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Skip to content - a11y */}
      <a href="#main-content" className="skip-link">Pular para o conteúdo</a>

      {/* Offline banner */}
      {!online && (
        <div className="offline-banner" role="alert" aria-live="polite">
          ⚠️ Sem conexão com a internet — alterações podem não ser salvas
        </div>
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main
        id="main-content"
        className="main-content"
        role="main"
        tabIndex={-1}
        style={{
          marginLeft: "var(--sidebar-w)", flex: 1, minHeight: "100vh",
          display: "flex", flexDirection: "column",
          transition: "margin 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div
          className="page-padding"
          style={{
            padding: "28px 32px", flex: 1,
            background: `radial-gradient(ellipse at 20% 0%, rgba(240,68,68,0.018) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(75,141,248,0.012) 0%, transparent 50%)`,
          }}
        >
          <ProgressProvider>
            <Suspense fallback={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: 40 }}
                   role="status" aria-label="Carregando">
                <Spinner />
              </div>
            }>
              <ErrorBoundary>{children}</ErrorBoundary>
            </Suspense>
          </ProgressProvider>
        </div>
      </main>
      <AiChat />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}
         role="status" aria-label="Carregando aplicação">
      <Spinner />
    </div>
  );

  if (!user) return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/planner" element={<Layout><Planner /></Layout>} />
      <Route path="/storyboard" element={<Layout><Storyboard /></Layout>} />
      <Route path="/checklist" element={<Layout><Checklist /></Layout>} />
      <Route path="/seo" element={<Layout><Seo /></Layout>} />
      <Route path="/metas" element={<Layout><Metas /></Layout>} />
      <Route path="/templates" element={<Layout><Templates /></Layout>} />
      <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
      <Route path="/research" element={<Layout><Research /></Layout>} />
      <Route path="/shorts" element={<Layout><Shorts /></Layout>} />
      <Route path="/thumbs" element={<Layout><ThumbEditor /></Layout>} />
      <Route path="/analyzer" element={<Layout><Analyzer /></Layout>} />
      <Route path="/hooks" element={<Layout><Hooks /></Layout>} />
      <Route path="/pipeline" element={<Layout><Pipeline /></Layout>} />
      <Route path="/roteiro" element={<Layout><FullScript /></Layout>} />
      <Route path="/preditor" element={<Layout><ViralPredict /></Layout>} />
      <Route path="/monetizar" element={<Layout><Monetize360 /></Layout>} />
      <Route path="/repurpose" element={<Layout><Repurpose /></Layout>} />
      <Route path="/algoritmo" element={<Layout><AlgoTools /></Layout>} />
      <Route path="/orcamento" element={<Layout><Orcamento /></Layout>} />
      <Route path="/ativos" element={<Layout><Ativos /></Layout>} />
      <Route path="/equipe" element={<Layout><Equipe /></Layout>} />
      <Route path="/settings" element={<Layout><Settings /></Layout>} />
      <Route path="/admin" element={<Layout><Admin /></Layout>} />
      <Route path="/ideas" element={<Layout><Ideas /></Layout>} />
      <Route path="/keywords" element={<Layout><Keywords /></Layout>} />
      <Route path="/tag-spy" element={<Layout><TagSpy /></Layout>} />
      <Route path="/seo-audit" element={<Layout><SeoAudit /></Layout>} />
      <Route path="/compare" element={<Layout><Compare /></Layout>} />
      <Route path="/daily-ideas" element={<Layout><DailyIdeas /></Layout>} />
      <Route path="/retention" element={<Layout><RetentionAnalyzer /></Layout>} />
      <Route path="/shorts-clip" element={<Layout><ShortsClipper /></Layout>} />
      <Route path="/my-analytics" element={<Layout><MyAnalytics /></Layout>} />
      <Route path="/command-center" element={<Layout><CommandCenter /></Layout>} />
      <Route path="/ab-testing" element={<Layout><ABTesting /></Layout>} />
      <Route path="/streak" element={<Layout><StreakTracker /></Layout>} />
      <Route path="/community" element={<Layout><CommunityPlanner /></Layout>} />
      <Route path="/shorts-optimizer" element={<Layout><ShortsOptimizer /></Layout>} />
      <Route path="/catalog" element={<Layout><CatalogOptimizer /></Layout>} />
      <Route path="/hype" element={<Layout><HypeStrategy /></Layout>} />
      <Route path="/editor" element={<Layout><Editor /></Layout>} />
      <Route path="/calendario" element={<Layout><Calendario /></Layout>} />
      <Route path="/gestao-canais" element={<Layout><GestaoCanais /></Layout>} />
      <Route path="/canal/:id" element={<Layout><CanalDetalhe /></Layout>} />
      <Route path="/referencias" element={<Layout><Referencias /></Layout>} />
      <Route path="/text-tools" element={<Layout><TextTools /></Layout>} />
      <Route path="/videos-virais" element={<Layout><VideosVirais /></Layout>} />
      <Route path="/nichos-virais" element={<Layout><NichosVirais /></Layout>} />
      <Route path="/canais-removidos" element={<Layout><CanaisRemovidos /></Layout>} />
      <Route path="/insights-canal" element={<Layout><InsightsCanal /></Layout>} />
      <Route path="/framecut" element={<Layout><FrameCut /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
