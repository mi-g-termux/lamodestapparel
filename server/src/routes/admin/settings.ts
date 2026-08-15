import { Router, type Request, type Response, type NextFunction } from "express";
import { query } from "../../db.js";
import { requireAuth, requirePerm, audit } from "../../security.js";
import { getSettingsForClient, saveSettings } from "../../settings.js";

export const settingsRouter: Router = Router();

// GET /api/admin/settings - Get all settings (namespaced)
settingsRouter.get("/", requireAuth, requirePerm("settings.read"), async (req: Request, res: Response) => {
  try {
    const settings = await getSettingsForClient();
    res.json(settings);
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// GET /api/admin/settings/:namespace - Get specific namespace
settingsRouter.get("/:namespace", requireAuth, requirePerm("settings.read"), async (req: Request, res: Response) => {
  try {
    const { namespace } = req.params;
    const result = await query("SELECT * FROM settings WHERE namespace = $1", [namespace]);

    if (result.length === 0) {
      res.status(404).json({ error: "Setting namespace not found" });
      return;
    }

    res.json(result[0]);
  } catch (err) {
    console.error("Failed to fetch setting:", err);
    res.status(500).json({ error: "Failed to fetch setting" });
  }
});

// PUT /api/admin/settings/:namespace - Update specific namespace
settingsRouter.put("/:namespace", requireAuth, requirePerm("settings.write"), async (req: Request, res: Response) => {
  try {
    const { namespace } = req.params;
    const { data } = req.body;

    if (!data || typeof data !== "object") {
      res.status(400).json({ error: "Invalid data format" });
      return;
    }

    // Get current value for audit
    const current = await query("SELECT data FROM settings WHERE namespace = $1", [namespace]);

    await saveSettings(namespace, data);
    await audit(req, "settings.update", namespace, current[0]?.data, data);

    res.json({ success: true, namespace, data });
  } catch (err) {
    console.error("Failed to update setting:", err);
    res.status(500).json({ error: "Failed to update setting" });
  }
});

// POST /api/admin/settings - Create new namespace
settingsRouter.post("/", requireAuth, requirePerm("settings.write"), async (req: Request, res: Response) => {
  try {
    const { namespace, data } = req.body;

    if (!namespace || !data) {
      res.status(400).json({ error: "namespace and data are required" });
      return;
    }

    await query(
      `INSERT INTO settings (namespace, data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (namespace) DO UPDATE SET data = $2, updated_at = NOW()`,
      [namespace, JSON.stringify(data)]
    );

    await audit(req, "settings.create", namespace, null, data);

    res.status(201).json({ success: true, namespace, data });
  } catch (err) {
    console.error("Failed to create setting:", err);
    res.status(500).json({ error: "Failed to create setting" });
  }
});

// GET /api/admin/settings/namespaces - List all available namespaces
settingsRouter.get("/meta/namespaces", requireAuth, requirePerm("settings.read"), async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT namespace, updated_at,
             jsonb_object_keys(data) as keys
      FROM settings
      ORDER BY namespace
    `);

    const namespaces = result.reduce((acc: Record<string, any>, row: any) => {
      if (!acc[row.namespace]) {
        acc[row.namespace] = { keys: [], updated_at: row.updated_at };
      }
      acc[row.namespace].keys.push(row.keys);
      return acc;
    }, {});

    res.json(namespaces);
  } catch (err) {
    console.error("Failed to fetch namespaces:", err);
    res.status(500).json({ error: "Failed to fetch namespaces" });
  }
});

// BULK UPDATE - Update multiple namespaces at once
settingsRouter.post("/bulk", requireAuth, requirePerm("settings.write"), async (req: Request, res: Response) => {
  try {
    const { settings } = req.body as { settings: Record<string, any> };

    if (!settings || typeof settings !== "object") {
      res.status(400).json({ error: "settings object required" });
      return;
    }

    const results: { namespace: string; success: boolean }[] = [];

    for (const [namespace, data] of Object.entries(settings)) {
      try {
        await saveSettings(namespace, data);
        results.push({ namespace, success: true });
      } catch (e) {
        results.push({ namespace, success: false });
      }
    }

    await audit(req, "settings.bulk_update", "multiple", null, settings);

    res.json({ results });
  } catch (err) {
    console.error("Failed to bulk update settings:", err);
    res.status(500).json({ error: "Failed to bulk update settings" });
  }
});