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


router.get("/repos", async (req, res) => {
    const { user, page = 1, sort = "desc" } = req.query;

    if (!user) {
        return res.status(400).json({ error: "Parâmetro 'user' é obrigatório." });
    }

    const perPage = 10;
    const pageInt = parseInt(page, 10);
    const offset = (pageInt - 1) * perPage;
    const sortOrder = sort === "asc" ? "asc" : "desc";

    try {
        // 1. Verifica se temos repositórios salvos para esse user
        const reposFromDb = await prisma.repository.findMany({
            where: {
                url: { contains: `github.com/${user}/` },
            },
            orderBy: {
                stars: sortOrder,
            },
            skip: offset,
            take: perPage,
        });

        // 2. Se tiver, retorna do banco
        if (reposFromDb.length > 0) {
            return res.json(reposFromDb);
        }

        // 3. Se não, busca do GitHub
        const response = await axios.get(`https://api.github.com/users/${user}/repos`, {
            params: {
                per_page: 100, // traz tudo de uma vez para salvar local
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

        // 4. Salva no banco se ainda não existir
        for (const repo of allRepos) {
            const exists = await prisma.repository.findUnique({
                where: { githubId: repo.githubId },
            });

            if (!exists) {
                await prisma.repository.create({
                    data: repo,
                });
            }
        }

        // 5. Retorna os itens paginados da lista total
        const paginated = allRepos
            .sort((a, b) =>
                sortOrder === "asc" ? a.stars - b.stars : b.stars - a.stars
            )
            .slice(offset, offset + perPage);

        res.json(paginated);
    } catch (err) {
        console.error(err.response?.data || err.message);

        if (err.response?.status === 404) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        console.error("Erro completo:", err);
        console.error("Resposta do GitHub:", err.response?.data || err.message);
        res.status(500).json({ error: "Erro ao buscar repositórios do GitHub." });
    }
});

router.post("/repos", authenticate, async (req, res) => {
    const { userId } = req.user;
    const { name, description = "", privateRepo = false } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Nome do repositório é obrigatório." });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        const response = await axios.post(
            "https://api.github.com/user/repos",
            {
                name,
                description,
                private: privateRepo,
            },
            {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            }
        );

        const repo = response.data;

        res.status(201).json({
            message: "Repositório criado com sucesso.",
            url: repo.html_url,
        });
    } catch (err) {
        console.error("Erro ao criar repositório:", err.response?.data || err.message);
        res.status(500).json({ error: "Erro ao criar repositório no GitHub." });
    }
});

router.delete("/repos/favorite/:githubId", authenticate, async (req, res) => {
    const userId = req.user.userId;
    const { githubId } = req.params;

    try {
        // Busca o repositório pelo githubId
        const repository = await prisma.repository.findUnique({
            where: { githubId },
        });

        if (!repository) {
            return res.status(404).json({ error: "Repositório não encontrado no banco." });
        }

        // Remove o favorito do usuário
        const deleted = await prisma.favorite.deleteMany({
            where: {
                userId,
                repositoryId: repository.id,
            },
        });

        if (deleted.count === 0) {
            return res.status(404).json({ error: "Esse repositório não está nos seus favoritos." });
        }

        res.json({ message: "Favorito removido com sucesso." });
    } catch (err) {
        console.error("Erro ao remover favorito:", err.message);
        res.status(500).json({ error: "Erro ao remover favorito." });
    }
});



router.delete("/repos/:repo", authenticate, async (req, res) => {
    const { repo } = req.params;
    const { userId } = req.user;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        const userInfo = await axios.get("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${user.token}`,
            },
        });

        const owner = userInfo.data.login;

        await axios.delete(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                Authorization: `Bearer ${user.token}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        res.json({ message: `Repositório '${owner}/${repo}' deletado com sucesso.` });
    } catch (err) {
        console.error("Erro ao deletar repositório:", err.response?.data || err.message);

        if (err.response?.status === 404) {
            return res.status(404).json({ error: "Repositório não encontrado ou você não tem permissão." });
        }

        res.status(500).json({ error: "Erro ao deletar repositório no GitHub." });
    }
});




export default router;
