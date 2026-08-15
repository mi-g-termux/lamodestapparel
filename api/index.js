/**
 * Vercel serverless entry point.
 *
 * Vercel imports this file for every /api/* request and hands the Express app
 * the raw request. The same app object also runs standalone on cPanel.
 */
import app, { boot } from "../server/dist/index.js";

export default async function handler(req, res) {
  await boot();
  return app(req, res);
}
