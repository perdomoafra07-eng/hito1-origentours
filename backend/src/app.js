import cors from "cors";
import express from "express";
import { LlmProviderError, LlmTimeoutError } from "./infra/llm/errores.js";
import { logger as loggerPorDefecto } from "./infra/logger.js";
import {
  EsquemaInvalidoError,
  EvidenciaInvalidaError,
  SolicitudInvalidaError,
} from "./modules/extraccion/errores.js";

const ORIGEN_FRONTEND = "http://localhost:5173";

export function createApp({ extraer, logger = loggerPorDefecto }) {
  const app = express();

  app.use(
    cors({
      origin(requestOrigin, callback) {
        if (requestOrigin === ORIGEN_FRONTEND) {
          callback(null, ORIGEN_FRONTEND);
          return;
        }
        callback(null, false);
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/extracciones", async (req, res) => {
    const cuerpo = req.body ?? {};
    try {
      const resultado = await extraer({
        texto: cuerpo.texto,
        canal: cuerpo.canal,
      });
      res.status(200).json(resultado);
    } catch (error) {
      if (error instanceof SolicitudInvalidaError) {
        res.status(400).json({ error: error.message, codigo: error.codigo });
        return;
      }
      if (error instanceof EvidenciaInvalidaError) {
        res.status(422).json({
          error: error.message,
          codigo: error.codigo,
          campos: error.campos,
        });
        return;
      }
      if (error instanceof EsquemaInvalidoError) {
        res.status(422).json({
          error: error.message,
          codigo: error.codigo,
          errores: error.errores,
        });
        return;
      }
      if (
        error instanceof LlmTimeoutError ||
        error instanceof LlmProviderError
      ) {
        logger.error({ codigo: error.codigo }, error.message);
        res.status(502).json({ error: error.message, codigo: error.codigo });
        return;
      }
      logger.error({ codigo: "ERROR_INTERNO" }, "Error interno de extracción");
      res.status(500).json({ error: "Error interno de extracción" });
    }
  });

  app.use((error, _req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400) {
      res.status(400).json({ error: "El cuerpo JSON no es válido" });
      return;
    }
    next(error);
  });

  return app;
}
