import { Router } from "express";
import { query } from "../../db.js";
import { requireAuth, requirePerm, audit } from "../../security.js";
export const designTokensRouter = Router();
// GET /api/admin/design-tokens - Get all design tokens
designTokensRouter.get("/", requireAuth, requirePerm("settings.read"), async (_req, res) => {
    try {
        const result = await query("SELECT * FROM design_tokens ORDER BY namespace");
        res.json(result);
    }
    catch (err) {
        console.error("Failed to fetch design tokens:", err);
        res.status(500).json({ error: "Failed to fetch design tokens" });
    }
});
// GET /api/admin/design-tokens/:namespace - Get specific token namespace
designTokensRouter.get("/:namespace", requireAuth, requirePerm("settings.read"), async (req, res) => {
    try {
        const { namespace } = req.params;
        const result = await query("SELECT * FROM design_tokens WHERE namespace = $1", [namespace]);
        if (result.length === 0) {
            res.status(404).json({ error: "Design token namespace not found" });
            return;
        }
        res.json(result[0]);
    }
    catch (err) {
        console.error("Failed to fetch design token:", err);
        res.status(500).json({ error: "Failed to fetch design token" });
    }
});
// PUT /api/admin/design-tokens/:namespace - Update design tokens
designTokensRouter.put("/:namespace", requireAuth, requirePerm("settings.write"), async (req, res) => {
    try {
        const { namespace } = req.params;
        const { tokens } = req.body;
        if (!tokens || typeof tokens !== "object") {
            res.status(400).json({ error: "tokens object required" });
            return;
        }
        // Get current for audit
        const current = await query("SELECT tokens FROM design_tokens WHERE namespace = $1", [namespace]);
        await query(`INSERT INTO design_tokens (namespace, tokens, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (namespace) DO UPDATE SET tokens = $2, updated_at = NOW()`, [namespace, JSON.stringify(tokens)]);
        await audit(req, "design_tokens.update", namespace, current[0]?.tokens, tokens);
        res.json({ success: true, namespace, tokens });
    }
    catch (err) {
        console.error("Failed to update design tokens:", err);
        res.status(500).json({ error: "Failed to update design tokens" });
    }
});
// GET /api/admin/design-tokens/css/variables - Get as CSS custom properties
designTokensRouter.get("/css/variables", async (_req, res) => {
    try {
        const result = await query("SELECT namespace, tokens FROM design_tokens");
        const cssVars = [];
        for (const row of result) {
            const tokens = row.tokens;
            for (const [key, value] of Object.entries(tokens)) {
                cssVars.push(`--${row.namespace}-${key}: ${value};`);
            }
        }
        res.setHeader("Content-Type", "text/css");
        res.send(`:root {\n  ${cssVars.join("\n  ")}\n}`);
    }
    catch (err) {
        console.error("Failed to generate CSS:", err);
        res.status(500).json({ error: "Failed to generate CSS" });
    }
});
// Public endpoint for storefront to get theme tokens
designTokensRouter.get("/public/theme", async (_req, res) => {
    try {
        const result = await query("SELECT namespace, tokens FROM design_tokens");
        res.json(result);
    }
    catch (err) {
        console.error("Failed to fetch public tokens:", err);
        res.status(500).json({ error: "Failed to fetch theme" });
    }
});
//# sourceMappingURL=design-tokens.js.map