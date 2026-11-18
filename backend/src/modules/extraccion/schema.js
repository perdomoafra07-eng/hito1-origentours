import Ajv from "ajv";

export const CAMPOS_EXTRACCION = [
  "tipo_cliente",
  "tipo_experiencia",
  "destino",
  "intereses",
  "fechas",
  "numero_viajeros",
  "restricciones",
  "presupuesto_referencia",
  "ciudad_origen",
];

export const CAMPOS_OBLIGATORIOS = [
  "destino",
  "fechas",
  "numero_viajeros",
  "tipo_experiencia",
];

export const TIPOS_CLIENTE = [
  "individual",
  "grupo",
  "grupo_academico",
  "organizacion",
];

export const IDIOMAS = ["es", "en"];

export const UMBRAL_CONFIANZA = 0.7;

const fecha = {
  type: ["string", "null"],
  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
  description:
    "Fecha en formato AAAA-MM-DD, o null si el texto no permite determinarla.",
};

const listaTexto = {
  type: "array",
  items: { type: "string" },
};

function mapaDeCampos(valor) {
  return {
    type: "object",
    additionalProperties: false,
    required: [...CAMPOS_EXTRACCION],
    properties: Object.fromEntries(
      CAMPOS_EXTRACCION.map((campo) => [campo, valor]),
    ),
  };
}

export const extraccionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "idioma",
    "datos_extraidos",
    "confianza_por_campo",
    "evidencia_por_campo",
    "campos_faltantes",
    "campos_ambiguos",
  ],
  properties: {
    idioma: {
      type: "string",
      enum: IDIOMAS,
      description: "Idioma del texto de la solicitud.",
    },
    datos_extraidos: {
      type: "object",
      additionalProperties: false,
      required: [...CAMPOS_EXTRACCION],
      properties: {
        tipo_cliente: {
          type: ["string", "null"],
          enum: [...TIPOS_CLIENTE, null],
          description:
            "Clasificación del cliente. null si el texto no lo permite.",
        },
        tipo_experiencia: {
          type: ["string", "null"],
          description: "Tipo de experiencia pedida, o null si no se menciona.",
        },
        destino: {
          type: ["string", "null"],
          description: "Destino mencionado, o null si no se menciona.",
        },
        intereses: {
          ...listaTexto,
          description: "Intereses mencionados. Lista vacía si no hay.",
        },
        fechas: {
          type: "object",
          additionalProperties: false,
          required: ["inicio", "fin", "flexibilidad"],
          properties: {
            inicio: fecha,
            fin: fecha,
            flexibilidad: {
              type: ["string", "null"],
              description:
                "Expresión relativa del cliente, por ejemplo Semana Santa. null si no aplica.",
            },
          },
        },
        numero_viajeros: {
          type: "object",
          additionalProperties: false,
          required: ["adultos", "menores", "edades_menores"],
          properties: {
            adultos: {
              type: ["integer", "null"],
              minimum: 0,
              description: "Cantidad de adultos, o null si no se menciona.",
            },
            menores: {
              type: ["integer", "null"],
              minimum: 0,
              description: "Cantidad de menores, o null si no se menciona.",
            },
            edades_menores: {
              type: "array",
              items: { type: "integer", minimum: 0 },
              description:
                "Edades dichas en el texto. Lista vacía si no se mencionan.",
            },
          },
        },
        restricciones: {
          type: "object",
          additionalProperties: false,
          required: ["alimentarias", "movilidad", "logisticas"],
          properties: {
            alimentarias: listaTexto,
            movilidad: listaTexto,
            logisticas: listaTexto,
          },
        },
        presupuesto_referencia: {
          type: ["string", "null"],
          description:
            "Referencia de presupuesto dicha por el cliente, o null.",
        },
        ciudad_origen: {
          type: ["string", "null"],
          description: "Ciudad de salida, o null si no se menciona.",
        },
      },
    },
    confianza_por_campo: mapaDeCampos({
      type: ["number", "null"],
      minimum: 0,
      maximum: 1,
      description: "Confianza entre 0 y 1, o null si el campo no tiene valor.",
    }),
    evidencia_por_campo: mapaDeCampos({
      type: ["string", "null"],
      description:
        "Fragmento literal del texto, o null si el campo no tiene valor.",
    }),
    campos_faltantes: {
      type: "array",
      items: { type: "string" },
      description:
        "Obligatorios sin valor: destino, fechas, numero_viajeros, tipo_experiencia.",
    },
    campos_ambiguos: {
      type: "array",
      items: { type: "string" },
      description: "Campos con valor y confianza menor a 0.7.",
    },
  },
};

const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
  strict: false,
});

const validar = ajv.compile(extraccionSchema);

export function validarExtraccion(datos) {
  const valido = validar(datos);
  return {
    valido: Boolean(valido),
    errores: valido
      ? []
      : (validar.errors ?? []).map(
          (error) => `${error.instancePath || "/"} ${error.message}`,
        ),
  };
}
