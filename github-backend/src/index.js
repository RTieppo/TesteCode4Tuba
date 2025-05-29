import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import repoRoutes from "./routes/repo.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js"; 
import { errorHandler } from "./middlewares/error.middleware.js";

dotenv.config();
const app = express();

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: "Muitas requisições. Tente novamente em instantes." },
});

// Middlewares globais
app.use(cors());
app.use(helmet());
app.use(express.json({ type: "application/json" }));
app.use(limiter);

// Rotas principais
app.use(authRoutes);
app.use(repoRoutes);
app.use(webhookRoutes);
app.use(favoritesRoutes);

// Rota de status
app.get("/", (req, res) => {
  res.send("API funcionando.");
});

// Middleware global de erros
app.use(errorHandler);

// Inicialização
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
