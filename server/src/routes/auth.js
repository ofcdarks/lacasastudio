const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const prisma = require("../db/prisma");
const { authenticate, signToken } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const NotifService = require("../services/notifications");

const router = Router();

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(128),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const { email, name, password } = req.validated;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email já cadastrado" });

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, password: hash, avatar: name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() },
    });
    const token = signToken({ id: user.id });

    await NotifService.create(user.id, "success", "Bem-vindo ao LaCasaStudio! 🏠", "/");

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) { next(err); }
});

router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

    const token = signToken({ id: user.id });

    // Check deadlines on login
    NotifService.checkDeadlines(user.id).catch(() => {});

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) { next(err); }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, avatar: true, role: true },
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(user);
  } catch (err) { next(err); }
});

module.exports = router;
