import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { checklistApi } from "../lib/api";
import { Card, Hdr, SecTitle, PBar, Select, C } from "../components/shared/UI";

export default function Checklist() {
  const { videos } = useApp();
  const [selV, setSelV] = useState(videos[0]?.id);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!selV) return;
    checklistApi.listByVideo(selV).then(setItems).catch(() => setItems([]));
  }, [selV]);

  const toggle = async (item) => {
    try {
      await checklistApi.update(item.id, { done: !item.done });
      setItems(p => p.map(i => i.id === item.id ? { ...i, done: !i.done } : i));
    } catch {}
  };

  const done = items.filter(i => i.done).length;

  return (
    <div className="page-enter">
      <Hdr title="Checklist de Publicação" sub="Garanta que tudo está pronto" action={<Select style={{ width: 200 }} value={selV || ""} onChange={e => setSelV(Number(e.target.value))}>{videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</Select>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        <Card>
          {items.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: C.dim }}>Nenhum item no checklist</div> : items.map((it, i) => (
            <div key={it.id} onClick={() => toggle(it)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", cursor: "pointer", borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${it.done ? C.green : C.border}`, background: it.done ? `${C.green}20` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.green, transition: "all 0.2s" }}>{it.done && "✓"}</div>
              <span style={{ fontSize: 14, color: it.done ? C.muted : C.text, textDecoration: it.done ? "line-through" : "none" }}>{it.label}</span>
            </div>
          ))}
        </Card>
        <Card>
          <SecTitle t="Progresso" />
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 40, fontWeight: 700, color: items.length > 0 && done === items.length ? C.green : C.text }}>{done}/{items.length}</div>
          </div>
          <PBar current={done} target={items.length || 1} color={C.green} h={8} />
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: C.muted, textAlign: "center", marginTop: 8 }}>{items.length > 0 ? Math.round((done / items.length) * 100) : 0}%</div>
        </Card>
      </div>
    </div>
  );
}
