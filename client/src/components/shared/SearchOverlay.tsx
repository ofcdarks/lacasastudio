import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchApi } from "../../lib/api";
import { C, Badge, ST } from "./UI";

export default function SearchOverlay({ onClose }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const nav = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (q.length < 2) { setResults(null); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchApi.search(q);
        setResults(data);
      } catch { setResults(null); }
      setLoading(false);
    }, 300);
  }, [q]);

  const go = (path) => { nav(path); onClose(); };

  const totalResults = results ? (results.videos?.length || 0) + (results.ideas?.length || 0) + (results.assets?.length || 0) + (results.scripts?.length || 0) : 0;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 99999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", margin: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ color: C.muted }}>🔍</span>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar vídeos, ideias, roteiros, ativos..."
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 15 }} />
          <kbd style={{ fontSize: 10, color: C.dim, background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 4 }}>ESC</kbd>
        </div>

        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {loading && <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>Buscando...</div>}

          {results && !loading && totalResults === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: C.dim }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 13 }}>Nenhum resultado para "{q}"</div>
            </div>
          )}

          {results?.videos?.length > 0 && (
            <div>
              <div style={{ padding: "10px 18px 4px", fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase" }}>Vídeos</div>
              {results.videos.map(v => (
                <div key={`v-${v.id}`} onClick={() => go("/planner")}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <Badge color={v.channel?.color || C.dim} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v.title}</div>
                    <div style={{ fontSize: 11, color: v.channel?.color }}>{v.channel?.name}</div>
                  </div>
                  {ST[v.status] && <Badge text={ST[v.status].l} color={ST[v.status].c} v="tag" />}
                </div>
              ))}
            </div>
          )}

          {results?.ideas?.length > 0 && (
            <div>
              <div style={{ padding: "10px 18px 4px", fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase" }}>Ideias</div>
              {results.ideas.map(i => (
                <div key={`i-${i.id}`} onClick={() => go("/ideas")}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 14 }}>💡</span>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{i.title}</div>
                </div>
              ))}
            </div>
          )}

          {results?.assets?.length > 0 && (
            <div>
              <div style={{ padding: "10px 18px 4px", fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase" }}>Ativos</div>
              {results.assets.map(a => (
                <div key={`a-${a.id}`} onClick={() => go("/ativos")}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 14 }}>📎</span>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                  <Badge text={a.type} color={C.dim} v="tag" />
                </div>
              ))}
            </div>
          )}

          {results?.scripts?.length > 0 && (
            <div>
              <div style={{ padding: "10px 18px 4px", fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase" }}>Roteiros</div>
              {results.scripts.map(s => (
                <div key={`s-${s.id}`} onClick={() => go("/editor")}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 14 }}>📝</span>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.video?.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
