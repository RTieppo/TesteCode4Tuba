import express from "express";
import axios from "axios";
import { authenticate } from "../middlewares/auth.middleware.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// Buscar repositórios com estrela direto do GitHub
router.get("/github/favorites", authenticate, async (req, res) => {
    const { userId } = req.user;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        const response = await axios.get("https://api.github.com/user/starred", {
            headers: {
                Authorization: `Bearer ${user.token}`,
            },
        });

        const favorites = response.data.map(repo => ({
            githubId: String(repo.id),
            name: repo.name,
            description: repo.description,
            stars: repo.stargazers_count,
            url: repo.html_url,
        }));

        res.json(favorites);
    } catch (err) {
        console.error("Erro ao buscar favoritos do GitHub:", err.response?.data || err.message);
        res.status(500).json({ error: "Erro ao buscar favoritos do GitHub." });
    }
});

export default router;
