// @ts-nocheck
import { useState, useEffect } from "react";
import { settingsApi } from "../lib/api";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/shared/Toast";
import { Card, Btn, Hdr, Label, Input, Select, SecTitle, C } from "../components/shared/UI";

const MODELS = [
  { v: "claude-sonnet-4-6", l: "Claude Sonnet 4.6", d: "Melhor custo-benefício para conteúdo" },
  { v: "deepseek-v3", l: "DeepSeek V3", d: "Muito barato, boa qualidade" },
  { v: "gemini-2.5-flash", l: "Gemini 2.5 Flash", d: "Ultra rápido e econômico" },
  { v: "gpt-4o-mini", l: "GPT-4o Mini", d: "Rápido, bom para SEO" },
  { v: "claude-haiku-4-5-20251001", l: "Claude Haiku 4.5", d: "Ultra rápido, mais barato" },
  { v: "gpt-4o", l: "GPT-4o", d: "Alta qualidade, mais caro" },
  { v: "qwen3-235b-a22b", l: "Qwen3 235B", d: "Open source, boa qualidade" },
  { v: "gemini-2.5-pro", l: "Gemini 2.5 Pro", d: "Premium, alta qualidade" },
];

export default function Settings() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const isAdmin = user?.isAdmin === true;

  // Admin-only fields
  const [laoKey, setLaoKey] = useState("");
  const [ytKey, setYtKey] = useState("");
  const [ifxCookie, setIfxCookie] = useState("");

  // Public fields
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [apiStatus, setApiStatus] = useState({});

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [promoting, setPromoting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    refresh();
    // Everyone can see the model and status
    settingsApi.get().then(s => {
      if (s.ai_model) setModel(s.ai_model);
    }).catch(() => {});

    // API status (configured or not, no values)
    fetch("/api/settings/status", {
      headers: { Authorization: `Bearer ${localStorage.getItem("lc_token")}` }
    }).then(r => r.json()).then(setApiStatus).catch(() => {});
  }, []);

  // Admin: load raw keys
  useEffect(() => {
    if (!isAdmin) return;
    settingsApi.getRaw("laozhang_api_key").then(s => { if (s.value) setLaoKey(s.value); }).catch(() => {});
    settingsApi.getRaw("youtube_api_key").then(s => { if (s.value) setYtKey(s.value); }).catch(() => {});
    settingsApi.getRaw("imagefx_cookie").then(s => { if (s.value) setIfxCookie(s.value); }).catch(() => {});
  }, [isAdmin]);

  const saveAdmin = async () => {
    setLoading(true); setSaved(false);
    try {
      await settingsApi.save({ laozhang_api_key: laoKey, youtube_api_key: ytKey, ai_model: model, imagefx_cookie: ifxCookie });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      toast?.success("Configurações salvas!");
    } catch (err) { toast?.error(err.message); }
    finally { setLoading(false); }
  };

  const saveModel = async () => {
    setLoading(true); setSaved(false);
    try {
      await settingsApi.save({ ai_model: model });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      toast?.success("Modelo salvo!");
    } catch (err) { toast?.error(err.message); }
    finally { setLoading(false); }
  };

  const testAI = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch("/api/ai/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("lc_token")}` },
        body: JSON.stringify({ topic: "teste de conexão" }),
      });
      const data = await res.json();
      setTestResult(data.error ? { ok: false, msg: data.error } : data.titles?.length > 0 ? { ok: true, msg: `IA OK! ${data.titles.length} títulos gerados.` } : { ok: false, msg: "Resposta inesperada" });
    } catch (err) { setTestResult({ ok: false, msg: err.message }); }
    finally { setTesting(false); }
  };

  // User API key state
  const [userApiKey, setUserApiKey] = useState("");
  const [userProvider, setUserProvider] = useState("openai");
  const [userModel, setUserModel] = useState("");
  const [userSaving, setUserSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) return;
    settingsApi.getUser().then(s => {
      if (s.user_api_key) setUserApiKey(s.user_api_key);
      if (s.user_api_provider) setUserProvider(s.user_api_provider);
      if (s.user_api_model) setUserModel(s.user_api_model);
    }).catch(() => {});
  }, [isAdmin]);

  const saveUserKey = async () => {
    setUserSaving(true);
    try {
      await settingsApi.saveUser({
        user_api_key: userApiKey,
        user_api_provider: userProvider,
        user_api_model: userModel || "",
      });
      toast?.success("Sua API Key salva!");
    } catch (err) { toast?.error(err.message); }
    finally { setUserSaving(false); }
  };

  const USER_PROVIDERS = [
    { v: "openai", l: "OpenAI", d: "GPT-4o, GPT-4o-mini", placeholder: "sk-...", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"] },
    { v: "google", l: "Google Gemini", d: "Gemini 2.5 Flash/Pro", placeholder: "AIza...", models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] },
    { v: "anthropic", l: "Anthropic", d: "Claude Sonnet, Haiku", placeholder: "sk-ant-...", models: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"] },
    { v: "groq", l: "Groq", d: "Llama, Mixtral (grátis)", placeholder: "gsk_...", models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"] },
    { v: "deepseek", l: "DeepSeek", d: "DeepSeek V3 (barato)", placeholder: "sk-...", models: ["deepseek-chat", "deepseek-reasoner"] },
  ];

  const curProvider = USER_PROVIDERS.find(p => p.v === userProvider) || USER_PROVIDERS[0];

  // ═══════════════════════════════════════════════
  // NON-ADMIN VIEW
  // ═══════════════════════════════════════════════
  if (!isAdmin) {
    return (
      <div className="page-enter" role="main" aria-label="Settings">
        <Hdr title="Configurações" sub="Sua API Key e preferências" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, maxWidth: 960 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* USER API KEY */}
            <Card color={C.blue}>
              <SecTitle t="Sua API Key" />
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
                Configure sua própria chave de API para usar IA. Cada provedor tem modelos e preços diferentes. Sua chave é <strong style={{ color: C.green }}>privada</strong> — ninguém mais tem acesso.
              </p>

              {/* Provider selector */}
              <Label t="Provedor" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 14 }}>
                {USER_PROVIDERS.map(p => (
                  <div key={p.v} onClick={() => { setUserProvider(p.v); setUserModel(p.models[0]); }}
                    style={{ padding: "8px 6px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                      background: userProvider === p.v ? `${C.blue}15` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${userProvider === p.v ? `${C.blue}40` : C.border}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: userProvider === p.v ? C.text : C.muted }}>{p.l}</div>
                    <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{p.d}</div>
                  </div>
                ))}
              </div>

              {/* API Key */}
              <Label t={`API Key (${curProvider.l})`} />
              <Input type="password" placeholder={curProvider.placeholder} value={userApiKey}
                onChange={e => setUserApiKey(e.target.value)}
                style={{ fontFamily: "var(--mono)", marginBottom: 12 }} />

              {/* Model */}
              <Label t="Modelo" />
              <Select value={userModel || curProvider.models[0]} onChange={e => setUserModel(e.target.value)} style={{ marginBottom: 14 }}>
                {curProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>

              <Btn onClick={saveUserKey} disabled={userSaving} style={{ width: "100%", justifyContent: "center" }}>
                {userSaving ? "Salvando..." : userApiKey ? "Salvar Minha API Key" : "Salvar"}
              </Btn>

              {userApiKey && (
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: `${C.green}10`, fontSize: 12, color: C.green }}>
                  ✓ Sua API Key está configurada — todas as features de IA usarão sua chave
                </div>
              )}
            </Card>

            {/* Info cards */}
            <Card>
              <SecTitle t="Como obter uma API Key" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { p: "OpenAI", url: "platform.openai.com/api-keys", color: "#10A37F" },
                  { p: "Google", url: "aistudio.google.com/apikey", color: "#4285F4" },
                  { p: "Anthropic", url: "console.anthropic.com/settings/keys", color: "#D97706" },
                  { p: "Groq", url: "console.groq.com/keys", color: "#F55036" },
                  { p: "DeepSeek", url: "platform.deepseek.com/api_keys", color: "#4F46E5" },
                ].map(p => (
                  <div key={p.p} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: C.text, width: 80 }}>{p.p}</span>
                    <span style={{ color: C.blue, fontSize: 11 }}>{p.url}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card>
              <SecTitle t="Status" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.muted }}>🔑 Sua API Key</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: userApiKey ? C.green : C.red }}>{userApiKey ? "✓ Configurada" : "✕ Não configurada"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.muted }}>🤖 Provedor</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{curProvider.l}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.muted }}>📊 Modelo</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: C.purple }}>{userModel || curProvider.models[0]}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ fontSize: 12, color: C.muted }}>📺 YouTube API</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: apiStatus.youtube_api_key ? C.green : C.dim }}>{apiStatus.youtube_api_key ? "✓ Admin" : "—"}</span>
                </div>
              </div>
              <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, fontSize: 11, color: C.dim }}>
                Se você não configurar sua API Key, o sistema usa a API do administrador (se disponível).
              </div>
            </Card>

            {/* Promote */}
            <Card>
              <SecTitle t="Administração" />
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Não é admin? Se nenhum admin existe, clique abaixo.</div>
              <Btn onClick={async () => {
                setPromoting(true);
                try {
                  await api.post("/auth/promote-admin", {});
                  await refresh();
                  toast?.success("Você agora é admin!");
                } catch (err) { toast?.error(err.message); }
                setPromoting(false);
              }} disabled={promoting}>{promoting ? "..." : "🛡 Tornar-me Admin"}</Btn>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // ADMIN VIEW - full access
  // ═══════════════════════════════════════════════
  return (
    <div className="page-enter" role="main" aria-label="Settings">
      <Hdr title="Configurações" sub="APIs, modelo de IA e preferências do sistema" action={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>🛡 Admin</span>
        </div>
      } />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* LaoZhang API — ADMIN ONLY */}
          <Card color={C.orange}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <SecTitle t="API LaoZhang (Inteligência Artificial)" />
              <span style={{ fontSize: 9, fontWeight: 700, color: C.red, background: `${C.red}15`, padding: "2px 8px", borderRadius: 4 }}>ADMIN</span>
            </div>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
              Usada para gerar roteiros, SEO, storyboards e análises.
              Obtenha em <span style={{ color: C.orange, fontWeight: 600 }}>api.laozhang.ai</span>
            </p>
            <Label t="API Key" />
            <Input type="password" placeholder="sk-..." value={laoKey}
              onChange={e => setLaoKey(e.target.value)}
              style={{ fontFamily: "var(--mono)", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={saveAdmin} disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
                {saved ? "✓ Salvo!" : "Salvar"}
              </Btn>
              <Btn vr="ghost" onClick={testAI} disabled={testing || !laoKey}>
                {testing ? "Testando..." : "Testar IA"}
              </Btn>
            </div>
            {testResult && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: testResult.ok ? `${C.green}10` : `${C.red}10`,
                color: testResult.ok ? C.green : C.red }}>
                {testResult.ok ? "✓" : "✕"} {testResult.msg}
              </div>
            )}
          </Card>

          {/* YouTube API — ADMIN ONLY */}
          <Card color={C.red}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <SecTitle t="API YouTube Data v3" />
              <span style={{ fontSize: 9, fontWeight: 700, color: C.red, background: `${C.red}15`, padding: "2px 8px", borderRadius: 4 }}>ADMIN</span>
            </div>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
              Puxa dados reais dos canais. Crie em <span style={{ color: C.red, fontWeight: 600 }}>console.cloud.google.com</span>
            </p>
            <Label t="YouTube API Key" />
            <Input type="password" placeholder="AIza..." value={ytKey}
              onChange={e => setYtKey(e.target.value)}
              style={{ fontFamily: "var(--mono)", marginBottom: 12 }} />
            <Btn onClick={saveAdmin} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {saved ? "✓ Salvo!" : "Salvar"}
            </Btn>
          </Card>

          {/* ImageFX — ADMIN ONLY */}
          <Card color="#EC4899">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <SecTitle t="ImageFX — Geração de Assets" />
              <span style={{ fontSize: 9, fontWeight: 700, color: C.red, background: `${C.red}15`, padding: "2px 8px", borderRadius: 4 }}>ADMIN</span>
            </div>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
              Gera imagens com <span style={{ color: "#EC4899", fontWeight: 600 }}>Google Imagen 3.5</span> (grátis).
              Abra <span style={{ color: "#EC4899", fontWeight: 600 }}>labs.google/fx</span> → F12 → Console → <code style={{ background: "rgba(255,255,255,.04)", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "#EC4899" }}>document.cookie</code>
            </p>
            <Label t="Cookie do ImageFX" />
            <textarea value={ifxCookie} onChange={e => setIfxCookie(e.target.value)}
              placeholder="__Secure-1PSID=...; __Secure-1PSIDTS=...; ..."
              style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 10, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px", color: C.text, outline: "none", minHeight: 60, resize: "vertical", marginBottom: 12 }} />
            <Btn onClick={saveAdmin} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {saved ? "✓ Salvo!" : "Salvar"}
            </Btn>
          </Card>

          {/* Model Selection */}
          <Card color={C.purple}>
            <SecTitle t="Modelo de IA" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {MODELS.map(m => (
                <div key={m.v} onClick={() => setModel(m.v)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    background: model === m.v ? `${C.purple}12` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${model === m.v ? `${C.purple}40` : C.border}` }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${model === m.v ? C.purple : C.border}`, background: model === m.v ? C.purple : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {model === m.v && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: model === m.v ? C.text : C.muted }}>{m.l}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>{m.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <Btn onClick={saveAdmin} disabled={loading} style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
              {saved ? "✓ Salvo!" : "Salvar Modelo"}
            </Btn>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <SecTitle t="Onde cada API é usada" />
            {[
              { icon: "🤖", title: "LaoZhang (IA)", items: ["Gerador SEO + IA", "Editor de Roteiro", "Storyboard automático", "Análise do canal"] },
              { icon: "📺", title: "YouTube Data API", items: ["Analytics real dos canais", "Dados de vídeos publicados", "Research de concorrentes"] },
              { icon: "🎨", title: "Google ImageFX", items: ["Geração de assets no Storyboard", "Imagen 3.5 (Google) — grátis", "Resolução alta landscape"] }
            ].map((sec, i) => (
              <div key={i} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>{sec.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{sec.title}</span>
                </div>
                {sec.items.map((item, j) => (
                  <div key={j} style={{ fontSize: 12, color: C.muted, padding: "3px 0 3px 28px" }}>• {item}</div>
                ))}
              </div>
            ))}
          </Card>

          <Card>
            <SecTitle t="Modelo Selecionado" />
            <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: C.purple, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
              {model}
            </div>
          </Card>

          <Card>
            <SecTitle t="Administração" />
            <div style={{ fontSize: 12, color: C.green, marginBottom: 8 }}>✅ Você é administrador</div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>
              Apenas você pode ver e editar as chaves de API. Outros usuários veem apenas o status (configurada/não configurada).
            </div>
            <Btn onClick={() => window.location.href = "/admin"}>🛡 Abrir Painel Admin</Btn>
          </Card>
        </div>
      </div>
    </div>
  );
}
