/**
 * Settings Management - Fixed version with all required exports
 */

import { query } from "./db.js";
import { env, isProd, isDev, isTest, isServerless } from "./env.js";

// Re-export environment variables
export const {
  NODE_ENV,
  PORT,
  DATABASE_URL,
  SITE_URL,
  APP_SECRET,
  UPLOAD_DIR,
  DEPLOY_TARGET,
  CRON_SECRET,
  ALLOWED_ORIGINS,
  TRUST_PROXY,
} = env;

// Add SITE_NAME export that other files expect
export const SITE_NAME = "Modest Apparel";

// Cache for settings
let settingsCache: Record<string, any> | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 1000 * 60;

export async function getAllSettings(): Promise<Record<string, any>> {
  const now = Date.now();
  if (settingsCache && now - lastCacheUpdate < CACHE_TTL) {
    return settingsCache;
  }
  try {
    const result = await query("SELECT namespace, data FROM settings");
    const settings: Record<string, any> = {};
    for (const row of result) {
      const namespace = String(row.namespace);
      settings[namespace] = row.data;
    }
    settingsCache = settings;
    lastCacheUpdate = now;
    return settings;
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    return {};
  }
}

export async function getSettingsForClient(): Promise<Record<string, any>> {
  const settings = await getAllSettings();
  return settings;
}

export async function getSettings(namespace: string): Promise<any> {
  try {
    const result = await query("SELECT data FROM settings WHERE namespace = $1", [namespace]);
    if (result.length === 0) return {};
    return result[0].data;
  } catch (err) {
    console.error(`Failed to fetch settings for ${namespace}:`, err);
    return {};
  }
}

export async function saveSettings(namespace: string, data: any): Promise<void> {
  await query(
    `INSERT INTO settings (namespace, data, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (namespace) DO UPDATE SET data = $2, updated_at = NOW()`,
    [namespace, JSON.stringify(data)]
  );
  settingsCache = null;
}

export function invalidateSettingsCache(): void {
  settingsCache = null;
  lastCacheUpdate = 0;
}

export const invalidateSettings = invalidateSettingsCache;

// Legacy functions that other files expect
export async function getNamespace(namespace: string): Promise<any> {
  return getSettings(namespace);
}

export async function getPublicSettings(): Promise<any> {
  return getSettingsForClient();
}

export async function ensureDefaults(): Promise<void> {
  // Already done via SQL seeding
}

export async function isMaintenanceMode(): Promise<boolean> {
  const features = await getSettings("features");
  return features?.maintenance_mode === true;
}

export async function getMaintenanceMessage(): Promise<string> {
  const features = await getSettings("features");
  return features?.maintenance_message || "We are making some updates.";
}

// Audit functions - simplified
export async function auditWrite(
  userId: string | null,
  userName: string | null,
  action: string,
  entity: string,
  ip: string,
  before?: unknown,
  after?: unknown
): Promise<void> {
  console.log(`[AUDIT] ${action} on ${entity} by ${userName} (${userId}) from ${ip}`);
}

export const DEFAULT_SETTINGS = {};

export async function featureOn(feature: string): Promise<boolean> {
  const features = await getSettings("features");
  return features?.[feature] === true;
}