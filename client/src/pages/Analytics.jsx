import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { Card, Badge, Hdr, SecTitle, PBar, C, ST } from "../components/shared/UI";

export default function Analytics() {
  const { channels, videos } = useApp();

  const stats = useMemo(() => {
    const byChannel = channels.map(ch => {
      const chVids = videos.filter(v => (v.channelId || v.channel?.id) === ch.id);
      return {
        ...ch,
        total: chVids.length,
        published: chVids.filter(v => v.status === "published").length,
        inProgress: chVids.filter(v => v.status !== "published").length,
        highPriority: chVids.filter(v => v.priority === "alta").length,
      };
    });
    const statusDist = {};
    Object.keys(ST).forEach(k => { statusDist[k] = videos.filter(v => v.status === k).length; });
    return { byChannel, statusDist, total: videos.length };
  }, [channels, videos]);

  return (
    <div className="page-enter">
      <Hdr title="Analytics" sub="Métricas e insights dos seus canais" action={<Badge text="Live Data" color={C.green} v="tag" />} />

      {/* Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { l: "Total Vídeos", v: stats.total, c: C.blue },
          { l: "Em Produção", v: videos.filter(v => v.status !== "published").length, c: C.orange },
          { l: "Publicados", v: stats.statusDist.published || 0, c: C.green },
          { l: "Alta Prioridade", v: videos.filter(v => v.priority === "alta").length, c: C.red },
        ].map((s, i) => (
          <Card key={i} color={s.c}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{s.l}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700 }}>{s.v}</div>
          </Card>
        ))}
      </div>

      {/* Status Distribution */}
      <SecTitle t="Distribuição por Status" />
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 4, height: 40, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
          {Object.entries(ST).map(([k, v]) => {
            const count = stats.statusDist[k] || 0;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div key={k} style={{ flex: pct, background: v.c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", minWidth: count > 0 ? 30 : 0, transition: "flex 0.5s" }}
                title={`${v.l}: ${count}`}>
                {pct > 8 && count}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {Object.entries(ST).map(([k, v]) => {
            const count = stats.statusDist[k] || 0;
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: v.c }} />
                {v.l}: <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: C.text }}>{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Per Channel */}
      <SecTitle t="Performance por Canal" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {stats.byChannel.map(ch => (
          <Card key={ch.id} color={ch.color}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Badge color={ch.color} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>{ch.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: C.green, marginLeft: "auto" }}>{ch.growth}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {[
                { l: "Total", v: ch.total, c: C.blue },
                { l: "Publicados", v: ch.published, c: C.green },
                { l: "Em Prod.", v: ch.inProgress, c: C.orange },
                { l: "Urgentes", v: ch.highPriority, c: C.red },
              ].map(x => (
                <div key={x.l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 10, textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 600, color: x.c }}>{x.v}</div>
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 2, textTransform: "uppercase" }}>{x.l}</div>
                </div>
              ))}
            </div>
            {ch.total > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 6 }}>
                  <span>Progresso de publicação</span>
                  <span style={{ fontFamily: "var(--mono)" }}>{ch.published}/{ch.total}</span>
                </div>
                <PBar current={ch.published} target={ch.total} color={ch.color} h={6} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
