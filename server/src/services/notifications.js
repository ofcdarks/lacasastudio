const prisma = require("../db/prisma");

const NotifService = {
  async create(userId, type, message, link = "") {
    return prisma.notification.create({
      data: { userId, type, message, link },
    });
  },

  async videoCreated(userId, videoTitle) {
    return this.create(userId, "success", `Vídeo "${videoTitle}" criado com sucesso`, "/planner");
  },

  async videoStatusChanged(userId, videoTitle, newStatus) {
    const statusLabels = {
      idea: "Ideia", script: "Roteiro", filming: "Gravação",
      editing: "Edição", review: "Revisão", scheduled: "Agendado", published: "Publicado"
    };
    const label = statusLabels[newStatus] || newStatus;
    return this.create(userId, "info", `"${videoTitle}" movido para ${label}`, "/planner");
  },

  async videoPublished(userId, videoTitle) {
    return this.create(userId, "success", `🎉 "${videoTitle}" foi publicado!`, "/planner");
  },

  async deadlineApproaching(userId, videoTitle, date) {
    return this.create(userId, "warning", `⏰ "${videoTitle}" tem deadline em ${date}`, "/planner");
  },

  async metaAchieved(userId, metaTitle) {
    return this.create(userId, "success", `🎯 Meta "${metaTitle}" atingida!`, "/metas");
  },

  async aiGenerated(userId, type) {
    const labels = { seo: "SEO", script: "Roteiro", storyboard: "Storyboard", titles: "Títulos" };
    return this.create(userId, "info", `IA gerou ${labels[type] || type} com sucesso`, "/seo");
  },

  async channelCreated(userId, channelName) {
    return this.create(userId, "success", `Canal "${channelName}" adicionado`, "/");
  },

  // Check deadlines (call via cron or on login)
  async checkDeadlines(userId) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const videos = await prisma.video.findMany({
      where: { userId, date: tomorrowStr, status: { not: "published" } },
    });

    for (const v of videos) {
      const existing = await prisma.notification.findFirst({
        where: { userId, message: { contains: v.title }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
      if (!existing) {
        await this.deadlineApproaching(userId, v.title, v.date);
      }
    }
  },
};

module.exports = NotifService;
