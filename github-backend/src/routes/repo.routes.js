import express from "express";
import axios from "axios";
import { authenticate } from "../middlewares/auth.middleware.js";
import { PrismaClient } from "@prisma/client";
import redis from "../utils/redis.js";

const prisma = new PrismaClient();
const router = express.Router();

// Buscar repositórios com cache
router.get("/repos", async (req, res) => {
    const { user, page = 1, sort = "desc" } = req.query;

    if (!user) {
        return res.status(400).json({ error: "Parâmetro 'user' é obrigatório." });
    }

    const perPage = 10;
    const offset = (parseInt(page, 10) - 1) * perPage;
    const sortOrder = sort === "asc" ? "asc" : "desc";
    const cacheKey = `repos:${user}:page${page}:sort${sortOrder}`;

    try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));

        const response = await axios.get(`https://api.github.com/users/${user}/repos`, {
            params: {
                per_page: 100,
                sort: "stars",
                direction: sortOrder,
            },
            headers: {
                Accept: "application/vnd.github.v3+json",
            },
        });

        const allRepos = response.data.map(repo => ({
            githubId: String(repo.id),
            name: repo.name,
            description: repo.description,
            stars: repo.stargazers_count,
            url: repo.html_url,
        }));

        for (const repo of allRepos) {
            const exists = await prisma.repository.findUnique({
                where: { githubId: repo.githubId },
            });
            if (!exists) await prisma.repository.create({ data: repo });
        }

        const paginated = allRepos
            .sort((a, b) => (sortOrder === "asc" ? a.stars - b.stars : b.stars - a.stars))
            .slice(offset, offset + perPage);

        await redis.set(cacheKey, JSON.stringify(paginated), "EX", 600);
        res.json(paginated);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "Erro ao buscar repositórios." });
    }
});

// Criar repositório no GitHub
router.post("/repos", authenticate, async (req, res) => {
    const { userId } = req.user;
    const { name, description = "", privateRepo = false } = req.body;

    if (!name) return res.status(400).json({ error: "Nome do repositório é obrigatório." });

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        const response = await axios.post(
            "https://api.github.com/user/repos",
            { name, description, private: privateRepo },
            {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            }
        );

        res.status(201).json({
            message: "Repositório criado com sucesso.",
            url: response.data.html_url,
        });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "Erro ao criar repositório." });
    }
});

// Adicionar favorito
router.post("/repos/favorite", authenticate, async (req, res) => {
    const userId = req.user.userId;
    const { githubId, name, description, stars, url } = req.body;

    if (!githubId || !name || !url) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    try {
        let repository = await prisma.repository.findUnique({ where: { githubId } });

        if (!repository) {
            repository = await prisma.repository.create({
                data: { githubId, name, description, stars, url },
            });
        }

        const alreadyFavorited = await prisma.favorite.findFirst({
            where: { userId, repositoryId: repository.id },
        });

        if (alreadyFavorited) {
            return res.status(400).json({ error: "Repositório já favoritado." });
        }

        await prisma.favorite.create({ data: { userId, repositoryId: repository.id } });
        res.status(201).json({ message: "Favorito adicionado com sucesso." });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Erro ao favoritar repositório." });
    }
});

// Listar favoritos do usuário
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

// Remover favorito
router.delete("/repos/favorite/:githubId", authenticate, async (req, res) => {
    const userId = req.user.userId;
    const { githubId } = req.params;

    try {
        const repository = await prisma.repository.findUnique({ where: { githubId } });
        if (!repository) {
            return res.status(404).json({ error: "Repositório não encontrado." });
        }

        const deleted = await prisma.favorite.deleteMany({
            where: { userId, repositoryId: repository.id },
        });

        if (deleted.count === 0) {
            return res.status(404).json({ error: "Esse repositório não está nos seus favoritos." });
        }

        res.json({ message: "Favorito removido com sucesso." });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Erro ao remover favorito." });
    }
});

export default router;
