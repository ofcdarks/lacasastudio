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
  draw: { icon: "✎", label: "Desenho Livre (P)", cur: "crosshair" },
  text: { icon: "T", label: "Texto (T)", cur: "text" },
  sticky: { icon: "🗒", label: "Post-it (S)", cur: "crosshair" },
  marker: { icon: "⚑", label: "Marcador (M)", cur: "crosshair" },
  eraser: { icon: "⌫", label: "Borracha (E)", cur: "cell" },
};

const COLORS = ["#ffffff","#EF4444","#F59E0B","#22C55E","#3B82F6","#A855F7","#EC4899","#06B6D4","#F97316","#6366F1"];
const STICKY_COLORS = ["#FEF08A","#FDBA74","#86EFAC","#93C5FD","#C4B5FD","#FDA4AF","#67E8F9","#FCA5A5"];
const MARKER_TYPES = [
  { icon: "⭐", label: "Importante" },
  { icon: "❗", label: "Urgente" },
  { icon: "✅", label: "Feito" },
  { icon: "❓", label: "Dúvida" },
  { icon: "💡", label: "Ideia" },
  { icon: "🔥", label: "Hot" },
  { icon: "🎯", label: "Meta" },
  { icon: "⚠️", label: "Atenção" },
];
const STROKE_W = [1, 2, 3, 5, 8];
const FONT_SIZES = [14, 18, 24, 32, 48];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ─── Render engine ──────────────────────── */
function renderEl(ctx, el, sel) {
  ctx.save();
  ctx.strokeStyle = el.color || "#fff";
  ctx.lineWidth = el.sw || 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = el.op ?? 1;

  const hasFill = el.fill && el.fill !== "none";

  switch (el.type) {
    case "rect": {
      if (hasFill) { ctx.fillStyle = el.fill === "hatch" ? "transparent" : (el.color || "#fff") + "25"; ctx.fillRect(el.x, el.y, el.w, el.h); }
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      if (el.fill === "hatch") hatch(ctx, el.x, el.y, el.w, el.h, el.color);
      break;
    }
    case "ellipse": {
      ctx.beginPath();
      ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.abs(el.w / 2) || 1, Math.abs(el.h / 2) || 1, 0, 0, Math.PI * 2);
      if (hasFill) { ctx.fillStyle = (el.color || "#fff") + "25"; ctx.fill(); }
      ctx.stroke();
      break;
    }
    case "diamond": {
      const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
      ctx.beginPath(); ctx.moveTo(cx, el.y); ctx.lineTo(el.x + el.w, cy); ctx.lineTo(cx, el.y + el.h); ctx.lineTo(el.x, cy); ctx.closePath();
      if (hasFill) { ctx.fillStyle = (el.color || "#fff") + "25"; ctx.fill(); }
      ctx.stroke();
      break;
    }
    case "line": {
      ctx.beginPath(); ctx.moveTo(el.x, el.y); ctx.lineTo(el.x + el.w, el.y + el.h); ctx.stroke();
      break;
    }
    case "arrow": {
      const ex = el.x + el.w, ey = el.y + el.h;
      ctx.beginPath(); ctx.moveTo(el.x, el.y); ctx.lineTo(ex, ey); ctx.stroke();
      const a = Math.atan2(el.h, el.w), hl = 16;
      ctx.beginPath();
      ctx.moveTo(ex - hl * Math.cos(a - 0.4), ey - hl * Math.sin(a - 0.4));
      ctx.lineTo(ex, ey);
      ctx.lineTo(ex - hl * Math.cos(a + 0.4), ey - hl * Math.sin(a + 0.4));
      ctx.stroke();
      break;
    }
    case "draw": {
      const pts = el.points || [];
      if (pts.length < 2) break;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      break;
    }
    case "text": {
      const fs = el.fontSize || 20;
      ctx.font = `${el.bold ? "bold " : ""}${fs}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = el.color || "#fff";
      const lines = (el.text || "").split("\n");
      lines.forEach((line, i) => ctx.fillText(line, el.x, el.y + i * (fs * 1.3)));
      break;
    }
    case "sticky": {
      const sw = el.w || 200, sh = el.h || 150;
      ctx.fillStyle = el.stickyColor || "#FEF08A";
      ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      roundRect(ctx, el.x, el.y, sw, sh, 6); ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 1;
      roundRect(ctx, el.x, el.y, sw, sh, 6); ctx.stroke();
      // Header bar
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(el.x, el.y, sw, 28);
      // Text
      ctx.fillStyle = "#1a1a1a";
      ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(el.title || "Post-it", el.x + 10, el.y + 18);
      ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
      const textLines = wrapText(ctx, el.text || "", sw - 20, 14);
      textLines.forEach((ln, i) => ctx.fillText(ln, el.x + 10, el.y + 44 + i * 16));
      break;
    }
    case "marker": {
      ctx.font = "36px serif";
      ctx.fillText(el.icon || "⭐", el.x, el.y + 36);
      if (el.label) {
        ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = el.color || "#fff";
        ctx.fillText(el.label, el.x - 4, el.y + 52);
      }
      break;
    }
    case "image": {
      if (el._img) {
        try { ctx.drawImage(el._img, el.x, el.y, el.w || el._img.width, el.h || el._img.height); } catch {}
      }
      break;
    }
  }

  // Selection box
  if (sel) {
    ctx.strokeStyle = "#3B82F6"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    const b = getBounds(el);
    ctx.strokeRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10);
    ctx.setLineDash([]);
    // Resize handles
    const corners = [[b.x - 5, b.y - 5], [b.x + b.w + 5, b.y - 5], [b.x - 5, b.y + b.h + 5], [b.x + b.w + 5, b.y + b.h + 5]];
    ctx.fillStyle = "#3B82F6";
    corners.forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill(); });
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function wrapText(ctx, text, maxW, lineH) {
  const words = text.split(" "), lines = []; let line = "";
  for (const w of words) {
    const test = line + (line ? " " : "") + w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 7);
}

function hatch(ctx, x, y, w, h, color) {
  ctx.save(); ctx.strokeStyle = (color || "#fff") + "35"; ctx.lineWidth = 1;
  const step = 8; ctx.beginPath();
  for (let i = -Math.abs(h); i < Math.abs(w) + Math.abs(h); i += step) { ctx.moveTo(x + i, y); ctx.lineTo(x + i - Math.abs(h), y + Math.abs(h)); }
  ctx.stroke(); ctx.restore();
}

function getBounds(el) {
  if (el.type === "draw" && el.points?.length) {
    let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    el.points.forEach(p => { mnx = Math.min(mnx, p[0]); mny = Math.min(mny, p[1]); mxx = Math.max(mxx, p[0]); mxy = Math.max(mxy, p[1]); });
    return { x: mnx, y: mny, w: mxx - mnx, h: mxy - mny };
  }
  if (el.type === "text") {
    const fs = el.fontSize || 20;
    const lines = (el.text || "").split("\n");
    const w = Math.max(...lines.map(l => l.length)) * fs * 0.6;
    return { x: el.x, y: el.y - fs, w: Math.max(w, 40), h: lines.length * fs * 1.3 + 4 };
  }
  if (el.type === "marker") return { x: el.x - 4, y: el.y - 4, w: 44, h: 60 };
  if (el.type === "sticky") return { x: el.x, y: el.y, w: el.w || 200, h: el.h || 150 };
  if (el.type === "image") return { x: el.x, y: el.y, w: el.w || 200, h: el.h || 200 };
  const x = Math.min(el.x, el.x + (el.w || 0)), y = Math.min(el.y, el.y + (el.h || 0));
  return { x, y, w: Math.abs(el.w || 0), h: Math.abs(el.h || 0) };
}

function hitTest(el, px, py) {
  const b = getBounds(el);
  const m = 10;
  return px >= b.x - m && px <= b.x + b.w + m && py >= b.y - m && py <= b.y + b.h + m;
}

function drawGrid(ctx, W, H, ox, oy, z) {
  ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1;
  const g = 20 * z, sx = ox % g, sy = oy % g;
  ctx.beginPath();
  for (let x = sx; x < W; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = sy; y < H; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
}

/* ─── MAIN ──────────────────────────────── */
export default function Ideas() {
  const { channels } = useApp();
  const toast = useToast();
  const cvs = useRef(null);
  const box = useRef(null);

  const [boards, setBoards] = useState([]);
  const [curBoard, setCurBoard] = useState(null);
  const [boardName, setBoardName] = useState("");
  const [showList, setShowList] = useState(true);

  const [els, setEls] = useState([]);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#ffffff");
  const [sw, setSw] = useState(2);
  const [fill, setFill] = useState("none");
  const [fontSize, setFontSize] = useState(20);
  const [selId, setSelId] = useState(null);
  const [stickyColor, setStickyColor] = useState("#FEF08A");
  const [markerType, setMarkerType] = useState(0);

  const [hist, setHist] = useState([[]]);
  const [hIdx, setHIdx] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [dragSt, setDragSt] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPan, setIsPan] = useState(false);
  const [panSt, setPanSt] = useState(null);
  const [editText, setEditText] = useState(null);
  const [editSticky, setEditSticky] = useState(null);
  const drawRef = useRef(null);
  const imgCache = useRef({});

  useEffect(() => { ideaApi.list().then(setBoards).catch(() => {}); }, []);

  const push = useCallback((newEls) => {
    const snap = JSON.parse(JSON.stringify(newEls.map(e => { const c = {...e}; delete c._img; return c; })));
    setHist(p => [...p.slice(0, hIdx + 1), snap].slice(-50));
    setHIdx(p => Math.min(p + 1, 49));
  }, [hIdx]);

  const undo = useCallback(() => {
    if (hIdx <= 0) return;
    setHIdx(hIdx - 1); setEls(JSON.parse(JSON.stringify(hist[hIdx - 1] || [])));
  }, [hist, hIdx]);

  const redo = useCallback(() => {
    if (hIdx >= hist.length - 1) return;
    setHIdx(hIdx + 1); setEls(JSON.parse(JSON.stringify(hist[hIdx + 1] || [])));
  }, [hist, hIdx]);

  // Load images
  const loadImg = useCallback((el) => {
    if (el.type !== "image" || !el.src) return el;
    if (imgCache.current[el.src]) { el._img = imgCache.current[el.src]; return el; }
    const img = new Image(); img.src = el.src;
    img.onload = () => { imgCache.current[el.src] = img; el._img = img; setEls(p => [...p]); };
    return el;
  }, []);

  // Render
  useEffect(() => {
    const c = cvs.current, b = box.current;
    if (!c || !b) return;
    const ctx = c.getContext("2d");
    const r = b.getBoundingClientRect();
    c.width = r.width; c.height = r.height;
    ctx.clearRect(0, 0, c.width, c.height);
    drawGrid(ctx, c.width, c.height, pan.x, pan.y, zoom);
    ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom);
    els.forEach(el => renderEl(ctx, el, el.id === selId));
    ctx.restore();
  }, [els, selId, pan, zoom]);

  useEffect(() => {
    const resize = () => { if (cvs.current && box.current) { cvs.current.width = box.current.clientWidth; cvs.current.height = box.current.clientHeight; } };
    window.addEventListener("resize", resize); resize();
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Keyboard
  useEffect(() => {
    const kd = (e) => {
      if (editText || editSticky) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selId) {
        const el = els.find(e => e.id === selId);
        if (el) localStorage.setItem("lc_clipboard", JSON.stringify(el));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        const clip = localStorage.getItem("lc_clipboard");
        if (clip) { try { const el = JSON.parse(clip); el.id = uid(); el.x += 20; el.y += 20; const n = [...els, el]; setEls(n); push(n); localStorage.setItem("lc_clipboard", JSON.stringify(el)); } catch {} }
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selId) {
        e.preventDefault(); const n = els.filter(e => e.id !== selId); setEls(n); push(n); setSelId(null); return;
      }
      if (e.key === " ") { e.preventDefault(); setIsPan(true); return; }
      const map = { v: "select", r: "rect", o: "ellipse", d: "diamond", l: "line", a: "arrow", p: "draw", t: "text", s: "sticky", m: "marker", e: "eraser" };
      if (map[e.key.toLowerCase()] && !e.ctrlKey && !e.metaKey) { setTool(map[e.key.toLowerCase()]); setSelId(null); }
    };
    const ku = (e) => { if (e.key === " ") setIsPan(false); };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [selId, els, editText, editSticky, undo, redo, push]);

  // Paste images from clipboard
  useEffect(() => {
    const onPaste = (e) => {
      if (editText || editSticky) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (ev) => {
            const src = ev.target.result;
            const img = new Image();
            img.onload = () => {
              const scale = Math.min(400 / img.width, 400 / img.height, 1);
              const el = { id: uid(), type: "image", x: 100, y: 100, w: img.width * scale, h: img.height * scale, src, _img: img, color: "#fff", sw: 1, op: 1, fill: "none" };
              imgCache.current[src] = img;
              const n = [...els, el]; setEls(n); push(n);
              toast?.success("Imagem colada!");
            };
            img.src = src;
          };
          reader.readAsDataURL(blob);
          return;
        }
        // Paste text or URL
        if (item.type === "text/plain") {
          item.getAsString((str) => {
            if (str.match(/^https?:\/\//)) {
              // It's a URL - create a link box
              const el = { id: uid(), type: "sticky", x: 100, y: 100, w: 260, h: 80, title: "🔗 Link", text: str, stickyColor: "#93C5FD", color: "#fff", sw: 1, op: 1, fill: "none" };
              const n = [...els, el]; setEls(n); push(n);
              toast?.info("Link colado como post-it!");
            }
          });
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [els, editText, editSticky, push, toast]);

  const toC = (e) => {
    const r = cvs.current.getBoundingClientRect();
    return { x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom };
  };

  const onDown = (e) => {
    if (e.button === 1 || isPan) { setPanSt({ x: e.clientX - pan.x, y: e.clientY - pan.y }); return; }
    const p = toC(e);

    if (tool === "select") {
      const hit = [...els].reverse().find(el => hitTest(el, p.x, p.y));
      setSelId(hit?.id || null);
      if (hit) {
        if (e.detail === 2 && (hit.type === "text" || hit.type === "sticky")) {
          if (hit.type === "text") setEditText({ id: hit.id, value: hit.text || "", x: hit.x, y: hit.y, fontSize: hit.fontSize || 20 });
          else setEditSticky({ id: hit.id, title: hit.title || "", text: hit.text || "", stickyColor: hit.stickyColor || "#FEF08A" });
          return;
        }
        setDragSt({ x: p.x - hit.x, y: p.y - hit.y, id: hit.id });
      }
      return;
    }
    if (tool === "eraser") {
      const hit = [...els].reverse().find(el => hitTest(el, p.x, p.y));
      if (hit) { const n = els.filter(el => el.id !== hit.id); setEls(n); push(n); }
      return;
    }
    if (tool === "text") { setEditText({ value: "", x: p.x, y: p.y, fontSize }); return; }
    if (tool === "sticky") {
      const el = { id: uid(), type: "sticky", x: p.x, y: p.y, w: 220, h: 160, title: "Post-it", text: "", stickyColor, color: "#000", sw: 1, op: 1, fill: "none" };
      const n = [...els, el]; setEls(n);
      setEditSticky({ id: el.id, title: el.title, text: el.text, stickyColor: el.stickyColor });
      return;
    }
    if (tool === "marker") {
      const mt = MARKER_TYPES[markerType];
      const el = { id: uid(), type: "marker", x: p.x, y: p.y, icon: mt.icon, label: mt.label, color, sw: 1, op: 1, fill: "none" };
      const n = [...els, el]; setEls(n); push(n);
      return;
    }

    setDrawing(true);
    const el = { id: uid(), type: tool, x: p.x, y: p.y, w: 0, h: 0, color, sw, fill, op: 1, ...(tool === "draw" ? { points: [[p.x, p.y]] } : {}) };
    drawRef.current = el;
    setEls(p => [...p, el]);
  };

  const onMove = (e) => {
    if (panSt) { setPan({ x: e.clientX - panSt.x, y: e.clientY - panSt.y }); return; }
    if (dragSt) {
      const p = toC(e);
      setEls(prev => prev.map(el => el.id === dragSt.id ? { ...el, x: p.x - dragSt.x, y: p.y - dragSt.y } : el));
      return;
    }
    if (!drawing || !drawRef.current) return;
    const p = toC(e), el = drawRef.current;
    if (tool === "draw") { el.points = [...(el.points || []), [p.x, p.y]]; }
    else { el.w = p.x - el.x; el.h = p.y - el.y; }
    setEls(prev => prev.map(e => e.id === el.id ? { ...el } : e));
  };

  const onUp = () => {
    if (panSt) { setPanSt(null); return; }
    if (dragSt) { setDragSt(null); push(els); return; }
    if (drawing) { setDrawing(false); drawRef.current = null; push(els); }
  };

  const onWheel = (e) => { e.preventDefault(); setZoom(p => Math.max(0.1, Math.min(5, p * (e.deltaY > 0 ? 0.9 : 1.1)))); };

  const confirmText = () => {
    if (!editText) return;
    if (editText.id) {
      // Editing existing
      if (editText.value.trim()) {
        setEls(p => p.map(e => e.id === editText.id ? { ...e, text: editText.value } : e));
        push(els);
      }
    } else if (editText.value.trim()) {
      const el = { id: uid(), type: "text", x: editText.x, y: editText.y, text: editText.value, color, fontSize: editText.fontSize, bold: false, sw: 1, op: 1, fill: "none" };
      const n = [...els, el]; setEls(n); push(n);
    }
    setEditText(null);
  };

  const confirmSticky = () => {
    if (!editSticky) return;
    setEls(p => p.map(e => e.id === editSticky.id ? { ...e, title: editSticky.title, text: editSticky.text, stickyColor: editSticky.stickyColor } : e));
    push(els);
    setEditSticky(null);
  };

  // Board ops
  const save = async () => {
    const data = JSON.stringify({ elements: els.map(e => { const c = {...e}; delete c._img; return c; }), panOffset: pan, zoom });
    try {
      if (curBoard) {
        await ideaApi.update(curBoard.id, { content: data, title: boardName || curBoard.title });
        setBoards(p => p.map(b => b.id === curBoard.id ? { ...b, content: data, title: boardName || b.title } : b));
        toast?.success("Salvo!");
      } else {
        const name = boardName || "Quadro " + new Date().toLocaleDateString("pt-BR");
        const board = await ideaApi.create({ title: name, content: data, color: "#3B82F6" });
        setBoards(p => [board, ...p]); setCurBoard(board); setBoardName(name);
        toast?.success("Quadro criado!");
      }
    } catch { toast?.error("Erro ao salvar"); }
  };

  const load = (b) => {
    try {
      const d = JSON.parse(b.content || "{}");
      const loaded = (d.elements || []).map(el => loadImg(el));
      setEls(loaded); setPan(d.panOffset || { x: 0, y: 0 }); setZoom(d.zoom || 1);
      setHist([loaded]); setHIdx(0);
    } catch { setEls([]); }
    setCurBoard(b); setBoardName(b.title); setSelId(null); setShowList(false);
  };

  const newBoard = () => { setEls([]); setCurBoard(null); setBoardName(""); setPan({ x: 0, y: 0 }); setZoom(1); setHist([[]]); setHIdx(0); setSelId(null); setShowList(false); };
  const delBoard = async (id) => { try { await ideaApi.del(id); setBoards(p => p.filter(b => b.id !== id)); if (curBoard?.id === id) newBoard(); toast?.success("Removido"); } catch {} };
  const exportPng = () => { const c = cvs.current; if (!c) return; const l = document.createElement("a"); l.download = (boardName || "quadro") + ".png"; l.href = c.toDataURL("image/png"); l.click(); };

  /* ─── Board List ──────────────────────── */
  if (showList) return (
    <div className="page-enter" style={{ maxWidth: 960, margin: "0 auto" }}>
      <Hdr title="Banco de Ideias" sub="Whiteboard para brainstorm e planejamento visual" action={<Btn onClick={newBoard}>+ Novo Quadro</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        <div onClick={newBoard} style={{ background: C.bgCard, borderRadius: 14, border: `2px dashed ${C.border}`, padding: 32, textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 180, transition: "all 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.red} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
          <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.3 }}>✎</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>Novo Quadro</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Ctrl+V para colar imagens</div>
        </div>
        {boards.map(b => (
          <div key={b.id} style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderH; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "none"; }}>
            <div onClick={() => load(b)} style={{ height: 120, background: `linear-gradient(135deg, ${C.bg}, ${C.bgCard})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <span style={{ fontSize: 36, opacity: 0.15 }}>✎</span>
              {b.content && (() => { try { return <span style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10, color: C.dim, fontFamily: "var(--mono)" }}>{(JSON.parse(b.content).elements || []).length} el.</span>; } catch { return null; } })()}
            </div>
            <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div onClick={() => load(b)}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{b.title}</div>
                <div style={{ fontSize: 10, color: C.dim }}>{new Date(b.updatedAt || b.createdAt).toLocaleDateString("pt-BR")}</div>
              </div>
              <Btn vr="subtle" onClick={e => { e.stopPropagation(); delBoard(b.id); }} style={{ color: C.red, fontSize: 11 }}>✕</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ─── Whiteboard ──────────────────────── */
  const selEl = els.find(e => e.id === selId);

  return (
    <div style={{ position: "relative", height: "calc(100vh - 110px)", display: "flex", flexDirection: "column", margin: "-24px -32px", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C.bgCard, borderBottom: `1px solid ${C.border}`, zIndex: 10, flexWrap: "wrap", minHeight: 48 }}>
        <Btn vr="ghost" onClick={() => setShowList(true)} style={{ padding: "5px 10px", fontSize: 11 }}>← Quadros</Btn>
        <div style={{ width: 1, height: 22, background: C.border }} />
        {Object.entries(TOOLS).map(([k, v]) => (
          <button key={k} onClick={() => { setTool(k); setSelId(null); }} title={v.label}
            style={{ width: 32, height: 32, borderRadius: 6, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: k === "sticky" || k === "marker" ? 14 : 15, background: tool === k ? `${C.red}22` : "transparent", color: tool === k ? C.red : C.muted, transition: "all 0.15s" }}>
            {v.icon}
          </button>
        ))}
        <div style={{ width: 1, height: 22, background: C.border }} />
        <div style={{ display: "flex", gap: 2 }}>
          {COLORS.map(c => <div key={c} onClick={() => setColor(c)} style={{ width: 18, height: 18, borderRadius: 4, cursor: "pointer", background: c, border: color === c ? "2px solid #fff" : `1px solid ${C.border}` }} />)}
        </div>
        <div style={{ width: 1, height: 22, background: C.border }} />
        <div style={{ display: "flex", gap: 1 }}>
          {STROKE_W.map(w => <button key={w} onClick={() => setSw(w)} style={{ width: 24, height: 24, borderRadius: 4, border: "none", cursor: "pointer", background: sw === w ? `${C.blue}20` : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: Math.min(w * 2, 14), height: Math.min(w * 2, 14), borderRadius: "50%", background: sw === w ? C.blue : C.dim }} />
          </button>)}
        </div>
        <div style={{ width: 1, height: 22, background: C.border }} />
        {["none", "solid", "hatch"].map(f => <button key={f} onClick={() => setFill(f)} style={{ padding: "3px 7px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 9, fontWeight: 600, background: fill === f ? `${C.purple}20` : "transparent", color: fill === f ? C.purple : C.dim }}>{f === "none" ? "Sem" : f === "solid" ? "Sólido" : "Hachura"}</button>)}
        <div style={{ flex: 1 }} />
        <Btn vr="ghost" onClick={undo} style={{ padding: "4px 7px", fontSize: 11 }} disabled={hIdx <= 0}>↩</Btn>
        <Btn vr="ghost" onClick={redo} style={{ padding: "4px 7px", fontSize: 11 }} disabled={hIdx >= hist.length - 1}>↪</Btn>
        <Btn vr="ghost" onClick={() => { setEls([]); setSelId(null); push([]); }} style={{ padding: "4px 7px", fontSize: 10 }}>Limpar</Btn>
        <Btn vr="ghost" onClick={exportPng} style={{ padding: "4px 7px", fontSize: 10 }}>PNG</Btn>
        <div style={{ width: 1, height: 22, background: C.border }} />
        <input value={boardName} onChange={e => setBoardName(e.target.value)} placeholder="Nome..." style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 8px", color: C.text, fontSize: 11, width: 130, outline: "none" }} />
        <Btn onClick={save} style={{ padding: "5px 12px", fontSize: 11 }}>Salvar</Btn>
      </div>

      {/* Sub toolbar for special tools */}
      {(tool === "sticky" || tool === "marker" || tool === "text") && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "rgba(17,18,25,0.95)", borderBottom: `1px solid ${C.border}`, zIndex: 9 }}>
          {tool === "sticky" && <>
            <span style={{ fontSize: 11, color: C.dim }}>Cor do post-it:</span>
            {STICKY_COLORS.map(sc => <div key={sc} onClick={() => setStickyColor(sc)} style={{ width: 22, height: 22, borderRadius: 5, cursor: "pointer", background: sc, border: stickyColor === sc ? "2px solid #fff" : `1px solid ${C.border}` }} />)}
          </>}
          {tool === "marker" && <>
            <span style={{ fontSize: 11, color: C.dim }}>Marcador:</span>
            {MARKER_TYPES.map((mt, i) => <button key={i} onClick={() => setMarkerType(i)} style={{ padding: "3px 8px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 13, background: markerType === i ? `${C.blue}20` : "transparent" }}>{mt.icon} <span style={{ fontSize: 10, color: markerType === i ? C.text : C.dim }}>{mt.label}</span></button>)}
          </>}
          {tool === "text" && <>
            <span style={{ fontSize: 11, color: C.dim }}>Tamanho:</span>
            {FONT_SIZES.map(fs => <button key={fs} onClick={() => setFontSize(fs)} style={{ padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: fontSize === fs ? `${C.blue}20` : "transparent", color: fontSize === fs ? C.blue : C.dim }}>{fs}px</button>)}
          </>}
        </div>
      )}

      {/* Canvas */}
      <div ref={box} style={{ flex: 1, position: "relative", cursor: isPan ? "grab" : TOOLS[tool]?.cur || "default", overflow: "hidden" }}>
        <canvas ref={cvs} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onWheel={onWheel}
          style={{ display: "block", width: "100%", height: "100%", background: C.bg }} />

        {/* Text input */}
        {editText && (
          <div style={{ position: "absolute", left: (editText.x * zoom + pan.x), top: (editText.y * zoom + pan.y - (editText.fontSize || 20)), zIndex: 20 }}>
            <textarea autoFocus value={editText.value}
              onChange={e => setEditText(p => ({ ...p, value: e.target.value }))}
              onKeyDown={e => { if (e.key === "Escape") { setEditText(null); return; } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmText(); } }}
              onBlur={confirmText}
              style={{ background: "rgba(0,0,0,0.85)", border: `2px solid ${C.blue}`, borderRadius: 6, padding: "8px 12px", color, fontSize: editText.fontSize || 20, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", minWidth: 200, minHeight: 60, resize: "both" }}
              placeholder="Digite seu texto... (Shift+Enter = nova linha)" />
          </div>
        )}

        {/* Sticky editor */}
        {editSticky && (
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 30, width: 320, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Editar Post-it</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>Título</div>
              <input value={editSticky.title} onChange={e => setEditSticky(p => ({ ...p, title: e.target.value }))}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none" }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>Conteúdo</div>
              <textarea value={editSticky.text} onChange={e => setEditSticky(p => ({ ...p, text: e.target.value }))}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none", minHeight: 80, resize: "vertical" }}
                placeholder="Escreva sua ideia..." />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>Cor</div>
              <div style={{ display: "flex", gap: 4 }}>
                {STICKY_COLORS.map(sc => <div key={sc} onClick={() => setEditSticky(p => ({ ...p, stickyColor: sc }))} style={{ width: 28, height: 28, borderRadius: 6, cursor: "pointer", background: sc, border: editSticky.stickyColor === sc ? "2px solid #fff" : `1px solid ${C.border}` }} />)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn vr="ghost" onClick={() => setEditSticky(null)}>Cancelar</Btn>
              <Btn onClick={confirmSticky}>Salvar</Btn>
            </div>
          </div>
        )}

        {/* Selected element info */}
        {selEl && !editText && !editSticky && (
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 11, color: C.muted, display: "flex", gap: 10, alignItems: "center", zIndex: 5 }}>
            <span>{selEl.type === "sticky" ? "📝 Post-it" : selEl.type === "marker" ? `${selEl.icon} Marcador` : selEl.type === "text" ? "T Texto" : selEl.type === "image" ? "🖼 Imagem" : selEl.type.charAt(0).toUpperCase() + selEl.type.slice(1)}</span>
            {(selEl.type === "text" || selEl.type === "sticky") && <button onClick={() => { if (selEl.type === "text") setEditText({ id: selEl.id, value: selEl.text, x: selEl.x, y: selEl.y, fontSize: selEl.fontSize }); else setEditSticky({ id: selEl.id, title: selEl.title, text: selEl.text, stickyColor: selEl.stickyColor }); }} style={{ background: `${C.blue}20`, border: "none", borderRadius: 4, padding: "2px 8px", color: C.blue, cursor: "pointer", fontSize: 10 }}>Editar</button>}
            <button onClick={() => { const n = els.filter(e => e.id !== selId); setEls(n); push(n); setSelId(null); }} style={{ background: `${C.red}20`, border: "none", borderRadius: 4, padding: "2px 8px", color: C.red, cursor: "pointer", fontSize: 10 }}>Deletar</button>
          </div>
        )}

        {/* Zoom controls */}
        <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 3, alignItems: "center" }}>
          <button onClick={() => setZoom(p => Math.max(0.1, p * 0.8))} style={{ width: 26, height: 26, borderRadius: 5, border: `1px solid ${C.border}`, background: C.bgCard, color: C.muted, cursor: "pointer", fontSize: 13 }}>−</button>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: C.dim, minWidth: 36, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(p => Math.min(5, p * 1.2))} style={{ width: 26, height: 26, borderRadius: 5, border: `1px solid ${C.border}`, background: C.bgCard, color: C.muted, cursor: "pointer", fontSize: 13 }}>+</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={{ padding: "3px 7px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.bgCard, color: C.dim, cursor: "pointer", fontSize: 9 }}>Reset</button>
        </div>
        <div style={{ position: "absolute", bottom: 10, left: 10, fontFamily: "var(--mono)", fontSize: 10, color: C.dim }}>{els.length} el.{selId ? " · 1 sel." : ""} · Ctrl+V cola imagens</div>
      </div>
    </div>
  );
}
