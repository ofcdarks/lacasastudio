import { useState, useEffect } from "react";
import { budgetApi } from "../lib/api";
import { Card, Badge, Hdr, C } from "../components/shared/UI";

export default function Orcamento() {
  const [items, setItems] = useState([]);
  useEffect(() => { budgetApi.list().then(setItems).catch(() => {}); }, []);

  const g = items.filter(i => i.type === "expense").reduce((a, i) => a + i.value, 0);
  const r = items.filter(i => i.type === "income").reduce((a, i) => a + i.value, 0);

  return (
    <div className="page-enter">
      <Hdr title="Orçamento" sub="Receitas e despesas" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
        {[{ l: "Receita", v: `R$ ${r.toLocaleString()}`, c: C.green }, { l: "Gastos", v: `R$ ${g.toLocaleString()}`, c: C.red }, { l: "Lucro", v: `R$ ${(r-g).toLocaleString()}`, c: r-g > 0 ? C.green : C.red }].map(s => (
          <Card key={s.l} color={s.c}><div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{s.l}</div><div style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 700, color: s.c }}>{s.v}</div></Card>
        ))}
      </div>
      <Card style={{ padding: 0 }}>
        {items.map((it, i) => (
          <div key={it.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", alignItems: "center", padding: "12px 20px", borderBottom: i < items.length-1 ? `1px solid ${C.border}` : "none" }}>
            <Badge text={it.category} color={it.type === "income" ? C.green : C.orange} v="tag" />
            <span style={{ fontSize: 13 }}>{it.desc}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, textAlign: "right", color: it.type === "income" ? C.green : C.red }}>{it.type === "income" ? "+" : "-"} R$ {it.value.toLocaleString()}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
