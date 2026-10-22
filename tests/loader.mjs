import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const subpath = specifier.slice(2);
    const basePath = path.resolve(process.cwd(), "src", subpath);
    let resolvedPath = basePath;
    if (fs.existsSync(basePath + ".ts")) {
      resolvedPath = basePath + ".ts";
    } else if (fs.existsSync(basePath + ".tsx")) {
      resolvedPath = basePath + ".tsx";
    } else if (fs.existsSync(path.join(basePath, "index.ts"))) {
      resolvedPath = path.join(basePath, "index.ts");
    }
    return nextResolve(pathToFileURL(resolvedPath).href, context);
  }
  return nextResolve(specifier, context);
}
