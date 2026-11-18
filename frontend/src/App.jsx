import { useState } from "react";
import "./App.css";

const API = "http://localhost:3001/api/extracciones";

const CANALES = [
  { valor: "formulario_web", etiqueta: "Formulario web" },
  { valor: "correo", etiqueta: "Correo" },
  { valor: "whatsapp", etiqueta: "WhatsApp" },
  { valor: "redes_sociales", etiqueta: "Redes sociales" },
];

const CAMPOS = [
  ["tipo_cliente", "Tipo de cliente"],
  ["tipo_experiencia", "Tipo de experiencia"],
  ["destino", "Destino"],
  ["intereses", "Intereses"],
  ["fechas", "Fechas"],
  ["numero_viajeros", "Número de viajeros"],
  ["restricciones", "Restricciones"],
  ["presupuesto_referencia", "Presupuesto de referencia"],
  ["ciudad_origen", "Ciudad de origen"],
];

function formatearValor(campo, valor) {
  if (valor == null || valor === "") {
    return "No mencionado";
  }

  if (campo === "fechas") {
    const partes = [];
    if (valor.inicio) partes.push(`Inicio ${valor.inicio}`);
    if (valor.fin) partes.push(`Fin ${valor.fin}`);
    if (valor.flexibilidad) partes.push(`Flexibilidad: ${valor.flexibilidad}`);
    return partes.length > 0 ? partes.join(" · ") : "No mencionado";
  }

  if (campo === "numero_viajeros") {
    const partes = [];
    if (valor.adultos != null) partes.push(`${valor.adultos} adultos`);
    if (valor.menores != null) partes.push(`${valor.menores} menores`);
    if (valor.edades_menores?.length) {
      partes.push(`edades ${valor.edades_menores.join(", ")}`);
    }
    return partes.length > 0 ? partes.join(", ") : "No mencionado";
  }

  if (campo === "restricciones") {
    const grupos = [
      ["Alimentarias", valor.alimentarias],
      ["Movilidad", valor.movilidad],
      ["Logísticas", valor.logisticas],
    ].filter(([, lista]) => Array.isArray(lista) && lista.length > 0);
    if (grupos.length === 0) return "Ninguna";
    return grupos
      .map(([nombre, lista]) => `${nombre}: ${lista.join(", ")}`)
      .join(" · ");
  }

  if (Array.isArray(valor)) {
    return valor.length > 0 ? valor.join(", ") : "No mencionado";
  }

  return String(valor);
}

function claseConfianza(valor) {
  if (typeof valor !== "number") return "confianza confianza-vacia";
  if (valor >= 0.85) return "confianza confianza-alta";
  if (valor >= 0.7) return "confianza confianza-media";
  return "confianza confianza-baja";
}

function textoConfianza(valor) {
  if (typeof valor !== "number") return "—";
  return valor.toFixed(2).replace(".", ",");
}

function textoEvidencia(evidencia) {
  if (!evidencia) return "Sin evidencia en el texto";
  return `Evidencia: «${evidencia}»`;
}

async function leerCuerpo(response) {
  const texto = await response.text();
  if (!texto) return {};
  try {
    return JSON.parse(texto);
  } catch {
    return { error: texto };
  }
}

function detalleError(cuerpo) {
  const partes = [];
  if (cuerpo?.error) partes.push(cuerpo.error);
  if (Array.isArray(cuerpo?.campos) && cuerpo.campos.length > 0) {
    partes.push(`Campos: ${cuerpo.campos.join(", ")}.`);
  }
  if (Array.isArray(cuerpo?.errores) && cuerpo.errores.length > 0) {
    partes.push(cuerpo.errores.slice(0, 3).join(" "));
  }
  return partes.join(" ") || "El servidor no envió un detalle.";
}

function mensajeError(status, cuerpo) {
  const detalle = detalleError(cuerpo);
  if (status === 400) {
    return { titulo: "Solicitud incompleta", detalle };
  }
  if (status === 422) {
    return { titulo: "La extracción no es válida", detalle };
  }
  if (status === 502) {
    return { titulo: "El servicio del modelo falló", detalle };
  }
  return { titulo: "No se pudo analizar la solicitud", detalle };
}

function nombreCanal(valor) {
  return CANALES.find((canal) => canal.valor === valor)?.etiqueta ?? valor;
}

function App() {
  const [texto, setTexto] = useState("");
  const [canal, setCanal] = useState("whatsapp");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  async function analizar(event) {
    event.preventDefault();
    setCargando(true);
    setError(null);
    setResultado(null);

    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, canal }),
      });
      const cuerpo = await leerCuerpo(response);
      if (!response.ok) {
        setError(mensajeError(response.status, cuerpo));
        return;
      }
      setResultado(cuerpo);
    } catch {
      setError({
        titulo: "No hay conexión con el servidor",
        detalle:
          "No se pudo contactar http://localhost:3001. Comprueba que el backend esté en marcha.",
      });
    } finally {
      setCargando(false);
    }
  }

  const faltantes = resultado?.campos_faltantes ?? [];
  const ambiguos = resultado?.campos_ambiguos ?? [];

  return (
    <main className="pagina">
      <header className="encabezado">
        <h1>Revisor inteligente de solicitudes – OrigenTours</h1>
        <p>Pega el texto libre, elige el canal y revisa la extracción.</p>
      </header>

      <form className="panel" onSubmit={analizar}>
        <label className="campo">
          Texto de la solicitud
          <textarea
            name="texto"
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            placeholder="Pega aquí el mensaje del cliente"
            disabled={cargando}
          />
        </label>
        <div className="acciones">
          <label className="campo">
            Canal
            <select
              name="canal"
              value={canal}
              onChange={(event) => setCanal(event.target.value)}
              disabled={cargando}
            >
              {CANALES.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta} ({opcion.valor})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={cargando}>
            {cargando ? "Analizando…" : "Analizar"}
          </button>
        </div>
      </form>

      {error && (
        <section className="aviso" role="alert">
          <h2>{error.titulo}</h2>
          <p>{error.detalle}</p>
        </section>
      )}

      {resultado && (
        <div className="resultados">
          <section className="panel bloque">
            <h2>Datos extraídos</h2>
            <div className="tabla-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Valor</th>
                    <th>Confianza</th>
                  </tr>
                </thead>
                <tbody>
                  {CAMPOS.map(([campo, etiqueta]) => {
                    const confianza = resultado.confianza_por_campo?.[campo];
                    const evidencia = resultado.evidencia_por_campo?.[campo];
                    return (
                      <tr key={campo} className="fila" tabIndex={0}>
                        <td>{etiqueta}</td>
                        <td>
                          {formatearValor(campo, resultado.datos_extraidos?.[campo])}
                          <span className="evidencia">{textoEvidencia(evidencia)}</span>
                        </td>
                        <td>
                          <span
                            className={claseConfianza(confianza)}
                            title={textoEvidencia(evidencia)}
                          >
                            {textoConfianza(confianza)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <caption>
                  Canal {nombreCanal(resultado.canal)} · Idioma {resultado.idioma}. Pasa
                  el mouse sobre una fila para ver la evidencia literal.
                </caption>
              </table>
            </div>
          </section>

          <section className="panel bloque">
            <h2>Alertas</h2>
            <div className="alertas">
              {faltantes.length === 0 && ambiguos.length === 0 && (
                <p className="vacio">No hay campos faltantes ni ambiguos.</p>
              )}
              {faltantes.length > 0 && (
                <article className="alerta alerta-faltante">
                  <h3>Campos faltantes</h3>
                  <p>Estos datos obligatorios no quedaron con valor.</p>
                  <ul>
                    {faltantes.map((campo) => (
                      <li key={campo}>{etiquetaCampo(campo)}</li>
                    ))}
                  </ul>
                </article>
              )}
              {ambiguos.length > 0 && (
                <article className="alerta alerta-ambiguo">
                  <h3>Campos ambiguos</h3>
                  <p>La confianza de estos campos es menor a 0,70.</p>
                  <ul>
                    {ambiguos.map((campo) => (
                      <li key={campo}>{etiquetaCampo(campo)}</li>
                    ))}
                  </ul>
                </article>
              )}
            </div>
          </section>

          <section className="panel bloque">
            <details className="json">
              <summary>JSON completo</summary>
              <pre>{JSON.stringify(resultado, null, 2)}</pre>
            </details>
            <p className="meta">
              Modelo {resultado.modelo ?? "—"} · Versión del prompt{" "}
              {resultado.version_prompt ?? "—"} · Tiempo de respuesta{" "}
              {typeof resultado.tiempo_ms === "number" ? `${resultado.tiempo_ms} ms` : "—"}
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

function etiquetaCampo(campo) {
  return CAMPOS.find(([clave]) => clave === campo)?.[1] ?? campo;
}

export default App;
