import "dotenv/config";
import express from "express";
import { loadConfig } from "./config/index.js";
import { logger } from "./infra/logger.js";

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "Backend escuchando");
});
