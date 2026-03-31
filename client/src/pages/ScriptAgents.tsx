// @ts-nocheck
import { useState, useEffect } from "react";
import { Hdr, Card, Label, Input, Select, Btn, C } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const API = "/api/framecut";
const tk = () => localStorage.getItem("lc_token") || "";
const hdr = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${tk()}` });
const safeJson = async (r: Response) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { error: t.slice(0, 200) }; } };

const MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic" },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "anthropic" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google" },
  { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek" },
];

const ICONS = ["🤖", "🎬", "📝", "🧠", "🎯", "🔥", "💡", "🎭", "📖", "🎪", "🎥", "✍️"];
const COLORS = ["#a78bfa", "#e63946", "#22D35E", "#4B8DF8", "#f4a261", "#EC4899", "#06B6D4", "#14B8A6"];

export default function ScriptAgents() {
  const toast = useToast();
  const [agents, setAgents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Generate form
  const [genTitle, setGenTitle] = useState("");
  const [genDuration, setGenDuration] = useState("10");
  const [genModel, setGenModel] = useState("gpt-4o");
  const [generating, setGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState("");

  // Edit/Create form
  const [showCreate, setShowCreate] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", nicho: "", prompt: "", icon: "🤖", color: "#a78bfa" });
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => { loadAgents(); }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/agents/list`, { headers: hdr() });
      const data = await safeJson(r);
      if (Array.isArray(data)) setAgents(data);
    } catch {}
    setLoading(false);
  };

  const saveAgent = async () => {
    if (!editForm.prompt.trim()) { toast?.error("O prompt do agente e obrigatorio"); return; }
    if (!editForm.name.trim()) { toast?.error("De um nome ao agente"); return; }
    try {
      const url = editId ? `${API}/agents/${editId}` : `${API}/agents/save`;
      const method = editId ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: hdr(), body: JSON.stringify(editForm) });
      const data = await safeJson(r);
      if (data.id || data.ok) {
        toast?.success(editId ? "Agente atualizado!" : "Agente criado!");
        setShowCreate(false);
        setEditId(null);
        setEditForm({ name: "", description: "", nicho: "", prompt: "", icon: "🤖", color: "#a78bfa" });
        loadAgents();
      } else {
        toast?.error(data.error || "Erro ao salvar");
      }
    } catch (e: any) { toast?.error(e.message); }
  };

  const deleteAgent = async (id: number) => {
    try {
      await fetch(`${API}/agents/${id}`, { method: "DELETE", headers: hdr() });
      setAgents(p => p.filter(a => a.id !== id));
      if (selected?.id === id) { setSelected(null); setGeneratedScript(""); }
      toast?.success("Agente removido");
    } catch {}
  };

  const startEdit = (agent: any) => {
    setEditForm({ name: agent.name, description: agent.description, nicho: agent.nicho, prompt: agent.prompt, icon: agent.icon, color: agent.color });
    setEditId(agent.id);
    setShowCreate(true);
  };

  const generateScript = async () => {
    if (!selected) { toast?.error("Selecione um agente"); return; }
    if (!genTitle.trim()) { toast?.error("Informe o titulo do video"); return; }
    setGenerating(true); setGeneratedScript("");
    try {
      const r = await fetch(`${API}/agents/generate`, {
        method: "POST", headers: hdr(),
        body: JSON.stringify({ agentId: selected.id, title: genTitle, duration: genDuration, model: genModel }),
      });
      const data = await safeJson(r);
      if (data.script) {
        setGeneratedScript(data.script);
        toast?.success(`Roteiro gerado com ${data.model}!`);
      } else {
        toast?.error(data.error || "Erro ao gerar roteiro");
      }
    } catch (e: any) { toast?.error(e.message); }
    setGenerating(false);
  };

  // Styles
  const cardStyle = (isSelected: boolean, color: string) => ({
    padding: "16px 18px",
    background: isSelected ? `${color}12` : "#101016",
    borderRadius: 12,
    border: `1px solid ${isSelected ? color + "50" : "#252538"}`,
    cursor: "pointer",
    transition: "all .2s",
  });

  return (
    <div>
      <Hdr title="🤖 Agentes de Roteiro" sub="Crie agentes com formulas de roteiro extraidas de videos e gere roteiros com IA" />

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>
        {/* LEFT: Agent list */}
        <div>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Label t={`Meus Agentes (${agents.length})`} />
              <button onClick={() => { setShowCreate(true); setEditId(null); setEditForm({ name: "", description: "", nicho: "", prompt: "", icon: "🤖", color: "#a78bfa" }); }}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #22D35E40", background: "#22D35E12", color: "#22D35E", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                + Criar Agente
              </button>
            </div>

            {loading && <div style={{ textAlign: "center", padding: 20, color: "#505068" }}>Carregando...</div>}

            {agents.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "30px 16px", color: "#505068" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🤖</div>
                <p style={{ fontSize: "0.88rem", marginBottom: 8 }}>Nenhum agente criado</p>
                <p style={{ fontSize: "0.78rem", color: "#3a3a50" }}>
                  Analise um video no FrameCut e clique em "Salvar como Agente" na tab Roteiro, ou crie um do zero aqui.
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
              {agents.map(a => (
                <div key={a.id} style={cardStyle(selected?.id === a.id, a.color || "#a78bfa")} onClick={() => { setSelected(a); setGeneratedScript(""); }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${a.color || "#a78bfa"}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
                      {a.icon || "🤖"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#ededf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                      {a.nicho && <div style={{ fontSize: "0.72rem", color: a.color || "#a78bfa", marginTop: 2 }}>{a.nicho}</div>}
                      {a.description && <div style={{ fontSize: "0.75rem", color: "#8a8aa0", marginTop: 4, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.description}</div>}
                      {a.sourceVideo && <div style={{ fontSize: "0.68rem", color: "#505068", marginTop: 4 }}>Baseado em: {a.sourceVideo}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); startEdit(a); }} style={{ background: "none", border: "none", color: "#8a8aa0", cursor: "pointer", fontSize: "0.78rem" }}>✏️</button>
                      <button onClick={e => { e.stopPropagation(); deleteAgent(a.id); }} style={{ background: "none", border: "none", color: "#505068", cursor: "pointer", fontSize: "0.78rem" }}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT: Generator */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Selected agent info + generate form */}
          {selected ? (
            <>
              {/* Agent header */}
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${selected.color || "#a78bfa"}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
                    {selected.icon || "🤖"}
                  </div>
                  <div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ededf0" }}>{selected.name}</div>
                    <div style={{ fontSize: "0.82rem", color: "#8a8aa0", marginTop: 2 }}>{selected.description || selected.nicho || "Agente de roteiro"}</div>
                  </div>
                </div>

                {/* Generate form */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 200px", gap: 10, marginBottom: 14 }}>
                  <div>
                    <Label t="Titulo do Video" />
                    <Input value={genTitle} onChange={(e: any) => setGenTitle(e.target.value)} placeholder="Ex: Como ganhar dinheiro com IA em 2026" />
                  </div>
                  <div>
                    <Label t="Duracao (min)" />
                    <Input type="number" value={genDuration} onChange={(e: any) => setGenDuration(e.target.value)} min={1} max={120} />
                  </div>
                  <div>
                    <Label t="Modelo de IA" />
                    <Select value={genModel} onChange={(e: any) => setGenModel(e.target.value)}>
                      {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                  </div>
                </div>

                <button onClick={generateScript} disabled={generating || !genTitle.trim()}
                  style={{ width: "100%", padding: "14px 20px", borderRadius: 10, border: "none", background: generating ? "#505068" : `linear-gradient(135deg, ${selected.color || "#a78bfa"}, ${selected.color || "#a78bfa"}cc)`, color: "#fff", cursor: generating ? "wait" : "pointer", fontSize: "0.95rem", fontWeight: 700, opacity: !genTitle.trim() ? 0.5 : 1, transition: "all .2s" }}>
                  {generating ? "⏳ Gerando roteiro..." : `🎬 Gerar Roteiro com ${MODELS.find(m => m.id === genModel)?.name || genModel}`}
                </button>
              </Card>

              {/* Agent prompt preview */}
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Label t="Prompt do Agente" />
                  <button onClick={() => { navigator.clipboard.writeText(selected.prompt); toast?.success("Prompt copiado!"); }}
                    style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #252538", background: "transparent", color: "#8a8aa0", cursor: "pointer", fontSize: "0.75rem" }}>
                    📋 Copiar
                  </button>
                </div>
                <pre style={{ fontSize: "0.78rem", color: "#8a8aa0", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'JetBrains Mono', monospace", maxHeight: 200, overflowY: "auto", background: "#0c0c10", borderRadius: 10, padding: "14px 16px", border: "1px solid #1e1e2a", margin: 0 }}>
                  {selected.prompt}
                </pre>
              </Card>

              {/* Generated script */}
              {generatedScript && (
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <Label t="Roteiro Gerado" />
                      <div style={{ fontSize: "0.78rem", color: "#505068", marginTop: 2 }}>
                        {genTitle} | {genDuration} min | {MODELS.find(m => m.id === genModel)?.name}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { navigator.clipboard.writeText(generatedScript); toast?.success("Roteiro copiado!"); }}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#22D35E15", color: "#22D35E", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                        📋 Copiar Roteiro
                      </button>
                      <button onClick={() => {
                        const blob = new Blob([generatedScript], { type: "text/plain" });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `roteiro_${genTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}.txt`;
                        a.click();
                        toast?.success("Roteiro baixado!");
                      }} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#4B8DF815", color: "#4B8DF8", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                        💾 Baixar .txt
                      </button>
                    </div>
                  </div>
                  <div style={{ background: "#0c0c10", borderRadius: 12, border: "1px solid #1e1e2a", padding: "18px 20px", maxHeight: 600, overflowY: "auto" }}>
                    <pre style={{ fontSize: "0.88rem", color: "#ededf0", lineHeight: 1.9, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font)", margin: 0 }}>
                      {generatedScript}
                    </pre>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#505068" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>🤖</div>
                <h3 style={{ fontSize: "1.1rem", color: "#8a8aa0", marginBottom: 8 }}>Selecione um agente para comecar</h3>
                <p style={{ fontSize: "0.88rem", lineHeight: 1.6 }}>
                  Escolha um agente da lista ou crie um novo. Depois basta informar o titulo e duracao do video para gerar o roteiro automaticamente.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ══════ CREATE/EDIT MODAL ══════ */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 20px", overflowY: "auto" }}
          onClick={() => setShowCreate(false)}>
          <div style={{ background: "#12121a", borderRadius: 16, width: "100%", maxWidth: 700, border: "1px solid #252538", maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ padding: "20px 24px", borderBottom: "1px solid #252538" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ededf0", margin: 0 }}>
                {editId ? "✏️ Editar Agente" : "🤖 Criar Novo Agente"}
              </h2>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              <div style={{ marginBottom: 14 }}>
                <Label t="Nome do Agente" />
                <Input value={editForm.name} onChange={(e: any) => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Roteirista True Crime BR" />
              </div>

              <div style={{ marginBottom: 14 }}>
                <Label t="Descricao (opcional)" />
                <Input value={editForm.description} onChange={(e: any) => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Ex: Gera roteiros de historias de crime com storytelling cinematografico" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <Label t="Nicho" />
                  <Input value={editForm.nicho} onChange={(e: any) => setEditForm(p => ({ ...p, nicho: e.target.value }))} placeholder="Ex: True Crime" />
                </div>
                <div>
                  <Label t="Icone e Cor" />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {ICONS.map(ic => (
                      <button key={ic} onClick={() => setEditForm(p => ({ ...p, icon: ic }))}
                        style={{ width: 32, height: 32, borderRadius: 8, border: editForm.icon === ic ? "2px solid #a78bfa" : "1px solid #252538", background: editForm.icon === ic ? "#a78bfa18" : "#101016", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    {COLORS.map(c => (
                      <div key={c} onClick={() => setEditForm(p => ({ ...p, color: c }))}
                        style={{ width: 24, height: 24, borderRadius: 6, background: c, cursor: "pointer", border: editForm.color === c ? "2px solid #fff" : "1px solid #252538" }} />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <Label t="Prompt do Agente (instrucoes para a IA)" />
                <textarea value={editForm.prompt} onChange={(e: any) => setEditForm(p => ({ ...p, prompt: e.target.value }))}
                  placeholder={"Voce e um roteirista profissional...\n\nEscreva aqui o prompt completo que sera enviado como instrucao de sistema para a IA.\n\nDica: Use o gerador automatico no FrameCut > Analise DNA > Roteiro > Gerar Agente"}
                  rows={16}
                  style={{ width: "100%", resize: "vertical", background: "#0c0c10", border: "1px solid #252538", borderRadius: 10, padding: "14px 16px", color: "#ededf0", fontSize: "0.85rem", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7, outline: "none" }} />
                <div style={{ fontSize: "0.72rem", color: "#505068", marginTop: 4 }}>{editForm.prompt.length} caracteres</div>
              </div>
            </div>

            <div style={{ padding: "14px 24px", borderTop: "1px solid #252538", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowCreate(false); setEditId(null); }}
                style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #252538", background: "transparent", color: "#8a8aa0", cursor: "pointer", fontSize: "0.85rem" }}>
                Cancelar
              </button>
              <button onClick={saveAgent}
                style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #22D35E, #14B8A6)", color: "#fff", cursor: "pointer", fontSize: "0.88rem", fontWeight: 700 }}>
                {editId ? "Salvar Alteracoes" : "Criar Agente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
