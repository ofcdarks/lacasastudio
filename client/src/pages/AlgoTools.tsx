// @ts-nocheck
import { useState, useEffect } from "react";
import { researchApi } from "../lib/api";
import { C, Btn, Hdr, Input, Select, Label } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";
import MagicTabs from "../components/shared/MagicTabs";

const fmt=n=>{if(!n)return"0";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return n.toString();};

export default function AlgoTools(){
  const toast=useToast();const pg=useProgress();
  const[tab,setTab]=useState("alerts");
  const[alerts,setAlerts]=useState(null);const[alertsLoading,setAlertsLoading]=useState(false);
  const[bestTime,setBestTime]=useState(null);const[btLoading,setBtLoading]=useState(false);
  const[btNiche,setBtNiche]=useState("");const[btCountry,setBtCountry]=useState("BR");const[btFreq,setBtFreq]=useState("3x/semana");
  const[trends,setTrends]=useState(null);const[trLoading,setTrLoading]=useState(false);
  const[trNiche,setTrNiche]=useState("");const[trCountry,setTrCountry]=useState("BR");
  const[engage,setEngage]=useState(null);const[egLoading,setEgLoading]=useState(false);
  const[egTitle,setEgTitle]=useState("");const[egNiche,setEgNiche]=useState("");
  const cp=txt=>{try{const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast?.success("Copiado!");}catch{}};

  const loadAlerts=async()=>{setAlertsLoading(true);pg?.start("🔔 Checando Canais",["Buscando vídeos recentes","Calculando velocidade"]);try{const r=await researchApi.spyAlerts();pg?.done();setAlerts(r);}catch(e){pg?.fail(e.message);}setAlertsLoading(false);};
  const loadBestTime=async()=>{if(!btNiche){toast?.error("Nicho obrigatório");return;}setBtLoading(true);pg?.start("⏰ Calculando Horários",["Analisando audiência","Cruzando dados"]);try{const r=await researchApi.bestTime({niche:btNiche,country:btCountry,frequency:btFreq});pg?.done();setBestTime(r);}catch(e){pg?.fail(e.message);}setBtLoading(false);};
  const loadTrends=async()=>{setTrLoading(true);pg?.start("📈 Buscando Tendências",["Trending YouTube","Virais do nicho","Analisando padrões"]);try{const r=await researchApi.trendDetector({niche:trNiche,country:trCountry});pg?.done();setTrends(r);}catch(e){pg?.fail(e.message);}setTrLoading(false);};
  const loadEngage=async()=>{if(!egTitle){toast?.error("Título obrigatório");return;}setEgLoading(true);pg?.start("💬 Gerando Engajamento",["Comentários","CTAs","Estratégia"]);try{const r=await researchApi.engagementGen({title:egTitle,niche:egNiche});pg?.done();setEngage(r);}catch(e){pg?.fail(e.message);}setEgLoading(false);};

  return<div className="page-enter" style={{maxWidth:1000,margin:"0 auto"}}>
    <Hdr title="Armas do Algoritmo" sub="Spy Alerts · Melhor Horário · Tendências · Engajamento"/>
    <MagicTabs tabs={[{key:"alerts",icon:"🔔",label:"Spy Alerts",color:C.red},{key:"time",icon:"⏰",label:"Melhor Horário",color:C.blue},{key:"trends",icon:"📈",label:"Tendências",color:C.green},{key:"engage",icon:"💬",label:"Engajamento",color:C.purple}]} active={tab} onChange={setTab}/>

    {/* 🔔 SPY ALERTS */}
    {tab==="alerts"&&<div>
      <Btn onClick={loadAlerts} disabled={alertsLoading} style={{marginBottom:16}}>{alertsLoading?"⏳":"🔔 Checar Novos Vídeos (48h)"}</Btn>
      {alerts&&<div>
        <div style={{fontSize:11,color:C.dim,marginBottom:12}}>{alerts.channelsChecked} canais checados · {alerts.alerts?.length||0} vídeos novos</div>
        {alerts.alerts?.length===0&&<div style={{textAlign:"center",padding:40,color:C.dim}}>Nenhum vídeo novo nas últimas 48h. Salve mais canais na Pesquisa de Mercado.</div>}
        <div style={{display:"grid",gap:8}}>
          {(alerts.alerts||[]).map((a,i)=><div key={i} style={{display:"flex",gap:12,padding:14,background:C.bgCard,borderRadius:12,border:`1px solid ${a.isViral?`${C.red}40`:a.isTrending?`${C.green}30`:C.border}`,borderLeft:`4px solid ${a.isViral?C.red:a.isTrending?C.green:C.blue}`}}>
            {a.thumbnail&&<img src={a.thumbnail} style={{width:120,height:68,borderRadius:6,objectFit:"cover"}}/>}
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                {a.isViral&&<span style={{fontSize:9,padding:"2px 8px",borderRadius:4,background:`${C.red}15`,color:C.red,fontWeight:800}}>🔥 VIRAL</span>}
                {a.isTrending&&!a.isViral&&<span style={{fontSize:9,padding:"2px 8px",borderRadius:4,background:`${C.green}15`,color:C.green,fontWeight:800}}>📈 TRENDING</span>}
                <span style={{fontSize:9,color:C.dim}}>{a.channelName} · {a.hoursAgo}h atrás</span>
              </div>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{a.title}</div>
              <div style={{display:"flex",gap:12,fontSize:11}}>
                <span style={{color:C.green,fontWeight:700}}>{fmt(a.views)} views</span>
                <span style={{color:C.blue}}>{fmt(a.velocity)}/hora</span>
                <span style={{color:C.dim}}>{fmt(a.likes)} likes</span>
              </div>
            </div>
            <button onClick={()=>cp(a.title)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9,alignSelf:"center"}}>📋</button>
          </div>)}
        </div>
      </div>}
    </div>}

    {/* ⏰ BEST TIME */}
    {tab==="time"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:10,marginBottom:16,alignItems:"end"}}>
        <div><Label t="Nicho *"/><Input value={btNiche} onChange={e=>setBtNiche(e.target.value)} placeholder="Ex: dark history..."/></div>
        <div><Label t="País"/><Select value={btCountry} onChange={e=>setBtCountry(e.target.value)}><option value="BR">Brasil</option><option value="US">EUA</option><option value="global">Global</option></Select></div>
        <div><Label t="Frequência"/><Select value={btFreq} onChange={e=>setBtFreq(e.target.value)}><option value="diário">Diário</option><option value="3x/semana">3x/semana</option><option value="2x/semana">2x/semana</option><option value="1x/semana">1x/semana</option></Select></div>
        <Btn onClick={loadBestTime} disabled={btLoading}>{btLoading?"⏳":"⏰ Calcular"}</Btn>
      </div>
      {bestTime&&<div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:16}}>
          {(bestTime.bestDays||[]).map(d=><div key={d.day} style={{background:C.bgCard,borderRadius:10,border:`1px solid ${d.score>=85?`${C.green}30`:d.score>=70?`${C.blue}20`:C.border}`,padding:12,textAlign:"center"}}>
            <div style={{fontSize:11,fontWeight:700,marginBottom:4}}>{d.day}</div>
            <div style={{fontSize:24,fontWeight:800,color:d.score>=85?C.green:d.score>=70?C.blue:"#F59E0B"}}>{d.score}</div>
            <div style={{fontSize:8,color:C.dim,marginTop:4}}>{d.reason?.slice(0,40)}</div>
          </div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.green}20`,padding:16}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:C.green}}>⏰ Melhores Horários</div>
            {(bestTime.bestHours||[]).map((h,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:18,fontWeight:800,color:C.green}}>{h.hour}</span>
              <span style={{fontSize:11,color:C.muted}}>{h.reason}</span>
              <span style={{fontSize:13,fontWeight:700,color:C.blue}}>{h.score}/100</span>
            </div>)}
          </div>
          <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.blue}20`,padding:16}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:C.blue}}>📅 Schedule Ideal</div>
            {(bestTime.schedule||[]).map((s,i)=><div key={i} style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontWeight:700,fontSize:13}}>{s.day} {s.hour}</span>
              <span style={{fontSize:10,color:C.dim,marginLeft:8}}>{s.type}</span>
            </div>)}
          </div>
        </div>
        {bestTime.recommendation&&<div style={{background:`${C.green}06`,borderRadius:12,border:`1px solid ${C.green}20`,padding:14,marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:13,color:C.green,marginBottom:4}}>💡 Recomendação</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{bestTime.recommendation}</div>
        </div>}
        {bestTime.firstHourStrategy&&<div style={{background:`${C.red}06`,borderRadius:12,border:`1px solid ${C.red}20`,padding:14,marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:13,color:C.red,marginBottom:4}}>🚀 Estratégia da 1ª Hora (CRÍTICO)</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{bestTime.firstHourStrategy}</div>
        </div>}
        {bestTime.algorithmTips&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14}}><div style={{fontWeight:700,fontSize:13,marginBottom:8}}>🧠 Dicas do Algoritmo</div>{bestTime.algorithmTips.map((t,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0"}}>🔥 {t}</div>)}</div>}
      </div>}
    </div>}

    {/* 📈 TRENDS */}
    {tab==="trends"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,marginBottom:16,alignItems:"end"}}>
        <div><Label t="Nicho (opcional)"/><Input value={trNiche} onChange={e=>setTrNiche(e.target.value)} placeholder="Filtrar por nicho..."/></div>
        <div><Label t="País"/><Select value={trCountry} onChange={e=>setTrCountry(e.target.value)}><option value="BR">Brasil</option><option value="US">EUA</option><option value="GB">UK</option><option value="MX">México</option><option value="ES">Espanha</option><option value="PT">Portugal</option><option value="AR">Argentina</option><option value="CO">Colômbia</option><option value="FR">França</option><option value="DE">Alemanha</option><option value="JP">Japão</option><option value="IN">Índia</option></Select></div>
        <Btn onClick={loadTrends} disabled={trLoading}>{trLoading?"⏳":"📈 Buscar Tendências"}</Btn>
      </div>
      {trends&&<div>
        {/* AI Opportunities */}
        {trends.insights&&<div style={{background:`linear-gradient(135deg,${C.red}06,${C.blue}06)`,borderRadius:14,border:`1px solid ${C.red}20`,padding:16,marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>🧠 Oportunidades pra Surfar AGORA</div>
          {(trends.insights.opportunities||[]).map((o,i)=><div key={i} style={{padding:12,marginBottom:8,background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`,borderLeft:`3px solid ${o.urgency==="alta"?C.red:"#F59E0B"}`,borderTopLeftRadius:0,borderBottomLeftRadius:0}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontWeight:700,fontSize:14}}>{o.topic}</span>
              <div style={{display:"flex",gap:4}}>
                {o.estimatedViews&&<span style={{fontSize:9,color:C.green,background:`${C.green}12`,padding:"2px 8px",borderRadius:4}}>👁️ {o.estimatedViews}</span>}
                {o.format&&<span style={{fontSize:9,color:C.purple,background:`${C.purple}12`,padding:"2px 8px",borderRadius:4}}>{o.format==="short"?"📱":"🎬"} {o.format}</span>}
                <span style={{fontSize:9,fontWeight:700,color:o.urgency==="alta"?C.red:"#F59E0B",background:o.urgency==="alta"?`${C.red}15`:`#F59E0B15`,padding:"2px 8px",borderRadius:4}}>●{o.urgency}</span>
              </div>
            </div>
            <div style={{fontSize:12,color:C.muted,marginBottom:6,lineHeight:1.6}}>{o.why}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"rgba(255,255,255,.02)",borderRadius:6,marginBottom:4}}>
              <span style={{fontSize:13,fontWeight:600,color:C.green}}>{o.titleSuggestion}</span>
              <button onClick={()=>cp(o.titleSuggestion)} style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${C.green}30`,background:`${C.green}08`,color:C.green,cursor:"pointer",fontSize:10}}>📋 Copiar</button>
            </div>
            {o.hookIdea&&<div style={{fontSize:11,color:C.blue,marginBottom:2}}>🎣 Hook: "{o.hookIdea}"</div>}
            {o.toolToUse&&<div style={{fontSize:10,color:C.dim}}>🔧 Usar: {o.toolToUse}</div>}
          </div>)}

          {/* Patterns */}
          {trends.insights.patterns?.length>0&&<div style={{marginTop:10,marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:C.dim,marginBottom:6}}>📊 Padrões Detectados</div>
            {trends.insights.patterns.map((p,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>📌 {p}</div>)}
          </div>}

          {/* Cross-niche */}
          {trends.insights.crossNiche&&<div style={{background:`${C.purple}06`,borderRadius:10,border:`1px solid ${C.purple}20`,padding:12,marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:12,color:C.purple,marginBottom:4}}>🔄 Oportunidade Cross-Nicho</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{trends.insights.crossNiche}</div>
          </div>}

          {/* Shorts combos */}
          {trends.insights.shortsCombos?.length>0&&<div style={{marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:C.orange,marginBottom:6}}>📱 Ideias de Shorts (surfar agora)</div>
            {trends.insights.shortsCombos.map((s,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
              <div><span style={{fontSize:10,color:C.dim}}>{s.trend}</span><div style={{fontSize:12,color:C.text}}>{s.shortIdea}</div></div>
              <button onClick={()=>cp(s.shortIdea)} style={{padding:"2px 8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:8,flexShrink:0}}>📋</button>
            </div>)}
          </div>}

          {/* Action plan */}
          {trends.insights.actionPlan&&<div style={{background:`${C.green}06`,borderRadius:10,border:`1px solid ${C.green}20`,padding:12,marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:12,color:C.green,marginBottom:4}}>⚡ Plano de Ação (próximos 3 dias)</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{trends.insights.actionPlan}</div>
          </div>}

          {/* Avoid + Prediction */}
          {trends.insights.avoidTopics?.length>0&&<div style={{marginBottom:8}}>{trends.insights.avoidTopics.map((t,i)=><div key={i} style={{fontSize:11,color:C.red,padding:"2px 0"}}>⛔ {t}</div>)}</div>}
          {trends.insights.prediction&&<div style={{fontSize:12,color:C.blue,fontWeight:600}}>🔮 {trends.insights.prediction}</div>}
        </div>}

        {/* Trending + Niche */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>🔥 Trending {trCountry}</div>
            {(trends.trending||[]).slice(0,10).map((v,i)=><div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:800,color:i<3?C.red:C.dim,minWidth:18}}>{i+1}</span>
              <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600}}>{v.title?.slice(0,50)}</div><div style={{fontSize:9,color:C.dim}}>{v.channelTitle}</div></div>
              <span style={{fontSize:11,fontWeight:700,color:C.green}}>{fmt(v.views)}</span>
            </div>)}
          </div>
          {trends.nicheVirals?.length>0&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.green}20`,padding:14}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:C.green}}>📈 Virais do Nicho (72h)</div>
            {trends.nicheVirals.slice(0,10).map((v,i)=><div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:800,color:i<3?C.green:C.dim,minWidth:18}}>{i+1}</span>
              <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600}}>{v.title?.slice(0,50)}</div><div style={{fontSize:9,color:C.dim}}>{v.channelTitle}</div></div>
              <div style={{textAlign:"right"}}><span style={{fontSize:11,fontWeight:700,color:C.green}}>{fmt(v.views)}</span><button onClick={()=>cp(v.title)} style={{marginLeft:4,padding:"1px 4px",border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:7,borderRadius:3}}>📋</button></div>
            </div>)}
          </div>}
        </div>
      </div>}
    </div>}

    {/* 💬 ENGAGEMENT */}
    {tab==="engage"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,marginBottom:16,alignItems:"end"}}>
        <div><Label t="Título do Vídeo *"/><Input value={egTitle} onChange={e=>setEgTitle(e.target.value)} placeholder="Título do vídeo que vai publicar..."/></div>
        <div><Label t="Nicho"/><Input value={egNiche} onChange={e=>setEgNiche(e.target.value)} placeholder="dark history..."/></div>
        <Btn onClick={loadEngage} disabled={egLoading}>{egLoading?"⏳":"💬 Gerar"}</Btn>
      </div>
      {engage&&<div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          {/* Pinned comment */}
          <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.red}20`,padding:14}}>
            <div style={{fontWeight:700,fontSize:13,color:C.red,marginBottom:6}}>📌 Comentário Fixado</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:8}}>{engage.pinnedComment}</div>
            <button onClick={()=>cp(engage.pinnedComment)} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${C.red}30`,background:`${C.red}08`,color:C.red,cursor:"pointer",fontSize:10,fontWeight:700,width:"100%"}}>📋 Copiar</button>
          </div>
          {/* First comment */}
          <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.blue}20`,padding:14}}>
            <div style={{fontWeight:700,fontSize:13,color:C.blue,marginBottom:6}}>💬 1º Comentário (Canal)</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:8}}>{engage.firstComment}</div>
            <button onClick={()=>cp(engage.firstComment)} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${C.blue}30`,background:`${C.blue}08`,color:C.blue,cursor:"pointer",fontSize:10,fontWeight:700,width:"100%"}}>📋 Copiar</button>
          </div>
        </div>

        {/* CTAs */}
        <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.green}20`,padding:14,marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:13,color:C.green,marginBottom:8}}>🎯 CTAs pro Vídeo (NÃO genéricos)</div>
          {(engage.ctaInVideo||[]).map((c,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:12,color:C.muted,flex:1}}>{c}</span><button onClick={()=>cp(c)} style={{padding:"2px 6px",border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:8,borderRadius:3}}>📋</button></div>)}
        </div>

        {/* Questions + Polemic + Catchphrase */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
          <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:6}}>❓ Perguntas (descrição)</div>
            {(engage.questions||[]).map((q,i)=><div key={i} style={{fontSize:11,color:C.muted,padding:"3px 0",cursor:"pointer"}} onClick={()=>cp(q)}>• {q}</div>)}
          </div>
          <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.red}15`,padding:14}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:6,color:C.red}}>🔥 Opinião Polêmica (segura)</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{engage.polemic}</div>
            <button onClick={()=>cp(engage.polemic||"")} style={{marginTop:6,padding:"4px 10px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9,width:"100%"}}>📋</button>
          </div>
          <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.purple}15`,padding:14}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:6,color:C.purple}}>🎤 Catchphrase</div>
            <div style={{fontSize:14,fontWeight:700,color:C.text,lineHeight:1.6}}>"{engage.callbackHook}"</div>
            <button onClick={()=>cp(engage.callbackHook||"")} style={{marginTop:6,padding:"4px 10px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9,width:"100%"}}>📋</button>
          </div>
        </div>

        {/* Reply templates + Community + End screen */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:6}}>💬 Templates de Resposta</div>
            {(engage.replyTemplates||[]).map((r,i)=><div key={i} style={{fontSize:11,color:C.muted,padding:"4px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}} onClick={()=>cp(r)}>📋 {r}</div>)}
          </div>
          <div style={{display:"grid",gap:8}}>
            {engage.communityPost&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.border}`,padding:14}}>
              <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>📢 Post Comunidade</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{engage.communityPost}</div>
              <button onClick={()=>cp(engage.communityPost)} style={{marginTop:6,padding:"4px 10px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:9,width:"100%"}}>📋</button>
            </div>}
            {engage.endScreenScript&&<div style={{background:C.bgCard,borderRadius:12,border:`1px solid ${C.green}15`,padding:14}}>
              <div style={{fontWeight:700,fontSize:12,marginBottom:4,color:C.green}}>📺 End Screen (falar)</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>"{engage.endScreenScript}"</div>
              <button onClick={()=>cp(engage.endScreenScript)} style={{marginTop:6,padding:"4px 10px",borderRadius:4,border:`1px solid ${C.green}30`,background:`${C.green}08`,color:C.green,cursor:"pointer",fontSize:9,width:"100%"}}>📋</button>
            </div>}
          </div>
        </div>
      </div>}
    </div>}
  </div>
}
