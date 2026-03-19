import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, Hdr, SecTitle, Select, C } from "../components/shared/UI";

export default function Editor() {
  const { videos, channels } = useApp();
  const [selV, setSelV] = useState(videos[0]?.id);
  const [script, setScript] = useState("# Abertura\n\nE aí galera! Tudo bem? Hoje vou mostrar algo incrível...\n\n# Desenvolvimento\n\nVamos entender o conceito por trás...\n\n# Demonstração\n\nAgora na prática...\n\n# Encerramento\n\nCurtiu? Deixa o like e se inscreve!");
  const vid = videos.find(v => v.id === selV);
  const ch = vid?.channel || channels.find(c => c.id === vid?.channelId);
  const wc = script.split(/\s+/).filter(Boolean).length;

  return (
    <div className="page-enter">
      <Hdr title="Editor de Roteiro" sub="Escreva e organize o roteiro" action={<Select style={{ width: 200 }} value={selV || ""} onChange={e => setSelV(Number(e.target.value))}>{videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</Select>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
        <Card style={{ padding: 0 }}><textarea value={script} onChange={e => setScript(e.target.value)} style={{ width: "100%", minHeight: 500, background: "transparent", border: "none", color: C.text, fontSize: 14, lineHeight: 1.8, padding: 24, outline: "none", resize: "vertical", fontFamily: "var(--font)" }} /></Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card><SecTitle t="Estatísticas" />{[{ l: "Palavras", v: wc }, { l: "Tempo estimado", v: `~${Math.ceil(wc/150)} min` }, { l: "Caracteres", v: script.length }].map(s => (<div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}><span style={{ fontSize: 12, color: C.muted }}>{s.l}</span><span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600 }}>{s.v}</span></div>))}</Card>
          <Card><SecTitle t="Vídeo" /><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{vid?.title}</div><div style={{ fontSize: 12, color: ch?.color }}>{ch?.name}</div></Card>
        </div>
      </div>
    </div>
  );
}
