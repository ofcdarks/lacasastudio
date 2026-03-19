import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { metaApi } from "../lib/api";
import { Card, Btn, Hdr, PBar, C } from "../components/shared/UI";

export default function Metas() {
  const { channels } = useApp();
  const [metas, setMetas] = useState([]);
  useEffect(() => { metaApi.list().then(setMetas).catch(() => {}); }, []);

  return (
    <div className="page-enter">
      <Hdr title="Metas & OKRs" sub="Acompanhe seus objetivos" action={<Btn>+ Nova Meta</Btn>} />
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Metas & OKRs</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>Março / Abril 2026</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {metas.map(m => {
          const ch = m.channel || (m.channelId ? channels.find(c => c.id === m.channelId) : { name: "Todos os Canais", color: C.blue });
          return (
            <Card key={m.id} color={ch?.color}>
              <div style={{ marginBottom: 16 }}><div style={{ fontWeight: 700, fontSize: 16 }}>{m.title}</div><div style={{ fontSize: 12, color: ch?.color, marginTop: 3 }}>{ch?.name}</div></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {(m.items || []).map((it, i) => (
                  <div key={it.id || i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                      <span style={{ fontSize: 13, color: C.muted }}>{it.label}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600 }}><span style={{ color: ch?.color }}>{it.current}</span> / {it.target} {it.unit}</span>
                    </div>
                    <PBar current={it.current} target={it.target} color={ch?.color} />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
