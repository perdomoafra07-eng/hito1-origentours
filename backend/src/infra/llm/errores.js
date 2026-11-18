export class LlmTimeoutError extends Error {
  constructor() {
    super("El modelo superó el tiempo de espera");
    this.name = "LlmTimeoutError";
    this.codigo = "LLM_TIMEOUT";
  }
}

export class LlmProviderError extends Error {
  constructor() {
    super("El proveedor del modelo no pudo completar la extracción");
    this.name = "LlmProviderError";
    this.codigo = "LLM_ERROR";
  }
}
