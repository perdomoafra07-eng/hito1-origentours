import { describe, expect, it } from "vitest";
import {
  normalizar,
  verificarEvidencias,
} from "../../src/modules/extraccion/verificador.js";
import { extraccion } from "./extraccion-fixture.js";

describe("normalizar", () => {
  it("ignora mayúsculas, tildes y espacios", () => {
    expect(normalizar("  Eje \n  CAFETERO  ")).toBe("eje cafetero");
    expect(normalizar("Bogotá")).toBe(normalizar("Bogota"));
  });
});

describe("verificarEvidencias", () => {
  it("acepta tildes, puntuación, emojis y fragmentos parciales", () => {
    const texto = "¡Hola! 👋 Queremos ir a Bogotá\n  el  fin de semana.";
    const resultado = verificarEvidencias(
      texto,
      extraccion({
        datos_extraidos: { destino: "Bogotá" },
        confianza_por_campo: { destino: 0.9 },
        evidencia_por_campo: { destino: "ir a Bogota" },
      }),
    );
    expect(resultado.valido).toBe(true);

    const parcial = verificarEvidencias(
      texto,
      extraccion({
        datos_extraidos: { destino: "Bogotá" },
        confianza_por_campo: { destino: 0.9 },
        evidencia_por_campo: { destino: "👋 queremos" },
      }),
    );
    expect(parcial.valido).toBe(true);
  });

  it("no verifica las evidencias null y rechaza un valor sin evidencia", () => {
    const vacio = verificarEvidencias(
      "Sin destino.",
      extraccion({
        datos_extraidos: { destino: null },
        evidencia_por_campo: { destino: null },
      }),
    );
    expect(vacio.valido).toBe(true);

    const sinEvidencia = verificarEvidencias(
      "Queremos ir a Barichara.",
      extraccion({
        datos_extraidos: { destino: "Barichara" },
        confianza_por_campo: { destino: 0.9 },
        evidencia_por_campo: { destino: null },
      }),
    );
    expect(sinEvidencia.valido).toBe(false);
    expect(sinEvidencia.camposInvalidos).toEqual(["destino"]);
  });

  it("rechaza una evidencia que no está en el texto", () => {
    const resultado = verificarEvidencias(
      "Queremos ir a Barichara.",
      extraccion({
        datos_extraidos: { destino: "Barichara" },
        confianza_por_campo: { destino: 0.9 },
        evidencia_por_campo: { destino: "Cartagena de Indias" },
      }),
    );
    expect(resultado.valido).toBe(false);
    expect(resultado.camposInvalidos).toContain("destino");
  });
});
