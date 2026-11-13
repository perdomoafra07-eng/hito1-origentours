import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/index.js";

const validEnv = {
  OPENAI_API_KEY: "sk-test",
  DATABASE_URL: "postgres://origentours:origentours@localhost:5432/origentours",
  LLM_MODEL: "gpt-4o-mini",
  LLM_TIMEOUT_MS: "30000",
  LLM_TEMPERATURE: "0.2",
};

const required = [
  "OPENAI_API_KEY",
  "DATABASE_URL",
  "LLM_MODEL",
  "LLM_TIMEOUT_MS",
  "LLM_TEMPERATURE",
];

describe("loadConfig", () => {
  it("acepta un entorno completo y usa el puerto por defecto", () => {
    const config = loadConfig(validEnv);

    expect(config.OPENAI_API_KEY).toBe("sk-test");
    expect(config.LLM_MODEL).toBe("gpt-4o-mini");
    expect(config.LLM_TIMEOUT_MS).toBe(30000);
    expect(config.LLM_TEMPERATURE).toBe(0.2);
    expect(config.PORT).toBe(3001);
  });

  it.each(required)("falla con un mensaje claro si falta %s", (name) => {
    const env = { ...validEnv };
    delete env[name];

    expect(() => loadConfig(env)).toThrow(
      new RegExp(
        `Configuración de entorno inválida[\\s\\S]*${name}: es obligatoria`,
      ),
    );
  });
});
