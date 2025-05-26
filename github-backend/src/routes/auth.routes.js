import express from "express";
import axios from "axios";
import { redirectToGitHub, handleGitHubCallback } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/auth/github", redirectToGitHub);

router.get("/auth/callback", handleGitHubCallback);

router.get("/repos/favorites", authenticate, async (req, res) => {
    const userId = req.user.userId;

    try {
        const favorites = await prisma.favorite.findMany({
            where: { userId },
            include: { repository: true },
        });

        const repos = favorites.map(fav => fav.repository);
        res.json(repos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao buscar favoritos." });
    }
});

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
        console.error(err);
        res.status(500).json({ error: "Erro ao buscar favoritos do GitHub." });
    }
});

router.post("/repos/favorite", authenticate, async (req, res) => {
    const userId = req.user.userId;
    const { githubId, name, description, stars, url } = req.body;

    if (!githubId || !name || !url) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    try {
        let repository = await prisma.repository.findUnique({
            where: { githubId },
        });

        if (!repository) {
            repository = await prisma.repository.create({
                data: {
                    githubId,
                    name,
                    description,
                    stars,
                    url,
                },
            });
        }

        const alreadyFavorited = await prisma.favorite.findFirst({
            where: {
                userId,
                repositoryId: repository.id,
            },
        });

        if (alreadyFavorited) {
            return res.status(400).json({ error: "Repositório já favoritado." });
        }

        await prisma.favorite.create({
            data: {
                userId,
                repositoryId: repository.id,
            },
        });

        res.status(201).json({ message: "Favorito adicionado com sucesso." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao favoritar repositório." });
    }
});

export default router;