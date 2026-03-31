// @ts-nocheck
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C, Btn, Input } from "../components/shared/UI";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isReg, setIsReg] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setErr("");
    setLoading(true);
    try {
      if (isReg) await register(form.email, form.name, form.password);
      else await login(form.email, form.password);
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(ellipse at 30% 20%, rgba(240,68,68,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(75,141,248,0.04) 0%, transparent 50%), ${C.bg}`,
    }}>
      <div style={{
        width: 420, padding: "44px 40px", background: C.bgCard, borderRadius: 20,
        border: `1px solid ${C.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: "linear-gradient(135deg, #F04444, #FF6B6B)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 22, color: "#fff", marginBottom: 18,
            boxShadow: "0 8px 24px rgba(240,68,68,0.25)",
          }}>LC</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>LaCasaStudio</h1>
          <p style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>
            {isReg ? "Crie sua conta para começar" : "Entre na sua conta"}
          </p>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isReg && (
            <div>
              <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 7 }}>Nome</label>
              <Input placeholder="Seu nome" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} onKeyDown={onKeyDown} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 7 }}>Email</label>
            <Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} onKeyDown={onKeyDown} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 7 }}>Senha</label>
            <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} onKeyDown={onKeyDown} />
          </div>

          {err && (
            <div style={{ fontSize: 12, color: C.red, padding: "10px 14px", background: `${C.red}08`, borderRadius: 10, border: `1px solid ${C.red}18` }}>
              {err}
            </div>
          )}

          <Btn onClick={handleSubmit} disabled={loading} style={{
            width: "100%", justifyContent: "center", padding: "13px", fontSize: 14, marginTop: 4,
            boxShadow: "0 4px 16px rgba(240,68,68,0.2)",
          }}>
            {loading ? "Carregando..." : isReg ? "Criar Conta" : "Entrar"}
          </Btn>

          <div style={{ textAlign: "center", fontSize: 13, color: C.muted, marginTop: 4 }}>
            {isReg ? "Já tem conta?" : "Não tem conta?"}{" "}
            <span onClick={() => { setIsReg(!isReg); setErr(""); }} style={{ color: C.red, cursor: "pointer", fontWeight: 600 }}>
              {isReg ? "Entrar" : "Criar conta"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.dim }}>YouTube Production OS — V2.5</div>
        </div>
      </div>
    </div>
  );
}
