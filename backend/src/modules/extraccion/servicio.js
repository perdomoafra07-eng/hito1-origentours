import { canalValido } from "./canales.js";
import {
  EsquemaInvalidoError,
  EvidenciaInvalidaError,
  SolicitudInvalidaError,
} from "./errores.js";
import { LlmProviderError, LlmTimeoutError } from "../../infra/llm/errores.js";
import {
  CAMPOS_EXTRACCION,
  CAMPOS_OBLIGATORIOS,
  UMBRAL_CONFIANZA,
  validarExtraccion,
} from "./schema.js";
import { verificarEvidencias } from "./verificador.js";

function textoONull(valor) {
  if (valor == null) {
    return null;
  }
  if (typeof valor !== "string") {
    return valor;
  }
  const limpio = valor.trim();
  return limpio === "" ? null : limpio;
}

function listaDeTextos(valor) {
  if (!Array.isArray(valor)) {
    return [];
  }
  return valor
    .map((item) => (typeof item === "string" ? item.trim() : item))
    .filter((item) => item !== "");
}

function completarMapa(mapa, comoTexto) {
  const resultado = {};
  for (const campo of CAMPOS_EXTRACCION) {
    const valor = mapa?.[campo];
    if (valor === undefined) {
      resultado[campo] = null;
      continue;
    }
    resultado[campo] = comoTexto ? textoONull(valor) : valor;
  }
  return resultado;
}

function normalizarContenido(contenido) {
  const datos = contenido.datos_extraidos ?? {};
  const fechas = datos.fechas ?? {};
  const viajeros = datos.numero_viajeros ?? {};
  const restricciones = datos.restricciones ?? {};

  return {
    idioma: textoONull(contenido.idioma),
    datos_extraidos: {
      tipo_cliente: textoONull(datos.tipo_cliente),
      tipo_experiencia: textoONull(datos.tipo_experiencia),
      destino: textoONull(datos.destino),
      intereses: listaDeTextos(datos.intereses),
      fechas: {
        inicio: textoONull(fechas.inicio),
        fin: textoONull(fechas.fin),
        flexibilidad: textoONull(fechas.flexibilidad),
      },
      numero_viajeros: {
        adultos: viajeros.adultos ?? null,
        menores: viajeros.menores ?? null,
        edades_menores: Array.isArray(viajeros.edades_menores)
          ? viajeros.edades_menores
          : [],
      },
      restricciones: {
        alimentarias: listaDeTextos(restricciones.alimentarias),
        movilidad: listaDeTextos(restricciones.movilidad),
        logisticas: listaDeTextos(restricciones.logisticas),
      },
      presupuesto_referencia: textoONull(datos.presupuesto_referencia),
      ciudad_origen: textoONull(datos.ciudad_origen),
    },
    confianza_por_campo: completarMapa(contenido.confianza_por_campo, false),
    evidencia_por_campo: completarMapa(contenido.evidencia_por_campo, true),
    campos_faltantes: Array.isArray(contenido.campos_faltantes)
      ? contenido.campos_faltantes
      : [],
    campos_ambiguos: Array.isArray(contenido.campos_ambiguos)
      ? contenido.campos_ambiguos
      : [],
  };
}

export function calcularCamposFaltantes(datos) {
  const faltantes = [];
  if (datos.destino == null) {
    faltantes.push("destino");
  }
  if (datos.fechas?.inicio == null && datos.fechas?.fin == null) {
    faltantes.push("fechas");
  }
  if (
    datos.numero_viajeros?.adultos == null &&
    datos.numero_viajeros?.menores == null
  ) {
    faltantes.push("numero_viajeros");
  }
  if (datos.tipo_experiencia == null) {
    faltantes.push("tipo_experiencia");
  }
  return faltantes.filter((campo) => CAMPOS_OBLIGATORIOS.includes(campo));
}

export function calcularCamposAmbiguos(confianza) {
  return CAMPOS_EXTRACCION.filter((campo) => {
    const valor = confianza?.[campo];
    return typeof valor === "number" && valor < UMBRAL_CONFIANZA;
  });
}

export async function extraerSolicitud({ texto, canal, llmClient, prompt }) {
  if (typeof texto !== "string" || texto.trim() === "") {
    throw new SolicitudInvalidaError("El campo texto es obligatorio");
  }
  if (!canalValido(canal)) {
    throw new SolicitudInvalidaError(
      "El canal no pertenece al catálogo: formulario_web, correo, whatsapp, redes_sociales",
    );
  }

  let respuesta;
  try {
    respuesta = await llmClient.extract(texto);
  } catch (error) {
    if (error instanceof LlmTimeoutError || error instanceof LlmProviderError) {
      throw error;
    }
    throw new LlmProviderError();
  }

  const crudo = respuesta?.contenido;
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) {
    throw new EsquemaInvalidoError(["/ debe ser un objeto"]);
  }

  const contenido = normalizarContenido(structuredClone(crudo));
  delete contenido.canal;
  delete contenido.canal_origen;

  const validacion = validarExtraccion(contenido);
  if (!validacion.valido) {
    throw new EsquemaInvalidoError(validacion.errores);
  }

  const verificacion = verificarEvidencias(texto, contenido);
  if (!verificacion.valido) {
    throw new EvidenciaInvalidaError(verificacion.camposInvalidos);
  }

  return {
    canal,
    idioma: contenido.idioma,
    datos_extraidos: contenido.datos_extraidos,
    confianza_por_campo: contenido.confianza_por_campo,
    evidencia_por_campo: contenido.evidencia_por_campo,
    campos_faltantes: calcularCamposFaltantes(contenido.datos_extraidos),
    campos_ambiguos: calcularCamposAmbiguos(contenido.confianza_por_campo),
    version_prompt: prompt.version,
    modelo: respuesta.modelo,
    tiempo_ms: respuesta.latenciaMs,
    tokens: {
      entrada: respuesta.uso?.prompt_tokens ?? 0,
      salida: respuesta.uso?.completion_tokens ?? 0,
      total: respuesta.uso?.total_tokens ?? 0,
    },
  };
}

export function crearExtractor({ llmClient, prompt }) {
  return (entrada) => extraerSolicitud({ ...entrada, llmClient, prompt });
}
