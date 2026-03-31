// @ts-nocheck
import { useApp } from "../context/AppContext";
import { Card, Badge, Hdr, Btn, C, ST } from "../components/shared/UI";
import { useState } from "react";

export default function Calendario() {
  const { videos, channels } = useApp();
  const [offset, setOffset] = useState(0);

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const wk = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const todayDate = now.getDate();
  const isCurrentMonth = offset === 0;
  const totalVideosThisMonth = videos.filter(v => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return v.date?.startsWith(prefix);
  }).length;

  return (
    <div className="page-enter" role="main" aria-label="Calendario">
      <Hdr title="Calendário" sub="Visualize sua agenda de publicações" />

      {/* Month stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ padding: "10px 16px", borderRadius: 10, background: C.bgCard, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>📅</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{totalVideosThisMonth}</span>
          <span style={{ fontSize: 12, color: C.muted }}>vídeos em {monthNames[month]}</span>
        </div>
        {offset !== 0 && (
          <Btn vr="ghost" onClick={() => setOffset(0)} style={{ fontSize: 12, padding: "8px 14px" }}>
            ◉ Hoje
          </Btn>
        )}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {/* Navigation header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <Btn vr="ghost" onClick={() => setOffset(p => p - 1)} style={{ fontSize: 13, padding: "8px 16px" }}>← Anterior</Btn>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em", color: C.text }}>{monthNames[month]} {year}</div>
          <Btn vr="ghost" onClick={() => setOffset(p => p + 1)} style={{ fontSize: 13, padding: "8px 16px" }}>Próximo →</Btn>
        </div>

        {/* Calendar grid */}
        <div style={{ padding: "12px 16px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {/* Weekday headers */}
            {wk.map((d, i) => (
              <div key={d} style={{
                fontSize: 11, color: i === 0 ? C.red : C.dim, textAlign: "center",
                padding: "10px 8px", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>{d}</div>
            ))}

            {/* Empty cells before first day */}
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`e${i}`} style={{ minHeight: 90 }} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const dv = videos.filter(v => v.date === ds);
              const isToday = isCurrentMonth && d === todayDate;
              const isSunday = new Date(year, month, d).getDay() === 0;
              return (
                <div key={d} style={{
                  padding: "8px 8px 6px", borderRadius: 10, minHeight: 90,
                  background: isToday ? `${C.red}0A` : dv.length > 0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)",
                  border: isToday ? `1.5px solid ${C.red}50` : `1px solid ${C.border}`,
                  transition: "all 0.15s",
                  position: "relative",
                }}>
                  {/* Day number */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 26, height: 26, borderRadius: 8,
                    fontFamily: "var(--mono)", fontSize: 12,
                    fontWeight: isToday ? 800 : 500,
                    color: isToday ? "#fff" : isSunday ? C.red : C.text,
                    background: isToday ? C.red : "transparent",
                    marginBottom: 4,
                  }}>{d}</div>

                  {/* Videos on this day */}
                  {dv.map(v => {
                    const vch = v.channel || channels.find(c => c.id === v.channelId);
                    const st = ST[v.status];
                    return (
                      <div key={v.id} style={{
                        fontSize: 10, padding: "3px 7px", borderRadius: 5,
                        background: `${vch?.color || C.muted}12`,
                        color: vch?.color || C.muted,
                        marginBottom: 3, fontWeight: 600,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        borderLeft: `2.5px solid ${vch?.color || C.muted}`,
                      }}
                        title={`${v.title} — ${st?.l || v.status}`}>
                        {v.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
