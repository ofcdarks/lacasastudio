// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, Card, Btn, Badge } from "../components/shared/UI";
import { channelApi, videoApi } from "../lib/api";

export default function GestaoCanais() {
  const nav = useNavigate();
  const [channels, setChannels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#EF4444", icon: "📺", subs: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      channelApi.list().then(setChannels).catch(() => []),
      videoApi.list().then(setVideos).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const ch = await channelApi.create(form);
      setChannels((p) => [...p, ch]);
      setShowCreate(false);
      setForm({ name: "", color: "#EF4444", icon: "📺", subs: "" });
      nav(`/canal/${ch.id}`);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remover este canal?")) return;
    try { await channelApi.del(id); setChannels((p) => p.filter((c) => c.id !== id)); }
    catch (e) { alert(e.message); }
  };

  const channelVideos = (chId) => videos.filter((v) => v.channelId === chId);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.blue}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📺</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Gestão de Canais</h1>
            <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Selecione um canal e gerencie seus vídeos</p>
          </div>
        </div>
        <Btn onClick={() => setShowCreate(true)} style={{ background: C.red, color: "#fff", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 10, display: "flex", alignItems: "center", gap: 6 }}>
          + Novo Canal
        </Btn>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Carregando...</div>
      ) : channels.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          <Card style={{ textAlign: "center", padding: "60px 40px", maxWidth: 500, margin: "0 auto" }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: `${C.dim}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>📺</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Você ainda não tem canais cadastrados</h2>
            <p style={{ fontSize: 13, color: C.dim, margin: "0 0 24px" }}>Crie seu primeiro canal para começar a gerenciar seus vídeos do YouTube</p>
            <Btn onClick={() => setShowCreate(true)} style={{ background: C.blue, color: "#fff", fontWeight: 700, padding: "12px 28px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 8 }}>
              + Criar Primeiro Canal
            </Btn>
          </Card>

          <Card style={{ textAlign: "center", padding: "40px", maxWidth: 500, margin: "0 auto" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: `${C.blue}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 12px" }}>🎬</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>Nenhum canal cadastrado</h3>
            <p style={{ fontSize: 12, color: C.dim, margin: "0 0 20px" }}>Criar Primeiro Canal</p>
            <Btn onClick={() => setShowCreate(true)} style={{ background: C.blue, color: "#fff", fontWeight: 700, padding: "10px 24px", borderRadius: 10 }}>
              + Criar Primeiro Título
            </Btn>
          </Card>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
          {channels.map((ch) => {
            const vids = channelVideos(ch.id);
            return (
              <Card key={ch.id} hov style={{ cursor: "pointer" }} onClick={() => nav(`/canal/${ch.id}`)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${ch.color || C.red}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{ch.icon || "📺"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{ch.name}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>{ch.subs || "0"} inscritos</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(ch.id); }} style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 16 }}>🗑️</button>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div><span style={{ fontSize: 20, fontWeight: 800, color: ch.color || C.red }}>{vids.length}</span><span style={{ fontSize: 10, color: C.dim, marginLeft: 4 }}>vídeos</span></div>
                  <div><span style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{vids.filter((v) => v.status === "published").length}</span><span style={{ fontSize: 10, color: C.dim, marginLeft: 4 }}>publicados</span></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Criar Canal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCreate(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28, width: 420, maxWidth: "90vw" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 20px" }}>Novo Canal</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 6, display: "block" }}>Nome do Canal *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Meu Canal Tech" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 6, display: "block" }}>Inscritos</label>
              <input value={form.subs} onChange={(e) => setForm({ ...form, subs: e.target.value })} placeholder="Ex: 1.5K" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 6, display: "block" }}>Cor</label>
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ width: "100%", height: 38, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 6, display: "block" }}>Ícone</label>
                <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", textAlign: "center" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => setShowCreate(false)} style={{ flex: 1, background: C.bgHover, color: C.muted, padding: "10px 16px", borderRadius: 10, fontWeight: 600 }}>Cancelar</Btn>
              <Btn onClick={handleCreate} disabled={saving || !form.name.trim()} style={{ flex: 1, background: C.blue, color: "#fff", padding: "10px 16px", borderRadius: 10, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>{saving ? "Criando..." : "Criar Canal"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
