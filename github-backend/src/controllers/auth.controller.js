import axios from "axios";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

export const redirectToGitHub = (req, res) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=read:user%20repo`;
    res.redirect(githubAuthUrl);
};

export const handleGitHubCallback = async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: "Código não encontrado." });

    try {
        // Troca o code por um access token
        const tokenRes = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code,
            },
            {
                headers: {
                    Accept: "application/json",
                },
            }
        );

        const accessToken = tokenRes.data.access_token;

        // Busca dados do usuário no GitHub
        const userRes = await axios.get("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const { id: githubId, login: username } = userRes.data;

        // Verifica se já existe no banco
        let user = await prisma.user.findUnique({ where: { githubId: String(githubId) } });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    githubId: String(githubId),
                    username,
                    token: accessToken,
                },
            });
        } else {
            // Atualiza token, caso necessário
            await prisma.user.update({
                where: { githubId: String(githubId) },
                data: { token: accessToken },
            });
        }

        // Gera JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Retorna o token (ou redireciona pro frontend com ele como query param)
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro na autenticação com GitHub." });
    }
};
