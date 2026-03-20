// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { ideaApi } from "../lib/api";
import { C, Btn, Hdr } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

const TOOLS = {
  select: { icon: "↖", label: "Selecionar (V)", cur: "default" },
  rect: { icon: "□", label: "Retângulo (R)", cur: "crosshair" },
  ellipse: { icon: "○", label: "Elipse (O)", cur: "crosshair" },
  diamond: { icon: "◇", label: "Diamante (D)", cur: "crosshair" },
  line: { icon: "╱", label: "Linha (L)", cur: "crosshair" },
  arrow: { icon: "→", label: "Seta (A)", cur: "crosshair" },
  draw: { icon: "✎", label: "Desenho (P)", cur: "crosshair" },
  text: { icon: "T", label: "Texto (T)", cur: "text" },
  sticky: { icon: "🗒", label: "Post-it (S)", cur: "crosshair" },
  marker: { icon: "⚑", label: "Marcador (M)", cur: "crosshair" },
  image: { icon: "🖼", label: "Imagem (I)", cur: "crosshair" },
  eraser: { icon: "⌫", label: "Borracha (E)", cur: "cell" },
};

const COLORS = ["#ffffff","#1e1e1e","#EF4444","#F59E0B","#22C55E","#3B82F6","#A855F7","#EC4899","#06B6D4","#F97316"];
const STICKY_COLORS = ["#FEF08A","#FDBA74","#86EFAC","#93C5FD","#C4B5FD","#FDA4AF","#67E8F9","#FCA5A5"];
const MARKERS = ["⭐","❗","✅","❓","💡","🔥","🎯","⚠️","🚀","📌","🏆","❤️"];

const FONTS = [
  { name: "Handwritten", family: "'Caveat', cursive", url: "https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap" },
  { name: "Sans", family: "'Plus Jakarta Sans', sans-serif", url: null },
  { name: "Code", family: "'JetBrains Mono', monospace", url: null },
  { name: "Serif", family: "'Playfair Display', serif", url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" },
  { name: "Display", family: "'Bebas Neue', sans-serif", url: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" },
  { name: "Elegant", family: "'Cormorant Garamond', serif", url: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&display=swap" },
  { name: "Modern", family: "'Space Grotesk', sans-serif", url: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" },
  { name: "Brush", family: "'Permanent Marker', cursive", url: "https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap" },
];

const SIZES = { S: 16, M: 24, L: 36, XL: 52 };
const ALIGNS = ["left", "center", "right"];
const STROKE_W = [1, 2, 3, 5, 8];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// Load fonts
if (typeof document !== "undefined") {
  FONTS.forEach(f => {
    if (f.url && !document.querySelector(`link[href="${f.url}"]`)) {
      const link = document.createElement("link"); link.rel = "stylesheet"; link.href = f.url;
      document.head.appendChild(link);
    }
  });
}

/* ─── Render ─────────────────────────────── */
function renderEl(ctx, el, sel) {
  ctx.save();
  ctx.strokeStyle = el.color || "#fff";
  ctx.lineWidth = el.sw || 2;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.globalAlpha = (el.opacity ?? 100) / 100;

  const hasFill = el.fill && el.fill !== "none";

  switch (el.type) {
    case "rect": {
      if (hasFill) { ctx.fillStyle = el.fill === "hatch" ? "transparent" : (el.color || "#fff") + "25"; ctx.fillRect(el.x, el.y, el.w, el.h); }
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      if (el.fill === "hatch") hatch(ctx, el);
      break;
    }
    case "ellipse": {
      ctx.beginPath(); ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.abs(el.w / 2) || 1, Math.abs(el.h / 2) || 1, 0, 0, Math.PI * 2);
      if (hasFill) { ctx.fillStyle = (el.color || "#fff") + "25"; ctx.fill(); } ctx.stroke(); break;
    }
    case "diamond": {
      const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
      ctx.beginPath(); ctx.moveTo(cx, el.y); ctx.lineTo(el.x + el.w, cy); ctx.lineTo(cx, el.y + el.h); ctx.lineTo(el.x, cy); ctx.closePath();
      if (hasFill) { ctx.fillStyle = (el.color || "#fff") + "25"; ctx.fill(); } ctx.stroke(); break;
    }
    case "line": { ctx.beginPath(); ctx.moveTo(el.x, el.y); ctx.lineTo(el.x + el.w, el.y + el.h); ctx.stroke(); break; }
    case "arrow": {
      const ex = el.x + el.w, ey = el.y + el.h;
      ctx.beginPath(); ctx.moveTo(el.x, el.y); ctx.lineTo(ex, ey); ctx.stroke();
      const a = Math.atan2(el.h, el.w), hl = 16;
      ctx.beginPath(); ctx.moveTo(ex - hl * Math.cos(a - 0.4), ey - hl * Math.sin(a - 0.4)); ctx.lineTo(ex, ey); ctx.lineTo(ex - hl * Math.cos(a + 0.4), ey - hl * Math.sin(a + 0.4)); ctx.stroke(); break;
    }
    case "draw": {
      const pts = el.points || []; if (pts.length < 2) break;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke(); break;
    }
    case "text": {
      const fs = el.fontSize || 24;
      const ff = el.fontFamily || FONTS[1].family;
      ctx.font = `${el.bold ? "bold " : ""}${el.italic ? "italic " : ""}${fs}px ${ff}`;
      ctx.fillStyle = el.color || "#fff";
      ctx.textAlign = el.align || "left";
      const lines = (el.text || "").split("\n");
      const ax = el.align === "center" ? el.x + (el.textW || 0) / 2 : el.align === "right" ? el.x + (el.textW || 0) : el.x;
      lines.forEach((line, i) => ctx.fillText(line, ax, el.y + i * (fs * 1.4)));
      break;
    }
    case "sticky": {
      const sw = el.w || 220, sh = el.h || 160;
      ctx.fillStyle = el.stickyColor || "#FEF08A";
      ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      rr(ctx, el.x, el.y, sw, sh, 8); ctx.fill();
      ctx.shadowColor = "transparent"; ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1;
      rr(ctx, el.x, el.y, sw, sh, 8); ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.05)"; ctx.fillRect(el.x + 1, el.y + 1, sw - 2, 30);
      ctx.fillStyle = "#1a1a1a"; ctx.font = "bold 13px 'Plus Jakarta Sans',sans-serif";
      ctx.fillText(el.title || "Post-it", el.x + 12, el.y + 20);
      ctx.font = "12px 'Plus Jakarta Sans',sans-serif";
      wrap(ctx, el.text || "", el.x + 12, el.y + 46, sw - 24, 16, 6);
      break;
    }
    case "marker": {
      ctx.font = "40px serif"; ctx.fillText(el.icon || "⭐", el.x, el.y + 40);
      if (el.label) { ctx.font = "bold 11px 'Plus Jakarta Sans',sans-serif"; ctx.fillStyle = el.color || "#fff"; ctx.fillText(el.label, el.x - 2, el.y + 56); }
      break;
    }
    case "image": {
      if (el._img) try { ctx.drawImage(el._img, el.x, el.y, el.w || el._img.width, el.h || el._img.height); } catch {}
      break;
    }
  }

  if (sel) {
    ctx.strokeStyle = "#3B82F6"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    const b = bounds(el); ctx.strokeRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10); ctx.setLineDash([]);
    ctx.fillStyle = "#fff";
    [[b.x-4,b.y-4],[b.x+b.w+4,b.y-4],[b.x-4,b.y+b.h+4],[b.x+b.w+4,b.y+b.h+4]].forEach(([cx,cy]) => {
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = "#3B82F6"; ctx.lineWidth = 1.5; ctx.stroke();
    });
  }
  ctx.restore();
}

function rr(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }
function wrap(ctx,t,x,y,mw,lh,ml){ const w=t.split(" "); let l="",n=0; for(const s of w){ const test=l+(l?" ":"")+s; if(ctx.measureText(test).width>mw&&l){ctx.fillText(l,x,y+n*lh);l=s;n++;if(n>=ml)return;} else l=test; } if(l&&n<ml)ctx.fillText(l,x,y+n*lh); }
function hatch(ctx,el){ ctx.save(); ctx.strokeStyle=(el.color||"#fff")+"35"; ctx.lineWidth=1; ctx.beginPath(); const s=8; for(let i=-Math.abs(el.h);i<Math.abs(el.w)+Math.abs(el.h);i+=s){ctx.moveTo(el.x+i,el.y);ctx.lineTo(el.x+i-Math.abs(el.h),el.y+Math.abs(el.h));} ctx.stroke(); ctx.restore(); }

function bounds(el) {
  if (el.type==="draw"&&el.points?.length){ let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity; el.points.forEach(p=>{a=Math.min(a,p[0]);b=Math.min(b,p[1]);c=Math.max(c,p[0]);d=Math.max(d,p[1]);}); return{x:a,y:b,w:c-a,h:d-b}; }
  if (el.type==="text"){ const fs=el.fontSize||24,lines=(el.text||"").split("\n"),w=Math.max(60,...lines.map(l=>l.length*(fs*0.6))); return{x:el.x,y:el.y-fs,w,h:lines.length*fs*1.4+8}; }
  if (el.type==="marker") return{x:el.x-4,y:el.y-4,w:48,h:64};
  if (el.type==="sticky") return{x:el.x,y:el.y,w:el.w||220,h:el.h||160};
  if (el.type==="image") return{x:el.x,y:el.y,w:el.w||200,h:el.h||200};
  return{x:Math.min(el.x,el.x+(el.w||0)),y:Math.min(el.y,el.y+(el.h||0)),w:Math.abs(el.w||0),h:Math.abs(el.h||0)};
}
function hit(el,px,py){ const b=bounds(el),m=10; return px>=b.x-m&&px<=b.x+b.w+m&&py>=b.y-m&&py<=b.y+b.h+m; }
function grid(ctx,W,H,ox,oy,z){ ctx.strokeStyle="rgba(255,255,255,0.03)";ctx.lineWidth=1;const g=20*z,sx=ox%g,sy=oy%g;ctx.beginPath();for(let x=sx;x<W;x+=g){ctx.moveTo(x,0);ctx.lineTo(x,H);}for(let y=sy;y<H;y+=g){ctx.moveTo(0,y);ctx.lineTo(W,y);}ctx.stroke(); }

/* ─── Panel Section Component ───────────── */
function PanelSec({ label, children }) {
  return <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 8 }}>{label}</div>
    {children}
  </div>;
}

/* ─── MAIN ──────────────────────────────── */
export default function Ideas() {
  const toast = useToast();
  const cvs = useRef(null), box = useRef(null);

  const [boards, setBoards] = useState([]);
  const [curBoard, setCurBoard] = useState(null);
  const [boardName, setBoardName] = useState("");
  const [showList, setShowList] = useState(true);

  const [els, setEls] = useState([]);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#ffffff");
  const [swVal, setSwVal] = useState(2);
  const [fillVal, setFillVal] = useState("none");
  const [fontIdx, setFontIdx] = useState(0);
  const [sizeKey, setSizeKey] = useState("M");
  const [alignVal, setAlignVal] = useState("left");
  const [opacityVal, setOpacityVal] = useState(100);
  const [selId, setSelId] = useState(null);
  const [stickyColor, setStickyColor] = useState("#FEF08A");
  const [markerIdx, setMarkerIdx] = useState(0);
  const [boldVal, setBoldVal] = useState(false);
  const [italicVal, setItalicVal] = useState(false);

  const [hist, setHist] = useState([[]]); const [hIdx, setHIdx] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [dragSt, setDragSt] = useState(null);
  const [pan, setPan] = useState({x:0,y:0}); const [zoom, setZoom] = useState(1);
  const [isPan, setIsPan] = useState(false); const [panSt, setPanSt] = useState(null);
  const [editText, setEditText] = useState(null);
  const [editSticky, setEditSticky] = useState(null);
  const drawRef = useRef(null);
  const imgCache = useRef({});

  useEffect(() => { ideaApi.list().then(setBoards).catch(() => {}); }, []);

  const push = useCallback((n) => {
    const s = JSON.parse(JSON.stringify(n.map(e => {const c={...e};delete c._img;return c;})));
    setHist(p => [...p.slice(0,hIdx+1),s].slice(-50)); setHIdx(p => Math.min(p+1,49));
  }, [hIdx]);
  const undo = useCallback(() => { if(hIdx<=0)return; setHIdx(hIdx-1); setEls(JSON.parse(JSON.stringify(hist[hIdx-1]||[]))); }, [hist,hIdx]);
  const redo = useCallback(() => { if(hIdx>=hist.length-1)return; setHIdx(hIdx+1); setEls(JSON.parse(JSON.stringify(hist[hIdx+1]||[]))); }, [hist,hIdx]);

  const loadImg = useCallback((el) => {
    if(el.type!=="image"||!el.src)return el;
    if(imgCache.current[el.src]){el._img=imgCache.current[el.src];return el;}
    const img=new Image();img.src=el.src;img.onload=()=>{imgCache.current[el.src]=img;el._img=img;setEls(p=>[...p]);};return el;
  },[]);

  // When selection changes, load its props into panel
  const selEl = els.find(e => e.id === selId);
  useEffect(() => {
    if (!selEl) return;
    if (selEl.color) setColor(selEl.color);
    if (selEl.sw) setSwVal(selEl.sw);
    if (selEl.fill) setFillVal(selEl.fill);
    if (selEl.opacity !== undefined) setOpacityVal(selEl.opacity);
    if (selEl.fontFamily) { const idx = FONTS.findIndex(f => f.family === selEl.fontFamily); if (idx >= 0) setFontIdx(idx); }
    if (selEl.fontSize) { const sk = Object.entries(SIZES).find(([,v]) => v === selEl.fontSize); if (sk) setSizeKey(sk[0]); }
    if (selEl.align) setAlignVal(selEl.align);
    if (selEl.bold !== undefined) setBoldVal(selEl.bold);
    if (selEl.italic !== undefined) setItalicVal(selEl.italic);
  }, [selId]);

  // Apply prop changes to selected element
  const updateSel = (props) => {
    if (!selId) return;
    setEls(p => p.map(e => e.id === selId ? { ...e, ...props } : e));
  };

  // Render canvas
  useEffect(() => {
    const c=cvs.current,b=box.current; if(!c||!b)return;
    const ctx=c.getContext("2d"); const r=b.getBoundingClientRect(); c.width=r.width;c.height=r.height;
    ctx.clearRect(0,0,c.width,c.height); grid(ctx,c.width,c.height,pan.x,pan.y,zoom);
    ctx.save();ctx.translate(pan.x,pan.y);ctx.scale(zoom,zoom);
    els.forEach(el=>renderEl(ctx,el,el.id===selId)); ctx.restore();
  },[els,selId,pan,zoom]);

  useEffect(()=>{ const r=()=>{if(cvs.current&&box.current){cvs.current.width=box.current.clientWidth;cvs.current.height=box.current.clientHeight;}}; window.addEventListener("resize",r);r();return()=>window.removeEventListener("resize",r); },[]);

  // Keys
  useEffect(()=>{
    const kd=(e)=>{
      if(editText||editSticky)return;
      if((e.ctrlKey||e.metaKey)&&e.key==="z"){e.preventDefault();e.shiftKey?redo():undo();return;}
      if((e.ctrlKey||e.metaKey)&&e.key==="y"){e.preventDefault();redo();return;}
      if((e.ctrlKey||e.metaKey)&&e.key==="c"&&selId){const el=els.find(e=>e.id===selId);if(el)localStorage.setItem("lc_clip",JSON.stringify(el));return;}
      if((e.ctrlKey||e.metaKey)&&e.key==="v"){const cl=localStorage.getItem("lc_clip");if(cl){try{const el=JSON.parse(cl);el.id=uid();el.x+=20;el.y+=20;const n=[...els,el];setEls(n);push(n);localStorage.setItem("lc_clip",JSON.stringify(el));}catch{}}return;}
      if((e.key==="Delete"||e.key==="Backspace")&&selId){e.preventDefault();const n=els.filter(e=>e.id!==selId);setEls(n);push(n);setSelId(null);return;}
      if(e.key===" "){e.preventDefault();setIsPan(true);return;}
      const map={v:"select",r:"rect",o:"ellipse",d:"diamond",l:"line",a:"arrow",p:"draw",t:"text",s:"sticky",m:"marker",i:"image",e:"eraser"};
      if(map[e.key.toLowerCase()]&&!e.ctrlKey&&!e.metaKey){setTool(map[e.key.toLowerCase()]);setSelId(null);}
    };
    const ku=(e)=>{if(e.key===" ")setIsPan(false);};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
    return()=>{window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[selId,els,editText,editSticky,undo,redo,push]);

  // Paste images/links
  useEffect(()=>{
    const onP=(e)=>{
      if(editText||editSticky)return;
      const items=e.clipboardData?.items;if(!items)return;
      for(const item of items){
        if(item.type.startsWith("image/")){e.preventDefault();const blob=item.getAsFile();const rd=new FileReader();rd.onload=(ev)=>{const src=ev.target.result;const img=new Image();img.onload=()=>{const sc=Math.min(400/img.width,400/img.height,1);const el={id:uid(),type:"image",x:100,y:100,w:img.width*sc,h:img.height*sc,src,_img:img,color:"#fff",sw:1,opacity:100,fill:"none"};imgCache.current[src]=img;const n=[...els,el];setEls(n);push(n);toast?.success("Imagem colada!");};img.src=src;};rd.readAsDataURL(blob);return;}
        if(item.type==="text/plain"){item.getAsString(str=>{if(str.match(/^https?:\/\//)){const el={id:uid(),type:"sticky",x:100,y:100,w:260,h:80,title:"🔗 Link",text:str,stickyColor:"#93C5FD",color:"#000",sw:1,opacity:100,fill:"none"};const n=[...els,el];setEls(n);push(n);toast?.info("Link colado!");}});}
      }
    };window.addEventListener("paste",onP);return()=>window.removeEventListener("paste",onP);
  },[els,editText,editSticky,push,toast]);

  // File input for image tool
  const fileRef = useRef(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const rd = new FileReader(); rd.onload = (ev) => {
      const src = ev.target.result; const img = new Image(); img.onload = () => {
        const sc = Math.min(500/img.width,500/img.height,1);
        const el = {id:uid(),type:"image",x:80,y:80,w:img.width*sc,h:img.height*sc,src,_img:img,color:"#fff",sw:1,opacity:100,fill:"none"};
        imgCache.current[src]=img; const n=[...els,el]; setEls(n); push(n); setTool("select"); toast?.success("Imagem adicionada!");
      }; img.src=src;
    }; rd.readAsDataURL(file); e.target.value = "";
  };

  const toC=(e)=>{const r=cvs.current.getBoundingClientRect();return{x:(e.clientX-r.left-pan.x)/zoom,y:(e.clientY-r.top-pan.y)/zoom};};

  const onDown=(e)=>{
    if(e.button===1||isPan){setPanSt({x:e.clientX-pan.x,y:e.clientY-pan.y});return;}
    const p=toC(e);
    if(tool==="select"){ const h=[...els].reverse().find(el=>hit(el,p.x,p.y)); setSelId(h?.id||null); if(h){if(e.detail===2){if(h.type==="text")setEditText({id:h.id,value:h.text||"",x:h.x,y:h.y,fontSize:h.fontSize||24});else if(h.type==="sticky")setEditSticky({id:h.id,title:h.title||"",text:h.text||"",stickyColor:h.stickyColor||"#FEF08A"});return;}setDragSt({x:p.x-h.x,y:p.y-h.y,id:h.id});}return;}
    if(tool==="eraser"){const h=[...els].reverse().find(el=>hit(el,p.x,p.y));if(h){const n=els.filter(el=>el.id!==h.id);setEls(n);push(n);}return;}
    if(tool==="text"){setEditText({value:"",x:p.x,y:p.y,fontSize:SIZES[sizeKey]});return;}
    if(tool==="sticky"){const el={id:uid(),type:"sticky",x:p.x,y:p.y,w:220,h:160,title:"Post-it",text:"",stickyColor,color:"#000",sw:1,opacity:100,fill:"none"};const n=[...els,el];setEls(n);setEditSticky({id:el.id,title:"Post-it",text:"",stickyColor});return;}
    if(tool==="marker"){const el={id:uid(),type:"marker",x:p.x,y:p.y,icon:MARKERS[markerIdx],label:"",color,sw:1,opacity:100,fill:"none"};const n=[...els,el];setEls(n);push(n);return;}
    if(tool==="image"){fileRef.current?.click();return;}
    setDrawing(true);
    const el={id:uid(),type:tool,x:p.x,y:p.y,w:0,h:0,color,sw:swVal,fill:fillVal,opacity:opacityVal,...(tool==="draw"?{points:[[p.x,p.y]]}:{})};
    drawRef.current=el;setEls(p=>[...p,el]);
  };

  const onMove=(e)=>{
    if(panSt){setPan({x:e.clientX-panSt.x,y:e.clientY-panSt.y});return;}
    if(dragSt){const p=toC(e);setEls(prev=>prev.map(el=>el.id===dragSt.id?{...el,x:p.x-dragSt.x,y:p.y-dragSt.y}:el));return;}
    if(!drawing||!drawRef.current)return;const p=toC(e),el=drawRef.current;
    if(tool==="draw"){el.points=[...(el.points||[]),[p.x,p.y]];}else{el.w=p.x-el.x;el.h=p.y-el.y;}
    setEls(prev=>prev.map(e=>e.id===el.id?{...el}:e));
  };

  const onUp=()=>{if(panSt){setPanSt(null);return;}if(dragSt){setDragSt(null);push(els);return;}if(drawing){setDrawing(false);drawRef.current=null;push(els);}};
  const onWheel=(e)=>{e.preventDefault();setZoom(p=>Math.max(0.1,Math.min(5,p*(e.deltaY>0?0.9:1.1))));};

  const confirmText=()=>{if(!editText)return;if(editText.id){if(editText.value.trim())setEls(p=>p.map(e=>e.id===editText.id?{...e,text:editText.value}:e));push(els);}else if(editText.value.trim()){const el={id:uid(),type:"text",x:editText.x,y:editText.y,text:editText.value,color,fontSize:editText.fontSize||SIZES[sizeKey],fontFamily:FONTS[fontIdx].family,align:alignVal,bold:boldVal,italic:italicVal,sw:1,opacity:opacityVal,fill:"none",textW:300};const n=[...els,el];setEls(n);push(n);}setEditText(null);};

  const confirmSticky=()=>{if(!editSticky)return;setEls(p=>p.map(e=>e.id===editSticky.id?{...e,title:editSticky.title,text:editSticky.text,stickyColor:editSticky.stickyColor}:e));push(els);setEditSticky(null);};

  // Layers
  const moveLayer=(dir)=>{if(!selId)return;const idx=els.findIndex(e=>e.id===selId);if(idx<0)return;const n=[...els];if(dir==="up"&&idx<n.length-1){[n[idx],n[idx+1]]=[n[idx+1],n[idx]];}else if(dir==="down"&&idx>0){[n[idx],n[idx-1]]=[n[idx-1],n[idx]];}else if(dir==="top"){n.push(n.splice(idx,1)[0]);}else if(dir==="bottom"){n.unshift(n.splice(idx,1)[0]);}setEls(n);push(n);};

  // Board ops
  const save=async()=>{const data=JSON.stringify({elements:els.map(e=>{const c={...e};delete c._img;return c;}),panOffset:pan,zoom});try{if(curBoard){await ideaApi.update(curBoard.id,{content:data,title:boardName||curBoard.title});setBoards(p=>p.map(b=>b.id===curBoard.id?{...b,content:data,title:boardName||b.title}:b));toast?.success("Salvo!");}else{const name=boardName||"Quadro "+new Date().toLocaleDateString("pt-BR");const board=await ideaApi.create({title:name,content:data,color:"#3B82F6"});setBoards(p=>[board,...p]);setCurBoard(board);setBoardName(name);toast?.success("Criado!");}}catch{toast?.error("Erro ao salvar");}};
  const load=(b)=>{try{const d=JSON.parse(b.content||"{}");const loaded=(d.elements||[]).map(el=>loadImg(el));setEls(loaded);setPan(d.panOffset||{x:0,y:0});setZoom(d.zoom||1);setHist([loaded]);setHIdx(0);}catch{setEls([]);}setCurBoard(b);setBoardName(b.title);setSelId(null);setShowList(false);};
  const newB=()=>{setEls([]);setCurBoard(null);setBoardName("");setPan({x:0,y:0});setZoom(1);setHist([[]]);setHIdx(0);setSelId(null);setShowList(false);};
  const delB=async(id)=>{try{await ideaApi.del(id);setBoards(p=>p.filter(b=>b.id!==id));if(curBoard?.id===id)newB();toast?.success("Removido");}catch{}};
  const exportPng=()=>{const c=cvs.current;if(!c)return;const l=document.createElement("a");l.download=(boardName||"quadro")+".png";l.href=c.toDataURL("image/png");l.click();};

  /* ─── Board List ──────────────────────── */
  if(showList) return(
    <div className="page-enter" style={{maxWidth:960,margin:"0 auto"}}>
      <Hdr title="Banco de Ideias" sub="Whiteboard completo para brainstorm e planejamento" action={<Btn onClick={newB}>+ Novo Quadro</Btn>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
        <div onClick={newB} style={{background:C.bgCard,borderRadius:14,border:`2px dashed ${C.border}`,padding:32,textAlign:"center",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:180,transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.red} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{fontSize:40,marginBottom:8,opacity:0.3}}>✎</div>
          <div style={{fontSize:14,fontWeight:600,color:C.muted}}>Novo Quadro</div>
          <div style={{fontSize:11,color:C.dim,marginTop:4}}>Ctrl+V cola imagens</div>
        </div>
        {boards.map(b=>(
          <div key={b.id} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderH;e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";}}>
            <div onClick={()=>load(b)} style={{height:120,background:`linear-gradient(135deg,${C.bg},${C.bgCard})`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
              <span style={{fontSize:36,opacity:0.15}}>✎</span>
              {b.content&&(()=>{try{return<span style={{position:"absolute",bottom:6,right:8,fontSize:10,color:C.dim,fontFamily:"var(--mono)"}}>{(JSON.parse(b.content).elements||[]).length} el.</span>;}catch{return null;}})()}
            </div>
            <div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div onClick={()=>load(b)}><div style={{fontWeight:600,fontSize:13}}>{b.title}</div><div style={{fontSize:10,color:C.dim}}>{new Date(b.updatedAt||b.createdAt).toLocaleDateString("pt-BR")}</div></div>
              <Btn vr="subtle" onClick={e=>{e.stopPropagation();delB(b.id);}} style={{color:C.red,fontSize:11}}>✕</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ─── Whiteboard ──────────────────────── */
  return(
    <div style={{position:"relative",height:"calc(100vh - 110px)",display:"flex",flexDirection:"column",margin:"-24px -32px",overflow:"hidden"}}>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>

      {/* Top toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:C.bgCard,borderBottom:`1px solid ${C.border}`,zIndex:10,flexWrap:"wrap",minHeight:44}}>
        <Btn vr="ghost" onClick={()=>setShowList(true)} style={{padding:"4px 8px",fontSize:10}}>← Quadros</Btn>
        <div style={{width:1,height:20,background:C.border}}/>
        {Object.entries(TOOLS).map(([k,v])=>(
          <button key={k} onClick={()=>{setTool(k);if(k==="image")fileRef.current?.click();setSelId(null);}} title={v.label}
            style={{width:30,height:30,borderRadius:6,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:k==="sticky"||k==="marker"||k==="image"?13:14,background:tool===k?`${C.red}22`:"transparent",color:tool===k?C.red:C.muted,transition:"all 0.15s"}}>{v.icon}</button>
        ))}
        <div style={{flex:1}}/>
        <Btn vr="ghost" onClick={undo} style={{padding:"3px 6px",fontSize:11}} disabled={hIdx<=0}>↩</Btn>
        <Btn vr="ghost" onClick={redo} style={{padding:"3px 6px",fontSize:11}} disabled={hIdx>=hist.length-1}>↪</Btn>
        <Btn vr="ghost" onClick={()=>{setEls([]);setSelId(null);push([]);}} style={{padding:"3px 6px",fontSize:10}}>Limpar</Btn>
        <Btn vr="ghost" onClick={exportPng} style={{padding:"3px 6px",fontSize:10}}>PNG</Btn>
        <div style={{width:1,height:20,background:C.border}}/>
        <input value={boardName} onChange={e=>setBoardName(e.target.value)} placeholder="Nome..." style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:5,padding:"4px 8px",color:C.text,fontSize:11,width:120,outline:"none"}}/>
        <Btn onClick={save} style={{padding:"4px 12px",fontSize:11}}>Salvar</Btn>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Canvas */}
        <div ref={box} style={{flex:1,position:"relative",cursor:isPan?"grab":TOOLS[tool]?.cur||"default",overflow:"hidden"}}>
          <canvas ref={cvs} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onWheel={onWheel} style={{display:"block",width:"100%",height:"100%",background:C.bg}}/>

          {editText&&(
            <div style={{position:"absolute",left:editText.x*zoom+pan.x,top:editText.y*zoom+pan.y-(editText.fontSize||24),zIndex:20}}>
              <textarea autoFocus value={editText.value} onChange={e=>setEditText(p=>({...p,value:e.target.value}))}
                onKeyDown={e=>{if(e.key==="Escape"){setEditText(null);return;}if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();confirmText();}}}
                onBlur={confirmText}
                style={{background:"rgba(0,0,0,0.9)",border:`2px solid ${C.blue}`,borderRadius:8,padding:"10px 14px",color,fontSize:editText.fontSize||SIZES[sizeKey],fontFamily:FONTS[fontIdx].family,fontWeight:boldVal?"bold":"normal",fontStyle:italicVal?"italic":"normal",outline:"none",minWidth:240,minHeight:80,resize:"both",lineHeight:1.4}}
                placeholder="Digite aqui... (Shift+Enter = nova linha)"/>
            </div>
          )}

          {editSticky&&(
            <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:30,width:340,background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,padding:22,boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Editar Post-it</div>
              <div style={{marginBottom:10}}><div style={{fontSize:10,color:C.dim,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>Título</div>
                <input value={editSticky.title} onChange={e=>setEditSticky(p=>({...p,title:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px",color:C.text,fontSize:13,outline:"none"}}/></div>
              <div style={{marginBottom:10}}><div style={{fontSize:10,color:C.dim,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>Conteúdo</div>
                <textarea value={editSticky.text} onChange={e=>setEditSticky(p=>({...p,text:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px",color:C.text,fontSize:13,outline:"none",minHeight:80,resize:"vertical"}} placeholder="Escreva sua ideia..."/></div>
              <div style={{marginBottom:14}}><div style={{fontSize:10,color:C.dim,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>Cor</div>
                <div style={{display:"flex",gap:4}}>{STICKY_COLORS.map(sc=><div key={sc} onClick={()=>setEditSticky(p=>({...p,stickyColor:sc}))} style={{width:28,height:28,borderRadius:6,cursor:"pointer",background:sc,border:editSticky.stickyColor===sc?"2px solid #fff":`1px solid ${C.border}`}}/>)}</div></div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn vr="ghost" onClick={()=>setEditSticky(null)}>Cancelar</Btn><Btn onClick={confirmSticky}>Salvar</Btn></div>
            </div>
          )}

          <div style={{position:"absolute",bottom:10,right:10,display:"flex",gap:3,alignItems:"center"}}>
            <button onClick={()=>setZoom(p=>Math.max(0.1,p*0.8))} style={{width:26,height:26,borderRadius:5,border:`1px solid ${C.border}`,background:C.bgCard,color:C.muted,cursor:"pointer",fontSize:13}}>−</button>
            <span style={{fontFamily:"var(--mono)",fontSize:10,color:C.dim,minWidth:36,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
            <button onClick={()=>setZoom(p=>Math.min(5,p*1.2))} style={{width:26,height:26,borderRadius:5,border:`1px solid ${C.border}`,background:C.bgCard,color:C.muted,cursor:"pointer",fontSize:13}}>+</button>
            <button onClick={()=>{setZoom(1);setPan({x:0,y:0});}} style={{padding:"3px 7px",borderRadius:5,border:`1px solid ${C.border}`,background:C.bgCard,color:C.dim,cursor:"pointer",fontSize:9}}>Reset</button>
          </div>
          <div style={{position:"absolute",bottom:10,left:10,fontFamily:"var(--mono)",fontSize:10,color:C.dim}}>{els.length} el. · Ctrl+V cola imagens</div>
        </div>

        {/* ─── RIGHT PROPERTIES PANEL ──────── */}
        <div style={{width:220,minWidth:220,background:C.bgCard,borderLeft:`1px solid ${C.border}`,overflowY:"auto",padding:"14px 14px"}}>

          <PanelSec label="Stroke">
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
              {COLORS.map(c=><div key={c} onClick={()=>{setColor(c);updateSel({color:c});}} style={{width:24,height:24,borderRadius:6,cursor:"pointer",background:c,border:color===c?"2px solid #3B82F6":`1px solid ${C.border}`,transition:"all 0.1s"}}/>)}
            </div>
            <div style={{display:"flex",gap:2,marginTop:8}}>
              {STROKE_W.map(w=><button key={w} onClick={()=>{setSwVal(w);updateSel({sw:w});}} style={{width:28,height:28,borderRadius:6,border:"none",cursor:"pointer",background:swVal===w?`${C.blue}20`:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{width:Math.min(w*2,14),height:Math.min(w*2,14),borderRadius:"50%",background:swVal===w?C.blue:C.dim}}/>
              </button>)}
            </div>
          </PanelSec>

          <PanelSec label="Fill">
            <div style={{display:"flex",gap:3}}>
              {[["none","Sem"],["solid","Sólido"],["hatch","Hachura"]].map(([f,l])=><button key={f} onClick={()=>{setFillVal(f);updateSel({fill:f});}} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,background:fillVal===f?`${C.purple}20`:"rgba(255,255,255,0.04)",color:fillVal===f?C.purple:C.dim}}>{l}</button>)}
            </div>
          </PanelSec>

          <PanelSec label="Font family">
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
              {FONTS.map((f,i)=><button key={i} onClick={()=>{setFontIdx(i);updateSel({fontFamily:f.family});}} style={{padding:"5px 8px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontFamily:f.family,background:fontIdx===i?`${C.blue}20`:"rgba(255,255,255,0.04)",color:fontIdx===i?C.blue:C.muted,fontWeight:500}}>{f.name}</button>)}
            </div>
          </PanelSec>

          <PanelSec label="Font size">
            <div style={{display:"flex",gap:3}}>
              {Object.entries(SIZES).map(([k,v])=><button key={k} onClick={()=>{setSizeKey(k);updateSel({fontSize:v});}} style={{flex:1,padding:"6px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:sizeKey===k?`${C.green}20`:"rgba(255,255,255,0.04)",color:sizeKey===k?C.green:C.dim}}>{k}</button>)}
            </div>
          </PanelSec>

          <PanelSec label="Style">
            <div style={{display:"flex",gap:3}}>
              <button onClick={()=>{setBoldVal(!boldVal);updateSel({bold:!boldVal});}} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:boldVal?`${C.blue}20`:"rgba(255,255,255,0.04)",color:boldVal?C.blue:C.dim}}>B</button>
              <button onClick={()=>{setItalicVal(!italicVal);updateSel({italic:!italicVal});}} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,fontStyle:"italic",background:italicVal?`${C.blue}20`:"rgba(255,255,255,0.04)",color:italicVal?C.blue:C.dim}}>I</button>
            </div>
          </PanelSec>

          <PanelSec label="Text align">
            <div style={{display:"flex",gap:3}}>
              {ALIGNS.map(a=><button key={a} onClick={()=>{setAlignVal(a);updateSel({align:a});}} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:14,background:alignVal===a?`${C.blue}20`:"rgba(255,255,255,0.04)",color:alignVal===a?C.blue:C.dim}}>{a==="left"?"≡":a==="center"?"≡":a==="right"?"≡":""}<span style={{fontSize:10,marginLeft:2}}>{a==="left"?"⇤":a==="center"?"⇔":a==="right"?"⇥":""}</span></button>)}
            </div>
          </PanelSec>

          <PanelSec label="Opacity">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min="0" max="100" value={opacityVal} onChange={e=>{const v=Number(e.target.value);setOpacityVal(v);updateSel({opacity:v});}} style={{flex:1,accentColor:C.blue}}/>
              <span style={{fontFamily:"var(--mono)",fontSize:11,color:C.dim,minWidth:28}}>{opacityVal}</span>
            </div>
          </PanelSec>

          <PanelSec label="Layers">
            <div style={{display:"flex",gap:3}}>
              {[["bottom","⇊"],["down","↓"],["up","↑"],["top","⇈"]].map(([d,i])=><button key={d} onClick={()=>moveLayer(d)} disabled={!selId} style={{flex:1,padding:"6px 0",borderRadius:6,border:"none",cursor:selId?"pointer":"not-allowed",fontSize:14,background:"rgba(255,255,255,0.04)",color:selId?C.muted:C.dim,opacity:selId?1:0.4}}>{i}</button>)}
            </div>
          </PanelSec>

          {tool==="marker"&&(
            <PanelSec label="Marcadores">
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {MARKERS.map((m,i)=><button key={i} onClick={()=>setMarkerIdx(i)} style={{width:32,height:32,borderRadius:6,border:"none",cursor:"pointer",fontSize:16,background:markerIdx===i?`${C.blue}20`:"rgba(255,255,255,0.04)"}}>{m}</button>)}
              </div>
            </PanelSec>
          )}

          {tool==="sticky"&&(
            <PanelSec label="Cor do Post-it">
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {STICKY_COLORS.map(sc=><div key={sc} onClick={()=>setStickyColor(sc)} style={{width:28,height:28,borderRadius:6,cursor:"pointer",background:sc,border:stickyColor===sc?"2px solid #fff":`1px solid ${C.border}`}}/>)}
              </div>
            </PanelSec>
          )}

          {selEl&&(
            <PanelSec label="Selecionado">
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{selEl.type==="sticky"?"📝 Post-it":selEl.type==="marker"?`${selEl.icon} Marcador`:selEl.type==="text"?"T Texto":selEl.type==="image"?"🖼 Imagem":selEl.type}</div>
              {(selEl.type==="text"||selEl.type==="sticky")&&<Btn vr="ghost" onClick={()=>{if(selEl.type==="text")setEditText({id:selEl.id,value:selEl.text,x:selEl.x,y:selEl.y,fontSize:selEl.fontSize});else setEditSticky({id:selEl.id,title:selEl.title,text:selEl.text,stickyColor:selEl.stickyColor});}} style={{width:"100%",marginBottom:6,fontSize:11,justifyContent:"center"}}>Editar conteúdo</Btn>}
              <Btn vr="ghost" onClick={()=>{const n=els.filter(e=>e.id!==selId);setEls(n);push(n);setSelId(null);}} style={{width:"100%",fontSize:11,color:C.red,justifyContent:"center"}}>Deletar</Btn>
            </PanelSec>
          )}
        </div>
      </div>
    </div>
  );
}
