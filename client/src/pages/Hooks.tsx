// @ts-nocheck
import { useState } from "react";
import { chatApi } from "../lib/api";
import { C, Btn, Hdr, Input, Select } from "../components/shared/UI";
import { useToast } from "../components/shared/Toast";
import { useProgress } from "../components/shared/ProgressModal";

const HOOKS_DB = {
  "Pergunta Chocante":[
    "Você sabia que [X] está ERRADO esse tempo todo?","E se eu te disser que [X] nunca existiu?","Por que ninguém fala sobre [X]?","Você ainda acredita em [X]? Tenho más notícias...","Já se perguntou por que [X] acontece? A resposta vai te chocar","O que acontece quando [X]? Ninguém esperava isso","Sabe aquela coisa que todo mundo faz? É ERRADO","Você faria [X] por 1 milhão? A maioria erra","Qual é o maior erro que [profissionais] cometem? Spoiler: você faz","Quer saber o segredo que [experts] não contam?"
  ],
  "Números Impactantes":[
    "97% das pessoas não sabem disso sobre [X]","Em apenas 30 dias, [resultado incrível]","5 coisas sobre [X] que mudaram minha vida","Gastei R$10.000 testando [X] — o resultado...","De 0 a [número grande] em [tempo curto]","1 em cada 3 pessoas faz [X] errado","Testei [X] por 365 dias — aqui o resultado","Os 3 erros que custam [valor] por mês","Em 2024, [X]% das pessoas vão [ação]","10 minutos de [X] = [resultado surpreendente]"
  ],
  "Storytelling":[
    "Tudo começou quando eu [ação inesperada]...","Ninguém acreditou quando eu disse que [X]","O dia que mudou tudo: [evento]","Eu quase desisti de [X], até que...","Essa é a história que ninguém conta sobre [X]","3 anos atrás eu não tinha nada. Hoje...","O erro que quase destruiu [X]","Quando eu descobri [X], não acreditei","Eles disseram que era impossível. Eu provei o contrário","A verdade sobre [X] que aprendi da pior forma"
  ],
  "Urgência/FOMO":[
    "Você tem 24 HORAS antes que [X] mude para sempre","Isso vai desaparecer em breve — aproveite agora","A janela para [X] está FECHANDO","Se você não fizer [X] agora, em 2025 será tarde","Última chance de [X] antes de [consequência]","O que ninguém está falando sobre [X] — ainda","Antes que seja removido: [X]","Acabou de sair e já está mudando tudo","Em 1 semana isso não existirá mais","Assista ANTES que tirem do ar"
  ],
  "Polêmico":[
    "[Pessoa/coisa famosa] está MENTINDO pra você","A verdade INCÔMODA sobre [X]","Por que [X] é uma FARSA — com provas","Ninguém tem coragem de dizer isso sobre [X]","O lado SOMBRIO de [X] que escondem de você","[Expert] admitiu que [X] é mentira","Desmascarando [X] de uma vez por todas","A maior mentira que te contaram sobre [X]","[X] é um golpe? A verdade nua e crua","O escândalo de [X] que ninguém fala"
  ],
  "Tutorial/Valor":[
    "Como fazer [X] em 5 minutos (método que funciona)","O guia DEFINITIVO de [X] — passo a passo","Faça ISSO e [resultado] em [tempo]","O método que [experts] usam pra [resultado]","[X] do ZERO ao AVANÇADO em 1 vídeo","A forma MAIS FÁCIL de [X] — testado","Copie EXATAMENTE este método de [X]","[X] explicado como se você tivesse 5 anos","O template de [X] que gera [resultado]","3 passos pra [resultado] que REALMENTE funciona"
  ],
  "Comparação":[
    "[X] vs [Y] — qual é REALMENTE melhor?","Testei [X] e [Y] — o resultado SURPREENDEU","[Barato] vs [Caro] — vale a diferença?","[Método antigo] vs [Método novo] — quem vence?","[X] ANTES e DEPOIS de [mudança]","O que [iniciante] vs [expert] faz diferente","[Produto A] destruiu [Produto B] nesse teste","[País A] vs [País B] — onde é melhor pra [X]?","Fiz [X] do jeito ERRADO e do jeito CERTO","[Grátis] vs [Pago] — a verdade sobre [X]"
  ],
  "Mistério/Dark":[
    "O caso MISTERIOSO de [X] que ninguém resolveu","5 coisas PERTURBADORAS sobre [X]","O que REALMENTE aconteceu com [X]?","A história PROIBIDA de [X]","Arquivos SECRETOS revelam [X]","O lugar mais PERIGOSO de [X]","A conspiração de [X] — fatos reais","Descobertas que a CIÊNCIA não explica","O vídeo que o YouTube não quer que você veja","A verdade SOMBRIA por trás de [X]"
  ],
  "Revelação":[
    "FINALMENTE descobri por que [X]","O segredo que [celebridade] revelou sobre [X]","REVELADO: o método por trás de [X]","A ciência ACABA DE PROVAR que [X]","Documento VAZADO mostra [X]","Depois de [tempo], finalmente a resposta sobre [X]","O que [expert] NÃO QUER que você saiba","BREAKING: [X] acaba de mudar TUDO","Leaked: o plano secreto por trás de [X]","A resposta que esperávamos sobre [X]"
  ],
  "Emocional":[
    "Isso mudou minha VIDA pra sempre","A lição mais DOLOROSA que aprendi sobre [X]","Chorei quando descobri [X]","De FALIDO a [resultado] — minha história real","O momento que TUDO fez sentido","Se eu soubesse disso ANTES...","A carta que nunca enviei sobre [X]","O que eu diria pro meu EU de 5 anos atrás","A decisão mais DIFÍCIL que já tomei","Perdi TUDO e reconstruí do zero"
  ]
};

const CATEGORIES = Object.keys(HOOKS_DB);
const ALL_HOOKS = Object.entries(HOOKS_DB).flatMap(([cat, hooks]) => hooks.map(h => ({ text: h, category: cat })));

export default function Hooks() {
  const toast = useToast();
  const pg = useProgress();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Todos");
  const [adapted, setAdapted] = useState([]);
  const [niche, setNiche] = useState("");
  const [adapting, setAdapting] = useState(false);

  const filtered = ALL_HOOKS.filter(h => {
    if (cat !== "Todos" && h.category !== cat) return false;
    if (search && !h.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const cp = txt => { try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); toast?.success("Copiado!"); } catch {} };

  const adaptHooks = async () => {
    if (!niche.trim()) { toast?.error("Digite seu nicho"); return; }
    setAdapting(true);
    pg?.start("🧠 Adaptando Hooks", ["Selecionando melhores", "Personalizando pro nicho", "Otimizando CTR"]);
    try {
      const { reply } = await chatApi.send([{ role: "user", content: `Adapte estes 10 hooks virais pro nicho "${niche}". Substitua [X] por termos REAIS do nicho. Retorne APENAS JSON array de 10 strings: ["hook adaptado 1","hook 2",...].
Hooks base: ${ALL_HOOKS.sort(() => Math.random() - 0.5).slice(0, 10).map(h => h.text).join(" | ")}` }]);
      const parsed = JSON.parse(reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      setAdapted(Array.isArray(parsed) ? parsed : []);
      pg?.done();
    } catch (e) { pg?.fail(e.message); toast?.error(e.message); }
    setAdapting(false);
  };

  return (
    <div className="page-enter" role="main" aria-label="Hooks" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Hdr title="Banco de Hooks Virais" sub={`${ALL_HOOKS.length}+ hooks organizados por categoria · IA adapta pro seu nicho`} />

      {/* Adapt section */}
      <div style={{ background: `linear-gradient(135deg,${C.red}08,${C.orange}08)`, borderRadius: 14, border: `1px solid ${C.red}20`, padding: 18, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🧠 IA adapta hooks pro seu nicho</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Seu nicho (ex: finanças, dark, ASMR, culinária)" style={{ flex: 1 }} />
          <Btn onClick={adaptHooks} disabled={adapting}>{adapting ? "⏳" : "🧠 Adaptar 10 Hooks"}</Btn>
        </div>
        {adapted.length > 0 && <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>✅ Hooks adaptados para "{niche}":</div>
          {adapted.map((h, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,.04)", borderRadius: 8, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.red, opacity: .3, minWidth: 20 }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{h}</span>
            <button onClick={() => cp(h)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.blue}30`, background: `${C.blue}08`, color: C.blue, cursor: "pointer", fontSize: 10, flexShrink: 0 }}>📋</button>
          </div>)}
        </div>}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar hook..." style={{ minWidth: 200 }} />
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {["Todos", ...CATEGORIES].map(c => <button key={c} onClick={() => setCat(c)} style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600, background: cat === c ? `${C.red}15` : "rgba(255,255,255,.04)", color: cat === c ? C.red : C.dim }}>{c}</button>)}
        </div>
        <span style={{ fontSize: 10, color: C.dim }}>{filtered.length} hooks</span>
      </div>

      {/* Hooks list */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 8 }}>
        {filtered.map((h, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{h.text}</div>
            <span style={{ fontSize: 9, color: C.dim, background: "rgba(255,255,255,.04)", padding: "1px 6px", borderRadius: 3, marginTop: 4, display: "inline-block" }}>{h.category}</span>
          </div>
          <button onClick={() => cp(h.text)} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 10, flexShrink: 0 }}>📋</button>
        </div>)}
      </div>
    </div>
  );
}
