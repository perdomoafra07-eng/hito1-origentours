import OpenAI from "openai";
import { LlmClient } from "./cliente.js";
import { LlmProviderError, LlmTimeoutError } from "./errores.js";

const NOMBRE_ESQUEMA = "extraccion_solicitud";

function esTimeout(error, signal) {
  if (signal?.aborted) {
    return true;
  }
  const nombre = String(error?.name ?? "").toLowerCase();
  return (
    nombre.includes("abort") ||
    nombre.includes("timeout") ||
    error?.code === "ETIMEDOUT"
  );
}

export class OpenAiLlmClient extends LlmClient {
  constructor({
    apiKey,
    model,
    temperature,
    timeoutMs,
    schema,
    prompt,
    openaiClient,
  }) {
    super();
    this.model = model;
    this.temperature = temperature;
    this.timeoutMs = timeoutMs;
    this.schema = schema;
    this.prompt = prompt;
    this.client =
      openaiClient ??
      new OpenAI({
        apiKey,
        timeout: timeoutMs,
      });
  }

  async extract(texto) {
    const inicio = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          temperature: this.temperature,
          messages: [
            { role: "system", content: this.prompt },
            { role: "user", content: texto },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: NOMBRE_ESQUEMA,
              strict: true,
              schema: this.schema,
            },
          },
        },
        { signal: controller.signal, timeout: this.timeoutMs },
      );

      const message = response.choices?.[0]?.message;
      if (!message?.content || message.refusal) {
        throw new LlmProviderError();
      }

      const contenido =
        typeof message.content === "string"
          ? JSON.parse(message.content)
          : message.content;

      return {
        contenido,
        modelo: response.model || this.model,
        uso: {
          prompt_tokens: response.usage?.prompt_tokens ?? 0,
          completion_tokens: response.usage?.completion_tokens ?? 0,
          total_tokens: response.usage?.total_tokens ?? 0,
        },
        latenciaMs: Date.now() - inicio,
      };
    } catch (error) {
      if (
        error instanceof LlmTimeoutError ||
        error instanceof LlmProviderError
      ) {
        throw error;
      }
      if (esTimeout(error, controller.signal)) {
        throw new LlmTimeoutError();
      }
      throw new LlmProviderError();
    } finally {
      clearTimeout(timer);
    }
  }
}
