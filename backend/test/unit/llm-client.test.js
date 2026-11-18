import { describe, expect, it } from "vitest";
import { FakeLlmClient } from "../../src/infra/llm/fake-client.js";
import {
  LlmProviderError,
  LlmTimeoutError,
} from "../../src/infra/llm/errores.js";
import { OpenAiLlmClient } from "../../src/infra/llm/openai-client.js";
import { extraccionSchema } from "../../src/modules/extraccion/schema.js";

const CLAVE = "sk-live-secret-do-not-print";

function clienteCon(create) {
  return new OpenAiLlmClient({
    apiKey: CLAVE,
    model: "gpt-4o-mini",
    temperature: 0,
    timeoutMs: 30,
    schema: extraccionSchema,
    prompt: "extrae",
    openaiClient: { chat: { completions: { create } } },
  });
}

describe("OpenAiLlmClient", () => {
  it("pide json_schema strict con el modelo y la temperatura de la config", async () => {
    let enviado;
    const cliente = clienteCon(async (body) => {
      enviado = body;
      return {
        model: body.model,
        choices: [{ message: { content: JSON.stringify({ idioma: "es" }) } }],
        usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
      };
    });

    const resultado = await cliente.extract("texto de prueba");

    expect(enviado.model).toBe("gpt-4o-mini");
    expect(enviado.temperature).toBe(0);
    expect(enviado.response_format.json_schema.strict).toBe(true);
    expect(enviado.response_format.json_schema.schema).toBe(extraccionSchema);
    expect(enviado.messages[1].content).toBe("texto de prueba");
    expect(JSON.stringify(enviado)).not.toContain(CLAVE);
    expect(resultado.contenido).toEqual({ idioma: "es" });
    expect(resultado.uso.total_tokens).toBe(7);
  });

  it("traduce un timeout a LlmTimeoutError sin revelar la clave", async () => {
    const cliente = clienteCon(
      (_body, opciones) =>
        new Promise((_resolve, reject) => {
          opciones.signal.addEventListener("abort", () => {
            const error = new Error(`timeout con ${CLAVE}`);
            error.name = "AbortError";
            reject(error);
          });
        }),
    );

    await expect(cliente.extract("hola")).rejects.toBeInstanceOf(
      LlmTimeoutError,
    );
    await expect(cliente.extract("hola")).rejects.not.toThrow(CLAVE);
  });

  it("traduce un error del proveedor sin copiar la clave al mensaje", async () => {
    const cliente = clienteCon(async () => {
      throw new Error(`Incorrect API key ${CLAVE}`);
    });

    await expect(cliente.extract("hola")).rejects.toBeInstanceOf(
      LlmProviderError,
    );
    await expect(cliente.extract("hola")).rejects.not.toThrow(CLAVE);
  });
});

describe("FakeLlmClient", () => {
  it("registra una llamada por extract y no sale a la red", async () => {
    const fake = new FakeLlmClient({ idioma: "es" });
    const resultado = await fake.extract("solicitud");

    expect(fake.llamadas).toEqual(["solicitud"]);
    expect(resultado.modelo).toBe("fake-model");
    expect(resultado.contenido).toEqual({ idioma: "es" });
    resultado.contenido.idioma = "en";
    expect(fake.contenido.idioma).toBe("es");
  });
});
