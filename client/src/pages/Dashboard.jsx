import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Card, Badge, Hdr, SecTitle, C, ST } from "../components/shared/UI";

export default function Dashboard() {
  const { channels, videos } = useApp();
  const nav = useNavigate();

  const sc = useMemo(() => {
    const c = {};
    Object.keys(ST).forEach(k => { c[k] = videos.filter(v => v.status === k).length; });
    return c;
  }, [videos]);

  const totalSubs = channels.reduce((a, ch) => {
    const n = parseFloat(ch.subs) || 0;
    return a + n;
  }, 0);

  return (
    <div className="page-enter">
      <Hdr title="Dashboard" sub="Visão geral de todos os seus canais" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { l: "Total Inscritos", v: `${totalSubs.toFixed(1)}K`, c: C.blue, i: "👥" },
          { l: "Em Produção", v: videos.filter(v => v.status !== "published").length, c: C.orange, i: "🎬" },
          { l: "Publicados", v: sc.published || 0, c: C.green, i: "✅" },
          { l: "Canais Ativos", v: channels.length, c: C.purple, i: "📺" },
        ].map((s, i) => (
          <Card key={i} color={s.c}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 500 }}>{s.l}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700 }}>{s.v}</div>
              </div>
              <span style={{ fontSize: 24 }}>{s.i}</span>
            </div>
          </Card>
        ))}
      </div>

      <SecTitle t="Pipeline de Produção" />
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {Object.entries(ST).map(([k, v]) => (
          <Card key={k} style={{ flex: 1, padding: "14px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: v.c, marginBottom: 4 }}>{sc[k] || 0}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{v.l}</div>
          </Card>
        ))}
      </div>

      <SecTitle t="Canais" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {channels.map(ch => (
          <Card key={ch.id} hov color={ch.color} onClick={() => nav("/planner")}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: `${ch.color}12`, border: `1px solid ${ch.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Badge color={ch.color} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{ch.name}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: ch.color }}>{ch.subs} inscritos</div>
              </div>
              <span style={{ fontFamily: "var(--mono)", marginLeft: "auto", fontSize: 12, color: C.green, fontWeight: 600 }}>{ch.growth}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[{ l: "Vídeos", v: ch.videoCount || ch.videos?.length || 0 }, { l: "Views", v: ch.views }, { l: "Crescimento", v: ch.growth }].map(x => (
                <div key={x.l} style={{ textAlign: "center", padding: "8px 0", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600 }}>{x.v}</div>
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 2, textTransform: "uppercase" }}>{x.l}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <SecTitle t="Últimas atividades" />
      <Card style={{ padding: 0 }}>
        {videos.slice(0, 6).map((v, i) => {
          const ch = v.channel || channels.find(c => c.id === v.channelId);
          const st = ST[v.status];
          return (
            <div key={v.id} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 100px", gap: 12, alignItems: "center", padding: "13px 20px", borderBottom: i < 5 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Badge color={ch?.color} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{v.title}</div>
                  <div style={{ fontSize: 11, color: ch?.color, marginTop: 1 }}>{ch?.name}</div>
                </div>
              </div>
              {st && <Badge text={`${st.i} ${st.l}`} color={st.c} v="tag" />}
              <span style={{ fontSize: 12, color: C.muted }}>
                {v.priority === "alta" ? "🔴" : v.priority === "média" ? "🟡" : "🔵"} {v.priority}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: C.dim, textAlign: "right" }}>{v.date}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
