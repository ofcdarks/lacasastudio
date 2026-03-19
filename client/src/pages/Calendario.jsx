import { useApp } from "../context/AppContext";
import { Card, Hdr, C } from "../components/shared/UI";

export default function Calendario() {
  const { videos, channels } = useApp();
  const wk = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const today = new Date().getDate();

  return (
    <div className="page-enter">
      <Hdr title="Calendário" sub="Agenda de publicações" />
      <Card>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, textAlign: "center" }}>Março 2026</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {wk.map(d => <div key={d} style={{ fontSize: 10, color: C.dim, textAlign: "center", padding: 8, fontWeight: 700, textTransform: "uppercase" }}>{d}</div>)}
          {Array.from({ length: 6 }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
            const ds = `2026-03-${String(d).padStart(2,'0')}`;
            const dv = videos.filter(v => v.date === ds);
            const isToday = d === today;
            return (
              <div key={d} style={{ padding: 8, borderRadius: 8, minHeight: 70, background: isToday ? `${C.red}08` : "rgba(255,255,255,0.02)", border: isToday ? `1px solid ${C.red}40` : `1px solid ${C.border}` }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? C.red : C.muted, marginBottom: 4 }}>{d}</div>
                {dv.map(v => {
                  const ch = v.channel || channels.find(c => c.id === v.channelId);
                  return <div key={v.id} style={{ fontSize: 9, padding: "2px 5px", borderRadius: 4, background: `${ch?.color||C.muted}15`, color: ch?.color, marginBottom: 2, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</div>;
                })}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
