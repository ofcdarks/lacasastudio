// @ts-nocheck
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { C, Btn, Hdr } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import MagicTabs from "../components/shared/MagicTabs";
import api from "../lib/api";

export default function Admin() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({});
  const [resetPw, setResetPw] = useState(null);
  const [accessOk, setAccessOk] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Always refresh user + try loading admin data to confirm access
    refresh();
    Promise.all([
      api.get("/admin/stats").then(s => { setStats(s); setAccessOk(true); }),
      api.get("/admin/users").then(setUsers),
      api.get("/admin/config").then(setConfig),
    ]).catch(() => { setAccessOk(false); }).finally(() => setChecking(false));
  }, []);

  const toggleBlock = async () => {
    const newVal = config.block_registration === "true" ? "false" : "true";
    await api.put("/admin/config", { block_registration: newVal });
    setConfig(p => ({ ...p, block_registration: newVal }));
    toast?.success(newVal === "true" ? "Cadastros bloqueados" : "Cadastros liberados");
  };

  const toggleAdmin = async (id, current) => {
    await api.put(`/admin/users/${id}`, { isAdmin: !current });
    setUsers(p => p.map(u => u.id === id ? { ...u, isAdmin: !current } : u));
    toast?.success("Permissão atualizada");
  };

  const delUser = async (id) => {
    if (!window.confirm("Deletar este usuário e TODOS os dados dele?")) return;
    await api.del(`/admin/users/${id}`);
    setUsers(p => p.filter(u => u.id !== id));
    toast?.success("Usuário removido");
  };

  const doResetPw = async () => {
    if (!resetPw?.password || resetPw.password.length < 4) { toast?.error("Senha mínima: 4 caracteres"); return; }
    await api.post(`/admin/reset-password/${resetPw.id}`, { password: resetPw.password });
    setResetPw(null);
    toast?.success("Senha redefinida");
  };

  if (checking) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Verificando acesso...</div>;

  if (!accessOk && !user?.isAdmin) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>Acesso Negado</h2>
      <p style={{ color: C.muted, marginBottom: 16 }}>Apenas administradores podem acessar este painel.</p>
      <Btn onClick={async () => {
        try {
          await api.post("/auth/promote-admin", {});
          await refresh();
          window.location.reload();
        } catch (err) {
          toast?.error(err.message || "Já existe um administrador");
        }
      }}>🛡 Tornar-me Admin (se nenhum existe)</Btn>
    </div>
  );

  const blocked = config.block_registration === "true";

  return (
    <div className="page-enter" role="main" aria-label="Admin" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Hdr title="Painel Admin" sub="Gerenciamento do sistema" />
      <MagicTabs tabs={[{key:"dashboard",icon:"📊",label:"Dashboard",color:C.red},{key:"users",icon:"👥",label:"Usuários",color:C.blue},{key:"config",icon:"⚙️",label:"Configurações",color:C.green}]} active={tab} onChange={setTab}/>

      {tab === "dashboard" && stats && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
            {[["Usuários", stats.users, "👥"], ["Vídeos", stats.videos, "🎬"], ["Ideias", stats.ideas, "💡"], ["Canais", stats.channels, "📺"]].map(([l, v, ic]) => (
              <div key={l} style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
                <div style={{ fontSize: 28 }}>{ic}</div>
                <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{v}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Últimos cadastros</div>
            {stats.recentUsers?.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div><span style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</span> <span style={{ fontSize: 11, color: C.dim }}>{u.email}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {u.isAdmin && <span style={{ fontSize: 10, background: `${C.red}20`, color: C.red, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>ADMIN</span>}
                  <span style={{ fontSize: 10, color: C.dim }}>{new Date(u.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "users" && (
        <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>{users.length} usuários</span>
            <Btn onClick={toggleBlock} style={{ fontSize: 11, padding: "6px 14px", background: blocked ? C.red : `${C.green}20`, color: blocked ? "#fff" : C.green }}>
              {blocked ? "🔒 Cadastros Bloqueados" : "🔓 Cadastros Liberados"}
            </Btn>
          </div>
          {users.map(u => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${C.border}`, gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${C.red}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.red }}>{u.name?.[0] || "?"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name} {u.isAdmin && <span style={{ fontSize: 9, background: `${C.red}20`, color: C.red, padding: "1px 6px", borderRadius: 3, fontWeight: 700, marginLeft: 6 }}>ADMIN</span>}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{u.email} · {u._count?.videos || 0} vídeos · {u._count?.ideas || 0} ideias</div>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <Btn vr="ghost" onClick={() => toggleAdmin(u.id, u.isAdmin)} style={{ fontSize: 10, padding: "4px 8px" }}>{u.isAdmin ? "Remover Admin" : "Tornar Admin"}</Btn>
                <Btn vr="ghost" onClick={() => setResetPw({ id: u.id, name: u.name, password: "" })} style={{ fontSize: 10, padding: "4px 8px" }}>Resetar Senha</Btn>
                {u.id !== user?.id && <Btn vr="ghost" onClick={() => delUser(u.id)} style={{ fontSize: 10, padding: "4px 8px", color: C.red }}>Deletar</Btn>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "config" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Bloqueio de Cadastro</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Quando ativado, novos usuários não poderão se cadastrar.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div onClick={toggleBlock} style={{ width: 48, height: 26, borderRadius: 13, background: blocked ? C.red : C.border, cursor: "pointer", position: "relative", transition: "all .2s" }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: "#fff", position: "absolute", top: 2, left: blocked ? 24 : 2, transition: "all .2s" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: blocked ? C.red : C.green }}>{blocked ? "Bloqueado" : "Liberado"}</span>
            </div>
          </div>
          <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Sistema</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 2, marginTop: 8 }}>
              Versão: LaCasaStudio V2.3<br />
              Admin: {user?.name} ({user?.email})
            </div>
          </div>
        </div>
      )}

      {resetPw && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, width: 360 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Resetar Senha — {resetPw.name}</div>
            <input value={resetPw.password} onChange={e => setResetPw(p => ({ ...p, password: e.target.value }))} type="password" placeholder="Nova senha (mín 4 chars)" style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn vr="ghost" onClick={() => setResetPw(null)}>Cancelar</Btn>
              <Btn onClick={doResetPw}>Redefinir</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
