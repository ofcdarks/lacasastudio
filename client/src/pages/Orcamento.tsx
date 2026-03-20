// @ts-nocheck
import { useState, useEffect } from "react";
import { budgetApi } from "../lib/api";
import { C, Btn, Hdr, Input, Select, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const CATS=[
  {id:"equip",icon:"🎥",name:"Equipamento",color:"#3B82F6",examples:"Câmera, mic, luzes, tripé"},
  {id:"soft",icon:"💻",name:"Software/IA",color:"#A855F7",examples:"LaoZhang, Midjourney, ElevenLabs, Canva"},
  {id:"content",icon:"📝",name:"Conteúdo",color:"#22C55E",examples:"Roteirista, editor, narrador, thumb"},
  {id:"marketing",icon:"📢",name:"Marketing",color:"#F59E0B",examples:"Ads, collabs, SEO tools, promoção"},
  {id:"hosting",icon:"🌐",name:"Hosting/Infra",color:"#EC4899",examples:"Domínio, hospedagem, CDN, email"},
  {id:"outsource",icon:"👥",name:"Freelancers",color:"#14B8A6",examples:"Editor de vídeo, designer, VA"},
  {id:"music",icon:"🎵",name:"Músicas/SFX",color:"#EF4444",examples:"Epidemic Sound, Artlist, Envato"},
  {id:"other",icon:"📦",name:"Outros",color:"#94A3B8",examples:"Cursos, livros, viagens"},
];
const PERIODS=["mensal","anual","único"];
const fmt=n=>n?.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})||"R$0";

export default function Orcamento(){
  const toast=useToast();
  const[items,setItems]=useState([]);const[showAdd,setShowAdd]=useState(false);
  const[form,setForm]=useState({name:"",category:"soft",amount:"",period:"mensal",notes:"",channel:""});
  const[filter,setFilter]=useState("all");const[editId,setEditId]=useState(null);

  useEffect(()=>{budgetApi.list().then(r=>setItems(Array.isArray(r)?r:[])).catch(()=>{});},[]);

  const save=async()=>{
    if(!form.name||!form.amount){toast?.error("Nome e valor obrigatórios");return;}
    const data={...form,amount:parseFloat(form.amount.replace(",","."))};
    try{
      if(editId){await budgetApi.update(editId,data);toast?.success("Atualizado!");}
      else{await budgetApi.create(data);toast?.success("Gasto adicionado!");}
      const r=await budgetApi.list();setItems(Array.isArray(r)?r:[]);setShowAdd(false);setEditId(null);setForm({name:"",category:"soft",amount:"",period:"mensal",notes:"",channel:""});
    }catch(e){toast?.error(e.message);}
  };

  const del=async(id)=>{try{await budgetApi.delete(id);setItems(p=>p.filter(i=>i.id!==id));toast?.success("Removido");}catch{}};

  const filtered=filter==="all"?items:items.filter(i=>i.category===filter);
  const monthlyTotal=items.reduce((a,i)=>{const v=i.amount||0;return a+(i.period==="anual"?v/12:i.period==="único"?0:v);},0);
  const annualTotal=items.reduce((a,i)=>{const v=i.amount||0;return a+(i.period==="mensal"?v*12:i.period==="único"?v:v);},0);
  const uniqueTotal=items.filter(i=>i.period==="único").reduce((a,i)=>a+(i.amount||0),0);
  const byCat=CATS.map(c=>({...c,total:items.filter(i=>i.category===c.id).reduce((a,i)=>{const v=i.amount||0;return a+(i.period==="mensal"?v:i.period==="anual"?v/12:0);},0),count:items.filter(i=>i.category===c.id).length})).filter(c=>c.count>0);

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Controle de Gastos" sub="Gerencie investimentos em todos os seus canais" action={<Btn onClick={()=>{setShowAdd(true);setEditId(null);setForm({name:"",category:"soft",amount:"",period:"mensal",notes:"",channel:""});}}>+ Novo Gasto</Btn>}/>

    {/* Overview */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:24}}>
      {[["Mensal",monthlyTotal,C.blue],["Anual",annualTotal,C.green],["Únicos",uniqueTotal,"#F59E0B"],["Itens",items.length,C.purple]].map(([l,v,c])=>
        <div key={l} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,textAlign:"center"}}>
          <div style={{fontSize:10,color:C.dim}}>{l}</div>
          <div style={{fontSize:22,fontWeight:800,color:c,marginTop:4}}>{typeof v==="number"&&l!=="Itens"?fmt(v):v}</div>
        </div>
      )}
    </div>

    {/* Category breakdown */}
    {byCat.length>0&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,marginBottom:20}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>📊 Gastos por Categoria (mensal)</div>
      <div style={{display:"grid",gap:8}}>
        {byCat.sort((a,b)=>b.total-a.total).map(c=>{const pct=monthlyTotal?Math.round(c.total/monthlyTotal*100):0;return<div key={c.id} style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18,minWidth:28}}>{c.icon}</span>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{fontWeight:600}}>{c.name} ({c.count})</span><span style={{color:c.color,fontWeight:700}}>{fmt(c.total)}/mês · {pct}%</span></div>
            <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,.06)"}}><div style={{height:"100%",borderRadius:3,background:c.color,width:`${pct}%`,transition:"width .5s"}}/></div>
          </div>
        </div>})}
      </div>
    </div>}

    {/* Filter */}
    <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
      <button onClick={()=>setFilter("all")} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${filter==="all"?C.blue:C.border}`,background:filter==="all"?`${C.blue}15`:"transparent",color:filter==="all"?C.blue:C.dim,cursor:"pointer",fontSize:11,fontWeight:600}}>Todos ({items.length})</button>
      {CATS.map(c=>{const cnt=items.filter(i=>i.category===c.id).length;return cnt?<button key={c.id} onClick={()=>setFilter(c.id)} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${filter===c.id?c.color:C.border}`,background:filter===c.id?`${c.color}15`:"transparent",color:filter===c.id?c.color:C.dim,cursor:"pointer",fontSize:11}}>{c.icon} {c.name} ({cnt})</button>:null;})}
    </div>

    {/* Items list */}
    <div style={{display:"grid",gap:8}}>
      {filtered.map(item=>{const cat=CATS.find(c=>c.id===item.category)||CATS[7];return<div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`}}>
        <span style={{fontSize:20}}>{cat.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:13}}>{item.name}</div>
          <div style={{fontSize:10,color:C.dim}}>{cat.name}{item.channel?` · ${item.channel}`:""}{item.notes?` · ${item.notes}`:""}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:16,fontWeight:800,color:cat.color}}>{fmt(item.amount)}</div>
          <div style={{fontSize:9,color:C.dim,padding:"1px 6px",borderRadius:3,background:"rgba(255,255,255,.04)"}}>{item.period}</div>
        </div>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>{setEditId(item.id);setForm({name:item.name,category:item.category||"other",amount:String(item.amount),period:item.period||"mensal",notes:item.notes||"",channel:item.channel||""});setShowAdd(true);}} style={{padding:"4px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>✏️</button>
          <button onClick={()=>del(item.id)} style={{padding:"4px 8px",borderRadius:4,border:`1px solid ${C.red}20`,background:`${C.red}08`,color:C.red,cursor:"pointer",fontSize:9}}>🗑</button>
        </div>
      </div>})}
    </div>

    {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:C.dim}}>
      <div style={{fontSize:40,marginBottom:8}}>💰</div>
      <div>Nenhum gasto registrado. Clique "+ Novo Gasto" pra começar.</div>
    </div>}

    {/* Add/Edit Modal */}
    {showAdd&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(6px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
      <div style={{background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:24,width:440}}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:16}}>{editId?"✏️ Editar Gasto":"+ Novo Gasto"}</div>
        <div style={{display:"grid",gap:10}}>
          <div><Label t="Nome *"/><Input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Ex: Midjourney Pro, Câmera Sony..."/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><Label t="Categoria"/><Select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>{CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</Select></div>
            <div><Label t="Período"/><Select value={form.period} onChange={e=>setForm(p=>({...p,period:e.target.value}))}>{PERIODS.map(p=><option key={p} value={p}>{p}</option>)}</Select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><Label t="Valor (R$) *"/><Input type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} placeholder="99.90"/></div>
            <div><Label t="Canal (opcional)"/><Input value={form.channel} onChange={e=>setForm(p=>({...p,channel:e.target.value}))} placeholder="Nome do canal..."/></div>
          </div>
          <div><Label t="Notas"/><Input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Anotações..."/></div>
          <div style={{fontSize:9,color:C.dim}}>Exemplos pra {CATS.find(c=>c.id===form.category)?.name}: {CATS.find(c=>c.id===form.category)?.examples}</div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:16}}>
          <Btn onClick={save} style={{flex:1}}>{editId?"💾 Salvar":"+ Adicionar"}</Btn>
          <Btn onClick={()=>{setShowAdd(false);setEditId(null);}} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.dim}}>Cancelar</Btn>
        </div>
      </div>
    </div>}
  </div>
}
