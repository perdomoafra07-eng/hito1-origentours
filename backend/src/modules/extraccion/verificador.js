import { CAMPOS_EXTRACCION } from "./schema.js";

export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tieneValor(valor) {
  if (valor == null) {
    return false;
  }
  if (typeof valor === "string") {
    return valor.trim() !== "";
  }
  if (typeof valor === "number") {
    return true;
  }
  if (Array.isArray(valor)) {
    return valor.length > 0;
  }
  if (typeof valor === "object") {
    return Object.values(valor).some((item) => tieneValor(item));
  }
  return true;
}

function aparece(texto, evidencia) {
  const fragmento = normalizar(evidencia);
  if (fragmento === "") {
    return false;
  }
  return normalizar(texto).includes(fragmento);
}

export function verificarEvidencias(texto, extraccion) {
  const datos = extraccion?.datos_extraidos ?? {};
  const evidencias = extraccion?.evidencia_por_campo ?? {};
  const confianzas = extraccion?.confianza_por_campo ?? {};
  const invalidos = new Set();

  for (const campo of CAMPOS_EXTRACCION) {
    const evidencia = evidencias[campo];
    const presente = tieneValor(datos[campo]);

    if (!presente) {
      if (evidencia != null && !aparece(texto, evidencia)) {
        invalidos.add(campo);
      }
      continue;
    }

    const confianza = confianzas[campo];
    if (typeof confianza !== "number" || confianza < 0 || confianza > 1) {
      invalidos.add(campo);
      continue;
    }

    if (typeof evidencia !== "string" || !aparece(texto, evidencia)) {
      invalidos.add(campo);
    }
  }

  const camposInvalidos = CAMPOS_EXTRACCION.filter((campo) =>
    invalidos.has(campo),
  );
  return { valido: camposInvalidos.length === 0, camposInvalidos };
}
