import { CAMPOS_EXTRACCION } from "../../src/modules/extraccion/schema.js";

export const TEXTO_COMPLETO =
  "Hola! Somos una pareja con nuestros dos hijos de 8 y 12 años, queremos ir al Eje Cafetero del 20 al 27 de diciembre de 2026. Salimos desde Bogotá. Nos interesa el café y el avistamiento de aves. Mi hijo menor es celíaco. Tenemos un presupuesto de unos 12 millones.";

export function extraccion(parcial = {}) {
  const datos = {
    tipo_cliente: null,
    tipo_experiencia: null,
    destino: null,
    intereses: [],
    fechas: { inicio: null, fin: null, flexibilidad: null },
    numero_viajeros: { adultos: null, menores: null, edades_menores: [] },
    restricciones: { alimentarias: [], movilidad: [], logisticas: [] },
  };

  const resultado = {
    idioma: parcial.idioma ?? "es",
    datos_extraidos: {
      ...datos,
      ...parcial.datos_extraidos,
      fechas: {
        ...datos.fechas,
        ...parcial.datos_extraidos?.fechas,
      },
      numero_viajeros: {
        ...datos.numero_viajeros,
        ...parcial.datos_extraidos?.numero_viajeros,
      },
      restricciones: {
        ...datos.restricciones,
        ...parcial.datos_extraidos?.restricciones,
      },
      presupuesto_referencia:
        parcial.datos_extraidos?.presupuesto_referencia ?? null,
      ciudad_origen: parcial.datos_extraidos?.ciudad_origen ?? null,
    },
    confianza_por_campo: {
      ...Object.fromEntries(CAMPOS_EXTRACCION.map((campo) => [campo, null])),
      ...parcial.confianza_por_campo,
    },
    evidencia_por_campo: {
      ...Object.fromEntries(CAMPOS_EXTRACCION.map((campo) => [campo, null])),
      ...parcial.evidencia_por_campo,
    },
    campos_faltantes: parcial.campos_faltantes ?? [],
    campos_ambiguos: parcial.campos_ambiguos ?? [],
  };

  if (parcial.canal_origen !== undefined) {
    resultado.canal_origen = parcial.canal_origen;
  }

  return resultado;
}
