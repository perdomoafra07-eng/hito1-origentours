import { describe, expect, it } from "vitest";
import {
  extraccionSchema,
  validarExtraccion,
} from "../../src/modules/extraccion/schema.js";
import { extraccion, TEXTO_COMPLETO } from "./extraccion-fixture.js";

function objetos(nodo, encontrados = []) {
  if (!nodo || typeof nodo !== "object") {
    return encontrados;
  }
  if (nodo.type === "object" && nodo.properties) {
    encontrados.push(nodo);
    for (const hijo of Object.values(nodo.properties)) {
      objetos(hijo, encontrados);
    }
  }
  if (nodo.type === "array" && nodo.items) {
    objetos(nodo.items, encontrados);
  }
  return encontrados;
}

const ejemploCompleto = extraccion({
  datos_extraidos: {
    tipo_cliente: "grupo",
    tipo_experiencia: "cultura cafetera y avistamiento de aves",
    destino: "Eje Cafetero",
    intereses: ["café", "avistamiento de aves"],
    fechas: { inicio: "2026-12-20", fin: "2026-12-27", flexibilidad: null },
    numero_viajeros: { adultos: 2, menores: 2, edades_menores: [8, 12] },
    restricciones: { alimentarias: ["celiaquía (hijo menor)"] },
    presupuesto_referencia: "unos 12 millones",
    ciudad_origen: "Bogotá",
  },
  confianza_por_campo: {
    tipo_cliente: 0.66,
    tipo_experiencia: 0.84,
    destino: 0.97,
    intereses: 0.93,
    fechas: 0.95,
    numero_viajeros: 0.8,
    restricciones: 0.9,
    presupuesto_referencia: 0.85,
    ciudad_origen: 0.96,
  },
  evidencia_por_campo: {
    tipo_cliente: "una pareja",
    tipo_experiencia: "el café y el avistamiento de aves",
    destino: "ir al Eje Cafetero",
    intereses: "el café y el avistamiento de aves",
    fechas: "del 20 al 27 de diciembre de 2026",
    numero_viajeros: "dos hijos de 8 y 12 años",
    restricciones: "Mi hijo menor es celíaco",
    presupuesto_referencia: "presupuesto de unos 12 millones",
    ciudad_origen: "desde Bogotá",
  },
});

describe("extraccionSchema", () => {
  it("cumple el modo strict: required completo, nullables y sin propiedades extra", () => {
    for (const objeto of objetos(extraccionSchema)) {
      expect(objeto.additionalProperties).toBe(false);
      expect(new Set(objeto.required)).toEqual(
        new Set(Object.keys(objeto.properties)),
      );
    }

    const datos = extraccionSchema.properties.datos_extraidos.properties;
    expect(datos.tipo_cliente.type).toEqual(["string", "null"]);
    expect(datos.tipo_cliente.enum).toEqual([
      "individual",
      "grupo",
      "grupo_academico",
      "organizacion",
      null,
    ]);
    expect(datos.destino.type).toEqual(["string", "null"]);
    expect(datos.fechas.properties.inicio.type).toEqual(["string", "null"]);
    expect(datos.numero_viajeros.properties.adultos.type).toEqual([
      "integer",
      "null",
    ]);
    expect(extraccionSchema.properties.canal).toBeUndefined();
    expect(extraccionSchema.properties.canal_origen).toBeUndefined();
    expect(TEXTO_COMPLETO).toContain("Eje Cafetero");
  });

  it("acepta la salida completa de la historia", () => {
    expect(validarExtraccion(ejemploCompleto).valido).toBe(true);
  });

  it("rechaza un objeto al que le faltan claves obligatorias", () => {
    const incompleto = { idioma: "es", datos_extraidos: {} };
    expect(validarExtraccion(incompleto).valido).toBe(false);
  });

  it("rechaza un tipo_cliente fuera del enum", () => {
    const invalido = extraccion({
      datos_extraidos: { tipo_cliente: "familia" },
    });
    expect(validarExtraccion(invalido).valido).toBe(false);
  });

  it("rechaza propiedades adicionales y fechas mal formadas", () => {
    const extra = extraccion();
    extra.notas = "esto no pertenece al esquema";
    expect(validarExtraccion(extra).valido).toBe(false);

    const fecha = extraccion({
      datos_extraidos: { fechas: { inicio: "20-12-2026" } },
    });
    expect(validarExtraccion(fecha).valido).toBe(false);
  });
});
