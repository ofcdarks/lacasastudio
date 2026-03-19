import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { youtubeApi, videoApi, settingsApi } from "../lib/api";
import { Card, Btn, Hdr, Label, Input, Badge, SecTitle, PBar, C, ST } from "../components/shared/UI";

export default function Analytics() {
  const { channels, videos, refreshVideos } = useApp();
  const nav = useNavigate();
  const [ytChannelId, setYtChannelId] = useState("");
  const [ytData, setYtData] = useState(null);
  const [ytVideos, setYtVideos] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [hasYtKey, setHasYtKey] = useState(false);
  const [savingTitle, setSavingTitle] = useState(null);

  useEffect(() => { settingsApi.getRaw("youtube_api_key").then(s => setHasYtKey(!!s.value)).catch(() => {}); }, []);

  const stats = useMemo(() => {
    const sd = {}; Object.keys(ST).forEach(k => { sd[k] = videos.filter(v => v.status === k).length; });
    return { sd, total: videos.length };
  }, [videos]);

  const fetchYouTube = async () => {
    if (!ytChannelId.trim()) return;
    setLoading(true); setError(""); setYtData(null); setYtVideos([]); setAnalysis(null);
    try {
      const data = await youtubeApi.channel(ytChannelId);
      if (data.error) { setError(data.error); return; }
      setYtData(data);
      const vids = await youtubeApi.videos(data.id, 15);
      if (!vids.error) setYtVideos(Array.isArray(vids) ? vids : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const runAnalysis = async () => {
    if (!ytData) return;
    setAnalyzing(true); setError("");
    try {
      const data = await youtubeApi.analyze({ channelName: ytData.title, stats: ytData.stats, recentVideos: ytVideos.slice(0, 15), channelDescription: ytData.description });
      if (data.error) { setError(data.error); return; }
      setAnalysis(data);
    } catch (err) { setError(err.message); }
    finally { setAnalyzing(false); }
  };

  const saveAsVideo = async (title, channelId) => {
    setSavingTitle(title);
    try {
      const chId = channelId || channels[0]?.id;
      if (!chId) { alert("Crie um canal primeiro"); return; }
      await videoApi.create({ title, channelId: chId, status: "idea", priority: "média", date: new Date().toISOString().slice(0, 10) });
      refreshVideos();
    } catch {}
    finally { setTimeout(() => setSavingTitle(null), 1500); }
  };

  const m = analysis?._metrics;

  return (
    <div className="page-enter">
      <Hdr title="Analytics" sub="Dados reais do YouTube + Análise profunda com IA especialista" />

      {/* Internal Stats */}
      <SecTitle t="Produção Interna" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[{ l: "Total", v: stats.total, c: C.blue }, { l: "Em Produção", v: videos.filter(v => v.status !== "published").length, c: C.orange }, { l: "Publicados", v: stats.sd.published || 0, c: C.green }, { l: "Urgentes", v: videos.filter(v => v.priority === "alta").length, c: C.red }].map((s, i) => (
          <Card key={i} color={s.c} style={{ padding: 16 }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{s.l}</div><div style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 700 }}>{s.v}</div></Card>
        ))}
      </div>

      {/* YouTube Section */}
      <SecTitle t="YouTube — Dados Reais + IA" />
      {!hasYtKey ? (
        <Card style={{ marginBottom: 20 }} color={C.red}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>YouTube API não configurada</div><div style={{ fontSize: 12, color: C.muted }}>Configure nas Configurações para dados reais</div></div><Btn onClick={() => nav("/settings")} style={{ fontSize: 12 }}>Configurações →</Btn></div></Card>
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
              <div style={{ flex: 1 }}><Label t="ID ou @ do Canal" /><Input placeholder="UCxxxxxxxx ou @handle" value={ytChannelId} onChange={e => setYtChannelId(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchYouTube()} /></div>
              <Btn onClick={fetchYouTube} disabled={loading} style={{ height: 38 }}>{loading ? "⏳..." : "Buscar Canal"}</Btn>
            </div>
          </Card>

          {error && <Card style={{ marginBottom: 16, padding: 14 }} color={C.red}><div style={{ fontSize: 12, color: C.red }}>{error}</div></Card>}

          {ytData && (
            <>
              {/* Channel Card */}
              <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }} color={C.red}>
                {ytData.thumbnail && <img src={ytData.thumbnail} alt="" style={{ width: 64, height: 64, borderRadius: 14 }} />}
                <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 18 }}>{ytData.title}</div><div style={{ fontFamily: "var(--mono)", fontSize: 12, color: C.red }}>{ytData.customUrl}</div></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
                  {[{ l: "Inscritos", v: ytData.stats.subscribers?.toLocaleString("pt-BR") }, { l: "Views", v: ytData.stats.views?.toLocaleString("pt-BR") }, { l: "Vídeos", v: ytData.stats.videos }].map(s => (
                    <div key={s.l}><div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 700 }}>{s.v}</div><div style={{ fontSize: 10, color: C.muted }}>{s.l}</div></div>
                  ))}
                </div>
              </Card>

              {/* Videos Table */}
              {ytVideos.length > 0 && (
                <Card style={{ padding: 0, marginBottom: 16 }}>
                  {ytVideos.slice(0, 10).map((v, i) => (
                    <div key={v.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr repeat(3, 80px)", gap: 10, alignItems: "center", padding: "10px 16px", borderBottom: i < 9 ? `1px solid ${C.border}` : "none" }}>
                      {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width: 80, height: 45, borderRadius: 6, objectFit: "cover" }} />}
                      <div><div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}>{v.title}</div><div style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim, marginTop: 2 }}>{new Date(v.publishedAt).toLocaleDateString("pt-BR")}</div></div>
                      {[{ l: "Views", v: v.stats.views?.toLocaleString("pt-BR"), c: C.blue }, { l: "Likes", v: v.stats.likes?.toLocaleString("pt-BR"), c: C.green }, { l: "Coment.", v: v.stats.comments?.toLocaleString("pt-BR"), c: C.orange }].map(s => (
                        <div key={s.l} style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600, color: s.c }}>{s.v}</div><div style={{ fontSize: 8, color: C.dim }}>{s.l}</div></div>
                      ))}
                    </div>
                  ))}
                </Card>
              )}

              {/* AI Analysis Button */}
              <Btn onClick={runAnalysis} disabled={analyzing} style={{ marginBottom: 20 }}>
                {analyzing ? "⏳ Analisando profundamente com IA..." : "✦ Análise Profunda do Canal com IA Especialista"}
              </Btn>

              {/* ═══ ANALYSIS RESULTS ═══ */}
              {analysis && (
                <>
                  {/* Summary + Score */}
                  <Card color={C.blue} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <SecTitle t="Diagnóstico do Canal" />
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: C.muted }}>Score de Crescimento</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 36, fontWeight: 700, color: analysis.growthScore >= 70 ? C.green : analysis.growthScore >= 40 ? C.orange : C.red }}>{analysis.growthScore}<span style={{ fontSize: 14, color: C.dim }}>/100</span></div>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, marginBottom: 12 }}>{analysis.summary}</p>
                    {m && (
                      <div style={{ display: "flex", gap: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                        {[{ l: "Views médios", v: m.avgViews?.toLocaleString() }, { l: "Likes médios", v: m.avgLikes?.toLocaleString() }, { l: "Comentários médios", v: m.avgComments?.toLocaleString() }, { l: "Engajamento", v: `${m.engagementRate}%` }].map(s => (
                          <div key={s.l} style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: C.blue }}>{s.v}</div>
                            <div style={{ fontSize: 9, color: C.dim }}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Strategy Card */}
                  {analysis.contentStrategy && (
                    <Card color={C.green} style={{ marginBottom: 16 }}>
                      <SecTitle t="📊 Estratégia de Conteúdo Recomendada" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                        {[
                          { l: "Melhor Dia", v: analysis.contentStrategy.bestPostingDay, i: "📅", c: C.blue },
                          { l: "Melhor Horário", v: analysis.contentStrategy.bestPostingTime, i: "⏰", c: C.orange },
                          { l: "Duração Ideal", v: analysis.contentStrategy.idealVideoLength, i: "⏱️", c: C.purple },
                          { l: "Vídeos/Semana", v: analysis.contentStrategy.videosPerWeek, i: "📈", c: C.green },
                        ].map(s => (
                          <div key={s.l} style={{ padding: 16, borderRadius: 12, background: `${s.c}08`, border: `1px solid ${s.c}20`, textAlign: "center" }}>
                            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.i}</div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: s.c, marginBottom: 4 }}>{s.v}</div>
                            <div style={{ fontSize: 10, color: C.muted }}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, padding: 14, background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                        💡 {analysis.contentStrategy.reasoning}
                      </div>
                    </Card>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    {/* Strengths */}
                    <Card color={C.green}>
                      <SecTitle t="✅ Pontos Fortes" />
                      {(analysis.strengths || []).map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: i < (analysis.strengths?.length || 0) - 1 ? `1px solid ${C.border}` : "none" }}>
                          <span style={{ color: C.green, flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{s}</span>
                        </div>
                      ))}
                    </Card>

                    {/* Weaknesses */}
                    <Card color={C.red}>
                      <SecTitle t="⚠️ Pontos Fracos" />
                      {(analysis.weaknesses || []).map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: i < (analysis.weaknesses?.length || 0) - 1 ? `1px solid ${C.border}` : "none" }}>
                          <span style={{ color: C.red, flexShrink: 0 }}>✕</span>
                          <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{s}</span>
                        </div>
                      ))}
                    </Card>
                  </div>

                  {/* Improvements */}
                  <Card color={C.orange} style={{ marginBottom: 16 }}>
                    <SecTitle t="🚀 Ações Imediatas para Crescer" />
                    {(analysis.improvements || []).map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < (analysis.improvements?.length || 0) - 1 ? `1px solid ${C.border}` : "none" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: C.orange, fontWeight: 700, width: 24, flexShrink: 0 }}>{i + 1}.</span>
                        <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{s}</span>
                      </div>
                    ))}
                  </Card>

                  {/* Next Video Ideas - SAVEABLE */}
                  <Card color={C.purple} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <SecTitle t="🎬 Próximos Vídeos — Clique para Colocar em Produção" />
                      <Badge text="Clique no +" color={C.green} v="tag" />
                    </div>
                    {(analysis.nextVideoIdeas || []).map((idea, i) => {
                      const t = typeof idea === "string" ? idea : idea.title;
                      const why = typeof idea === "object" ? idea.whyItWorks : "";
                      const est = typeof idea === "object" ? idea.estimatedViews : "";
                      const isSaved = savingTitle === t;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < (analysis.nextVideoIdeas?.length || 0) - 1 ? `1px solid ${C.border}` : "none" }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: C.purple, fontWeight: 700, width: 24, flexShrink: 0 }}>{i + 1}.</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 2 }}>{t}</div>
                            {why && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>💡 {why}</div>}
                            {est && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>📊 Views estimados: {est}</div>}
                          </div>
                          <Btn vr={isSaved ? "ghost" : "primary"} onClick={() => saveAsVideo(t)}
                            disabled={isSaved} style={{ fontSize: 11, padding: "6px 14px", flexShrink: 0 }}>
                            {isSaved ? "✓ Salvo!" : "+ Produzir"}
                          </Btn>
                        </div>
                      );
                    })}
                  </Card>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    {/* Engagement Tips */}
                    <Card color={C.cyan}>
                      <SecTitle t="💬 Dicas de Engajamento" />
                      {(analysis.engagementTips || []).map((tip, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: i < (analysis.engagementTips?.length || 0) - 1 ? `1px solid ${C.border}` : "none" }}>
                          <span style={{ color: C.cyan }}>💡</span>
                          <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{tip}</span>
                        </div>
                      ))}
                    </Card>

                    {/* Thumbnail + Competitor */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {analysis.thumbnailTips && (
                        <Card color={C.pink}>
                          <SecTitle t="🖼️ Thumbnails" />
                          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{analysis.thumbnailTips}</div>
                        </Card>
                      )}
                      {analysis.competitorAnalysis && (
                        <Card color={C.teal}>
                          <SecTitle t="🏆 Análise Competitiva" />
                          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{analysis.competitorAnalysis}</div>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Monthly Goals */}
                  {analysis.monthlyGoals && (
                    <Card color={C.orange} style={{ marginBottom: 16 }}>
                      <SecTitle t="🎯 Metas para o Próximo Mês" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
                        {[
                          { l: "Inscritos", v: analysis.monthlyGoals.subscribers, c: C.blue },
                          { l: "Views", v: analysis.monthlyGoals.views, c: C.green },
                          { l: "Vídeos", v: analysis.monthlyGoals.videos, c: C.purple },
                        ].map(s => (
                          <div key={s.l} style={{ padding: 16, borderRadius: 12, background: `${s.c}08`, border: `1px solid ${s.c}20` }}>
                            <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
