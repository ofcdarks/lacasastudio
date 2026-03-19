import { useState, useEffect } from "react";
import { settingsApi } from "../lib/api";
import { Card, Btn, Hdr, Label, Input, Select, C, SecTitle } from "../components/shared/UI";

const MODELS = [
  { v: "deepseek-v3", l: "DeepSeek V3 (Recomendado - barato e bom)", cat: "Custo-benefício" },
  { v: "deepseek-v3.2", l: "DeepSeek V3.2 (Mais novo)", cat: "Custo-benefício" },
  { v: "deepseek-r1", l: "DeepSeek R1 (Reasoning)", cat: "Raciocínio" },
  { v: "gpt-4o-mini", l: "GPT-4o Mini (Rápido e barato)", cat: "Custo-benefício" },
  { v: "gpt-4o", l: "GPT-4o (Alta qualidade)", cat: "Premium" },
  { v: "claude-sonnet-4-6", l: "Claude Sonnet 4.6 (Excelente)", cat: "Premium" },
  { v: "claude-haiku-4-5-20251001", l: "Claude Haiku 4.5 (Rápido)", cat: "Custo-benefício" },
  { v: "gemini-2.5-flash", l: "Gemini 2.5 Flash (Rápido)", cat: "Custo-benefício" },
  { v: "gemini-2.5-pro", l: "Gemini 2.5 Pro (Qualidade)", cat: "Premium" },
  { v: "grok-3-mini-fast", l: "Grok 3 Mini Fast", cat: "Custo-benefício" },
  { v: "qwen3-235b-a22b", l: "Qwen3 235B (Qualidade)", cat: "Premium" },
];

export default function Settings() {
  const [settings, setSettings] = useState({
    ai_api_key: "",
    ai_base_url: "https://api.laozhang.ai/v1",
    ai_model: "deepseek-v3",
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [newKey, setNewKey] = useState("");

  useEffect(() => {
    settingsApi.get().then(data => {
      setSettings(prev => ({
        ...prev,
        ai_base_url: data.ai_base_url || "https://api.laozhang.ai/v1",
        ai_model: data.ai_model || "deepseek-v3",
      }));
      if (data.ai_api_key_set) {
        setApiKeySet(true);
        setSettings(prev => ({ ...prev, ai_api_key: data.ai_api_key }));
      }
    }).catch(() => {});
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      const toSave = { ...settings };
      if (newKey) toSave.ai_api_key = newKey;
      else delete toSave.ai_api_key;
      
      await settingsApi.update(toSave);
      setSaved(true);
      if (newKey) { setApiKeySet(true); setNewKey(""); }
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter">
      <Hdr title="Configurações" sub="Configure a integração com IA e preferências do sistema" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* AI Config */}
        <Card color={C.purple} style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 24 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Integração com IA</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Configure a API para gerar roteiros, SEO, storyboards e mais</div>
            </div>
            {apiKeySet && <span style={{ marginLeft: "auto", fontSize: 11, padding: "4px 10px", borderRadius: 6, background: `${C.green}15`, color: C.green, fontWeight: 600 }}>✓ Configurado</span>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <Label t="API Key" />
              {apiKeySet && !showKey ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Input value={settings.ai_api_key} disabled style={{ opacity: 0.6 }} />
                  <Btn vr="ghost" onClick={() => setShowKey(true)} style={{ whiteSpace: "nowrap" }}>Alterar</Btn>
                </div>
              ) : (
                <div>
                  <Input
                    type="password"
                    placeholder="sk-... (cole sua API key aqui)"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                  />
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
                    Obtenha sua key em <span style={{ color: C.blue }}>api.laozhang.ai</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label t="URL Base da API" />
              <Input
                placeholder="https://api.laozhang.ai/v1"
                value={settings.ai_base_url}
                onChange={e => setSettings(p => ({ ...p, ai_base_url: e.target.value }))}
              />
              <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
                Compatível com OpenAI API format
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <Label t="Modelo de IA" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8, marginTop: 4 }}>
              {MODELS.map(m => (
                <div key={m.v} onClick={() => setSettings(p => ({ ...p, ai_model: m.v }))}
                  style={{
                    padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${settings.ai_model === m.v ? C.purple : C.border}`,
                    background: settings.ai_model === m.v ? `${C.purple}10` : "rgba(255,255,255,0.02)",
                    transition: "all 0.2s",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: settings.ai_model === m.v ? 700 : 400, color: settings.ai_model === m.v ? C.text : C.muted }}>{m.l}</span>
                    {settings.ai_model === m.v && <span style={{ fontSize: 11, color: C.purple }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 10, color: C.dim }}>{m.cat}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
            <Btn onClick={save} disabled={loading}>
              {loading ? "Salvando..." : "💾 Salvar Configurações"}
            </Btn>
            {saved && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>✓ Salvo com sucesso!</span>}
          </div>
        </Card>

        {/* Info cards */}
        <Card color={C.blue}>
          <SecTitle t="Onde a IA é usada" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "✦", title: "Gerador SEO + IA", desc: "Gera títulos, descrições e tags otimizados" },
              { icon: "¶", title: "Editor de Roteiro", desc: "Gera roteiros completos com IA" },
              { icon: "▤", title: "Storyboard", desc: "Gera cenas automaticamente" },
              { icon: "▦", title: "Planner", desc: "Sugere ideias de vídeos com IA" },
            ].map(f => (
              <div key={f.title} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{f.icon}</span>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{f.title}</div><div style={{ fontSize: 11, color: C.muted }}>{f.desc}</div></div>
              </div>
            ))}
          </div>
        </Card>

        <Card color={C.orange}>
          <SecTitle t="Dicas de Economia" />
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            <p style={{ margin: "0 0 10px" }}>O modelo <strong style={{ color: C.text }}>DeepSeek V3</strong> oferece o melhor custo-benefício — qualidade comparável ao GPT-4o por uma fração do preço.</p>
            <p style={{ margin: "0 0 10px" }}>Para tarefas mais complexas como roteiros longos, considere o <strong style={{ color: C.text }}>Claude Sonnet 4.6</strong> ou <strong style={{ color: C.text }}>GPT-4o</strong>.</p>
            <p style={{ margin: 0 }}>A LaoZhang AI oferece preços até 90% menores que as APIs oficiais.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
