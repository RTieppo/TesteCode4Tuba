import express from "express";
import { redirectToGitHub, handleGitHubCallback } from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/auth/github", redirectToGitHub);
router.get("/auth/callback", handleGitHubCallback);

export default router;