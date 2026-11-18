export class SolicitudInvalidaError extends Error {
  constructor(message) {
    super(message);
    this.name = "SolicitudInvalidaError";
    this.codigo = "SOLICITUD_INVALIDA";
  }
}

export class EsquemaInvalidoError extends Error {
  constructor(errores) {
    super("La extracción no cumple el esquema");
    this.name = "EsquemaInvalidoError";
    this.codigo = "ESQUEMA_INVALIDO";
    this.errores = errores;
  }
}

export class EvidenciaInvalidaError extends Error {
  constructor(campos) {
    super("La evidencia no aparece en el texto original");
    this.name = "EvidenciaInvalidaError";
    this.codigo = "EVIDENCIA_INVALIDA";
    this.campos = campos;
  }
}
