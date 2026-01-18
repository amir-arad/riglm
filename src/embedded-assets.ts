/**
 * Embedded Assets Module
 *
 * This module provides embedded static assets for standalone executable builds.
 * When compiled with `bun build --compile`, these files are bundled into the binary.
 *
 * In development mode, files are read from the filesystem.
 * In standalone mode, the embedded content is used directly.
 */

import { join, dirname } from "path";
import { existsSync } from "fs";

export interface EmbeddedAsset {
  content: string;
  contentType: string;
}

/**
 * Map of URL paths to embedded asset content and MIME types
 */
export type EmbeddedAssetsMap = Map<string, EmbeddedAsset>;

/**
 * Detect if we're running as a standalone executable.
 *
 * In standalone mode, __dirname points to a temporary extraction location
 * and the original public directory won't exist relative to it.
 */
export function isStandaloneMode(): boolean {
  // Check if the public directory exists relative to expected location
  const expectedPublicPath = join(dirname(__dirname), "public");
  return !existsSync(expectedPublicPath);
}

/**
 * Load embedded assets.
 *
 * Files are embedded at compile time when using `bun build --compile`.
 * The paths must be string literals for Bun to embed them.
 */
export async function loadEmbeddedAssets(): Promise<EmbeddedAssetsMap> {
  const assets: EmbeddedAssetsMap = new Map();

  try {
    // Bun embeds files referenced with static string literal paths
    // These paths are relative to THIS file's location (src/)
    const indexHtmlPath = join(__dirname, "../public/index.html");
    const faviconPath = join(__dirname, "../public/favicon.svg");

    const indexHtml = await Bun.file(indexHtmlPath).text();
    const favicon = await Bun.file(faviconPath).text();

    // Map multiple paths to the same content for convenience
    assets.set("/", { content: indexHtml, contentType: "text/html; charset=utf-8" });
    assets.set("/index.html", { content: indexHtml, contentType: "text/html; charset=utf-8" });
    assets.set("/favicon.svg", { content: favicon, contentType: "image/svg+xml" });
  } catch (error) {
    // In development, this may fail if paths don't resolve correctly
    // The server will fall back to express.static() in that case
    console.warn("Failed to load embedded assets:", error);
  }

  return assets;
}

/**
 * Create Express middleware for serving embedded assets.
 *
 * This middleware serves assets from memory, bypassing the filesystem.
 * It should be used in standalone mode where express.static() won't work.
 */
export function createEmbeddedAssetsMiddleware(assets: EmbeddedAssetsMap) {
  return (
    req: { path: string; method: string },
    res: { setHeader: (key: string, value: string) => void; send: (content: string) => void },
    next: () => void
  ) => {
    // Only handle GET requests
    if (req.method !== "GET") {
      return next();
    }

    const asset = assets.get(req.path);
    if (asset) {
      res.setHeader("Content-Type", asset.contentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.send(asset.content);
    }

    next();
  };
}
