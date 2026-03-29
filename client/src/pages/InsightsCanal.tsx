// @ts-nocheck
import { useState } from "react";
import { C, Card, Btn } from "../components/shared/UI";
import { youtubeApi } from "../lib/api";

const fmt = (n) => { if (!n) return "0"; if (n >= 1e9) return (n / 1e9).toFixed(1) + "B"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };

export default function InsightsCanal() {
  const [url, setUrl] = useState("");
  const [videoCount, setVideoCount] = useState(100);
  const [orderBy, setOrderBy] = useState("recent");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      // 1. Get channel info
      const handle = url.replace(/.*\/(c\/|channel\/|@)?/, "").replace(/\?.*/, "").trim();
      const channelData = await youtubeApi.channel(handle);
      if (!channelData || !channelData.id) throw new Error("Canal não encontrado");

      // 2. Get videos
      const max = Math.min(videoCount, 50); // YouTube API max per request
      const videos = await youtubeApi.videos(channelData.id, max);

      // Sort videos
      const sorted = [...(videos || [])];
      if (orderBy === "popular") sorted.sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0));

      // 3. Analyze via AI — use correct payload format
      let analysis = null;
      try {
        analysis = await youtubeApi.analyze({
          channelName: channelData.title,
          stats: channelData.stats,
          recentVideos: sorted.slice(0, 15),
        });
      } catch (e) {
        // AI analysis is optional — show videos even if AI fails
        analysis = { error: "Análise IA indisponível. Configure a API Key de IA nas Configurações." };
      }

      setResult({ channel: channelData, videos: sorted, analysis });
    } catch (e) { setError(e.message || "Erro ao analisar canal"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.purple}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📊</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Insights de Canal</h1>
          <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Análise inteligente de canais do YouTube</p>
        </div>
      </div>

      <Card color={C.orange} style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.orange }}>⚠️ Esta funcionalidade utiliza a API do YouTube. Certifique-se de ter uma API Key configurada.</div>
      </Card>

      <Card style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8, display: "block" }}>URL do Canal</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Cole a URL do canal do YouTube aqui..." onKeyDown={(e) => e.key === "Enter" && analyze()} style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, outline: "none" }} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10, display: "block" }}>Quantidade de Vídeos</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[10, 25, 50, 100].map((n) => (
              <button key={n} onClick={() => setVideoCount(n)} style={{ padding: "16px 8px", borderRadius: 12, border: `2px solid ${videoCount === n ? C.cyan : C.border}`, background: videoCount === n ? `${C.cyan}08` : C.bg, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{n}</div>
                <div style={{ fontSize: 11, color: C.dim }}>vídeos</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10, display: "block" }}>Ordenar Por</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[{ k: "recent", l: "Mais Recentes", d: "Últimos postados" }, { k: "popular", l: "Mais Populares", d: "Maior número de views" }].map((o) => (
              <button key={o.k} onClick={() => setOrderBy(o.k)} style={{ padding: "14px", borderRadius: 12, border: `2px solid ${orderBy === o.k ? C.cyan : C.border}`, background: orderBy === o.k ? `${C.cyan}08` : C.bg, cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{o.l}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{o.d}</div>
              </button>
            ))}
          </div>
        </div>

        <Btn onClick={analyze} disabled={loading || !url.trim()} style={{ width: "100%", padding: "16px", borderRadius: 12, background: loading ? C.dim : "linear-gradient(135deg, #A855F7, #6366F1)", color: "#fff", fontWeight: 700, fontSize: 15, textAlign: "center", opacity: loading || !url.trim() ? 0.5 : 1 }}>
          {loading ? "⏳ Analisando..." : "✨ Iniciar Análise"}
        </Btn>
      </Card>

      {error && <Card color={C.red} style={{ padding: 14, marginBottom: 16 }}><span style={{ fontSize: 12, color: C.red }}>⚠️ {error}</span></Card>}

      {result && (
        <div>
          {/* Channel Overview */}
          <Card style={{ marginBottom: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              {result.channel.thumbnail && <img src={result.channel.thumbnail} alt="" style={{ width: 60, height: 60, borderRadius: 30, objectFit: "cover" }} />}
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{result.channel.title}</div>
                <div style={{ fontSize: 12, color: C.dim }}>{result.channel.customUrl}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              <div style={{ textAlign: "center", padding: 12, background: `${C.blue}08`, borderRadius: 10 }}><div style={{ fontSize: 22, fontWeight: 800, color: C.blue }}>{fmt(result.channel.stats?.subscribers)}</div><div style={{ fontSize: 10, color: C.dim }}>Inscritos</div></div>
              <div style={{ textAlign: "center", padding: 12, background: `${C.green}08`, borderRadius: 10 }}><div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{fmt(result.channel.stats?.views)}</div><div style={{ fontSize: 10, color: C.dim }}>Views Totais</div></div>
              <div style={{ textAlign: "center", padding: 12, background: `${C.purple}08`, borderRadius: 10 }}><div style={{ fontSize: 22, fontWeight: 800, color: C.purple }}>{result.channel.stats?.videos}</div><div style={{ fontSize: 10, color: C.dim }}>Vídeos</div></div>
              <div style={{ textAlign: "center", padding: 12, background: `${C.orange}08`, borderRadius: 10 }}><div style={{ fontSize: 22, fontWeight: 800, color: C.orange }}>{result.videos?.length || 0}</div><div style={{ fontSize: 10, color: C.dim }}>Analisados</div></div>
            </div>
          </Card>

          {/* AI Analysis */}
          {result.analysis && !result.analysis.error && (
            <Card style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>📊 Análise Inteligente</div>
              {result.analysis.summary && <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>{result.analysis.summary}</p>}
              {result.analysis.strengths && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 6 }}>💪 Pontos Fortes:</div>
                  {result.analysis.strengths.filter(Boolean).map((s, i) => <div key={i} style={{ fontSize: 12, color: C.muted, padding: "2px 0" }}>• {s}</div>)}
                </div>
              )}
              {result.analysis.improvements && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.orange, marginBottom: 6 }}>📈 Melhorias:</div>
                  {result.analysis.improvements.filter(Boolean).map((s, i) => <div key={i} style={{ fontSize: 12, color: C.muted, padding: "2px 0" }}>• {s}</div>)}
                </div>
              )}
              {result.analysis.nextVideoIdeas && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 6 }}>💡 Ideias para Próximos Vídeos:</div>
                  {result.analysis.nextVideoIdeas.filter(Boolean).map((s, i) => <div key={i} style={{ fontSize: 12, color: C.muted, padding: "2px 0" }}>• {s}</div>)}
                </div>
              )}
              {result.analysis.growthScore && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: `${C.purple}08`, borderRadius: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.purple }}>Growth Score:</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{result.analysis.growthScore}/100</span>
                </div>
              )}
            </Card>
          )}
          {result.analysis?.error && <Card color={C.orange} style={{ padding: 14, marginBottom: 16 }}><span style={{ fontSize: 12, color: C.orange }}>ℹ️ {result.analysis.error}</span></Card>}

          {/* Videos grid */}
          {result.videos?.length > 0 && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>🎬 Vídeos ({result.videos.length})</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {result.videos.slice(0, 30).map((v, i) => (
                  <Card key={i} hov style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => window.open(`https://youtube.com/watch?v=${v.id}`, "_blank")}>
                    {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width: "100%", height: 150, objectFit: "cover" }} />}
                    <div style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: C.text, marginBottom: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.title}</div>
                      <div style={{ display: "flex", gap: 10, fontSize: 10, color: C.dim }}>
                        <span>👁️ {fmt(v.stats?.views)}</span>
                        <span>👍 {fmt(v.stats?.likes)}</span>
                        <span>💬 {fmt(v.stats?.comments)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
