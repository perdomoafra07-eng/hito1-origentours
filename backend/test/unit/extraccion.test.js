import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { FakeLlmClient } from "../../src/infra/llm/fake-client.js";
import {
  cargarPrompt,
  VERSION_PROMPT,
} from "../../src/modules/extraccion/prompt.js";
import { crearExtractor } from "../../src/modules/extraccion/servicio.js";
import { extraccion, TEXTO_COMPLETO } from "./extraccion-fixture.js";

const prompt = cargarPrompt();

function loggerSilencioso() {
  const lineas = [];
  return {
    lineas,
    error(datos, mensaje) {
      lineas.push(`${JSON.stringify(datos)} ${mensaje ?? ""}`);
    },
    info() {},
    warn() {},
  };
}

async function conServidor(contenido, fn) {
  const llm = new FakeLlmClient(contenido);
  const logger = loggerSilencioso();
  const app = createApp({
    extraer: crearExtractor({ llmClient: llm, prompt }),
    logger,
  });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    return await fn({
      base: `http://127.0.0.1:${port}`,
      llm,
      logger,
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function post(base, body) {
  const response = await fetch(`${base}/api/extracciones`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json(), response };
}

const completa = extraccion({
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

describe("POST /api/extracciones", () => {
  it("extrae una solicitud completa en una sola llamada", async () => {
    await conServidor(completa, async ({ base, llm }) => {
      const { status, json } = await post(base, {
        texto: TEXTO_COMPLETO,
        canal: "whatsapp",
      });

      expect(status).toBe(200);
      expect(llm.llamadas).toEqual([TEXTO_COMPLETO]);
      expect(json.canal).toBe("whatsapp");
      expect(json.datos_extraidos.destino).toBe("Eje Cafetero");
      expect(json.datos_extraidos.fechas).toEqual({
        inicio: "2026-12-20",
        fin: "2026-12-27",
        flexibilidad: null,
      });
      expect(json.datos_extraidos.numero_viajeros.edades_menores).toEqual([
        8, 12,
      ]);
      expect(json.confianza_por_campo.destino).toBeGreaterThan(0);
      expect(json.confianza_por_campo.destino).toBeLessThanOrEqual(1);
      expect(TEXTO_COMPLETO).toContain(json.evidencia_por_campo.destino);
      expect(json.campos_faltantes).toEqual([]);
      expect(json.campos_ambiguos).toContain("tipo_cliente");
      expect(json.version_prompt).toBe(VERSION_PROMPT);
      expect(json.modelo).toBe("fake-model");
      expect(json.tiempo_ms).toBe(5);
      expect(json.tokens).toEqual({ entrada: 10, salida: 20, total: 30 });
    });
  });

  it("deja en null lo que el texto no menciona", async () => {
    const texto =
      "Queremos ir al Eje Cafetero del 20 al 27 de diciembre de 2026.";
    const respuesta = extraccion({
      datos_extraidos: {
        destino: "Eje Cafetero",
        fechas: { inicio: "2026-12-20", fin: "2026-12-27" },
      },
      confianza_por_campo: { destino: 0.95, fechas: 0.95 },
      evidencia_por_campo: {
        destino: "ir al Eje Cafetero",
        fechas: "del 20 al 27 de diciembre de 2026",
      },
    });

    await conServidor(respuesta, async ({ base }) => {
      const { status, json } = await post(base, { texto, canal: "correo" });

      expect(status).toBe(200);
      expect(json.datos_extraidos.presupuesto_referencia).toBeNull();
      expect(json.datos_extraidos.ciudad_origen).toBeNull();
      expect(json.confianza_por_campo.presupuesto_referencia).toBeNull();
      expect(json.confianza_por_campo.ciudad_origen).toBeNull();
      expect(json.evidencia_por_campo.presupuesto_referencia).toBeNull();
      expect(json.evidencia_por_campo.ciudad_origen).toBeNull();
    });
  });

  it("guarda Semana Santa en flexibilidad y deja las fechas en null", async () => {
    const texto = "queremos viajar en Semana Santa";
    const respuesta = extraccion({
      datos_extraidos: {
        fechas: { inicio: null, fin: null, flexibilidad: "en Semana Santa" },
      },
      confianza_por_campo: { fechas: 0.9 },
      evidencia_por_campo: { fechas: "en Semana Santa" },
    });

    await conServidor(respuesta, async ({ base }) => {
      const { status, json } = await post(base, {
        texto,
        canal: "correo",
      });

      expect(status).toBe(200);
      expect(json.datos_extraidos.fechas.inicio).toBeNull();
      expect(json.datos_extraidos.fechas.fin).toBeNull();
      expect(json.datos_extraidos.fechas.flexibilidad).toBe("en Semana Santa");
      expect(json.campos_faltantes).toEqual([
        "destino",
        "fechas",
        "numero_viajeros",
        "tipo_experiencia",
      ]);
    });
  });

  it("responde 422 si la evidencia no está en el texto", async () => {
    const respuesta = extraccion({
      datos_extraidos: { destino: "Barichara" },
      confianza_por_campo: { destino: 0.9 },
      evidencia_por_campo: { destino: "Cartagena de Indias" },
    });

    await conServidor(respuesta, async ({ base, llm }) => {
      const { status, json } = await post(base, {
        texto: "Queremos ir a Barichara.",
        canal: "whatsapp",
      });

      expect(status).toBe(422);
      expect(json.codigo).toBe("EVIDENCIA_INVALIDA");
      expect(json.campos).toContain("destino");
      expect(llm.llamadas).toHaveLength(1);
    });
  });

  it("fuerza el canal del sistema e ignora el del modelo", async () => {
    const respuesta = extraccion({
      canal_origen: "whatsapp",
      datos_extraidos: { destino: "Barichara" },
      confianza_por_campo: { destino: 0.95 },
      evidencia_por_campo: { destino: "ir a Barichara" },
    });

    await conServidor(respuesta, async ({ base }) => {
      const { status, json } = await post(base, {
        texto: "Queremos ir a Barichara.",
        canal: "correo",
      });

      expect(status).toBe(200);
      expect(json.canal).toBe("correo");
      expect(json.canal_origen).toBeUndefined();
    });
  });

  it("cuenta los niños y no inventa edades", async () => {
    const texto = "vamos 2 adultos y 3 niños";
    const respuesta = extraccion({
      datos_extraidos: {
        numero_viajeros: { adultos: 2, menores: 3, edades_menores: [] },
      },
      confianza_por_campo: { numero_viajeros: 0.9 },
      evidencia_por_campo: { numero_viajeros: "2 adultos y 3 niños" },
    });

    await conServidor(respuesta, async ({ base, llm }) => {
      const { status, json } = await post(base, {
        texto,
        canal: "formulario_web",
      });

      expect(status).toBe(200);
      expect(json.datos_extraidos.numero_viajeros.menores).toBe(3);
      expect(json.datos_extraidos.numero_viajeros.edades_menores).toEqual([]);
      expect(llm.llamadas).toEqual([texto]);
    });
  });

  it("responde 400 si falta el texto o el canal no es del catálogo", async () => {
    await conServidor(extraccion(), async ({ base, llm }) => {
      const sinTexto = await post(base, { canal: "correo" });
      const canalMal = await post(base, { texto: "Hola", canal: "sms" });

      expect(sinTexto.status).toBe(400);
      expect(canalMal.status).toBe(400);
      expect(llm.llamadas).toHaveLength(0);
    });
  });

  it("responde 502 sin escribir la clave cuando falla el modelo", async () => {
    const secreto = "sk-live-secret-do-not-print";
    await conServidor(
      new Error(`fallo con ${secreto}`),
      async ({ base, logger }) => {
        const { status, json } = await post(base, {
          texto: "Hola, queremos viajar.",
          canal: "whatsapp",
        });

        expect(status).toBe(502);
        expect(JSON.stringify(json)).not.toContain(secreto);
        expect(logger.lineas.join("\n")).not.toContain(secreto);
      },
    );
  });

  it("marca ambiguo un campo con cifras contradictorias y conserva la primera evidencia", async () => {
    const texto =
      "Viajamos 4 adultos a Barichara del 15 al 18 de marzo de 2027, somos 3 personas en total y uno usa silla de ruedas. Queremos talleres de artesanía y comida típica.";
    const respuesta = extraccion({
      datos_extraidos: {
        tipo_cliente: "grupo",
        tipo_experiencia: "talleres de artesanía y comida típica",
        destino: "Barichara",
        intereses: ["artesanía", "comida típica"],
        fechas: { inicio: "2027-03-15", fin: "2027-03-18" },
        numero_viajeros: { adultos: 4, menores: null, edades_menores: [] },
        restricciones: { movilidad: ["silla de ruedas"] },
      },
      confianza_por_campo: {
        tipo_cliente: 0.8,
        tipo_experiencia: 0.9,
        destino: 0.97,
        intereses: 0.9,
        fechas: 0.95,
        numero_viajeros: 0.45,
        restricciones: 0.92,
      },
      evidencia_por_campo: {
        tipo_cliente: "4 adultos",
        tipo_experiencia: "talleres de artesanía y comida típica",
        destino: "a Barichara",
        intereses: "talleres de artesanía y comida típica",
        fechas: "del 15 al 18 de marzo de 2027",
        numero_viajeros: "4 adultos",
        restricciones: "usa silla de ruedas",
      },
    });

    await conServidor(respuesta, async ({ base, llm }) => {
      const { status, json } = await post(base, {
        texto,
        canal: "formulario_web",
      });

      expect(status).toBe(200);
      expect(llm.llamadas).toEqual([texto]);
      expect(json.datos_extraidos.numero_viajeros.adultos).toBe(4);
      expect(json.confianza_por_campo.numero_viajeros).toBeLessThan(0.7);
      expect(json.campos_ambiguos).toContain("numero_viajeros");
      expect(json.evidencia_por_campo.numero_viajeros).toBe("4 adultos");
      expect(texto.indexOf("4 adultos")).toBeLessThan(
        texto.indexOf("3 personas"),
      );
      expect(json.version_prompt).toBe("extraccion-v1.1");
    });
  });

  it("habilita CORS solo para el frontend local", async () => {
    await conServidor(extraccion(), async ({ base }) => {
      const permitido = await fetch(`${base}/health`, {
        headers: { Origin: "http://localhost:5173" },
      });
      const ajeno = await fetch(`${base}/health`, {
        headers: { Origin: "http://evil.example" },
      });

      expect(permitido.headers.get("access-control-allow-origin")).toBe(
        "http://localhost:5173",
      );
      expect(ajeno.headers.get("access-control-allow-origin")).toBeNull();
    });
  });
});

describe("prompt de extracción", () => {
  it("usa extraccion-v1.1 por defecto, con R9, y conserva la v1.0", () => {
    expect(prompt.version).toBe("extraccion-v1.1");
    expect(prompt.contenido).toContain("R1.");
    expect(prompt.contenido).toContain("R5.");
    expect(prompt.contenido).toContain("R6.");
    expect(prompt.contenido).toContain("R7.");
    expect(prompt.contenido).toContain("R9.");
    expect(prompt.contenido).toContain("primera mención");
    expect(prompt.contenido).toContain("Semana Santa");
    expect(prompt.contenido).toContain("Villa de Leyva");

    const anterior = cargarPrompt("extraccion-v1.0");
    expect(anterior.version).toBe("extraccion-v1.0");
    expect(anterior.contenido).not.toContain("R9.");
  });
});
