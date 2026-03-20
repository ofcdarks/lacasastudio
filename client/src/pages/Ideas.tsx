// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from "react";
import { ideaApi } from "../lib/api";
import { C, Btn, Hdr } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

/* ── constants ────────────────────────────── */
const TOOLS={select:{i:"↖",l:"Selecionar (V)",c:"default"},rect:{i:"□",l:"Retângulo (R)",c:"crosshair"},ellipse:{i:"○",l:"Elipse (O)",c:"crosshair"},diamond:{i:"◇",l:"Diamante (D)",c:"crosshair"},line:{i:"╱",l:"Linha (L)",c:"crosshair"},arrow:{i:"→",l:"Seta (A)",c:"crosshair"},draw:{i:"✎",l:"Desenho (P)",c:"crosshair"},text:{i:"T",l:"Texto (T)",c:"text"},sticky:{i:"🗒",l:"Post-it (S)",c:"crosshair"},marker:{i:"⚑",l:"Marcador (M)",c:"crosshair"},image:{i:"🖼",l:"Imagem (I)",c:"crosshair"},eraser:{i:"⌫",l:"Borracha (E)",c:"cell"}};
const COLORS=["#ffffff","#1e1e1e","#EF4444","#F59E0B","#22C55E","#3B82F6","#A855F7","#EC4899","#06B6D4","#F97316"];
const STICKY_C=["#FEF08A","#FDBA74","#86EFAC","#93C5FD","#C4B5FD","#FDA4AF","#67E8F9","#FCA5A5"];
const MARKERS=["⭐","❗","✅","❓","💡","🔥","🎯","⚠️","🚀","📌","🏆","❤️"];
const FONTS=[
  {n:"Handwritten",f:"'Caveat',cursive",u:"https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap"},
  {n:"Sans",f:"'Plus Jakarta Sans',sans-serif",u:null},
  {n:"Code",f:"'JetBrains Mono',monospace",u:null},
  {n:"Serif",f:"'Playfair Display',serif",u:"https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap"},
  {n:"Display",f:"'Bebas Neue',sans-serif",u:"https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"},
  {n:"Elegant",f:"'Cormorant Garamond',serif",u:"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&display=swap"},
  {n:"Modern",f:"'Space Grotesk',sans-serif",u:"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap"},
  {n:"Brush",f:"'Permanent Marker',cursive",u:"https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap"},
];
const SIZES={S:16,M:24,L:36,XL:52};
const SW=[1,2,3,5,8];
const CANVAS_BGS=["#0B0C14","#111219","#1a1b2e","#0f172a","#fafafa","#f0f0e8","#e8f0f0","#f5f0ff","#fff5e6","#f0e8e8"];
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
if(typeof document!=="undefined")FONTS.forEach(f=>{if(f.u&&!document.querySelector(`link[href="${f.u}"]`)){const l=document.createElement("link");l.rel="stylesheet";l.href=f.u;document.head.appendChild(l);}});

/* ── geometry ─────────────────────────────── */
function bounds(el){
  if(el.type==="draw"&&el.points?.length){let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;el.points.forEach(p=>{a=Math.min(a,p[0]);b=Math.min(b,p[1]);c=Math.max(c,p[0]);d=Math.max(d,p[1]);});return{x:a,y:b,w:c-a||1,h:d-b||1};}
  if(el.type==="text"){const fs=el.fontSize||24,lines=(el.text||"T").split("\n"),w=Math.max(60,...lines.map(l=>l.length*(fs*0.55)));return{x:el.x,y:el.y-fs,w:Math.max(w,60),h:lines.length*fs*1.4+8};}
  if(el.type==="marker")return{x:el.x-4,y:el.y-4,w:48,h:64};
  if(el.type==="sticky")return{x:el.x,y:el.y,w:el.w||220,h:el.h||160};
  if(el.type==="image")return{x:el.x,y:el.y,w:el.w||200,h:el.h||200};
  return{x:Math.min(el.x,el.x+(el.w||0)),y:Math.min(el.y,el.y+(el.h||0)),w:Math.abs(el.w||1),h:Math.abs(el.h||1)};
}
function hit(el,px,py){const b=bounds(el),m=10;return px>=b.x-m&&px<=b.x+b.w+m&&py>=b.y-m&&py<=b.y+b.h+m;}
function hitHandle(el,px,py){
  const b=bounds(el);const hs=[[b.x,b.y,"nw"],[b.x+b.w,b.y,"ne"],[b.x,b.y+b.h,"sw"],[b.x+b.w,b.y+b.h,"se"]];
  for(const[hx,hy,dir]of hs){if(Math.abs(px-hx)<8&&Math.abs(py-hy)<8)return dir;}return null;
}

/* ── render ───────────────────────────────── */
function render(ctx,el,sel){
  ctx.save();ctx.strokeStyle=el.color||"#fff";ctx.lineWidth=el.sw||2;ctx.lineCap="round";ctx.lineJoin="round";ctx.globalAlpha=(el.opacity??100)/100;
  const hf=el.fill&&el.fill!=="none";
  if(el.type==="rect"){if(hf){ctx.fillStyle=el.fill==="hatch"?"transparent":(el.color||"#fff")+"25";ctx.fillRect(el.x,el.y,el.w,el.h);}ctx.strokeRect(el.x,el.y,el.w,el.h);if(el.fill==="hatch")hatchFn(ctx,el);}
  else if(el.type==="ellipse"){ctx.beginPath();ctx.ellipse(el.x+el.w/2,el.y+el.h/2,Math.abs(el.w/2)||1,Math.abs(el.h/2)||1,0,0,Math.PI*2);if(hf){ctx.fillStyle=(el.color||"#fff")+"25";ctx.fill();}ctx.stroke();}
  else if(el.type==="diamond"){const cx=el.x+el.w/2,cy=el.y+el.h/2;ctx.beginPath();ctx.moveTo(cx,el.y);ctx.lineTo(el.x+el.w,cy);ctx.lineTo(cx,el.y+el.h);ctx.lineTo(el.x,cy);ctx.closePath();if(hf){ctx.fillStyle=(el.color||"#fff")+"25";ctx.fill();}ctx.stroke();}
  else if(el.type==="line"){ctx.beginPath();ctx.moveTo(el.x,el.y);ctx.lineTo(el.x+el.w,el.y+el.h);ctx.stroke();}
  else if(el.type==="arrow"){const ex=el.x+el.w,ey=el.y+el.h;ctx.beginPath();ctx.moveTo(el.x,el.y);ctx.lineTo(ex,ey);ctx.stroke();const a=Math.atan2(el.h,el.w),hl=16;ctx.beginPath();ctx.moveTo(ex-hl*Math.cos(a-.4),ey-hl*Math.sin(a-.4));ctx.lineTo(ex,ey);ctx.lineTo(ex-hl*Math.cos(a+.4),ey-hl*Math.sin(a+.4));ctx.stroke();}
  else if(el.type==="draw"){const p=el.points||[];if(p.length>=2){ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);ctx.stroke();}}
  else if(el.type==="text"){const fs=el.fontSize||24;ctx.font=`${el.bold?"bold ":""}${el.italic?"italic ":""}${fs}px ${el.fontFamily||FONTS[1].f}`;ctx.fillStyle=el.color||"#fff";ctx.textAlign=el.align||"left";const lines=(el.text||"").split("\n");lines.forEach((l,i)=>ctx.fillText(l,el.x,el.y+i*(fs*1.4)));}
  else if(el.type==="sticky"){const sw=el.w||220,sh=el.h||160;ctx.fillStyle=el.stickyColor||"#FEF08A";ctx.shadowColor="rgba(0,0,0,.15)";ctx.shadowBlur=10;ctx.shadowOffsetY=4;rrFn(ctx,el.x,el.y,sw,sh,8);ctx.fill();ctx.shadowColor="transparent";ctx.strokeStyle="rgba(0,0,0,.08)";ctx.lineWidth=1;rrFn(ctx,el.x,el.y,sw,sh,8);ctx.stroke();ctx.fillStyle="rgba(0,0,0,.05)";ctx.fillRect(el.x+1,el.y+1,sw-2,30);ctx.fillStyle="#1a1a1a";ctx.font="bold 13px 'Plus Jakarta Sans',sans-serif";ctx.fillText(el.title||"Post-it",el.x+12,el.y+20);ctx.font="12px 'Plus Jakarta Sans',sans-serif";wrapFn(ctx,el.text||"",el.x+12,el.y+46,sw-24,16,6);}
  else if(el.type==="marker"){ctx.font="40px serif";ctx.fillText(el.icon||"⭐",el.x,el.y+40);if(el.label){ctx.font="bold 11px 'Plus Jakarta Sans',sans-serif";ctx.fillStyle=el.color||"#fff";ctx.fillText(el.label,el.x-2,el.y+56);}}
  else if(el.type==="image"&&el._img){try{ctx.drawImage(el._img,el.x,el.y,el.w||el._img.width,el.h||el._img.height);}catch{}}
  if(sel){ctx.strokeStyle="#3B82F6";ctx.lineWidth=1.5;ctx.setLineDash([5,4]);const b=bounds(el);ctx.strokeRect(b.x-5,b.y-5,b.w+10,b.h+10);ctx.setLineDash([]);ctx.fillStyle="#fff";[[b.x-4,b.y-4],[b.x+b.w+4,b.y-4],[b.x-4,b.y+b.h+4],[b.x+b.w+4,b.y+b.h+4]].forEach(([cx,cy])=>{ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#3B82F6";ctx.lineWidth=2;ctx.stroke();});}
  ctx.restore();
}
function rrFn(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();}
function wrapFn(c,t,x,y,mw,lh,ml){const w=t.split(" ");let l="",n=0;for(const s of w){const test=l+(l?" ":"")+s;if(c.measureText(test).width>mw&&l){c.fillText(l,x,y+n*lh);l=s;n++;if(n>=ml)return;}else l=test;}if(l&&n<ml)c.fillText(l,x,y+n*lh);}
function hatchFn(c,el){c.save();c.strokeStyle=(el.color||"#fff")+"35";c.lineWidth=1;c.beginPath();const s=8;for(let i=-Math.abs(el.h);i<Math.abs(el.w)+Math.abs(el.h);i+=s){c.moveTo(el.x+i,el.y);c.lineTo(el.x+i-Math.abs(el.h),el.y+Math.abs(el.h));}c.stroke();c.restore();}
function gridFn(c,W,H,ox,oy,z){c.strokeStyle="rgba(255,255,255,.03)";c.lineWidth=1;const g=20*z,sx=ox%g,sy=oy%g;c.beginPath();for(let x=sx;x<W;x+=g){c.moveTo(x,0);c.lineTo(x,H);}for(let y=sy;y<H;y+=g){c.moveTo(0,y);c.lineTo(W,y);}c.stroke();}
/* ── templates ────────────────────────────── */
const TEMPLATES={
  "Carrossel Instagram":{w:1080,h:1080,els:[{type:"rect",x:40,y:40,w:1000,h:1000,color:"#3B82F6",sw:3,fill:"solid",opacity:100},{type:"text",x:100,y:200,text:"Slide 1\nTítulo Principal",color:"#fff",fontSize:48,fontFamily:"'Plus Jakarta Sans',sans-serif",bold:true,sw:1,opacity:100,fill:"none"},{type:"text",x:100,y:900,text:"@seucanal",color:"#fff",fontSize:24,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:60,fill:"none"}]},
  "Mapa Mental":{els:[{type:"ellipse",x:300,y:250,w:200,h:80,color:"#EF4444",sw:3,fill:"solid",opacity:100},{type:"text",x:340,y:295,text:"Tema Central",color:"#fff",fontSize:18,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"line",x:500,y:290,w:100,h:-60,color:"#F59E0B",sw:2,fill:"none",opacity:100},{type:"line",x:500,y:290,w:100,h:60,color:"#22C55E",sw:2,fill:"none",opacity:100},{type:"line",x:300,y:290,w:-100,h:-60,color:"#3B82F6",sw:2,fill:"none",opacity:100},{type:"line",x:300,y:290,w:-100,h:60,color:"#A855F7",sw:2,fill:"none",opacity:100},{type:"rect",x:600,y:200,w:150,h:50,color:"#F59E0B",sw:2,fill:"solid",opacity:100},{type:"text",x:620,y:230,text:"Tópico 1",color:"#fff",fontSize:14,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"rect",x:600,y:320,w:150,h:50,color:"#22C55E",sw:2,fill:"solid",opacity:100},{type:"text",x:620,y:350,text:"Tópico 2",color:"#fff",fontSize:14,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"rect",x:100,y:200,w:150,h:50,color:"#3B82F6",sw:2,fill:"solid",opacity:100},{type:"text",x:120,y:230,text:"Tópico 3",color:"#fff",fontSize:14,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"rect",x:100,y:320,w:150,h:50,color:"#A855F7",sw:2,fill:"solid",opacity:100},{type:"text",x:120,y:350,text:"Tópico 4",color:"#fff",fontSize:14,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"}]},
  "Funil de Vendas":{els:[{type:"rect",x:150,y:50,w:500,h:70,color:"#3B82F6",sw:2,fill:"solid",opacity:100},{type:"text",x:310,y:92,text:"TOPO — Atenção",color:"#fff",fontSize:18,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"rect",x:200,y:140,w:400,h:70,color:"#22C55E",sw:2,fill:"solid",opacity:100},{type:"text",x:310,y:182,text:"MEIO — Interesse",color:"#fff",fontSize:18,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"rect",x:250,y:230,w:300,h:70,color:"#F59E0B",sw:2,fill:"solid",opacity:100},{type:"text",x:310,y:272,text:"FUNDO — Decisão",color:"#fff",fontSize:18,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"rect",x:300,y:320,w:200,h:70,color:"#EF4444",sw:2,fill:"solid",opacity:100},{type:"text",x:340,y:362,text:"AÇÃO — Compra",color:"#fff",fontSize:16,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"}]},
  "Passo a Passo":{els:[{type:"ellipse",x:50,y:80,w:60,h:60,color:"#EF4444",sw:2,fill:"solid",opacity:100},{type:"text",x:72,y:118,text:"1",color:"#fff",fontSize:28,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:130,y:115,text:"Primeiro passo aqui",color:"#fff",fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"arrow",x:80,y:150,w:0,h:40,color:"#EF4444",sw:2,fill:"none",opacity:100},{type:"ellipse",x:50,y:200,w:60,h:60,color:"#F59E0B",sw:2,fill:"solid",opacity:100},{type:"text",x:72,y:238,text:"2",color:"#fff",fontSize:28,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:130,y:235,text:"Segundo passo aqui",color:"#fff",fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"arrow",x:80,y:270,w:0,h:40,color:"#F59E0B",sw:2,fill:"none",opacity:100},{type:"ellipse",x:50,y:320,w:60,h:60,color:"#22C55E",sw:2,fill:"solid",opacity:100},{type:"text",x:72,y:358,text:"3",color:"#fff",fontSize:28,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:130,y:355,text:"Terceiro passo aqui",color:"#fff",fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"}]},
  "Comparativo":{els:[{type:"rect",x:50,y:50,w:300,h:350,color:"#EF4444",sw:2,fill:"solid",opacity:100},{type:"text",x:130,y:90,text:"❌ MITO",color:"#fff",fontSize:28,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:80,y:140,text:"Ponto falso 1",color:"#fff",fontSize:16,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:80,y:180,text:"Ponto falso 2",color:"#fff",fontSize:16,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:80,y:220,text:"Ponto falso 3",color:"#fff",fontSize:16,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"rect",x:450,y:50,w:300,h:350,color:"#22C55E",sw:2,fill:"solid",opacity:100},{type:"text",x:510,y:90,text:"✅ VERDADE",color:"#fff",fontSize:28,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:480,y:140,text:"Ponto real 1",color:"#fff",fontSize:16,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:480,y:180,text:"Ponto real 2",color:"#fff",fontSize:16,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:480,y:220,text:"Ponto real 3",color:"#fff",fontSize:16,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"}]},
  "CTA / Oferta":{els:[{type:"rect",x:100,y:50,w:600,h:400,color:"#6366F1",sw:3,fill:"solid",opacity:100},{type:"text",x:200,y:120,text:"OFERTA ESPECIAL",color:"#FEF08A",fontSize:36,bold:true,fontFamily:"'Bebas Neue',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:180,y:180,text:"Descrição da oferta irresistível",color:"#fff",fontSize:20,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"rect",x:250,y:250,w:300,h:60,color:"#EF4444",sw:0,fill:"solid",opacity:100},{type:"text",x:310,y:288,text:"QUERO AGORA →",color:"#fff",fontSize:22,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:250,y:380,text:"⚡ Vagas limitadas",color:"#FEF08A",fontSize:16,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:80,fill:"none"}]},
  "Storytelling":{els:[{type:"sticky",x:50,y:50,w:200,h:140,title:"1. Gancho",text:"Comece com uma pergunta ou frase impactante",stickyColor:"#FEF08A",color:"#000",sw:1,opacity:100,fill:"none"},{type:"arrow",x:250,y:120,w:50,h:0,color:"#F59E0B",sw:2,fill:"none",opacity:100},{type:"sticky",x:310,y:50,w:200,h:140,title:"2. Contexto",text:"Apresente o problema ou situação",stickyColor:"#FDBA74",color:"#000",sw:1,opacity:100,fill:"none"},{type:"arrow",x:510,y:120,w:50,h:0,color:"#22C55E",sw:2,fill:"none",opacity:100},{type:"sticky",x:570,y:50,w:200,h:140,title:"3. Virada",text:"Mostre a solução ou insight",stickyColor:"#86EFAC",color:"#000",sw:1,opacity:100,fill:"none"},{type:"arrow",x:400,y:200,w:0,h:40,color:"#3B82F6",sw:2,fill:"none",opacity:100},{type:"sticky",x:310,y:250,w:200,h:140,title:"4. CTA",text:"Chame para ação",stickyColor:"#93C5FD",color:"#000",sw:1,opacity:100,fill:"none"}]},
  "Roteiro Reels":{els:[{type:"rect",x:100,y:30,w:600,h:60,color:"#EF4444",sw:2,fill:"solid",opacity:100},{type:"text",x:280,y:68,text:"GANCHO (0-3s)",color:"#fff",fontSize:20,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:120,y:120,text:"Frase de impacto que prende a atenção",color:"#F59E0B",fontSize:16,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"rect",x:100,y:160,w:600,h:60,color:"#3B82F6",sw:2,fill:"solid",opacity:100},{type:"text",x:250,y:198,text:"DESENVOLVIMENTO (3-20s)",color:"#fff",fontSize:20,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:120,y:250,text:"Ponto 1 · Ponto 2 · Ponto 3",color:"#06B6D4",fontSize:16,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"rect",x:100,y:290,w:600,h:60,color:"#22C55E",sw:2,fill:"solid",opacity:100},{type:"text",x:280,y:328,text:"CTA FINAL (20-30s)",color:"#fff",fontSize:20,bold:true,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"},{type:"text",x:120,y:380,text:"Siga para mais · Link na bio · Salva esse post",color:"#A855F7",fontSize:16,fontFamily:"'Plus Jakarta Sans',sans-serif",sw:1,opacity:100,fill:"none"}]},
};
const CONTENT_BLOCKS=[
  {n:"Título",icon:"H",make:()=>({type:"text",text:"Título Principal",fontSize:48,bold:true,fontFamily:"'Bebas Neue',sans-serif",color:"#fff"})},
  {n:"Subtítulo",icon:"h",make:()=>({type:"text",text:"Subtítulo explicativo",fontSize:24,fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#A855F7"})},
  {n:"CTA Botão",icon:"▶",make:()=>({type:"rect",w:280,h:56,color:"#EF4444",fill:"solid"})},
  {n:"Numeração",icon:"#",make:()=>({type:"text",text:"01",fontSize:64,bold:true,fontFamily:"'Bebas Neue',sans-serif",color:"#F59E0B"})},
  {n:"Promessa",icon:"✨",make:()=>({type:"sticky",w:220,h:120,title:"✨ Promessa",text:"O que o público vai ganhar",stickyColor:"#86EFAC"})},
  {n:"Erro Comum",icon:"⚠",make:()=>({type:"sticky",w:220,h:120,title:"⚠ Erro Comum",text:"O que as pessoas fazem de errado",stickyColor:"#FCA5A5"})},
  {n:"Solução",icon:"💡",make:()=>({type:"sticky",w:220,h:120,title:"💡 Solução",text:"A resposta certa para o problema",stickyColor:"#93C5FD"})},
  {n:"Prova Social",icon:"🏆",make:()=>({type:"sticky",w:220,h:120,title:"🏆 Prova Social",text:"Resultados e depoimentos",stickyColor:"#FEF08A"})},
];

function PS({label,children}){return<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:8}}>{label}</div>{children}</div>;}

/* ── MAIN ─────────────────────────────────── */
export default function Ideas(){
  const toast=useToast();const cvs=useRef(null),box=useRef(null),fileRef=useRef(null);
  const[boards,setBoards]=useState([]);const[curBoard,setCurBoard]=useState(null);const[boardName,setBoardName]=useState("");const[showList,setShowList]=useState(true);
  const[els,setEls]=useState([]);const[tool,setTool]=useState("select");const[color,setColor]=useState("#ffffff");const[swV,setSwV]=useState(2);const[fillV,setFillV]=useState("none");
  const[fontIdx,setFontIdx]=useState(0);const[sizeKey,setSizeKey]=useState("M");const[alignV,setAlignV]=useState("left");const[opV,setOpV]=useState(100);const[selId,setSelId]=useState(null);
  const[stickyC,setStickyC]=useState("#FEF08A");const[mrkIdx,setMrkIdx]=useState(0);const[boldV,setBoldV]=useState(false);const[italicV,setItalicV]=useState(false);
  // Prefs
  const[showPrefs,setShowPrefs]=useState(false);const[showGrid,setShowGrid]=useState(true);const[zenMode,setZenMode]=useState(false);const[viewMode,setViewMode]=useState(false);const[canvasBg,setCanvasBg]=useState("#0B0C14");
  const[drawMode,setDrawMode]=useState("clean"); // "clean" or "hand"
  const[showTemplates,setShowTemplates]=useState(false);
  const[showBlocks,setShowBlocks]=useState(false);
  const[searchQ,setSearchQ]=useState("");
  const[favOnly,setFavOnly]=useState(false);
  // Interaction
  const[hist,setHist]=useState([[]]);const[hIdx,setHIdx]=useState(0);const[drawing,setDrawing]=useState(false);const[dragSt,setDragSt]=useState(null);
  const[resizing,setResizing]=useState(null); // {id, dir, startX, startY, origBounds}
  const[pan,setPan]=useState({x:0,y:0});const[zoom,setZoom]=useState(1);const[isPan,setIsPan]=useState(false);const[panSt,setPanSt]=useState(null);
  // TEXT: separate state for the floating text editor
  const[textEditor,setTextEditor]=useState(null); // {id?, x, y, screenX, screenY, value, fontSize}
  const[stickyEditor,setStickyEditor]=useState(null);
  const drawRef=useRef(null);const imgCache=useRef({});

  useEffect(()=>{ideaApi.list().then(setBoards).catch(()=>{});},[]);
  // Autosave every 30s
  useEffect(()=>{if(!curBoard||showList||els.length===0)return;const t=setInterval(()=>{save();},30000);return()=>clearInterval(t);},[curBoard,els.length,showList]);

  const push=useCallback(n=>{const s=JSON.parse(JSON.stringify(n.map(e=>{const c={...e};delete c._img;return c;})));setHist(p=>[...p.slice(0,hIdx+1),s].slice(-50));setHIdx(p=>Math.min(p+1,49));},[hIdx]);
  const undo=useCallback(()=>{if(hIdx<=0)return;setHIdx(hIdx-1);setEls(JSON.parse(JSON.stringify(hist[hIdx-1]||[])));},[hist,hIdx]);
  const redo=useCallback(()=>{if(hIdx>=hist.length-1)return;setHIdx(hIdx+1);setEls(JSON.parse(JSON.stringify(hist[hIdx+1]||[])));},[hist,hIdx]);
  const loadImg=useCallback(el=>{if(el.type!=="image"||!el.src)return el;if(imgCache.current[el.src]){el._img=imgCache.current[el.src];return el;}const img=new Image();img.src=el.src;img.onload=()=>{imgCache.current[el.src]=img;el._img=img;setEls(p=>[...p]);};return el;},[]);

  const selEl=els.find(e=>e.id===selId);
  useEffect(()=>{if(!selEl)return;if(selEl.color)setColor(selEl.color);if(selEl.sw)setSwV(selEl.sw);if(selEl.fill)setFillV(selEl.fill);if(selEl.opacity!==undefined)setOpV(selEl.opacity);if(selEl.fontFamily){const i=FONTS.findIndex(f=>f.f===selEl.fontFamily);if(i>=0)setFontIdx(i);}if(selEl.fontSize){const s=Object.entries(SIZES).find(([,v])=>v===selEl.fontSize);if(s)setSizeKey(s[0]);}if(selEl.align)setAlignV(selEl.align);if(selEl.bold!==undefined)setBoldV(selEl.bold);if(selEl.italic!==undefined)setItalicV(selEl.italic);},[selId]);
  const updSel=props=>{if(!selId)return;setEls(p=>p.map(e=>e.id===selId?{...e,...props}:e));};

  // Canvas render
  useEffect(()=>{const c=cvs.current,b=box.current;if(!c||!b)return;const ctx=c.getContext("2d");const r=b.getBoundingClientRect();c.width=r.width;c.height=r.height;ctx.fillStyle=canvasBg;ctx.fillRect(0,0,c.width,c.height);if(showGrid)gridFn(ctx,c.width,c.height,pan.x,pan.y,zoom);ctx.save();ctx.translate(pan.x,pan.y);ctx.scale(zoom,zoom);els.forEach(el=>render(ctx,el,el.id===selId));ctx.restore();},[els,selId,pan,zoom,showGrid,canvasBg]);
  useEffect(()=>{const r=()=>{if(cvs.current&&box.current){cvs.current.width=box.current.clientWidth;cvs.current.height=box.current.clientHeight;}};window.addEventListener("resize",r);r();return()=>window.removeEventListener("resize",r);},[]);

  // Keys
  useEffect(()=>{
    const kd=e=>{
      if(textEditor||stickyEditor)return;
      if((e.ctrlKey||e.metaKey)&&e.key==="z"){e.preventDefault();e.shiftKey?redo():undo();return;}
      if((e.ctrlKey||e.metaKey)&&e.key==="y"){e.preventDefault();redo();return;}
      if((e.ctrlKey||e.metaKey)&&e.key==="c"&&selId){const el=els.find(e=>e.id===selId);if(el)localStorage.setItem("lc_clip",JSON.stringify(el));return;}
      if((e.ctrlKey||e.metaKey)&&e.key==="v"){const cl=localStorage.getItem("lc_clip");if(cl){try{const el=JSON.parse(cl);el.id=uid();el.x+=20;el.y+=20;const n=[...els,el];setEls(n);push(n);}catch{}}return;}
      if((e.key==="Delete"||e.key==="Backspace")&&selId){e.preventDefault();const n=els.filter(e=>e.id!==selId);setEls(n);push(n);setSelId(null);return;}
      if(e.altKey&&e.key==="z"){e.preventDefault();setZenMode(p=>!p);return;}
      if(e.altKey&&e.key==="r"){e.preventDefault();setViewMode(p=>!p);return;}
      if(e.key===" "){e.preventDefault();setIsPan(true);return;}
      const map={v:"select",r:"rect",o:"ellipse",d:"diamond",l:"line",a:"arrow",p:"draw",t:"text",s:"sticky",m:"marker",e:"eraser"};
      if(map[e.key?.toLowerCase()]&&!e.ctrlKey&&!e.metaKey){setTool(map[e.key.toLowerCase()]);setSelId(null);}
    };
    const ku=e=>{if(e.key===" ")setIsPan(false);};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
    return()=>{window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[selId,els,textEditor,stickyEditor,undo,redo,push]);

  // Paste
  useEffect(()=>{
    const onP=e=>{if(textEditor||stickyEditor)return;const items=e.clipboardData?.items;if(!items)return;
    for(const item of items){if(item.type.startsWith("image/")){e.preventDefault();const blob=item.getAsFile();const rd=new FileReader();rd.onload=ev=>{const src=ev.target.result;const img=new Image();img.onload=()=>{const sc=Math.min(400/img.width,400/img.height,1);const el={id:uid(),type:"image",x:100,y:100,w:img.width*sc,h:img.height*sc,src,_img:img,color:"#fff",sw:1,opacity:100,fill:"none"};imgCache.current[src]=img;const n=[...els,el];setEls(n);push(n);};img.src=src;};rd.readAsDataURL(blob);return;}
    if(item.type==="text/plain"){item.getAsString(str=>{if(str.match(/^https?:\/\//)){const el={id:uid(),type:"sticky",x:100,y:100,w:260,h:80,title:"🔗 Link",text:str,stickyColor:"#93C5FD",color:"#000",sw:1,opacity:100,fill:"none"};const n=[...els,el];setEls(n);push(n);}});}}};
    window.addEventListener("paste",onP);return()=>window.removeEventListener("paste",onP);
  },[els,textEditor,stickyEditor,push]);

  const handleFile=e=>{const file=e.target.files?.[0];if(!file)return;const rd=new FileReader();rd.onload=ev=>{const src=ev.target.result;const img=new Image();img.onload=()=>{const sc=Math.min(500/img.width,500/img.height,1);const el={id:uid(),type:"image",x:80,y:80,w:img.width*sc,h:img.height*sc,src,_img:img,color:"#fff",sw:1,opacity:100,fill:"none"};imgCache.current[src]=img;const n=[...els,el];setEls(n);push(n);setTool("select");};img.src=src;};rd.readAsDataURL(file);e.target.value="";};

  const toC=e=>{const r=cvs.current.getBoundingClientRect();return{x:(e.clientX-r.left-pan.x)/zoom,y:(e.clientY-r.top-pan.y)/zoom};};
  const toScreen=(cx,cy)=>({sx:cx*zoom+pan.x,sy:cy*zoom+pan.y});

  /* ── Mouse handlers ──────────────────── */
  const onDown=e=>{
    if(viewMode)return;
    if(e.button===1||isPan){setPanSt({x:e.clientX-pan.x,y:e.clientY-pan.y});return;}
    const p=toC(e);

    if(tool==="select"){
      // Check resize handles first
      if(selId){const selEl=els.find(el=>el.id===selId);if(selEl){const dir=hitHandle(selEl,p.x,p.y);if(dir){const b=bounds(selEl);setResizing({id:selId,dir,sx:p.x,sy:p.y,ob:{...b},oel:{...selEl}});return;}}}
      const h=[...els].reverse().find(el=>hit(el,p.x,p.y));
      setSelId(h?.id||null);
      if(h){
        if(e.detail===2){if(h.type==="text"){const sc=toScreen(h.x,h.y);setTextEditor({id:h.id,value:h.text||"",screenX:sc.sx,screenY:sc.sy-(h.fontSize||24),fontSize:h.fontSize||24});} else if(h.type==="sticky")setStickyEditor({id:h.id,title:h.title||"",text:h.text||"",stickyColor:h.stickyColor||"#FEF08A"});return;}
        setDragSt({x:p.x-h.x,y:p.y-h.y,id:h.id});
      }return;
    }
    if(tool==="eraser"){const h=[...els].reverse().find(el=>hit(el,p.x,p.y));if(h){const n=els.filter(el=>el.id!==h.id);setEls(n);push(n);}return;}
    if(tool==="text"){
      const sc=toScreen(p.x,p.y);
      setTextEditor({value:"",screenX:sc.sx,screenY:sc.sy,canvasX:p.x,canvasY:p.y,fontSize:SIZES[sizeKey]});
      return;
    }
    if(tool==="sticky"){const el={id:uid(),type:"sticky",x:p.x,y:p.y,w:220,h:160,title:"Post-it",text:"",stickyColor:stickyC,color:"#000",sw:1,opacity:100,fill:"none"};const n=[...els,el];setEls(n);setStickyEditor({id:el.id,title:"Post-it",text:"",stickyColor:stickyC});return;}
    if(tool==="marker"){const el={id:uid(),type:"marker",x:p.x,y:p.y,icon:MARKERS[mrkIdx],label:"",color,sw:1,opacity:100,fill:"none"};const n=[...els,el];setEls(n);push(n);return;}
    if(tool==="image"){fileRef.current?.click();return;}
    setDrawing(true);
    const el={id:uid(),type:tool,x:p.x,y:p.y,w:0,h:0,color,sw:swV,fill:fillV,opacity:opV,...(tool==="draw"?{points:[[p.x,p.y]]}:{})};
    drawRef.current=el;setEls(p=>[...p,el]);
  };

  const onMove=e=>{
    if(panSt){setPan({x:e.clientX-panSt.x,y:e.clientY-panSt.y});return;}
    if(resizing){
      const p=toC(e);const{id,dir,sx,sy,ob,oel}=resizing;const dx=p.x-sx,dy=p.y-sy;
      setEls(prev=>prev.map(el=>{
        if(el.id!==id)return el;
        const u={...el};
        if(el.type==="sticky"||el.type==="image"||el.type==="rect"||el.type==="ellipse"||el.type==="diamond"){
          if(dir.includes("e")){u.w=(oel.w||ob.w)+dx;}
          if(dir.includes("w")){u.x=oel.x+dx;u.w=(oel.w||ob.w)-dx;}
          if(dir.includes("s")){u.h=(oel.h||ob.h)+dy;}
          if(dir.includes("n")){u.y=oel.y+dy;u.h=(oel.h||ob.h)-dy;}
          if(u.w<20)u.w=20;if(u.h<20)u.h=20;
        }else if(el.type==="line"||el.type==="arrow"){
          if(dir==="se"||dir==="ne"){u.w=oel.w+dx;u.h=oel.h+dy;}
        }
        return u;
      }));return;
    }
    if(dragSt){const p=toC(e);setEls(prev=>prev.map(el=>el.id===dragSt.id?{...el,x:p.x-dragSt.x,y:p.y-dragSt.y}:el));return;}
    if(!drawing||!drawRef.current)return;const p=toC(e),el=drawRef.current;
    if(tool==="draw"){el.points=[...(el.points||[]),[p.x,p.y]];}else{el.w=p.x-el.x;el.h=p.y-el.y;}
    setEls(prev=>prev.map(e=>e.id===el.id?{...el}:e));
  };

  const onUp=()=>{
    if(panSt){setPanSt(null);return;}
    if(resizing){setResizing(null);push(els);return;}
    if(dragSt){setDragSt(null);push(els);return;}
    if(drawing){setDrawing(false);drawRef.current=null;push(els);}
  };
  const onWheel=e=>{e.preventDefault();setZoom(p=>Math.max(.1,Math.min(5,p*(e.deltaY>0?.9:1.1))));};

  // Text confirm
  const confirmText=()=>{
    if(!textEditor)return;
    if(textEditor.id){
      if(textEditor.value.trim()){setEls(p=>p.map(e=>e.id===textEditor.id?{...e,text:textEditor.value}:e));push(els);}
    }else if(textEditor.value.trim()){
      const el={id:uid(),type:"text",x:textEditor.canvasX,y:textEditor.canvasY,text:textEditor.value,color,fontSize:textEditor.fontSize||SIZES[sizeKey],fontFamily:FONTS[fontIdx].f,align:alignV,bold:boldV,italic:italicV,sw:1,opacity:opV,fill:"none"};
      const n=[...els,el];setEls(n);push(n);
    }
    setTextEditor(null);
  };
  const confirmSticky=()=>{if(!stickyEditor)return;setEls(p=>p.map(e=>e.id===stickyEditor.id?{...e,title:stickyEditor.title,text:stickyEditor.text,stickyColor:stickyEditor.stickyColor}:e));push(els);setStickyEditor(null);};
  const moveLayer=d=>{if(!selId)return;const idx=els.findIndex(e=>e.id===selId);if(idx<0)return;const n=[...els];if(d==="up"&&idx<n.length-1)[n[idx],n[idx+1]]=[n[idx+1],n[idx]];else if(d==="down"&&idx>0)[n[idx],n[idx-1]]=[n[idx-1],n[idx]];else if(d==="top")n.push(n.splice(idx,1)[0]);else if(d==="bottom")n.unshift(n.splice(idx,1)[0]);setEls(n);push(n);};

  // Board ops
  const loadTemplate=(name)=>{const t=TEMPLATES[name];if(!t)return;const newEls=t.els.map(e=>({...e,id:uid()}));setEls(newEls);push(newEls);setShowTemplates(false);toast?.success("Template carregado!");};
  const addBlock=(block)=>{const b=block.make();const el={...b,id:uid(),x:200+Math.random()*100,y:200+Math.random()*100,sw:b.sw||2,opacity:b.opacity||100,fill:b.fill||"none",color:b.color||color};const n=[...els,el];setEls(n);push(n);setShowBlocks(false);};
  const duplicateBoard=async(b)=>{try{const board=await ideaApi.create({title:b.title+" (cópia)",content:b.content,color:b.color||"#3B82F6"});setBoards(p=>[board,...p]);toast?.success("Duplicado!");}catch{}};
  const toggleFav=async(b)=>{const tags=b.tags?.includes("fav")?b.tags.replace("fav",""):((b.tags||"")+" fav").trim();await ideaApi.update(b.id,{tags});setBoards(p=>p.map(x=>x.id===b.id?{...x,tags}:x));};
  const save=async()=>{const data=JSON.stringify({elements:els.map(e=>{const c={...e};delete c._img;return c;}),panOffset:pan,zoom});try{if(curBoard){await ideaApi.update(curBoard.id,{content:data,title:boardName||curBoard.title});setBoards(p=>p.map(b=>b.id===curBoard.id?{...b,content:data,title:boardName||b.title}:b));toast?.success("Salvo!");}else{const name=boardName||"Quadro "+new Date().toLocaleDateString("pt-BR");const board=await ideaApi.create({title:name,content:data,color:"#3B82F6"});setBoards(p=>[board,...p]);setCurBoard(board);setBoardName(name);toast?.success("Criado!");}}catch{toast?.error("Erro");}};
  const load=b=>{try{const d=JSON.parse(b.content||"{}");setEls((d.elements||[]).map(el=>loadImg(el)));setPan(d.panOffset||{x:0,y:0});setZoom(d.zoom||1);setHist([d.elements||[]]);setHIdx(0);}catch{setEls([]);}setCurBoard(b);setBoardName(b.title);setSelId(null);setShowList(false);};
  const newB=()=>{setEls([]);setCurBoard(null);setBoardName("");setPan({x:0,y:0});setZoom(1);setHist([[]]);setHIdx(0);setSelId(null);setShowList(false);};
  const delB=async id=>{try{await ideaApi.del(id);setBoards(p=>p.filter(b=>b.id!==id));if(curBoard?.id===id)newB();}catch{}};

  /* ── Board list ─────────────────────────── */
  if(showList)return(
    <div className="page-enter" style={{maxWidth:960,margin:"0 auto"}}>
      <Hdr title="Banco de Ideias" sub="Whiteboard para brainstorm e planejamento" action={<div style={{display:"flex",gap:8}}><Btn vr="ghost" onClick={()=>setFavOnly(!favOnly)} style={{fontSize:11}}>{favOnly?"★ Favoritos":"☆ Mostrar Favoritos"}</Btn><Btn onClick={newB}>+ Novo Quadro</Btn></div>}/>
      <div style={{marginBottom:16}}><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Buscar quadros..." style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:13,outline:"none"}}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
        <div onClick={newB} style={{background:C.bgCard,borderRadius:14,border:`2px dashed ${C.border}`,padding:32,textAlign:"center",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:180}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.red} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{fontSize:40,marginBottom:8,opacity:.3}}>✎</div><div style={{fontSize:14,fontWeight:600,color:C.muted}}>Novo Quadro</div></div>
        {boards.filter(b=>{if(searchQ&&!b.title?.toLowerCase().includes(searchQ.toLowerCase()))return false;if(favOnly&&!b.tags?.includes("fav"))return false;return true;}).map(b=><div key={b.id} style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderH;e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";}}>
          <div onClick={()=>load(b)} style={{height:120,background:`linear-gradient(135deg,${C.bg},${C.bgCard})`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:36,opacity:.15}}>✎</span></div>
          <div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div onClick={()=>load(b)}><div style={{fontWeight:600,fontSize:13}}>{b.title}</div><div style={{fontSize:10,color:C.dim}}>{new Date(b.updatedAt||b.createdAt).toLocaleDateString("pt-BR")}</div></div><div style={{display:"flex",gap:2}}><button onClick={e=>{e.stopPropagation();toggleFav(b);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14}}>{b.tags?.includes("fav")?"★":"☆"}</button><button onClick={e=>{e.stopPropagation();duplicateBoard(b);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.dim}}>⊕</button><Btn vr="subtle" onClick={e=>{e.stopPropagation();delB(b.id);}} style={{color:C.red,fontSize:11}}>✕</Btn></div></div></div>)}
      </div></div>);

  /* ── Whiteboard ─────────────────────────── */
  return(
    <div style={{position:"relative",height:"calc(100vh - 110px)",display:"flex",flexDirection:"column",margin:"-24px -32px",overflow:"hidden"}}>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
      {/* Toolbar */}
      {!zenMode&&<div style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:C.bgCard,borderBottom:`1px solid ${C.border}`,zIndex:10,flexWrap:"wrap",minHeight:44}}>
        <Btn vr="ghost" onClick={()=>setShowList(true)} style={{padding:"4px 8px",fontSize:10}}>← Quadros</Btn>
        <div style={{width:1,height:20,background:C.border}}/>
        {Object.entries(TOOLS).map(([k,v])=><button key={k} onClick={()=>{setTool(k);if(k==="image")fileRef.current?.click();setSelId(null);}} title={v.l} style={{width:30,height:30,borderRadius:6,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:k==="sticky"||k==="marker"||k==="image"?13:14,background:tool===k?`${C.red}22`:"transparent",color:tool===k?C.red:C.muted}}>{v.i}</button>)}
        <div style={{flex:1}}/>
        <div style={{width:1,height:20,background:C.border}}/>
        <Btn vr="ghost" onClick={()=>setShowTemplates(true)} style={{padding:"3px 8px",fontSize:10}}>📋 Templates</Btn>
        <Btn vr="ghost" onClick={()=>setShowBlocks(!showBlocks)} style={{padding:"3px 8px",fontSize:10}}>🧩 Blocos</Btn>
        <button onClick={()=>setDrawMode(drawMode==="clean"?"hand":"clean")} style={{padding:"3px 8px",borderRadius:6,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,background:drawMode==="hand"?`${C.purple}20`:"rgba(255,255,255,.04)",color:drawMode==="hand"?C.purple:C.dim}}>{drawMode==="hand"?"✎ Rabisco":"▬ Limpo"}</button>
        {/* Prefs button */}
        <div style={{position:"relative"}}><button onClick={()=>setShowPrefs(!showPrefs)} style={{width:30,height:30,borderRadius:6,border:"none",cursor:"pointer",fontSize:14,background:showPrefs?`${C.blue}22`:"transparent",color:showPrefs?C.blue:C.muted,display:"flex",alignItems:"center",justifyContent:"center"}}>☰</button>
          {showPrefs&&<div style={{position:"absolute",top:36,right:0,width:280,background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:12,zIndex:99,boxShadow:"0 12px 40px rgba(0,0,0,.5)",overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:600}}>⚙ Preferências</span><button onClick={()=>setShowPrefs(false)} style={{background:"none",border:"none",color:C.dim,cursor:"pointer"}}>✕</button></div>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:6}}>Fundo do canvas</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{CANVAS_BGS.map(bg=><div key={bg} onClick={()=>setCanvasBg(bg)} style={{width:26,height:26,borderRadius:6,cursor:"pointer",background:bg,border:canvasBg===bg?"2px solid #3B82F6":`1px solid ${C.border}`}}/>)}</div></div>
            <div style={{padding:"4px 0"}}>{[["Alternar grade","Ctrl+'",showGrid,()=>setShowGrid(p=>!p)],["Modo zen","Alt+Z",zenMode,()=>{setZenMode(p=>!p);setShowPrefs(false);}],["Modo visualização","Alt+R",viewMode,()=>setViewMode(p=>!p)]].map(([l,k,v,fn],i)=><div key={i} onClick={fn} style={{display:"flex",alignItems:"center",padding:"8px 14px",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{width:20,fontSize:13,color:v?C.blue:"transparent"}}>{v?"✓":""}</span><span style={{flex:1,fontSize:12,color:C.text}}>{l}</span><span style={{fontSize:10,color:C.dim,fontFamily:"var(--mono)"}}>{k}</span></div>)}</div>
          </div>}</div>
        <Btn vr="ghost" onClick={undo} style={{padding:"3px 6px",fontSize:11}} disabled={hIdx<=0}>↩</Btn>
        <Btn vr="ghost" onClick={redo} style={{padding:"3px 6px",fontSize:11}} disabled={hIdx>=hist.length-1}>↪</Btn>
        <Btn vr="ghost" onClick={()=>{setEls([]);setSelId(null);push([]);}} style={{padding:"3px 6px",fontSize:10}}>Limpar</Btn>
        <Btn vr="ghost" onClick={()=>{const c=cvs.current;if(c){const l=document.createElement("a");l.download=(boardName||"q")+".png";l.href=c.toDataURL();l.click();}}} style={{padding:"3px 6px",fontSize:10}}>PNG</Btn>
        <div style={{width:1,height:20,background:C.border}}/>
        <input value={boardName} onChange={e=>setBoardName(e.target.value)} placeholder="Nome..." style={{background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:5,padding:"4px 8px",color:C.text,fontSize:11,width:120,outline:"none"}}/>
        <Btn onClick={save} style={{padding:"4px 12px",fontSize:11}}>Salvar</Btn>
      </div>}

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Canvas */}
        <div ref={box} style={{flex:1,position:"relative",cursor:resizing?`${resizing.dir}-resize`:isPan?"grab":TOOLS[tool]?.c||"default",overflow:"hidden"}}>
          <canvas ref={cvs} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onWheel={onWheel} style={{display:"block",width:"100%",height:"100%",background:canvasBg}}/>

          {/* TEXT EDITOR - positioned using screen coordinates */}
          {textEditor&&<div style={{position:"absolute",left:textEditor.screenX,top:textEditor.screenY,zIndex:20}}>
            <textarea autoFocus value={textEditor.value} onChange={e=>setTextEditor(p=>({...p,value:e.target.value}))}
              onKeyDown={e=>{if(e.key==="Escape"){setTextEditor(null);return;}if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();confirmText();}}}
              onBlur={confirmText}
              style={{background:"rgba(0,0,0,.9)",border:`2px solid ${C.blue}`,borderRadius:8,padding:"10px 14px",color,fontSize:textEditor.fontSize||SIZES[sizeKey],fontFamily:FONTS[fontIdx].f,fontWeight:boldV?"bold":"normal",fontStyle:italicV?"italic":"normal",outline:"none",minWidth:260,minHeight:80,resize:"both",lineHeight:1.4,whiteSpace:"pre-wrap"}}
              placeholder="Digite aqui... (Shift+Enter = nova linha)"/>
          </div>}

          {/* STICKY EDITOR */}
          {stickyEditor&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:30,width:340,background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,padding:22,boxShadow:"0 20px 60px rgba(0,0,0,.5)"}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Editar Post-it</div>
            <div style={{marginBottom:10}}><div style={{fontSize:10,color:C.dim,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>Título</div><input value={stickyEditor.title} onChange={e=>setStickyEditor(p=>({...p,title:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px",color:C.text,fontSize:13,outline:"none"}}/></div>
            <div style={{marginBottom:10}}><div style={{fontSize:10,color:C.dim,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>Conteúdo</div><textarea value={stickyEditor.text} onChange={e=>setStickyEditor(p=>({...p,text:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px",color:C.text,fontSize:13,outline:"none",minHeight:80,resize:"vertical"}} placeholder="Escreva..."/></div>
            <div style={{marginBottom:14}}><div style={{fontSize:10,color:C.dim,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>Cor</div><div style={{display:"flex",gap:4}}>{STICKY_C.map(sc=><div key={sc} onClick={()=>setStickyEditor(p=>({...p,stickyColor:sc}))} style={{width:28,height:28,borderRadius:6,cursor:"pointer",background:sc,border:stickyEditor.stickyColor===sc?"2px solid #fff":`1px solid ${C.border}`}}/>)}</div></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn vr="ghost" onClick={()=>setStickyEditor(null)}>Cancelar</Btn><Btn onClick={confirmSticky}>Salvar</Btn></div>
          </div>}

          {/* Template picker */}
          {showTemplates&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:40}} onClick={()=>setShowTemplates(false)}>
            <div onClick={e=>e.stopPropagation()} style={{background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:24,width:700,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.5)"}}>
              <div style={{fontWeight:700,fontSize:18,marginBottom:4}}>Templates Prontos</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Escolha um modelo para começar rapidamente</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                {Object.entries(TEMPLATES).map(([name])=>(
                  <div key={name} onClick={()=>loadTemplate(name)} style={{background:"rgba(255,255,255,.03)",border:`1px solid ${C.border}`,borderRadius:12,padding:16,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";}}>
                    <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>{name}</div>
                    <div style={{fontSize:11,color:C.dim}}>{TEMPLATES[name].els?.length||0} elementos</div>
                  </div>))}
              </div>
            </div>
          </div>}
          {/* Content blocks picker */}
          {showBlocks&&<div style={{position:"absolute",top:50,left:10,background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:12,padding:12,zIndex:25,width:180,boxShadow:"0 8px 24px rgba(0,0,0,.4)"}}>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:8}}>Blocos de Conteúdo</div>
            {CONTENT_BLOCKS.map((b,i)=>(
              <div key={i} onClick={()=>addBlock(b)} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,cursor:"pointer",fontSize:12,color:C.text}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:14}}>{b.icon}</span><span>{b.n}</span>
              </div>))}
          </div>}
          {zenMode&&<button onClick={()=>setZenMode(false)} style={{position:"absolute",top:10,right:10,padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bgCard,color:C.muted,cursor:"pointer",fontSize:11,zIndex:5,opacity:.5}}>Sair do Zen (Alt+Z)</button>}
          {viewMode&&<div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",padding:"6px 14px",borderRadius:8,background:`${C.blue}20`,color:C.blue,fontSize:11,fontWeight:600,zIndex:5}}>Modo Visualização · Alt+R para sair</div>}

          <div style={{position:"absolute",bottom:10,right:10,display:"flex",gap:3,alignItems:"center"}}>
            <button onClick={()=>setZoom(p=>Math.max(.1,p*.8))} style={{width:26,height:26,borderRadius:5,border:`1px solid ${C.border}`,background:C.bgCard,color:C.muted,cursor:"pointer",fontSize:13}}>−</button>
            <span style={{fontFamily:"var(--mono)",fontSize:10,color:C.dim,minWidth:36,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
            <button onClick={()=>setZoom(p=>Math.min(5,p*1.2))} style={{width:26,height:26,borderRadius:5,border:`1px solid ${C.border}`,background:C.bgCard,color:C.muted,cursor:"pointer",fontSize:13}}>+</button>
            <button onClick={()=>{setZoom(1);setPan({x:0,y:0});}} style={{padding:"3px 7px",borderRadius:5,border:`1px solid ${C.border}`,background:C.bgCard,color:C.dim,cursor:"pointer",fontSize:9}}>Reset</button>
          </div>
          <div style={{position:"absolute",bottom:10,left:10,fontFamily:"var(--mono)",fontSize:10,color:C.dim}}>{els.length} el. · Ctrl+V cola imagens</div>
        </div>

        {/* Right Panel */}
        {!zenMode&&<div style={{width:220,minWidth:220,background:C.bgCard,borderLeft:`1px solid ${C.border}`,overflowY:"auto",padding:"14px"}}>
          <PS label="Stroke"><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{COLORS.map(c=><div key={c} onClick={()=>{setColor(c);updSel({color:c});}} style={{width:24,height:24,borderRadius:6,cursor:"pointer",background:c,border:color===c?"2px solid #3B82F6":`1px solid ${C.border}`}}/>)}</div><div style={{display:"flex",gap:2,marginTop:8}}>{SW.map(w=><button key={w} onClick={()=>{setSwV(w);updSel({sw:w});}} style={{width:28,height:28,borderRadius:6,border:"none",cursor:"pointer",background:swV===w?`${C.blue}20`:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:Math.min(w*2,14),height:Math.min(w*2,14),borderRadius:"50%",background:swV===w?C.blue:C.dim}}/></button>)}</div></PS>
          <PS label="Fill"><div style={{display:"flex",gap:3}}>{[["none","Sem"],["solid","Sólido"],["hatch","Hachura"]].map(([f,l])=><button key={f} onClick={()=>{setFillV(f);updSel({fill:f});}} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,background:fillV===f?`${C.purple}20`:"rgba(255,255,255,.04)",color:fillV===f?C.purple:C.dim}}>{l}</button>)}</div></PS>
          <PS label="Font family"><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{FONTS.map((f,i)=><button key={i} onClick={()=>{setFontIdx(i);updSel({fontFamily:f.f});}} style={{padding:"5px 8px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontFamily:f.f,background:fontIdx===i?`${C.blue}20`:"rgba(255,255,255,.04)",color:fontIdx===i?C.blue:C.muted}}>{f.n}</button>)}</div></PS>
          <PS label="Font size"><div style={{display:"flex",gap:3}}>{Object.entries(SIZES).map(([k,v])=><button key={k} onClick={()=>{setSizeKey(k);updSel({fontSize:v});}} style={{flex:1,padding:"6px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:sizeKey===k?`${C.green}20`:"rgba(255,255,255,.04)",color:sizeKey===k?C.green:C.dim}}>{k}</button>)}</div></PS>
          <PS label="Style"><div style={{display:"flex",gap:3}}><button onClick={()=>{setBoldV(!boldV);updSel({bold:!boldV});}} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:boldV?`${C.blue}20`:"rgba(255,255,255,.04)",color:boldV?C.blue:C.dim}}>B</button><button onClick={()=>{setItalicV(!italicV);updSel({italic:!italicV});}} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,fontStyle:"italic",background:italicV?`${C.blue}20`:"rgba(255,255,255,.04)",color:italicV?C.blue:C.dim}}>I</button></div></PS>
          <PS label="Text align"><div style={{display:"flex",gap:3}}>{[["left","⇤"],["center","⇔"],["right","⇥"]].map(([a,ic])=><button key={a} onClick={()=>{setAlignV(a);updSel({align:a});}} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:14,background:alignV===a?`${C.blue}20`:"rgba(255,255,255,.04)",color:alignV===a?C.blue:C.dim}}>{ic}</button>)}</div></PS>
          <PS label="Opacity"><div style={{display:"flex",alignItems:"center",gap:8}}><input type="range" min="0" max="100" value={opV} onChange={e=>{const v=+e.target.value;setOpV(v);updSel({opacity:v});}} style={{flex:1,accentColor:C.blue}}/><span style={{fontFamily:"var(--mono)",fontSize:11,color:C.dim,minWidth:28}}>{opV}</span></div></PS>
          <PS label="Layers"><div style={{display:"flex",gap:3}}>{[["bottom","⇊"],["down","↓"],["up","↑"],["top","⇈"]].map(([d,i])=><button key={d} onClick={()=>moveLayer(d)} disabled={!selId} style={{flex:1,padding:"6px 0",borderRadius:6,border:"none",cursor:selId?"pointer":"not-allowed",fontSize:14,background:"rgba(255,255,255,.04)",color:selId?C.muted:C.dim,opacity:selId?1:.4}}>{i}</button>)}</div></PS>
          <PS label="Modo de desenho"><div style={{display:"flex",gap:3}}><button onClick={()=>setDrawMode("clean")} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,background:drawMode==="clean"?`${C.blue}20`:"rgba(255,255,255,.04)",color:drawMode==="clean"?C.blue:C.dim}}>▬ Limpo</button><button onClick={()=>setDrawMode("hand")} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,background:drawMode==="hand"?`${C.purple}20`:"rgba(255,255,255,.04)",color:drawMode==="hand"?C.purple:C.dim}}>✎ Rabisco</button></div></PS>
          {tool==="marker"&&<PS label="Marcadores"><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{MARKERS.map((m,i)=><button key={i} onClick={()=>setMrkIdx(i)} style={{width:32,height:32,borderRadius:6,border:"none",cursor:"pointer",fontSize:16,background:mrkIdx===i?`${C.blue}20`:"rgba(255,255,255,.04)"}}>{m}</button>)}</div></PS>}
          {tool==="sticky"&&<PS label="Cor do Post-it"><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{STICKY_C.map(sc=><div key={sc} onClick={()=>setStickyC(sc)} style={{width:28,height:28,borderRadius:6,cursor:"pointer",background:sc,border:stickyC===sc?"2px solid #fff":`1px solid ${C.border}`}}/>)}</div></PS>}
          {selEl&&<PS label="Selecionado"><div style={{fontSize:11,color:C.muted,marginBottom:8}}>{selEl.type}</div>{(selEl.type==="text"||selEl.type==="sticky")&&<Btn vr="ghost" onClick={()=>{if(selEl.type==="text"){const sc=toScreen(selEl.x,selEl.y);setTextEditor({id:selEl.id,value:selEl.text,screenX:sc.sx,screenY:sc.sy-(selEl.fontSize||24),fontSize:selEl.fontSize});}else setStickyEditor({id:selEl.id,title:selEl.title,text:selEl.text,stickyColor:selEl.stickyColor});}} style={{width:"100%",marginBottom:6,fontSize:11}}>Editar</Btn>}<Btn vr="ghost" onClick={()=>{const n=els.filter(e=>e.id!==selId);setEls(n);push(n);setSelId(null);}} style={{width:"100%",fontSize:11,color:C.red}}>Deletar</Btn></PS>}
        </div>}
      </div></div>);
}
