const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("⏭  Database already seeded, skipping.");
    return;
  }

  console.log("🌱 Seeding database...");

  // User
  const hash = await bcrypt.hash("admin123", 12);
  await prisma.user.create({ data: { email: "admin@lacasa.com", name: "Admin LaCasa", password: hash, avatar: "AL", role: "admin" } });

  // Channels
  const channels = await Promise.all([
    prisma.channel.create({ data: { name: "Tech Brasil", color: "#EF4444", icon: "⚡", subs: "48.2K", videoCount: 87, views: "2.1M", growth: "+12.4%" } }),
    prisma.channel.create({ data: { name: "Dev Life", color: "#A855F7", icon: "💻", subs: "22.8K", videoCount: 34, views: "890K", growth: "+8.7%" } }),
    prisma.channel.create({ data: { name: "Finanças+", color: "#22C55E", icon: "💰", subs: "15.6K", videoCount: 52, views: "1.3M", growth: "+15.2%" } }),
    prisma.channel.create({ data: { name: "Vlogs MK", color: "#EC4899", icon: "🎥", subs: "31.4K", videoCount: 96, views: "4.2M", growth: "+6.1%" } }),
  ]);

  // Videos
  const videos = await Promise.all([
    prisma.video.create({ data: { title: "React 20 - O que mudou?", channelId: channels[0].id, status: "editing", date: "2026-03-20", priority: "alta", duration: "14:00" } }),
    prisma.video.create({ data: { title: "Setup Dev 2026", channelId: channels[1].id, status: "script", date: "2026-03-22", priority: "média", duration: "22:00" } }),
    prisma.video.create({ data: { title: "Investindo em Crypto", channelId: channels[2].id, status: "filming", date: "2026-03-25", priority: "alta", duration: "18:30" } }),
    prisma.video.create({ data: { title: "Vlog: Dia em SP", channelId: channels[3].id, status: "idea", date: "2026-03-28", priority: "baixa", duration: "12:00" } }),
    prisma.video.create({ data: { title: "Top 10 VS Code Extensions", channelId: channels[0].id, status: "scheduled", date: "2026-03-19", priority: "alta", duration: "11:00" } }),
    prisma.video.create({ data: { title: "Clean Code na Prática", channelId: channels[1].id, status: "published", date: "2026-03-15", priority: "média", duration: "25:00" } }),
    prisma.video.create({ data: { title: "ETFs para Iniciantes", channelId: channels[2].id, status: "review", date: "2026-03-21", priority: "alta", duration: "16:00" } }),
    prisma.video.create({ data: { title: "Viagem Minas Gerais", channelId: channels[3].id, status: "editing", date: "2026-03-23", priority: "média", duration: "20:00" } }),
  ]);

  // Scenes for first video
  const sceneData = [
    { type: "intro", title: "Abertura", duration: "0:00-0:15", notes: "Logo animada + música tema", camera: "Close-up", audio: "Música tema", color: "#A855F7" },
    { type: "hook", title: "Gancho", duration: "0:15-0:35", notes: "Pergunta impactante para reter audiência", camera: "Medium shot", audio: "Sound FX", color: "#EF4444" },
    { type: "content", title: "Conteúdo Principal", duration: "0:35-8:00", notes: "Desenvolvimento com B-roll", camera: "Multi-angle", audio: "Narração + BG", color: "#3B82F6" },
    { type: "demo", title: "Demonstração", duration: "8:00-11:00", notes: "Screen recording com zoom", camera: "Screencast", audio: "Narração", color: "#06B6D4" },
    { type: "cta", title: "Call to Action", duration: "11:00-11:30", notes: "Inscreva-se + like + comente", camera: "Close-up", audio: "Narração + FX", color: "#F59E0B" },
    { type: "outro", title: "Encerramento", duration: "11:30-12:00", notes: "End screen com vídeos sugeridos", camera: "Medium shot", audio: "Música tema", color: "#22C55E" },
  ];
  await Promise.all(sceneData.map((s, i) => prisma.scene.create({ data: { ...s, videoId: videos[0].id, order: i } })));

  // Checklists for first video
  const checkItems = ["Thumbnail criada", "Título otimizado SEO", "Descrição completa", "Tags adicionadas", "End screen configurado", "Cards inseridos", "Legendas revisadas", "Comunidade avisada"];
  await Promise.all(checkItems.map((label, i) => prisma.checklist.create({ data: { label, done: i < 2, videoId: videos[0].id } })));

  // Metas
  await prisma.meta.create({ data: { title: "Crescimento Q1", channelId: channels[0].id, items: { create: [
    { label: "Vídeos publicados", current: 5, target: 8, unit: "vídeos" },
    { label: "Inscritos ganhos", current: 3200, target: 5000, unit: "inscritos" },
    { label: "Views totais", current: 98000, target: 150000, unit: "views" },
  ] } } });
  await prisma.meta.create({ data: { title: "Lançamento série", channelId: channels[1].id, items: { create: [
    { label: "Episódios gravados", current: 6, target: 10, unit: "ep." },
    { label: "Views por episódio", current: 3800, target: 5000, unit: "views" },
  ] } } });
  await prisma.meta.create({ data: { title: "Monetização", channelId: channels[2].id, items: { create: [
    { label: "Receita mensal", current: 890, target: 1500, unit: "R$" },
    { label: "Membros canal", current: 87, target: 200, unit: "membros" },
  ] } } });
  await prisma.meta.create({ data: { title: "Metas Gerais", items: { create: [
    { label: "Vídeos totais no mês", current: 11, target: 16, unit: "vídeos" },
    { label: "Horas de conteúdo", current: 7.5, target: 12, unit: "h" },
  ] } } });

  // Team
  await prisma.teamMember.create({ data: { name: "Marcos Silva", role: "admin", email: "marcos@lacasa.com", avatar: "MS", status: "online", tasks: 12, channels: { connect: channels.map(c => ({ id: c.id })) } } });
  await prisma.teamMember.create({ data: { name: "Ana Costa", role: "editor", email: "ana@lacasa.com", avatar: "AC", status: "online", tasks: 8, channels: { connect: [{ id: channels[0].id }, { id: channels[1].id }] } } });
  await prisma.teamMember.create({ data: { name: "Pedro Mendes", role: "designer", email: "pedro@lacasa.com", avatar: "PM", status: "away", tasks: 5, channels: { connect: [{ id: channels[0].id }, { id: channels[2].id }] } } });

  // Assets
  const assetData = [
    { name: "Intro Tech Brasil v3", type: "intro", format: "MP4", size: "12.4 MB", channelId: channels[0].id, tags: "intro,animação" },
    { name: "Thumbnail Template A", type: "thumbnail", format: "PSD", size: "8.2 MB", tags: "template,thumbnail" },
    { name: "Overlay Subscribe", type: "overlay", format: "PNG", size: "340 KB", tags: "overlay,subscribe" },
    { name: "Música Lo-Fi BG", type: "audio", format: "MP3", size: "5.6 MB", tags: "música,background" },
    { name: "Transição Glitch", type: "transition", format: "MOV", size: "3.1 MB", channelId: channels[0].id, tags: "transição,efeito" },
  ];
  await Promise.all(assetData.map(a => prisma.asset.create({ data: a })));

  // Templates
  await prisma.template.create({ data: { name: "Tutorial Técnico", desc: "Template para tutoriais técnicos", episodes: 12, structure: "Intro (15s)|Problema (30s)|Solução (5-8min)|Recap (30s)|CTA (15s)|Outro (15s)", channelId: channels[0].id, color: "#EF4444", tags: "tutorial,tech" } });
  await prisma.template.create({ data: { name: "Série Dev Tips", desc: "Formato curto para dicas rápidas", episodes: 8, structure: "Hook (10s)|Tip do Dia (3-5min)|Exemplo (2min)|Próximo Ep (15s)", channelId: channels[1].id, color: "#A855F7", tags: "série,tips" } });

  // Budget
  await Promise.all([
    prisma.budgetItem.create({ data: { category: "Equipamento", desc: "Microfone Rode NT1", value: 1200, type: "expense", month: "2026-03" } }),
    prisma.budgetItem.create({ data: { category: "Software", desc: "Adobe CC mensal", value: 250, type: "expense", month: "2026-03" } }),
    prisma.budgetItem.create({ data: { category: "YouTube", desc: "AdSense março", value: 890, type: "income", month: "2026-03" } }),
    prisma.budgetItem.create({ data: { category: "Patrocínio", desc: "NordVPN", value: 2500, type: "income", month: "2026-03" } }),
  ]);

  // Notifications
  await Promise.all([
    prisma.notification.create({ data: { type: "deadline", message: "Top 10 VS Code Extensions — publica amanhã!" } }),
    prisma.notification.create({ data: { type: "deadline", message: "React 20 — prazo de edição em 2 dias" } }),
    prisma.notification.create({ data: { type: "team", message: "Ana Costa finalizou edição de 'Viagem MG'" } }),
    prisma.notification.create({ data: { type: "meta", message: "Meta de inscritos Tech Brasil: 64% concluída", read: true } }),
  ]);

  console.log("✅ Database seeded successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
