// @ts-nocheck
import { useState, useEffect } from "react";
import { C, Btn, Hdr } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";
import MagicTabs from "../components/shared/MagicTabs";

const api = {
  status: () => fetch("/api/algorithm/oauth/status", { headers: { Authorization: `Bearer ${localStorage.getItem("lc_token")}` } }).then(r => r.json()),
  url: () => fetch("/api/algorithm/oauth/url", { headers: { Authorization: `Bearer ${localStorage.getItem("lc_token")}` } }).then(r => r.json()),
  overview: (days) => fetch(`/api/algorithm/my-channel/overview?days=${days}`, { headers: { Authorization: `Bearer ${localStorage.getItem("lc_token")}` } }).then(r => r.json()),
  videos: (days) => fetch(`/api/algorithm/my-channel/videos?days=${days}`, { headers: { Authorization: `Bearer ${localStorage.getItem("lc_token")}` } }).then(r => r.json()),
  satisfaction: () => fetch("/api/algorithm/satisfaction", { headers: { Authorization: `Bearer ${localStorage.getItem("lc_token")}` } }).then(r => r.json()),
  devices: () => fetch("/api/algorithm/devices", { headers: { Authorization: `Bearer ${localStorage.getItem("lc_token")}` } }).then(r => r.json()),
};
const fmt=n=>{if(!n)return"0";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(n);};

function Ring({score,size=80,label}){const r=size/2-6,circ=2*Math.PI*r,off=circ-(score/100)*circ;const c=score>=80?C.green:score>=60?"#F59E0B":C.red;return<div style={{textAlign:"center"}}><svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="5"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset .8s"}}/><text x={size/2} y={size/2+2} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={size*.28} fontWeight="800">{score}</text></svg>{label&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>{label}</div>}</div>}

function Stat({label,value,color,sub}){return<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 14px",textAlign:"center"}}><div style={{fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div><div style={{fontSize:22,fontWeight:800,color:color||C.text}}>{value}</div>{sub&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>{sub}</div>}</div>}

export default function MyAnalytics(){
  const toast=useToast();const pg=useProgress();
  const[connected,setConnected]=useState(false);const[channelName,setChannelName]=useState("");
  const[tab,setTab]=useState("overview");const[days,setDays]=useState(28);
  const[overview,setOverview]=useState(null);const[videos,setVideos]=useState([]);
  const[satisfaction,setSatisfaction]=useState(null);const[devices,setDevices]=useState(null);
  const[loading,setLoading]=useState(false);

  useEffect(()=>{
    api.status().then(s=>{setConnected(s.connected);setChannelName(s.channelName);}).catch(()=>{});
    const params = new URLSearchParams(window.location.search);
    if(params.get("oauth")==="success"){toast?.success("YouTube conectado com sucesso!");window.history.replaceState({},"",window.location.pathname);}
    if(params.get("oauth")==="error"){toast?.error("Erro OAuth: "+(params.get("reason")||"tente novamente"));window.history.replaceState({},"",window.location.pathname);}
  },[]);

  const connect=async()=>{
    try{
      const d=await api.url();
      if(d.error){toast?.error(d.error);return;}
      if(d.url)window.location.href=d.url;
      else toast?.error("URL OAuth não retornada. Verifique YT_OAUTH_CLIENT_ID no .env");
    }catch(e){toast?.error("Erro ao conectar: "+(e?.message||"verifique o console"));}
  };

  const loadData=async(t)=>{
    setTab(t);setLoading(true);
    pg?.start("📊 Carregando dados reais",["Conectando YouTube Analytics","Processando métricas"]);
    try{
      if(t==="overview"||!overview){const o=await api.overview(days);setOverview(o);}
      if(t==="videos"||!videos.length){const v=await api.videos(days);setVideos(Array.isArray(v.videos)?v.videos:[]);}
      if(t==="satisfaction"){const s=await api.satisfaction();setSatisfaction(s);}
      if(t==="devices"){const d=await api.devices();setDevices(d);}
      pg?.done();
    }catch(e){pg?.fail(e.message);}setLoading(false);
  };

  useEffect(()=>{if(connected)loadData("overview");},[connected]);

  if(!connected)return<div className="page-enter" style={{maxWidth:600,margin:"0 auto",textAlign:"center",padding:60}}>
    <Hdr title="Meu Canal — Dados Reais" sub="Conecte seu YouTube para ver CTR, AVD, satisfaction e muito mais"/>
    <div style={{fontSize:48,marginBottom:20}}>🔗</div>
    <div style={{fontSize:14,color:C.muted,marginBottom:24,lineHeight:1.7}}>Conectar via OAuth permite puxar dados REAIS do YouTube Analytics:<br/>CTR, retenção, satisfaction, traffic sources, devices e mais.</div>
    <Btn onClick={connect}>🔗 Conectar Minha Conta YouTube</Btn>
    <div style={{fontSize:11,color:C.dim,marginTop:12}}>Requer Google OAuth Client ID configurado no .env</div>
  </div>;

  const t=overview?.totals||{};

  return<div className="page-enter" style={{maxWidth:1100,margin:"0 auto"}}>
    <Hdr title={`📺 ${channelName}`} sub="Dados reais do YouTube Analytics — CTR, retenção, satisfaction" action={<div style={{display:"flex",gap:6}}>{[7,28,90].map(d=><button key={d} onClick={()=>{setDays(d);loadData(tab);}} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${days===d?C.blue:C.border}`,background:days===d?`${C.blue}12`:"transparent",color:days===d?C.blue:C.dim,cursor:"pointer",fontSize:11,fontWeight:600}}>{d}d</button>)}</div>}/>

    <MagicTabs tabs={[{key:"overview",icon:"📊",label:"Overview",color:C.blue},{key:"videos",icon:"🎬",label:"Vídeos",color:C.green},{key:"satisfaction",icon:"😊",label:"Satisfação",color:C.purple},{key:"devices",icon:"📱",label:"Devices",color:C.orange}]} active={tab} onChange={k=>loadData(k)}/>

    {tab==="overview"&&overview&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:20}}>
        <Stat label="Views" value={fmt(t.views)} color={C.green}/>
        <Stat label="Watch Time" value={`${fmt(Math.round(t.watchTime))}min`} color={C.blue}/>
        <Stat label="AVD" value={`${Math.round(t.avgDuration)}s`} color={C.purple}/>
        <Stat label="Retenção" value={`${Math.round(t.avgPct)}%`} color={t.avgPct>=50?C.green:C.red}/>
        <Stat label="Satisfaction" value={`${t.satisfaction}%`} color={t.satisfaction>=90?C.green:C.red}/>
        <Stat label="Net Subs" value={`+${fmt(t.netSubs)}`} color={t.netSubs>0?C.green:C.red}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
        <Stat label="Likes" value={fmt(t.likes)} color={C.green}/>
        <Stat label="Comments" value={fmt(t.comments)} color={C.blue}/>
        <Stat label="Shares" value={fmt(t.shares)} color={C.purple}/>
        <Stat label="Subs Gained" value={fmt(t.subsGained)} color={C.orange} sub={`-${fmt(t.subsLost)} lost`}/>
      </div>
      {overview.daily?.length>0&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>📈 Views por Dia</div>
        <div style={{display:"flex",gap:2,height:80,alignItems:"end"}}>
          {overview.daily.map((d,i)=>{const max=Math.max(...overview.daily.map(x=>x.views))||1;return<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{width:"100%",height:`${(d.views/max)*100}%`,background:`${C.green}40`,borderRadius:"3px 3px 0 0",minHeight:2}}/><div style={{fontSize:7,color:C.dim,marginTop:2}}>{d.date?.slice(8)}</div></div>})}
        </div>
      </div>}
    </div>}

    {tab==="videos"&&<div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🎬 Performance por Vídeo</div>
      {videos.map((v,i)=><div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
        <span style={{fontSize:12,fontWeight:800,color:C.dim,minWidth:20}}>{i+1}</span>
        {v.thumbnail&&<img src={v.thumbnail} style={{width:80,height:45,borderRadius:6,objectFit:"cover"}}/>}
        <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div><div style={{fontSize:10,color:C.dim}}>{fmt(v.views)} views · {Math.round(v.avgPct)}% ret</div></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,textAlign:"center",fontSize:10}}>
          <div><div style={{fontWeight:700,color:C.green}}>{fmt(v.views)}</div><div style={{color:C.dim}}>views</div></div>
          <div><div style={{fontWeight:700,color:C.blue}}>{Math.round(v.avgDuration)}s</div><div style={{color:C.dim}}>AVD</div></div>
          <div><div style={{fontWeight:700,color:C.purple}}>{Math.round(v.avgPct)}%</div><div style={{color:C.dim}}>ret</div></div>
          <div><div style={{fontWeight:700,color:C.orange}}>+{v.subsGained}</div><div style={{color:C.dim}}>subs</div></div>
        </div>
      </div>)}
    </div>}

    {tab==="satisfaction"&&satisfaction&&<div>
      <div style={{display:"flex",gap:20,alignItems:"center",background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
        <Ring score={satisfaction.overall} size={110} label="Satisfaction"/>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:satisfaction.overall>=90?C.green:C.red}}>Satisfaction Score: {satisfaction.overall}%</div>
          <div style={{fontSize:13,color:C.muted,marginTop:4}}>Tendência: {satisfaction.trend==="up"?"📈 Subindo":"📉 Caindo"}</div>
          <div style={{fontSize:11,color:C.dim,marginTop:4}}>Em 2026, satisfaction é o fator #1 de ranking do algoritmo</div>
        </div>
      </div>
      <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
        <div style={{display:"flex",gap:2,height:60,alignItems:"end"}}>
          {(satisfaction.daily||[]).slice(-30).map((d,i)=><div key={i} style={{flex:1,background:d.satisfaction>=90?`${C.green}40`:d.satisfaction>=70?`#F59E0B40`:`${C.red}40`,height:`${d.satisfaction}%`,borderRadius:"2px 2px 0 0",minHeight:2}}/>)}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.dim,marginTop:4}}><span>30 dias atrás</span><span>Hoje</span></div>
      </div>
    </div>}

    {tab==="devices"&&devices&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:16}}>
        {(devices.devices||[]).map((d,i)=><div key={i} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:16,textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:4}}>{d.device==="MOBILE"?"📱":d.device==="DESKTOP"?"💻":d.device==="TV"?"📺":"📟"}</div>
          <div style={{fontSize:20,fontWeight:800,color:C.blue}}>{d.pct}%</div>
          <div style={{fontSize:11,color:C.dim}}>{d.device}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:4}}>{fmt(d.views)} views · AVD {d.avgDuration}s</div>
        </div>)}
      </div>
      {devices.recommendations?.map((r,i)=><div key={i} style={{fontSize:12,color:C.muted,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>💡 {r}</div>)}
    </div>}
  </div>;
}
