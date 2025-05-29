import { Router } from "express";
const router = Router();

router.post("/webhook/github", async (req, res) => {
    const event = req.headers["x-github-event"];
    const signature = req.headers["x-hub-signature-256"];

    console.log("📥 Webhook recebido:", event);

    if (event === "repository") {
        const payload = req.body;

        if (payload.action === "created") {
            const repo = payload.repository;

            try {
                const githubId = String(repo.id);

                const exists = await prisma.repository.findUnique({ where: { githubId } });

                if (!exists) {
                    await prisma.repository.create({
                        data: {
                            githubId,
                            name: repo.name,
                            description: repo.description,
                            stars: repo.stargazers_count,
                            url: repo.html_url,
                        },
                    });

                    console.log("✅ Novo repositório salvo:", repo.name);
                }
            } catch (err) {
                console.error("Erro ao salvar repositório via webhook:", err.message);
            }
        }
    }

    res.status(200).json({ message: "Webhook processado" });
});

export default router;
