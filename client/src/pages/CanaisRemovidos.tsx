// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Card, Btn } from "../components/shared/UI";

const fmt = (n) => { if (!n) return "0"; if (n >= 1e9) return (n / 1e9).toFixed(1) + "B"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };
const hdr = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("lc_token")}` });

export default function CanaisRemovidos() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trends/removed-channels", { headers: hdr() });
      if (res.ok) {
        const data = await res.json();
        const list = data.channels || data || [];
        setChannels(list);
        setTotal(data.total || list.length);
      } else {
        // Fallback: load from localStorage cache
        const cached = localStorage.getItem("lcs_removed_channels");
        if (cached) try { setChannels(JSON.parse(cached)); } catch {}
      }
    } catch (e) {
      const cached = localStorage.getItem("lcs_removed_channels");
      if (cached) try { setChannels(JSON.parse(cached)); } catch {}
    }
    setLoading(false);
  };

  const filtered = channels.filter((ch) =>
    !search || (ch.name || ch.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.orange}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚠️</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Canais Removidos</h1>
            <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Canais que foram removidos ou encerrados no YouTube</p>
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.red, background: `${C.red}15`, padding: "6px 14px", borderRadius: 8 }}>
          {total || channels.length} canais removidos
        </span>
      </div>

      <Card color={C.orange} style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.orange }}>
          ⚠️ <strong>Atenção:</strong> Estes canais foram identificados como removidos, encerrados ou indisponíveis no YouTube.
        </div>
      </Card>

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar canais removidos..."
            style={{ width: "100%", padding: "12px 16px 12px 40px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 13, outline: "none" }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.dim }}>⏳ Carregando...</div>
      ) : filtered.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((ch, i) => (
            <Card key={i} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: `${C.red}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: C.red }}>
                    {(ch.name || ch.title || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{ch.name || ch.title}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>
                      📅 {ch.removedAt ? new Date(ch.removedAt).toLocaleDateString("pt-BR") : ch.detectedAt ? new Date(ch.detectedAt).toLocaleDateString("pt-BR") : "Data desconhecida"}
                      {ch.monetized && <span style={{ marginLeft: 8, color: C.green }}>💰 $</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: C.red, padding: "3px 8px", borderRadius: 4 }}>REMOVIDO</span>
                </div>

                {ch.lastThumbnail && (
                  <div style={{ position: "relative", marginBottom: 10 }}>
                    <img src={ch.lastThumbnail} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8, opacity: 0.8 }} />
                    {ch.lastViewCount && (
                      <span style={{ position: "absolute", bottom: 8, right: 8, fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.7)", padding: "3px 8px", borderRadius: 4 }}>
                        👁️ {fmt(ch.lastViewCount)}
                      </span>
                    )}
                  </div>
                )}

                {ch.lastVideoTitle && (
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {ch.lastVideoTitle}
                  </div>
                )}

                <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>👁️ {fmt(ch.totalViews || ch.views || 0)}</div>
                    <div style={{ fontSize: 9, color: C.dim }}>visualizações</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>🎬 {ch.videoCount || ch.videos || 0}</div>
                    <div style={{ fontSize: 9, color: C.dim }}>vídeos</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>👥 {fmt(ch.subscribers || ch.subs || 0)}</div>
                    <div style={{ fontSize: 9, color: C.dim }}>inscritos</div>
                  </div>
                </div>

                {(ch.niche || ch.category) && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: C.muted, background: `${C.dim}10`, padding: "2px 8px", borderRadius: 4 }}>
                      🏷️ {ch.niche || ch.category}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ textAlign: "center", padding: "60px 40px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Nenhum canal removido encontrado</h2>
          <p style={{ fontSize: 13, color: C.dim }}>O sistema monitora canais automaticamente e registra quando são removidos do YouTube</p>
        </Card>
      )}
    </div>
  );
}
