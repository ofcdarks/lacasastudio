// @ts-nocheck
import { useState, useEffect } from "react";
import { budgetApi } from "../lib/api";
import { C, Btn, Hdr, Input, Select, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import MagicTabs from "../components/shared/MagicTabs";

const CATS=[
  {id:"equip",icon:"🎥",name:"Equipamento",color:"#3B82F6"},
  {id:"soft",icon:"💻",name:"Software/IA",color:"#A855F7"},
  {id:"content",icon:"📝",name:"Conteúdo",color:"#22C55E"},
  {id:"marketing",icon:"📢",name:"Marketing/Ads",color:"#F59E0B"},
  {id:"hosting",icon:"🌐",name:"Hosting/Infra",color:"#EC4899"},
  {id:"outsource",icon:"👥",name:"Freelancers",color:"#14B8A6"},
  {id:"music",icon:"🎵",name:"Músicas/SFX",color:"#EF4444"},
  {id:"other",icon:"📦",name:"Outros",color:"#94A3B8"},
];
const INCOME_CATS=[
  {id:"adsense",icon:"💰",name:"AdSense",color:"#22C55E"},
  {id:"affiliate",icon:"🔗",name:"Afiliados",color:"#3B82F6"},
  {id:"sponsor",icon:"🤝",name:"Patrocínios",color:"#F59E0B"},
  {id:"product",icon:"📚",name:"Produtos Digitais",color:"#A855F7"},
  {id:"membership",icon:"⭐",name:"Membership",color:"#EC4899"},
  {id:"freelance",icon:"💼",name:"Freelance",color:"#14B8A6"},
  {id:"other_income",icon:"💵",name:"Outros",color:"#94A3B8"},
];
const PERIODS=["mensal","anual","único"];
const fmt=n=>(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const ALL_CATS=[...CATS,...INCOME_CATS];

export default function Orcamento(){
  const toast=useToast();
  const[items,setItems]=useState([]);const[showAdd,setShowAdd]=useState(false);const[tab,setTab]=useState("overview");
  const[form,setForm]=useState({name:"",category:"soft",amount:"",period:"mensal",notes:"",channel:"",isIncome:false});
  const[filter,setFilter]=useState("all");const[editId,setEditId]=useState(null);

  useEffect(()=>{budgetApi.list().then(r=>setItems(Array.isArray(r)?r:[])).catch(()=>{});},[]);

  const save=async()=>{
    if(!form.name||!form.amount){toast?.error("Nome e valor obrigatórios");return;}
    const data={...form,amount:parseFloat(String(form.amount).replace(",","."))};
    try{
      if(editId){await budgetApi.update(editId,data);toast?.success("Atualizado!");}
      else{await budgetApi.create(data);toast?.success("Adicionado!");}
      const r=await budgetApi.list();setItems(Array.isArray(r)?r:[]);setShowAdd(false);setEditId(null);
      setForm({name:"",category:"soft",amount:"",period:"mensal",notes:"",channel:"",isIncome:false});
    }catch(e){toast?.error(e.message);}
  };
  const del=async(id)=>{try{await budgetApi.delete(id);setItems(p=>p.filter(i=>i.id!==id));toast?.success("Removido");}catch{}};
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};

  const expenses=items.filter(i=>!i.isIncome);
  const incomes=items.filter(i=>i.isIncome);
  const monthlyExp=expenses.reduce((a,i)=>{const v=i.amount||0;return a+(i.period==="anual"?v/12:i.period==="único"?0:v);},0);
  const monthlyInc=incomes.reduce((a,i)=>{const v=i.amount||0;return a+(i.period==="anual"?v/12:i.period==="único"?0:v);},0);
  const annualExp=expenses.reduce((a,i)=>{const v=i.amount||0;return a+(i.period==="mensal"?v*12:v);},0);
  const annualInc=incomes.reduce((a,i)=>{const v=i.amount||0;return a+(i.period==="mensal"?v*12:v);},0);
  const profit=monthlyInc-monthlyExp;
  const roi=monthlyExp>0?Math.round((monthlyInc/monthlyExp)*100):0;
  const filtered=(filter==="all"?items:items.filter(i=>i.category===filter)).sort((a,b)=>(b.amount||0)-(a.amount||0));
  const byCatExp=CATS.map(c=>({...c,total:expenses.filter(i=>i.category===c.id).reduce((a,i)=>{const v=i.amount||0;return a+(i.period==="mensal"?v:i.period==="anual"?v/12:0);},0),count:expenses.filter(i=>i.category===c.id).length})).filter(c=>c.count>0).sort((a,b)=>b.total-a.total);
  const byCatInc=INCOME_CATS.map(c=>({...c,total:incomes.filter(i=>i.category===c.id).reduce((a,i)=>{const v=i.amount||0;return a+(i.period==="mensal"?v:i.period==="anual"?v/12:0);},0),count:incomes.filter(i=>i.category===c.id).length})).filter(c=>c.count>0).sort((a,b)=>b.total-a.total);

  const exportCSV=()=>{
    const rows=["Tipo,Nome,Categoria,Valor,Período,Canal,Notas",...items.map(i=>{const cat=ALL_CATS.find(c=>c.id===i.category);return`${i.isIncome?"Receita":"Gasto"},${i.name},${cat?.name||i.category},${i.amount},${i.period},${i.channel||""},${i.notes||""}`;})];
    const blob=new Blob([rows.join("\n")],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`lacasa-financeiro-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);toast?.success("CSV exportado!");
  };
  const exportReport=()=>{
    const txt=`RELATÓRIO FINANCEIRO — LaCasaStudio\n${new Date().toLocaleDateString("pt-BR")}\n${"=".repeat(50)}\n\n📊 RESUMO MENSAL\nReceitas: ${fmt(monthlyInc)}\nDespesas: ${fmt(monthlyExp)}\nLucro: ${fmt(profit)}\nROI: ${roi}%\n\n📊 RESUMO ANUAL\nReceitas: ${fmt(annualInc)}\nDespesas: ${fmt(annualExp)}\nLucro: ${fmt(annualInc-annualExp)}\n\n💸 DESPESAS POR CATEGORIA\n${byCatExp.map(c=>`  ${c.icon} ${c.name}: ${fmt(c.total)}/mês (${c.count} itens)`).join("\n")}\n\n💰 RECEITAS POR CATEGORIA\n${byCatInc.map(c=>`  ${c.icon} ${c.name}: ${fmt(c.total)}/mês (${c.count} itens)`).join("\n")}\n\n📋 TODOS OS ITENS\n${items.map(i=>`  [${i.isIncome?"💰":"💸"}] ${i.name} — ${fmt(i.amount)} (${i.period})${i.channel?` · ${i.channel}`:""}${i.notes?` · ${i.notes}`:""}`).join("\n")}`;
    cp(txt);
  };

  return<div className="page-enter" role="main" aria-label="Orcamento" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Controle Financeiro" sub="Gastos + Receitas · ROI · Lucro · Exportação" action={<div style={{display:"flex",gap:6}}>
      <Btn onClick={exportCSV} style={{fontSize:10,background:"transparent",border:`1px solid ${C.border}`,color:C.dim}}>📥 CSV</Btn>
      <Btn onClick={exportReport} style={{fontSize:10,background:"transparent",border:`1px solid ${C.border}`,color:C.dim}}>📋 Relatório</Btn>
      <Btn onClick={()=>{setShowAdd(true);setEditId(null);setForm({name:"",category:"soft",amount:"",period:"mensal",notes:"",channel:"",isIncome:false});}}>+ Novo</Btn>
    </div>}/>

    {/* Cards */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:20}}>
      {[["Receita/mês",monthlyInc,C.green],["Gasto/mês",monthlyExp,C.red],["Lucro/mês",profit,profit>=0?C.green:C.red],["ROI",roi+"%",roi>=100?C.green:roi>=50?"#F59E0B":C.red],["Anual",annualInc-annualExp,annualInc-annualExp>=0?C.green:C.red],["Itens",items.length,C.blue]].map(([l,v,c])=>
        <div key={l} style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14,textAlign:"center"}}>
          <div style={{fontSize:9,color:C.dim,letterSpacing:1}}>{l}</div>
          <div style={{fontSize:20,fontWeight:800,color:c,marginTop:4}}>{typeof v==="number"?fmt(v):v}</div>
        </div>
      )}
    </div>

    {/* Tabs */}
    <MagicTabs tabs={[{key:"overview",icon:"📊",label:"Overview",color:C.blue},{key:"expenses",icon:"💸",label:"Gastos",color:C.red},{key:"income",icon:"💰",label:"Receitas",color:C.green},{key:"all",icon:"📋",label:"Tudo",color:C.purple}]} active={tab} onChange={setTab}/>

    {/* OVERVIEW */}
    {tab==="overview"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      {/* Expense breakdown */}
      <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.red}15`,padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.red}}>💸 Despesas ({fmt(monthlyExp)}/mês)</div>
        {byCatExp.length?byCatExp.map(c=>{const pct=monthlyExp?Math.round(c.total/monthlyExp*100):0;return<div key={c.id} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span>{c.icon} {c.name} ({c.count})</span><span style={{color:c.color,fontWeight:700}}>{fmt(c.total)} · {pct}%</span></div>
          <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,.06)"}}><div style={{height:"100%",borderRadius:3,background:c.color,width:`${pct}%`,transition:"width .5s"}}/></div>
        </div>}):<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:20}}>Nenhuma despesa</div>}
      </div>
      {/* Income breakdown */}
      <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.green}15`,padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.green}}>💰 Receitas ({fmt(monthlyInc)}/mês)</div>
        {byCatInc.length?byCatInc.map(c=>{const pct=monthlyInc?Math.round(c.total/monthlyInc*100):0;return<div key={c.id} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span>{c.icon} {c.name} ({c.count})</span><span style={{color:c.color,fontWeight:700}}>{fmt(c.total)} · {pct}%</span></div>
          <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,.06)"}}><div style={{height:"100%",borderRadius:3,background:c.color,width:`${pct}%`,transition:"width .5s"}}/></div>
        </div>}):<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:20}}>Nenhuma receita<br/><span style={{fontSize:10}}>Adicione receitas de AdSense, afiliados, etc.</span></div>}
      </div>
      {/* Profit gauge */}
      <div style={{gridColumn:"1/-1",background:profit>=0?`linear-gradient(135deg,${C.green}06,${C.blue}06)`:`linear-gradient(135deg,${C.red}06,${C.red}03)`,borderRadius:14,border:`1px solid ${profit>=0?C.green:C.red}15`,padding:20,textAlign:"center"}}>
        <div style={{fontSize:12,color:C.dim}}>Balanço Mensal</div>
        <div style={{fontSize:36,fontWeight:900,color:profit>=0?C.green:C.red,marginTop:4}}>{fmt(profit)}</div>
        <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:10}}>
          <div><span style={{fontSize:10,color:C.dim}}>ROI</span><div style={{fontSize:18,fontWeight:800,color:roi>=100?C.green:"#F59E0B"}}>{roi}%</div></div>
          <div><span style={{fontSize:10,color:C.dim}}>Break-even</span><div style={{fontSize:18,fontWeight:800,color:profit>=0?C.green:C.red}}>{profit>=0?"✅ Positivo":"❌ Negativo"}</div></div>
          <div><span style={{fontSize:10,color:C.dim}}>Margem</span><div style={{fontSize:18,fontWeight:800,color:C.blue}}>{monthlyInc>0?Math.round((profit/monthlyInc)*100):0}%</div></div>
        </div>
      </div>
    </div>}

    {/* EXPENSES / INCOME / ALL */}
    {(tab==="expenses"||tab==="income"||tab==="all")&&<div>
      <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
        <button onClick={()=>setFilter("all")} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${filter==="all"?C.blue:C.border}`,background:filter==="all"?`${C.blue}15`:"transparent",color:filter==="all"?C.blue:C.dim,cursor:"pointer",fontSize:10,fontWeight:600}}>Todos</button>
        {(tab==="expenses"?CATS:tab==="income"?INCOME_CATS:ALL_CATS).map(c=>{const cnt=items.filter(i=>i.category===c.id).length;return cnt?<button key={c.id} onClick={()=>setFilter(c.id)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${filter===c.id?c.color:C.border}`,background:filter===c.id?`${c.color}15`:"transparent",color:filter===c.id?c.color:C.dim,cursor:"pointer",fontSize:10}}>{c.icon} {c.name} ({cnt})</button>:null;})}
      </div>
      <div style={{display:"grid",gap:6}}>
        {filtered.filter(i=>tab==="all"?true:tab==="expenses"?!i.isIncome:i.isIncome).map(item=>{const cat=ALL_CATS.find(c=>c.id===item.category)||{icon:"📦",name:"Outro",color:"#94A3B8"};const isInc=item.isIncome;return<div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:C.bgCard,borderRadius:10,border:`1px solid ${C.border}`,borderLeft:`3px solid ${isInc?C.green:cat.color}`}}>
          <span style={{fontSize:18}}>{cat.icon}</span>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:700,fontSize:13}}>{item.name}</span>{isInc&&<span style={{fontSize:8,padding:"1px 6px",borderRadius:3,background:`${C.green}15`,color:C.green,fontWeight:700}}>RECEITA</span>}</div>
            <div style={{fontSize:10,color:C.dim}}>{cat.name}{item.channel?` · ${item.channel}`:""}{item.notes?` · ${item.notes}`:""}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:16,fontWeight:800,color:isInc?C.green:cat.color}}>{isInc?"+":"-"}{fmt(item.amount)}</div>
            <div style={{fontSize:9,color:C.dim,padding:"1px 6px",borderRadius:3,background:"rgba(255,255,255,.04)"}}>{item.period}</div>
          </div>
          <div style={{display:"flex",gap:3}}>
            <button onClick={()=>{setEditId(item.id);setForm({name:item.name,category:item.category||"other",amount:String(item.amount),period:item.period||"mensal",notes:item.notes||"",channel:item.channel||"",isIncome:!!item.isIncome});setShowAdd(true);}} style={{padding:"4px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:9}}>✏️</button>
            <button onClick={()=>del(item.id)} style={{padding:"4px 8px",borderRadius:4,border:`1px solid ${C.red}20`,background:`${C.red}08`,color:C.red,cursor:"pointer",fontSize:9}}>🗑</button>
          </div>
        </div>})}
      </div>
      {filtered.filter(i=>tab==="all"?true:tab==="expenses"?!i.isIncome:i.isIncome).length===0&&<div style={{textAlign:"center",padding:40,color:C.dim}}>Nenhum item nesta categoria</div>}
    </div>}

    {/* Add/Edit Modal */}
    {showAdd&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(6px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
      <div style={{background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:24,width:460}}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:16}}>{editId?"✏️ Editar":"+ Novo Item"}</div>
        {/* Type toggle */}
        <div style={{display:"flex",gap:4,marginBottom:14}}>
          <button onClick={()=>setForm(p=>({...p,isIncome:false,category:"soft"}))} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${!form.isIncome?C.red:C.border}`,background:!form.isIncome?`${C.red}12`:"transparent",color:!form.isIncome?C.red:C.dim,cursor:"pointer",fontSize:13,fontWeight:700}}>💸 Despesa</button>
          <button onClick={()=>setForm(p=>({...p,isIncome:true,category:"adsense"}))} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${form.isIncome?C.green:C.border}`,background:form.isIncome?`${C.green}12`:"transparent",color:form.isIncome?C.green:C.dim,cursor:"pointer",fontSize:13,fontWeight:700}}>💰 Receita</button>
        </div>
        <div style={{display:"grid",gap:10}}>
          <div><Label t="Nome *"/><Input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder={form.isIncome?"Ex: AdSense Canal X, Hotmart...":"Ex: Midjourney, ElevenLabs..."}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><Label t="Categoria"/><Select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>{(form.isIncome?INCOME_CATS:CATS).map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</Select></div>
            <div><Label t="Período"/><Select value={form.period} onChange={e=>setForm(p=>({...p,period:e.target.value}))}>{PERIODS.map(p=><option key={p} value={p}>{p}</option>)}</Select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><Label t="Valor (R$) *"/><Input type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} placeholder="99.90"/></div>
            <div><Label t="Canal (opcional)"/><Input value={form.channel} onChange={e=>setForm(p=>({...p,channel:e.target.value}))} placeholder="Nome do canal..."/></div>
          </div>
          <div><Label t="Notas"/><Input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Anotações..."/></div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:16}}>
          <Btn onClick={save} style={{flex:1}}>{editId?"💾 Salvar":form.isIncome?"💰 Adicionar Receita":"💸 Adicionar Gasto"}</Btn>
          <Btn onClick={()=>{setShowAdd(false);setEditId(null);}} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.dim}}>Cancelar</Btn>
        </div>
      </div>
    </div>}
  </div>
}
