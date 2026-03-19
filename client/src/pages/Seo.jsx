import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, Btn, Hdr, Label, Input, Select, Badge, SecTitle, PBar, C } from "../components/shared/UI";

export default function Seo() {
  const { videos } = useApp();
  const [selV, setSelV] = useState(videos[0]?.id);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const vid = videos.find(v => v.id === selV);

  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      const t = topic || vid?.title || "Conteúdo";
      setResults({
        titles: [`${t} — Guia Completo 2026`, `${t}: Tudo que Você PRECISA Saber`, `Como ${t} em 2026 (Método Comprovado)`, `${t} — Do Zero ao Avançado`, `Por que ${t} Vai MUDAR Tudo!`],
        desc: `Neste vídeo mostro tudo sobre ${t.toLowerCase()}. Do zero ao avançado.\n\n🔥 Timestamps:\n00:00 Intro\n00:30 Conceitos\n03:00 Prática\n08:00 Dicas\n11:00 Conclusão\n\n#${t.replace(/\s+/g,'')} #Tutorial #2026`,
        tags: [t, `${t} 2026`, `${t} tutorial`, `como ${t.toLowerCase()}`, `${t} dicas`, "tutorial", "2026"],
        score: { seo: 87, ctr: 72, reach: 91 },
      });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="page-enter">
      <Hdr title="Gerador SEO + IA" sub="Otimize títulos, descrições e tags com IA" />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Gerar Conteúdo SEO</div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr auto", gap: 12, alignItems: "end" }}>
          <div><Label t="Vídeo" /><Select value={selV||""} onChange={e => setSelV(Number(e.target.value))}>{videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</Select></div>
          <div><Label t="Tópico" /><Input placeholder="Ex: React hooks..." value={topic} onChange={e => setTopic(e.target.value)} /></div>
          <Btn onClick={generate} disabled={loading} style={{ height: 38 }}>{loading ? "⏳ Gerando..." : "✦ Gerar com IA"}</Btn>
        </div>
      </Card>
      {results && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card color={C.orange}>
            <SecTitle t="Sugestões de Título" />
            {results.titles.map((t, i) => (
              <div key={i} style={{ padding: "10px 12px", background: i === 0 ? `${C.orange}08` : "transparent", borderRadius: 8, marginBottom: 4, border: i === 0 ? `1px solid ${C.orange}20` : "1px solid transparent", cursor: "pointer" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: C.dim, marginRight: 8 }}>{i+1}.</span>
                <span style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? C.text : C.muted }}>{t}</span>
              </div>
            ))}
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card color={C.green}>
              <SecTitle t="Score" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[{ l: "SEO", v: results.score.seo, c: C.green }, { l: "CTR", v: results.score.ctr, c: C.orange }, { l: "Alcance", v: results.score.reach, c: C.blue }].map(s => (
                  <div key={s.l} style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 10, color: C.muted, marginTop: 4, marginBottom: 8 }}>{s.l}</div><PBar current={s.v} target={100} color={s.c} /></div>
                ))}
              </div>
            </Card>
            <Card color={C.purple}><SecTitle t="Tags" /><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{results.tags.map((tag, i) => <Badge key={i} text={tag} color={i < 3 ? C.purple : C.muted} v="tag" />)}</div></Card>
          </div>
          <div style={{ gridColumn: "1/-1" }}><Card color={C.blue}><SecTitle t="Descrição Otimizada" /><div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, whiteSpace: "pre-wrap", background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>{results.desc}</div></Card></div>
        </div>
      )}
    </div>
  );
}
