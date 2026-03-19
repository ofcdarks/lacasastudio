import { useApp } from "../context/AppContext";
import { Card, Badge, Hdr, SecTitle, C } from "../components/shared/UI";

export default function Analytics() {
  const { channels } = useApp();
  const metrics = [{ l: "Views (7d)", vs: [12400,8900,15600,11200,9800,14300,16800] }, { l: "Watch Time (h)", vs: [42,31,48,38,33,45,52] }, { l: "CTR (%)", vs: [6.2,5.8,7.1,6.5,5.9,6.8,7.4] }];

  return (
    <div className="page-enter">
      <Hdr title="Analytics" sub="Métricas detalhadas" action={<Badge text="Beta" color={C.purple} v="tag" />} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {metrics.map(m => {
          const last = m.vs[m.vs.length-1], prev = m.vs[m.vs.length-2];
          const ch = (((last-prev)/prev)*100).toFixed(1), mx = Math.max(...m.vs);
          return (
            <Card key={m.l}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{m.l}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 700 }}>{last.toLocaleString()}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: ch > 0 ? C.green : C.red, fontWeight: 600 }}>{ch > 0 ? "+" : ""}{ch}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
                {m.vs.map((v, i) => <div key={i} style={{ flex: 1, borderRadius: 3, height: `${(v/mx)*100}%`, minHeight: 4, background: i === m.vs.length-1 ? C.blue : `${C.blue}30` }} />)}
              </div>
            </Card>
          );
        })}
      </div>
      <SecTitle t="Por Canal" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {channels.map(ch => (
          <Card key={ch.id} color={ch.color}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><Badge color={ch.color} /><span style={{ fontWeight: 700 }}>{ch.name}</span><span style={{ fontFamily: "var(--mono)", fontSize: 11, color: C.green, marginLeft: "auto" }}>{ch.growth}</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[{ l: "Inscritos", v: ch.subs }, { l: "Views", v: ch.views }].map(x => <div key={x.l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 10, textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 600 }}>{x.v}</div><div style={{ fontSize: 9, color: C.dim, marginTop: 2, textTransform: "uppercase" }}>{x.l}</div></div>)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
