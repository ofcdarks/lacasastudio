// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { ideaApi } from "../lib/api";
import { C, Btn, Hdr, Input } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";

/* ─── Types ──────────────────────────────────────── */
const TOOLS = {
  select: { icon: "⇱", label: "Selecionar", key: "V" },
  rect: { icon: "▭", label: "Retângulo", key: "R" },
  ellipse: { icon: "⬭", label: "Elipse", key: "O" },
  diamond: { icon: "◇", label: "Diamante", key: "D" },
  line: { icon: "╱", label: "Linha", key: "L" },
  arrow: { icon: "→", label: "Seta", key: "A" },
  draw: { icon: "✎", label: "Desenho Livre", key: "P" },
  text: { icon: "T", label: "Texto", key: "T" },
  eraser: { icon: "⌫", label: "Borracha", key: "E" },
};

const COLORS = ["#ffffff","#EF4444","#F59E0B","#22C55E","#3B82F6","#A855F7","#EC4899","#06B6D4","#F97316","#6366F1"];
const STROKE_WIDTHS = [1, 2, 3, 5, 8];
const FILL_STYLES = ["none", "solid", "hatch"];

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function hitTest(el, x, y) {
  const m = 8;
  if (el.type === "draw") {
    for (const p of (el.points || [])) {
      if (Math.abs(p[0] - x) < m * 2 && Math.abs(p[1] - y) < m * 2) return true;
    }
    return false;
  }
  if (el.type === "text") {
    const w = (el.text || "").length * 10;
    return x >= el.x - m && x <= el.x + w + m && y >= el.y - 20 && y <= el.y + m;
  }
  if (el.type === "line" || el.type === "arrow") {
    const dx = el.w, dy = el.h, len = Math.sqrt(dx * dx + dy * dy) || 1;
    const dot = ((x - el.x) * dx + (y - el.y) * dy) / (len * len);
    const cx = el.x + dot * dx, cy = el.y + dot * dy;
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    return dot >= -0.1 && dot <= 1.1 && dist < m * 2;
  }
  if (el.type === "diamond") {
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    const rx = Math.abs(el.w) / 2 || 1, ry = Math.abs(el.h) / 2 || 1;
    return (Math.abs(x - cx) / rx + Math.abs(y - cy) / ry) <= 1.2;
  }
  if (el.type === "ellipse") {
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    const rx = Math.abs(el.w) / 2 || 1, ry = Math.abs(el.h) / 2 || 1;
    return ((x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2) <= 1.3;
  }
  // rect default
  const minX = Math.min(el.x, el.x + (el.w || 0)), maxX = Math.max(el.x, el.x + (el.w || 0));
  const minY = Math.min(el.y, el.y + (el.h || 0)), maxY = Math.max(el.y, el.y + (el.h || 0));
  return x >= minX - m && x <= maxX + m && y >= minY - m && y <= maxY + m;
}

function drawElement(ctx, el, selected) {
  ctx.strokeStyle = el.color || "#fff";
  ctx.lineWidth = el.strokeWidth || 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = el.opacity || 1;

  const fill = el.fill && el.fill !== "none";
  if (fill) {
    ctx.fillStyle = el.fill === "solid" ? (el.color || "#fff") + "30" : "transparent";
  }

  if (el.type === "rect") {
    if (fill && el.fill === "solid") { ctx.fillRect(el.x, el.y, el.w, el.h); }
    ctx.strokeRect(el.x, el.y, el.w, el.h);
    if (fill && el.fill === "hatch") drawHatch(ctx, el.x, el.y, el.w, el.h, el.color);
  } else if (el.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.abs(el.w / 2), Math.abs(el.h / 2), 0, 0, Math.PI * 2);
    if (fill && el.fill === "solid") ctx.fill();
    ctx.stroke();
    if (fill && el.fill === "hatch") drawHatchEllipse(ctx, el.x, el.y, el.w, el.h, el.color);
  } else if (el.type === "diamond") {
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    ctx.beginPath();
    ctx.moveTo(cx, el.y); ctx.lineTo(el.x + el.w, cy); ctx.lineTo(cx, el.y + el.h); ctx.lineTo(el.x, cy); ctx.closePath();
    if (fill && el.fill === "solid") ctx.fill();
    ctx.stroke();
  } else if (el.type === "line") {
    ctx.beginPath(); ctx.moveTo(el.x, el.y); ctx.lineTo(el.x + el.w, el.y + el.h); ctx.stroke();
  } else if (el.type === "arrow") {
    const ex = el.x + el.w, ey = el.y + el.h;
    ctx.beginPath(); ctx.moveTo(el.x, el.y); ctx.lineTo(ex, ey); ctx.stroke();
    const angle = Math.atan2(el.h, el.w);
    const hl = 14;
    ctx.beginPath();
    ctx.moveTo(ex - hl * Math.cos(angle - 0.4), ey - hl * Math.sin(angle - 0.4));
    ctx.lineTo(ex, ey);
    ctx.lineTo(ex - hl * Math.cos(angle + 0.4), ey - hl * Math.sin(angle + 0.4));
    ctx.stroke();
  } else if (el.type === "draw") {
    if (!el.points || el.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(el.points[0][0], el.points[0][1]);
    for (let i = 1; i < el.points.length; i++) ctx.lineTo(el.points[i][0], el.points[i][1]);
    ctx.stroke();
  } else if (el.type === "text") {
    ctx.font = `${el.fontSize || 20}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = el.color || "#fff";
    ctx.fillText(el.text || "", el.x, el.y);
  }

  if (selected) {
    ctx.strokeStyle = "#3B82F6";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    if (el.type === "draw" && el.points?.length) {
      let mx = -Infinity, my = -Infinity, mnx = Infinity, mny = Infinity;
      el.points.forEach(p => { mx = Math.max(mx, p[0]); my = Math.max(my, p[1]); mnx = Math.min(mnx, p[0]); mny = Math.min(mny, p[1]); });
      ctx.strokeRect(mnx - 4, mny - 4, mx - mnx + 8, my - mny + 8);
    } else if (el.type === "text") {
      const tw = (el.text || "").length * (el.fontSize || 20) * 0.6;
      ctx.strokeRect(el.x - 4, el.y - (el.fontSize || 20), tw + 8, (el.fontSize || 20) + 8);
    } else if (el.type === "line" || el.type === "arrow") {
      ctx.strokeRect(Math.min(el.x, el.x + el.w) - 4, Math.min(el.y, el.y + el.h) - 4, Math.abs(el.w) + 8, Math.abs(el.h) + 8);
    } else {
      ctx.strokeRect(el.x - 4, el.y - 4, (el.w || 0) + 8, (el.h || 0) + 8);
    }
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
}

function drawHatch(ctx, x, y, w, h, color) {
  ctx.save(); ctx.strokeStyle = (color || "#fff") + "40"; ctx.lineWidth = 1;
  const step = 8;
  ctx.beginPath();
  for (let i = -Math.abs(h); i < Math.abs(w) + Math.abs(h); i += step) {
    ctx.moveTo(x + i, y); ctx.lineTo(x + i - Math.abs(h), y + Math.abs(h));
  }
  ctx.stroke(); ctx.restore();
}
function drawHatchEllipse(ctx, x, y, w, h, color) { drawHatch(ctx, x, y, w, h, color); }

function drawGrid(ctx, width, height, offsetX, offsetY, zoom) {
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  const gridSize = 20 * zoom;
  const startX = (offsetX % gridSize);
  const startY = (offsetY % gridSize);
  ctx.beginPath();
  for (let x = startX; x < width; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
  for (let y = startY; y < height; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
  ctx.stroke();
}

/* ─── Main Component ────────────────────────────── */
export default function Ideas() {
  const { channels } = useApp();
  const toast = useToast();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Board state
  const [boards, setBoards] = useState([]);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [boardName, setBoardName] = useState("");
  const [showBoardList, setShowBoardList] = useState(true);

  // Canvas state
  const [elements, setElements] = useState([]);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fillStyle, setFillStyle] = useState("none");
  const [fontSize, setFontSize] = useState(20);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Interaction state
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [textInput, setTextInput] = useState(null);
  const drawingElRef = useRef(null);

  // Load boards
  useEffect(() => {
    ideaApi.list().then(setBoards).catch(() => {});
  }, []);

  // Save to history
  const pushHistory = useCallback((els) => {
    setHistory(prev => {
      const next = [...prev.slice(0, historyIdx + 1), JSON.parse(JSON.stringify(els))];
      if (next.length > 50) next.shift();
      return next;
    });
    setHistoryIdx(prev => Math.min(prev + 1, 49));
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    setElements(JSON.parse(JSON.stringify(history[newIdx] || [])));
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    setElements(JSON.parse(JSON.stringify(history[newIdx] || [])));
  }, [history, historyIdx]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height, panOffset.x, panOffset.y, zoom);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    elements.forEach(el => {
      drawElement(ctx, el, el.id === selectedId);
    });

    ctx.restore();
  }, [elements, selectedId, panOffset, zoom]);

  // Resize
  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (textInput) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); return; }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && !textInput) {
          e.preventDefault();
          const newEls = elements.filter(el => el.id !== selectedId);
          setElements(newEls);
          pushHistory(newEls);
          setSelectedId(null);
        }
        return;
      }
      if (e.key === " ") { e.preventDefault(); setIsPanning(true); return; }
      const toolKey = Object.entries(TOOLS).find(([, v]) => v.key.toLowerCase() === e.key.toLowerCase());
      if (toolKey && !e.ctrlKey && !e.metaKey) { setTool(toolKey[0]); setSelectedId(null); }
    };
    const up = (e) => { if (e.key === " ") setIsPanning(false); };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", handler); window.removeEventListener("keyup", up); };
  }, [selectedId, elements, textInput, undo, redo, pushHistory]);

  // Mouse → canvas coords
  const toCanvas = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left - panOffset.x) / zoom, y: (e.clientY - rect.top - panOffset.y) / zoom };
  };

  const onMouseDown = (e) => {
    if (e.button === 1 || isPanning) {
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }
    const pos = toCanvas(e);

    if (tool === "select") {
      const hit = [...elements].reverse().find(el => hitTest(el, pos.x, pos.y));
      setSelectedId(hit?.id || null);
      if (hit) setDragStart({ x: pos.x - hit.x, y: pos.y - hit.y, id: hit.id });
      return;
    }
    if (tool === "eraser") {
      const hit = [...elements].reverse().find(el => hitTest(el, pos.x, pos.y));
      if (hit) {
        const newEls = elements.filter(el => el.id !== hit.id);
        setElements(newEls);
        pushHistory(newEls);
      }
      return;
    }
    if (tool === "text") {
      setTextInput({ x: pos.x, y: pos.y, value: "" });
      return;
    }

    setIsDrawing(true);
    const newEl = {
      id: genId(), type: tool, x: pos.x, y: pos.y, w: 0, h: 0,
      color, strokeWidth, fill: fillStyle, opacity: 1,
      ...(tool === "draw" ? { points: [[pos.x, pos.y]] } : {}),
      ...(tool === "text" ? { text: "", fontSize } : {}),
    };
    drawingElRef.current = newEl;
    setElements(prev => [...prev, newEl]);
  };

  const onMouseMove = (e) => {
    if (panStart) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (dragStart) {
      const pos = toCanvas(e);
      setElements(prev => prev.map(el =>
        el.id === dragStart.id ? { ...el, x: pos.x - dragStart.x, y: pos.y - dragStart.y } : el
      ));
      return;
    }
    if (!isDrawing || !drawingElRef.current) return;
    const pos = toCanvas(e);
    const el = drawingElRef.current;

    if (tool === "draw") {
      el.points = [...(el.points || []), [pos.x, pos.y]];
      setElements(prev => prev.map(e => e.id === el.id ? { ...el } : e));
    } else {
      el.w = pos.x - el.x;
      el.h = pos.y - el.y;
      setElements(prev => prev.map(e => e.id === el.id ? { ...el } : e));
    }
  };

  const onMouseUp = () => {
    if (panStart) { setPanStart(null); return; }
    if (dragStart) {
      setDragStart(null);
      pushHistory(elements);
      return;
    }
    if (isDrawing) {
      setIsDrawing(false);
      drawingElRef.current = null;
      pushHistory(elements);
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  const confirmText = () => {
    if (!textInput || !textInput.value.trim()) { setTextInput(null); return; }
    const newEl = { id: genId(), type: "text", x: textInput.x, y: textInput.y, text: textInput.value, color, fontSize, strokeWidth: 1, opacity: 1, fill: "none" };
    const newEls = [...elements, newEl];
    setElements(newEls);
    pushHistory(newEls);
    setTextInput(null);
  };

  // Board operations
  const saveBoard = async () => {
    const data = JSON.stringify({ elements, panOffset, zoom });
    try {
      if (currentBoard) {
        await ideaApi.update(currentBoard.id, { content: data, title: boardName || currentBoard.title });
        setBoards(prev => prev.map(b => b.id === currentBoard.id ? { ...b, content: data, title: boardName || b.title } : b));
        toast?.success("Quadro salvo!");
      } else {
        const name = boardName || "Quadro " + new Date().toLocaleDateString("pt-BR");
        const board = await ideaApi.create({ title: name, content: data, color: "#3B82F6" });
        setBoards(prev => [board, ...prev]);
        setCurrentBoard(board);
        setBoardName(name);
        toast?.success("Quadro criado!");
      }
    } catch (err) { toast?.error("Erro ao salvar"); }
  };

  const loadBoard = (board) => {
    try {
      const data = JSON.parse(board.content || "{}");
      setElements(data.elements || []);
      setPanOffset(data.panOffset || { x: 0, y: 0 });
      setZoom(data.zoom || 1);
      setHistory([data.elements || []]);
      setHistoryIdx(0);
    } catch {
      setElements([]);
    }
    setCurrentBoard(board);
    setBoardName(board.title);
    setSelectedId(null);
    setShowBoardList(false);
  };

  const newBoard = () => {
    setElements([]);
    setCurrentBoard(null);
    setBoardName("");
    setPanOffset({ x: 0, y: 0 });
    setZoom(1);
    setHistory([[]]);
    setHistoryIdx(0);
    setSelectedId(null);
    setShowBoardList(false);
  };

  const deleteBoard = async (id) => {
    try {
      await ideaApi.del(id);
      setBoards(prev => prev.filter(b => b.id !== id));
      if (currentBoard?.id === id) newBoard();
      toast?.success("Quadro removido");
    } catch {}
  };

  const clearCanvas = () => {
    setElements([]);
    setSelectedId(null);
    pushHistory([]);
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = (boardName || "quadro") + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // ─── Board List View ──────────────────────────
  if (showBoardList) {
    return (
      <div className="page-enter" style={{ maxWidth: 900, margin: "0 auto" }}>
        <Hdr title="Banco de Ideias" sub="Quadros de ideias estilo whiteboard"
          action={<Btn onClick={newBoard}>+ Novo Quadro</Btn>} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {/* New board card */}
          <div onClick={newBoard} style={{
            background: C.bgCard, borderRadius: 14, border: `2px dashed ${C.border}`,
            padding: 32, textAlign: "center", cursor: "pointer", display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 180,
            transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.red}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>+</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>Novo Quadro</div>
          </div>

          {boards.map(b => (
            <div key={b.id} style={{
              background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`,
              overflow: "hidden", cursor: "pointer", transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderH; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {/* Preview area */}
              <div onClick={() => loadBoard(b)} style={{
                height: 140, background: C.bg, position: "relative", overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: 48, opacity: 0.1 }}>✎</div>
                {b.content && (() => {
                  try {
                    const d = JSON.parse(b.content);
                    const count = (d.elements || []).length;
                    return <div style={{ position: "absolute", bottom: 8, right: 8, fontSize: 10, color: C.dim, fontFamily: "var(--mono)" }}>{count} elementos</div>;
                  } catch { return null; }
                })()}
              </div>
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div onClick={() => loadBoard(b)}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                    {new Date(b.updatedAt || b.createdAt).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <Btn vr="subtle" onClick={(e) => { e.stopPropagation(); deleteBoard(b.id); }} style={{ color: C.red, fontSize: 11 }}>✕</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Whiteboard View ──────────────────────────
  return (
    <div style={{ position: "relative", height: "calc(100vh - 110px)", display: "flex", flexDirection: "column", margin: "-24px -32px", overflow: "hidden" }}>
      {/* Top toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: C.bgCard, borderBottom: `1px solid ${C.border}`, zIndex: 10, flexWrap: "wrap" }}>
        {/* Back button */}
        <Btn vr="ghost" onClick={() => setShowBoardList(true)} style={{ padding: "6px 10px", fontSize: 11 }}>← Quadros</Btn>
        <div style={{ width: 1, height: 24, background: C.border, margin: "0 4px" }} />

        {/* Tools */}
        {Object.entries(TOOLS).map(([key, val]) => (
          <button key={key} onClick={() => { setTool(key); setSelectedId(null); }}
            title={`${val.label} (${val.key})`}
            style={{
              width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              background: tool === key ? `${C.red}20` : "transparent",
              color: tool === key ? C.red : C.muted,
              transition: "all 0.15s",
            }}>
            {val.icon}
          </button>
        ))}

        <div style={{ width: 1, height: 24, background: C.border, margin: "0 4px" }} />

        {/* Colors */}
        <div style={{ display: "flex", gap: 3 }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)}
              style={{
                width: 22, height: 22, borderRadius: 6, cursor: "pointer",
                background: c, border: color === c ? "2px solid #fff" : `2px solid ${C.border}`,
                transition: "all 0.15s",
              }} />
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: C.border, margin: "0 4px" }} />

        {/* Stroke width */}
        <div style={{ display: "flex", gap: 2 }}>
          {STROKE_WIDTHS.map(w => (
            <button key={w} onClick={() => setStrokeWidth(w)}
              style={{
                width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
                background: strokeWidth === w ? `${C.blue}20` : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <div style={{ width: Math.min(w * 2 + 2, 16), height: Math.min(w * 2 + 2, 16), borderRadius: "50%", background: strokeWidth === w ? C.blue : C.dim }} />
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: C.border, margin: "0 4px" }} />

        {/* Fill style */}
        <div style={{ display: "flex", gap: 2 }}>
          {FILL_STYLES.map(f => (
            <button key={f} onClick={() => setFillStyle(f)}
              style={{
                padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 10, fontWeight: 600,
                background: fillStyle === f ? `${C.purple}20` : "transparent",
                color: fillStyle === f ? C.purple : C.dim,
              }}>
              {f === "none" ? "Sem" : f === "solid" ? "Sólido" : "Hachura"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <Btn vr="ghost" onClick={undo} style={{ padding: "5px 8px", fontSize: 12 }} disabled={historyIdx <= 0}>↩</Btn>
        <Btn vr="ghost" onClick={redo} style={{ padding: "5px 8px", fontSize: 12 }} disabled={historyIdx >= history.length - 1}>↪</Btn>
        <Btn vr="ghost" onClick={clearCanvas} style={{ padding: "5px 8px", fontSize: 11 }}>Limpar</Btn>
        <Btn vr="ghost" onClick={exportPng} style={{ padding: "5px 8px", fontSize: 11 }}>Exportar PNG</Btn>

        <div style={{ width: 1, height: 24, background: C.border, margin: "0 4px" }} />

        {/* Board name + save */}
        <input value={boardName} onChange={e => setBoardName(e.target.value)}
          placeholder="Nome do quadro..."
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", color: C.text, fontSize: 12, width: 160, outline: "none" }} />
        <Btn onClick={saveBoard} style={{ padding: "6px 14px", fontSize: 12 }}>Salvar</Btn>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, position: "relative", cursor: isPanning ? "grab" : tool === "draw" ? "crosshair" : tool === "eraser" ? "cell" : tool === "text" ? "text" : tool === "select" ? "default" : "crosshair", overflow: "hidden" }}>
        <canvas ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          style={{ display: "block", width: "100%", height: "100%", background: C.bg }}
        />

        {/* Text input overlay */}
        {textInput && (
          <div style={{ position: "absolute", left: textInput.x * zoom + panOffset.x, top: textInput.y * zoom + panOffset.y - fontSize, zIndex: 20 }}>
            <input autoFocus value={textInput.value}
              onChange={e => setTextInput(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") confirmText(); if (e.key === "Escape") setTextInput(null); }}
              onBlur={confirmText}
              style={{
                background: "rgba(0,0,0,0.7)", border: `1px solid ${C.blue}`, borderRadius: 4,
                padding: "4px 8px", color: color, fontSize: fontSize, fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: "none", minWidth: 120,
              }} />
          </div>
        )}

        {/* Zoom indicator */}
        <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: C.bgCard, color: C.muted, cursor: "pointer", fontSize: 14 }}>−</button>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: C.dim, minWidth: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(prev => Math.min(5, prev * 1.2))} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: C.bgCard, color: C.muted, cursor: "pointer", fontSize: 14 }}>+</button>
          <button onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bgCard, color: C.dim, cursor: "pointer", fontSize: 10 }}>Reset</button>
        </div>

        {/* Element count */}
        <div style={{ position: "absolute", bottom: 12, left: 12, fontFamily: "var(--mono)", fontSize: 10, color: C.dim }}>
          {elements.length} elementos {selectedId ? "· 1 selecionado" : ""}
        </div>
      </div>
    </div>
  );
}
