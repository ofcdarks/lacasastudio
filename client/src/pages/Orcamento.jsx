import { useState, useEffect } from "react";
import { useConfirm } from "../context/ConfirmContext";
import { budgetApi } from "../lib/api";
import { Card, Btn, Hdr, Label, Input, Select, Badge, SecTitle, C } from "../components/shared/UI";

function EditModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({ category: item.category, desc: item.desc, value: item.value, type: item.type });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await onSave(item.id, form); onClose(); } catch {} finally { setSaving(false); }
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Editar Lançamento</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label t="Tipo" /><Select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}><option value="income">Receita</option><option value="expense">Gasto</option></Select></div>
            <div><Label t="Categoria" /><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} /></div>
          </div>
          <div><Label t="Descrição" /><Input value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} /></div>
          <div><Label t="Valor (R$)" /><Input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <Btn vr="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
        </div>
      </div>
    </div>
  );
}

export default function Orcamento() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [showF, setShowF] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ category: "", desc: "", value: "", type: "expense" });

  useEffect(() => { budgetApi.list().then(setItems).catch(() => {}); }, []);

  const addItem = async () => {
    if (!form.desc.trim() || !form.value) return;
    try {
      const item = await budgetApi.create({ ...form, value: Number(form.value), month: new Date().toISOString().slice(0, 7) });
      setItems(p => [item, ...p]);
      setForm({ category: "", desc: "", value: "", type: "expense" });
      setShowF(false);
    } catch (err) { alert(err.message); }
  };

  const saveEdit = async (id, data) => {
    const updated = await budgetApi.update(id, data);
    setItems(p => p.map(i => i.id === id ? updated : i));
  };

  const delItem = async (id) => {
    const ok = await confirm({ title: "Remover Lançamento", message: "Este lançamento será removido do orçamento. Deseja continuar?" });
    if (!ok) return;
    try { await budgetApi.del(id); setItems(p => p.filter(i => i.id !== id)); } catch {}
  };

  const expenses = items.filter(i => i.type === "expense").reduce((a, i) => a + i.value, 0);
  const income = items.filter(i => i.type === "income").reduce((a, i) => a + i.value, 0);
  const profit = income - expenses;

  return (
    <div className="page-enter">
      {editItem && <EditModal item={editItem} onClose={() => setEditItem(null)} onSave={saveEdit} />}

      <Hdr title="Orçamento" sub="Controle receitas e despesas dos seus canais"
        action={<Btn onClick={() => setShowF(!showF)}>{showF ? "✕ Fechar" : "+ Novo Lançamento"}</Btn>} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
        {[
          { l: "Receita", v: `R$ ${income.toLocaleString("pt-BR")}`, c: C.green },
          { l: "Gastos", v: `R$ ${expenses.toLocaleString("pt-BR")}`, c: C.red },
          { l: "Lucro", v: `R$ ${profit.toLocaleString("pt-BR")}`, c: profit >= 0 ? C.green : C.red },
        ].map(s => (
          <Card key={s.l} color={s.c}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{s.l}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 700, color: s.c }}>{s.v}</div>
          </Card>
        ))}
      </div>

      {showF && (
        <Card style={{ marginBottom: 16, borderColor: `${C.blue}30` }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Novo Lançamento</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 1fr auto", gap: 10, alignItems: "end" }}>
            <div><Label t="Tipo" /><Select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}><option value="income">Receita</option><option value="expense">Gasto</option></Select></div>
            <div><Label t="Categoria" /><Input placeholder="Equipamento" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} /></div>
            <div><Label t="Descrição" /><Input placeholder="Microfone Rode..." value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} /></div>
            <div><Label t="Valor (R$)" /><Input type="number" placeholder="1200" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} /></div>
            <Btn onClick={addItem} style={{ height: 38 }}>Criar</Btn>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0 }}>
        {items.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: C.dim }}>Nenhum lançamento registrado</div>
        ) : items.map((it, i) => (
          <div key={it.id} style={{ display: "grid", gridTemplateColumns: "auto auto 1fr 2fr 1fr 60px", gap: 12, alignItems: "center", padding: "12px 20px", borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            onClick={() => setEditItem(it)}>
            <span style={{ fontSize: 14 }}>{it.type === "income" ? "📈" : "📉"}</span>
            <Badge text={it.category || "Outros"} color={it.type === "income" ? C.green : C.orange} v="tag" />
            <span style={{ fontSize: 13, color: C.text }}>{it.desc}</span>
            <div />
            <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, textAlign: "right", color: it.type === "income" ? C.green : C.red }}>
              {it.type === "income" ? "+" : "-"} R$ {it.value?.toLocaleString("pt-BR")}
            </span>
            <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
              <Btn vr="subtle" onClick={() => setEditItem(it)} style={{ fontSize: 10, padding: "4px 6px" }}>✎</Btn>
              <Btn vr="subtle" onClick={() => delItem(it.id)} style={{ fontSize: 10, color: C.red, padding: "4px 6px" }}>✕</Btn>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
