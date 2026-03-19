import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { videoApi, aiApi } from "../lib/api";
import { Card, Btn, Hdr, SecTitle, Select, C } from "../components/shared/UI";

export default function Editor() {
  const { videos, channels, refreshVideos } = useApp();
  const [selV, setSelV] = useState(videos[0]?.id);
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [saved, setSaved] = useState(false);
  const vid = videos.find(v => v.id === selV);
  const ch = vid?.channel || channels.find(c => c.id === vid?.channelId);
  const wc = script.split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    if (!selV) return;
    videoApi.get(selV).then(v => {
      setScript(v.script || "");
    }).catch(() => {});
  }, [selV]);

  const saveScript = async () => {
    try {
      await videoApi.update(selV, { script });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { alert(err.message); }
  };

  const generateScript = async () => {
    setLoading(true);
    try {
      const data = await aiApi.script({
        title: vid?.title,
        topic: vid?.title,
        duration: vid?.duration,
        style: "educativo e envolvente",
      });
      setScript(data.script);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const improveScript = async () => {
    if (!script.trim()) return;
    setImproving(true);
    try {
      const data = await aiApi.improve({
        text: script,
        instruction: "Melhore este roteiro de YouTube: torne-o mais envolvente, natural e com ganchos melhores. Mantenha a estrutura mas melhore o conteúdo.",
      });
      setScript(data.result);
    } catch (err) {
      alert(err.message);
    } finally {
      setImproving(false);
    }
  };

  return (
    <div className="page-enter">
      <Hdr title="Editor de Roteiro" sub="Escreva e organize o roteiro" action={
        <div style={{ display: "flex", gap: 8 }}>
          <Select style={{ width: 200 }} value={selV || ""} onChange={e => setSelV(Number(e.target.value))}>
            {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
          </Select>
        </div>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
        <div>
          <Card style={{ padding: 0, marginBottom: 12 }}>
            <textarea value={script} onChange={e => setScript(e.target.value)} placeholder="Escreva seu roteiro aqui ou clique em 'Gerar com IA'..."
              style={{ width: "100%", minHeight: 460, background: "transparent", border: "none", color: C.text, fontSize: 14, lineHeight: 1.8, padding: 24, outline: "none", resize: "vertical", fontFamily: "var(--font)" }} />
          </Card>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={saveScript} style={{ flex: 1, justifyContent: "center" }}>
              {saved ? "✓ Salvo!" : "💾 Salvar Roteiro"}
            </Btn>
            <Btn vr="ghost" onClick={generateScript} disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
              {loading ? "🤖 Gerando..." : "🤖 Gerar com IA"}
            </Btn>
            <Btn vr="ghost" onClick={improveScript} disabled={improving || !script.trim()} style={{ flex: 1, justifyContent: "center" }}>
              {improving ? "✨ Melhorando..." : "✨ Melhorar com IA"}
            </Btn>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <SecTitle t="Estatísticas" />
            {[{ l: "Palavras", v: wc }, { l: "Tempo estimado", v: `~${Math.ceil(wc / 150)} min` }, { l: "Caracteres", v: script.length }].map(s => (
              <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.muted }}>{s.l}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600 }}>{s.v}</span>
              </div>
            ))}
          </Card>
          <Card>
            <SecTitle t="Vídeo" />
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{vid?.title}</div>
            <div style={{ fontSize: 12, color: ch?.color }}>{ch?.name}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: C.dim, marginTop: 6 }}>{vid?.duration} · {vid?.date}</div>
          </Card>
          <Card color={C.purple}>
            <SecTitle t="IA" />
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              <strong style={{ color: C.text }}>Gerar:</strong> Cria um roteiro completo do zero baseado no título do vídeo.
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginTop: 8 }}>
              <strong style={{ color: C.text }}>Melhorar:</strong> Reescreve o roteiro atual tornando-o mais envolvente.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
