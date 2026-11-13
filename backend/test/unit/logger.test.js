import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/infra/logger.js";

describe("logger", () => {
  it("no muestra la clave del LLM ni el encabezado authorization", () => {
    const secret = "sk-live-secret-do-not-print";
    const lines = [];
    const logger = createLogger({
      write(chunk) {
        lines.push(chunk.toString());
      },
    });

    logger.info(
      {
        apiKey: secret,
        OPENAI_API_KEY: secret,
        req: {
          headers: {
            authorization: `Bearer ${secret}`,
          },
        },
      },
      "llamada al modelo",
    );

    const output = lines.join("");
    expect(output).toContain("llamada al modelo");
    expect(output).toContain("[Redacted]");
    expect(output).not.toContain(secret);
  });
});
