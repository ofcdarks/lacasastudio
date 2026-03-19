import { useState } from "react";
import { useApp } from "../context/AppContext";
import { aiApi } from "../lib/api";
import { Card, Btn, Hdr, Label, Input, Select, Badge, SecTitle, PBar, C, Empty } from "../components/shared/UI";

export default function Seo() {
  const { videos, channels } = useApp();
  const [selV, setSelV] = useState(videos[0]?.id);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const vid = videos.find(v => v.id === selV);
  const ch = vid?.channel || channels.find(c => c.id === vid?.channelId);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await aiApi.seo({
        title: vid?.title || topic,
        topic: topic || vid?.title,
        channelName: ch?.name || "",
      });
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter">
      <Hdr title="Gerador SEO + IA" sub="Otimize títulos, descrições e tags com inteligência artificial" />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>✦</span> Gerar Conteúdo SEO com IA
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr auto", gap: 12, alignItems: "end" }}>
          <div><Label t="Vídeo" /><Select value={selV||""} onChange={e => setSelV(Number(e.target.value))}>{videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</Select></div>
          <div><Label t="Tópico / Palavras-chave (opcional)" /><Input placeholder="Ex: React hooks, investimentos, treino em casa..." value={topic} onChange={e => setTopic(e.target.value)} /></div>
          <Btn onClick={generate} disabled={loading} style={{ height: 38 }}>{loading ? "🤖 Gerando..." : "✦ Gerar com IA"}</Btn>
        </div>
        {error && <div style={{ marginTop: 12, fontSize: 12, color: C.red, padding: "8px 12px", background: `${C.red}10`, borderRadius: 8 }}>{error}</div>}
      </Card>

      {!results && !loading && <Card><Empty icon="✦" title="Clique em 'Gerar com IA'" sub="A IA vai criar títulos, descrição e tags otimizados para SEO" /></Card>}

      {loading && (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12, animation: "pulse 1.5s infinite" }}>🤖</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Gerando conteúdo SEO...</div>
          <div style={{ fontSize: 13, color: C.muted }}>A IA está analisando e criando conteúdo otimizado</div>
          <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </Card>
      )}

      {results && !loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card color={C.orange}>
            <SecTitle t="Sugestões de Título" />
            {(results.titles || []).map((t, i) => (
              <div key={i} style={{ padding: "10px 12px", background: i === 0 ? `${C.orange}08` : "transparent", borderRadius: 8, marginBottom: 4, border: i === 0 ? `1px solid ${C.orange}20` : "1px solid transparent", cursor: "pointer" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: C.dim, marginRight: 8 }}>{i+1}.</span>
                <span style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? C.text : C.muted }}>{t}</span>
                {i === 0 && <Badge text="Top" color={C.green} v="tag" />}
              </div>
            ))}
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {results.score && (
              <Card color={C.green}>
                <SecTitle t="Score de Otimização" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[{ l: "SEO", v: results.score.seo, c: C.green }, { l: "CTR", v: results.score.ctr, c: C.orange }, { l: "Alcance", v: results.score.reach, c: C.blue }].map(s => (
                    <div key={s.l} style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 10, color: C.muted, marginTop: 4, marginBottom: 8 }}>{s.l}</div><PBar current={s.v} target={100} color={s.c} /></div>
                  ))}
                </div>
              </Card>
            )}
            <Card color={C.purple}><SecTitle t="Tags" /><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{(results.tags || []).map((tag, i) => <Badge key={i} text={tag} color={i < 3 ? C.purple : C.muted} v="tag" />)}</div></Card>
          </div>
          <div style={{ gridColumn: "1/-1" }}><Card color={C.blue}><SecTitle t="Descrição Otimizada" /><div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, whiteSpace: "pre-wrap", background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>{results.description || results.desc}</div></Card></div>
        </div>
      )}
    </div>
  );
}
