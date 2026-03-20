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
  const [laoKey, setLaoKey] = useState("");
  const [ytKey, setYtKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [promoting, setPromoting] = useState(false);
  const [ifxCookie, setIfxCookie] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    refresh(); // refresh user data to get latest isAdmin
    settingsApi.get().then(s => {
      if (s.ai_model) setModel(s.ai_model);
    }).catch(() => {});
    settingsApi.getRaw("laozhang_api_key").then(s => { if (s.value) setLaoKey(s.value); }).catch(() => {});
    settingsApi.getRaw("youtube_api_key").then(s => { if (s.value) setYtKey(s.value); }).catch(() => {});
    settingsApi.getRaw("imagefx_cookie").then(s => { if (s.value) setIfxCookie(s.value); }).catch(() => {});
  }, []);

  const save = async () => {
    setLoading(true);
    setSaved(false);
    try {
      await settingsApi.save({ laozhang_api_key: laoKey, youtube_api_key: ytKey, ai_model: model, imagefx_cookie: ifxCookie });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { toast?.error(err.message); }
    finally { setLoading(false); }
  };

  const testAI = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("lc_token")}` },
        body: JSON.stringify({ topic: "teste de conexão" }),
      });
      const data = await res.json();
      setTestResult(data.error ? { ok: false, msg: data.error } : data.titles?.length > 0 ? { ok: true, msg: `IA OK! ${data.titles.length} títulos gerados.` } : { ok: false, msg: "Resposta inesperada" });
    } catch (err) { setTestResult({ ok: false, msg: err.message }); }
    finally { setTesting(false); }
  };

  return (
    <div className="page-enter">
      <Hdr title="Configurações" sub="APIs, modelo de IA e preferências do sistema" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* LaoZhang API */}
          <Card color={C.orange}>
            <SecTitle t="API LaoZhang (Inteligência Artificial)" />
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
              Usada para gerar roteiros, SEO, storyboards e análises.
              Obtenha em <span style={{ color: C.orange, fontWeight: 600 }}>api.laozhang.ai</span>
            </p>
            <Label t="API Key" />
            <Input type="password" placeholder="sk-..." value={laoKey}
              onChange={e => setLaoKey(e.target.value)}
              style={{ fontFamily: "var(--mono)", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={save} disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
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

          {/* YouTube API */}
          <Card color={C.red}>
            <SecTitle t="API YouTube Data v3" />
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
              Puxa dados reais dos seus canais (inscritos, views, vídeos).
              Crie em <span style={{ color: C.red, fontWeight: 600 }}>console.cloud.google.com</span> → APIs & Services → YouTube Data API v3
            </p>
            <Label t="YouTube API Key" />
            <Input type="password" placeholder="AIza..." value={ytKey}
              onChange={e => setYtKey(e.target.value)}
              style={{ fontFamily: "var(--mono)", marginBottom: 12 }} />
            <Btn onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {saved ? "✓ Salvo!" : "Salvar"}
            </Btn>
          </Card>

          {/* ImageFX Cookie — Geração de Assets */}
          <Card color="#EC4899">
            <SecTitle t="ImageFX — Geração de Assets" />
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
              Gera imagens com <span style={{ color: "#EC4899", fontWeight: 600 }}>Google Imagen 3.5</span> (grátis).
              Para obter o cookie: abra <span style={{ color: "#EC4899", fontWeight: 600 }}>labs.google/fx</span> → F12 → Console → cole:
              <code style={{ display: "block", background: "rgba(255,255,255,.04)", padding: "8px 10px", borderRadius: 6, marginTop: 6, fontSize: 10, fontFamily: "var(--mono)", color: "#EC4899", lineHeight: 1.6, wordBreak: "break-all" }}>
                document.cookie
              </code>
              <span style={{ fontSize: 10, color: C.dim, marginTop: 4, display: "block" }}>Copie o resultado inteiro e cole abaixo.</span>
            </p>
            <Label t="Cookie do ImageFX" />
            <textarea value={ifxCookie} onChange={e => setIfxCookie(e.target.value)}
              placeholder="__Secure-1PSID=...; __Secure-1PSIDTS=...; ..."
              style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 10, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px", color: C.text, outline: "none", minHeight: 60, resize: "vertical", marginBottom: 12 }} />
            <Btn onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
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
                    border: `1px solid ${model === m.v ? `${C.purple}40` : C.border}`, transition: "all 0.2s" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${model === m.v ? C.purple : C.border}`, background: model === m.v ? C.purple : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {model === m.v && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: model === m.v ? C.text : C.muted }}>{m.l}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>{m.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <Btn onClick={save} disabled={loading} style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
              {saved ? "✓ Salvo!" : "Salvar Modelo"}
            </Btn>
          </Card>
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <SecTitle t="Onde cada API é usada" />
            {[
              { icon: "🤖", title: "LaoZhang (IA)", items: ["Gerador SEO + IA", "Editor de Roteiro", "Storyboard automático", "Análise do canal"] },
              { icon: "📺", title: "YouTube Data API", items: ["Analytics real dos canais", "Dados de vídeos publicados", "Recomendações baseadas em dados"] },
              { icon: "🎨", title: "Google ImageFX", items: ["Geração de assets 2D no Storyboard", "Imagen 3.5 (Google) — grátis", "Resolução alta 16:9 landscape"] }
            ].map((sec, i) => (
              <div key={i} style={{ padding: "12px 0", borderBottom: i === 0 ? `1px solid ${C.border}` : "none" }}>
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
            <SecTitle t="Como obter YouTube API Key" />
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              <div style={{ marginBottom: 6 }}>1. Acesse console.cloud.google.com</div>
              <div style={{ marginBottom: 6 }}>2. Crie um projeto (ou use existente)</div>
              <div style={{ marginBottom: 6 }}>3. Vá em "APIs & Services" → "Library"</div>
              <div style={{ marginBottom: 6 }}>4. Busque "YouTube Data API v3" e ative</div>
              <div style={{ marginBottom: 6 }}>5. Vá em "Credentials" → "Create credentials" → "API Key"</div>
              <div>6. Copie a key e cole aqui</div>
            </div>
          </Card>

          <Card>
            <SecTitle t="Modelo Selecionado" />
            <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: C.purple, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
              {model}
            </div>
          </Card>

          {!user?.isAdmin && (
            <Card>
              <SecTitle t="Administração" />
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Você não é administrador. Se nenhum admin existe no sistema, clique abaixo para se tornar admin.</div>
              <Btn onClick={async () => {
                setPromoting(true);
                try {
                  await api.post("/auth/promote-admin", {});
                  await refresh();
                  toast?.success("Você agora é admin! O link Admin apareceu no menu lateral.");
                } catch (err) {
                  toast?.error(err.message || "Já existe um administrador no sistema");
                }
                setPromoting(false);
              }} disabled={promoting} style={{ opacity: promoting ? 0.5 : 1 }}>
                {promoting ? "Promovendo..." : "🛡 Tornar-me Administrador"}
              </Btn>
            </Card>
          )}

          {user?.isAdmin && (
            <Card>
              <SecTitle t="Administração" />
              <div style={{ fontSize: 12, color: C.green, marginBottom: 8 }}>✅ Você é administrador</div>
              <Btn onClick={() => window.location.href = "/admin"}>🛡 Abrir Painel Admin</Btn>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
