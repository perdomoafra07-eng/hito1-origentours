import { LlmClient } from "./cliente.js";

export class FakeLlmClient extends LlmClient {
  constructor(contenido) {
    super();
    this.contenido = contenido;
    this.llamadas = [];
  }

  async extract(texto) {
    this.llamadas.push(texto);
    const producido =
      typeof this.contenido === "function"
        ? await this.contenido(texto)
        : this.contenido;

    if (producido instanceof Error) {
      throw producido;
    }

    return {
      contenido: structuredClone(producido),
      modelo: "fake-model",
      uso: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
      latenciaMs: 5,
    };
  }
}
