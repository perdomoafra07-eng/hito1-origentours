import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIRECTORIO = dirname(fileURLToPath(import.meta.url));

export const VERSION_PROMPT = "extraccion-v1.1";

export function cargarPrompt(version = VERSION_PROMPT) {
  const ruta = join(DIRECTORIO, "prompts", `${version}.md`);
  const contenido = readFileSync(ruta, "utf8");
  return { version, contenido };
}
