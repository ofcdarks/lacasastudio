// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Btn, Hdr } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const api = {
  generate: () => fetch("/api/competitive/daily-ideas/generate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("lc_token")}` }, body: "{}" }).then(r => r.json()),
  list: () => fetch("/api/competitive/daily-ideas", { headers: { Authorization: `Bearer ${localStorage.getItem("lc_token")}` } }).then(r => r.json()),
  use: (id) => fetch(`/api/competitive/daily-ideas/${id}/use`, { method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("lc_token")}` } }).then(r => r.json()),
};

const POT = { very_high: { c: C.red, bg: `${C.red}15`, l: "🔥 Muito Alto" }, high: { c: C.green, bg: `${C.green}15`, l: "🚀 Alto" }, medium: { c: "#F59E0B", bg: "#F59E0B15", l: "📊 Médio" }, low: { c: C.dim, bg: "rgba(255,255,255,.06)", l: "📉 Baixo" } };

export default function DailyIdeas() {
  const toast = useToast(); const pg = useProgress();
  const [ideas, setIdeas] = useState([]); const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const cp = txt => { try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); toast?.success("Copiado!"); } catch {} };

  useEffect(() => { api.list().then(setIdeas).catch(() => {}); }, []);

  const generate = async () => {
    setLoading(true); pg?.start("💡 Gerando Ideias do Dia", ["Coletando trends", "Analisando seus nichos", "IA criando ideias", "Ranqueando potencial"]);
    try {
      const d = await api.generate(); pg?.done();
      if (d.error) throw new Error(d.error);
      setContext({ niches: d.niches, trending: d.trendingContext });
      api.list().then(setIdeas).catch(() => {});
    } catch (e) { pg?.fail(e.message); } setLoading(false);
  };

  const markUsed = async (id) => {
    await api.use(id);
    setIdeas(ideas.map(i => i.id === id ? { ...i, used: true } : i));
    toast?.success("Marcado como usado!");
  };

  const todayIdeas = ideas.filter(i => new Date(i.createdAt).toDateString() === new Date().toDateString());
  const pastIdeas = ideas.filter(i => new Date(i.createdAt).toDateString() !== new Date().toDateString());

  return <div className="page-enter" style={{ maxWidth: 1000, margin: "0 auto" }}>
    <Hdr title="Ideias do Dia" sub="Ideias personalizadas baseadas nos seus nichos + tendências reais" />

    <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
      <Btn onClick={generate} disabled={loading}>{loading ? "⏳" : "💡 Gerar Ideias de Hoje"}</Btn>
      {todayIdeas.length > 0 && <span style={{ fontSize: 11, color: C.dim }}>{todayIdeas.length} ideias geradas hoje</span>}
    </div>

    {context && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
      {context.niches?.map((n, i) => <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${C.blue}12`, color: C.blue }}>{n}</span>)}
      <span style={{ fontSize: 11, color: C.dim }}>+ trends do Brasil</span>
    </div>}

    {todayIdeas.length > 0 && <div style={{ marginBottom: 28 }}>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>💡 Ideias para Hoje</div>
      <div style={{ display: "grid", gap: 10 }}>
        {todayIdeas.map(idea => {
          const p = POT[idea.potential] || POT.medium;
          return <div key={idea.id} style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${idea.used ? `${C.green}30` : C.border}`, padding: 16, opacity: idea.used ? 0.6 : 1, borderLeft: `4px solid ${p.c}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{idea.title}</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: p.c, background: p.bg, padding: "3px 10px", borderRadius: 6, flexShrink: 0, marginLeft: 8 }}>{p.l}</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 8 }}>{idea.reasoning}</div>
            {idea.tags && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {idea.tags.split(",").map((t, i) => <span key={i} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: `${C.purple}10`, color: C.purple }}>{t.trim()}</span>)}
            </div>}
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => cp(idea.title)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 10 }}>📋 Copiar título</button>
              {!idea.used && <button onClick={() => markUsed(idea.id)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.green}30`, background: `${C.green}08`, color: C.green, cursor: "pointer", fontSize: 10 }}>✅ Usar</button>}
              {idea.used && <span style={{ fontSize: 10, color: C.green, padding: "4px 10px" }}>✅ Usado</span>}
            </div>
          </div>;
        })}
      </div>
    </div>}

    {pastIdeas.length > 0 && <div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: C.dim }}>📜 Ideias Anteriores</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 8 }}>
        {pastIdeas.slice(0, 20).map(idea => {
          const p = POT[idea.potential] || POT.medium;
          return <div key={idea.id} onClick={() => cp(idea.title)} style={{ background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, padding: 12, cursor: "pointer", opacity: idea.used ? 0.5 : 0.8 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{idea.title}</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: p.c }}>{p.l}</span>
              <span style={{ fontSize: 9, color: C.dim }}>{new Date(idea.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>;
        })}
      </div>
    </div>}

    {!ideas.length && <div style={{ textAlign: "center", padding: 40, color: C.dim }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>💡</div>
      <div style={{ fontSize: 14 }}>Clique "Gerar Ideias de Hoje" para receber 10 ideias personalizadas</div>
      <div style={{ fontSize: 11, marginTop: 6 }}>Baseadas nos canais que você monitora + trends atuais</div>
    </div>}
  </div>;
}
