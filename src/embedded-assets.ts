

import { join, dirname } from "path";
import { existsSync } from "fs";

export interface EmbeddedAsset {
  content: string;
  contentType: string;
}


export type EmbeddedAssetsMap = Map<string, EmbeddedAsset>;


export function isStandaloneMode(): boolean {
  
  const expectedPublicPath = join(dirname(__dirname), "public");
  return !existsSync(expectedPublicPath);
}


export async function loadEmbeddedAssets(): Promise<EmbeddedAssetsMap> {
  const assets: EmbeddedAssetsMap = new Map();

  try {
    
    
    const indexHtmlPath = join(__dirname, "../public/index.html");
    const faviconPath = join(__dirname, "../public/favicon.svg");

    const indexHtml = await Bun.file(indexHtmlPath).text();
    const favicon = await Bun.file(faviconPath).text();

    
    assets.set("/", { content: indexHtml, contentType: "text/html; charset=utf-8" });
    assets.set("/index.html", { content: indexHtml, contentType: "text/html; charset=utf-8" });
    assets.set("/favicon.svg", { content: favicon, contentType: "image/svg+xml" });
  } catch (error) {
    
    
    console.warn("Failed to load embedded assets:", error);
  }

  return assets;
}


export function createEmbeddedAssetsMiddleware(assets: EmbeddedAssetsMap) {
  return (
    req: { path: string; method: string },
    res: { setHeader: (key: string, value: string) => void; send: (content: string) => void },
    next: () => void
  ) => {
    
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
