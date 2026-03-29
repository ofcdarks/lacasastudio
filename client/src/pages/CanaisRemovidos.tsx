// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Card, Btn } from "../components/shared/UI";
import { youtubeApi } from "../lib/api";

const fmt = (n) => { if (!n) return "0"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); };
const STORAGE_KEY = "lcs_canais_removidos";

function loadRemoved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveRemoved(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

export default function CanaisRemovidos() {
  const [channels, setChannels] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => { setChannels(loadRemoved()); }, []);

  const handleAddManual = () => {
    if (!url.trim()) return;
    const entry = {
      id: Date.now(),
      name: url.trim(),
      addedAt: new Date().toISOString(),
      status: "removido",
      note: "Adicionado manualmente",
    };
    const updated = [entry, ...channels];
    setChannels(updated);
    saveRemoved(updated);
    setUrl("");
    setShowAdd(false);
  };

  const handleCheck = async () => {
    if (!url.trim()) return;
    setChecking(true); setCheckResult(null);
    try {
      const handle = url.replace(/.*\/(c\/|channel\/|@)?/, "").replace(/\?.*/, "").trim();
      const data = await youtubeApi.channel(handle);
      if (data && data.title) {
        setCheckResult({ found: true, data });
      }
    } catch {
      // Canal não encontrado = provavelmente removido
      const entry = {
        id: Date.now(),
        name: url.trim(),
        addedAt: new Date().toISOString(),
        status: "removido",
        note: "Não encontrado na API do YouTube",
      };
      const updated = [entry, ...channels];
      setChannels(updated);
      saveRemoved(updated);
      setCheckResult({ found: false });
    }
    setChecking(false);
  };

  const handleRemove = (id) => {
    const updated = channels.filter((c) => c.id !== id);
    setChannels(updated);
    saveRemoved(updated);
  };

  const filtered = channels.filter((ch) =>
    !search || (ch.name || "").toLowerCase().includes(search.toLowerCase())
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
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.red, background: `${C.red}15`, padding: "6px 14px", borderRadius: 8 }}>
            {channels.length} canais registrados
          </span>
          <Btn onClick={() => setShowAdd(true)} style={{ background: C.blue, color: "#fff", padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12 }}>+ Verificar Canal</Btn>
        </div>
      </div>

      <Card color={C.orange} style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.orange }}>
          ⚠️ <strong>Atenção:</strong> Use esta ferramenta para verificar se canais do YouTube ainda estão ativos. Canais não encontrados serão registrados automaticamente.
        </div>
      </Card>

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar canais removidos..." style={{ width: "100%", padding: "12px 16px 12px 40px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 13, outline: "none" }} />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((ch) => (
            <Card key={ch.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: `${C.red}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: C.red }}>
                  {(ch.name || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{ch.name}</div>
                  <div style={{ fontSize: 10, color: C.dim }}>📅 {new Date(ch.addedAt).toLocaleDateString("pt-BR")}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: C.red, padding: "3px 8px", borderRadius: 4 }}>REMOVIDO</span>
              </div>
              {ch.note && <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>{ch.note}</div>}
              {ch.lastStats && (
                <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: C.muted }}>👁️ {fmt(ch.lastStats.views)}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>👥 {fmt(ch.lastStats.subs)}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>🎬 {ch.lastStats.videos}</span>
                </div>
              )}
              <button onClick={() => handleRemove(ch.id)} style={{ background: `${C.dim}10`, color: C.dim, border: `1px solid ${C.border}`, padding: "6px 12px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", width: "100%" }}>🗑️ Remover da Lista</button>
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ textAlign: "center", padding: "60px 40px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Nenhum canal removido registrado</h2>
          <p style={{ fontSize: 13, color: C.dim }}>Use "Verificar Canal" para checar se um canal ainda está ativo no YouTube</p>
        </Card>
      )}

      {/* Modal Verificar Canal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setShowAdd(false); setCheckResult(null); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28, width: 460, maxWidth: "90vw" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 20px" }}>Verificar Canal</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 6, display: "block" }}>URL ou nome do canal</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/@canal ou nome do canal" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none" }} />
            </div>

            {checkResult && (
              <Card color={checkResult.found ? C.green : C.red} style={{ padding: 14, marginBottom: 14 }}>
                {checkResult.found ? (
                  <div style={{ fontSize: 12, color: C.green }}>✅ Canal encontrado: <strong>{checkResult.data.title}</strong> — ainda está ativo!</div>
                ) : (
                  <div style={{ fontSize: 12, color: C.red }}>❌ Canal não encontrado — registrado como removido.</div>
                )}
              </Card>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={handleCheck} disabled={checking || !url.trim()} style={{ flex: 1, background: C.blue, color: "#fff", padding: "10px", borderRadius: 10, fontWeight: 700, opacity: checking ? 0.6 : 1 }}>{checking ? "Verificando..." : "🔍 Verificar na API"}</Btn>
              <Btn onClick={handleAddManual} disabled={!url.trim()} style={{ flex: 1, background: `${C.red}15`, color: C.red, padding: "10px", borderRadius: 10, fontWeight: 700, border: `1px solid ${C.red}25` }}>+ Adicionar Manual</Btn>
            </div>
            <Btn onClick={() => { setShowAdd(false); setCheckResult(null); }} style={{ width: "100%", marginTop: 10, background: "transparent", color: C.muted, padding: "8px", borderRadius: 10, fontWeight: 600, fontSize: 12 }}>Cancelar</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
