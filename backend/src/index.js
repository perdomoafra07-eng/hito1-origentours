import "dotenv/config";
import { createApp } from "./app.js";
import { loadConfig } from "./config/index.js";
import { OpenAiLlmClient } from "./infra/llm/openai-client.js";
import { logger } from "./infra/logger.js";
import { cargarPrompt } from "./modules/extraccion/prompt.js";
import { extraccionSchema } from "./modules/extraccion/schema.js";
import { crearExtractor } from "./modules/extraccion/servicio.js";

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const prompt = cargarPrompt();
const llmClient = new OpenAiLlmClient({
  apiKey: config.OPENAI_API_KEY,
  model: config.LLM_MODEL,
  temperature: config.LLM_TEMPERATURE,
  timeoutMs: config.LLM_TIMEOUT_MS,
  schema: extraccionSchema,
  prompt: prompt.contenido,
});

const app = createApp({
  extraer: crearExtractor({ llmClient, prompt }),
  logger,
});

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "Backend escuchando");
});
