/**
 * Contrato del cliente de extracción.
 * `extract` recibe solo el texto. El prompt, el esquema y la clave
 * se entregan al construir la implementación, nunca se registran en logs.
 *
 * @typedef {Object} UsoTokens
 * @property {number} prompt_tokens
 * @property {number} completion_tokens
 * @property {number} total_tokens
 *
 * @typedef {Object} ResultadoLlm
 * @property {object} contenido
 * @property {string} modelo
 * @property {UsoTokens} uso
 * @property {number} latenciaMs
 */

export class LlmClient {
  /**
   * @param {string} _texto
   * @returns {Promise<ResultadoLlm>}
   */
  async extract(_texto) {
    throw new Error("LlmClient.extract no está implementado");
  }
}
