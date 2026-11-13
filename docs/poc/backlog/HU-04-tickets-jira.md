# Tickets de Jira – HU-04 · Extraer los datos a JSON estructurado

## Decisiones de arquitectura que asumen los tickets

- **Ubicación del trabajo:** HU-04 es una historia solo de backend. No hay tickets de frontend, porque las pantallas pertenecen a HU-14. El proyecto React no se toca en esta historia.
- **Lenguaje y librerías:** JavaScript (ES Modules) sobre Node.js 20 y Express, con estas librerías:
  - `openai` (SDK oficial) para el LLM.
  - `ajv` para JSON Schema.
  - `pg` y `node-pg-migrate` para PostgreSQL.
  - `vitest` para pruebas.
  - `pino` para logs.
- **Contrato con el LLM:** se usan las salidas estructuradas de OpenAI (JSON Schema en modo `strict`). El mismo esquema lo reutilizará HU-05.
- **Inversión de dependencias:** el servicio de extracción depende de una interfaz `LlmClient`, con una implementación real (`OpenAiClient`) y una simulada (`MockLlmClient`). Así se pueden hacer pruebas sin red.

```
/ (repositorio)
├── backend/
│   ├── src/
│   │   ├── config/               # env, validación de configuración
│   │   ├── modules/extraccion/
│   │   │   ├── extraccion.service.js
│   │   │   ├── evidencia.verificador.js
│   │   │   ├── esquema/extraccion.schema.json
│   │   │   └── prompts/extraccion-v1.0.md
│   │   ├── infra/llm/            # llm.client.js, openai.client.js, mock.client.js
│   │   └── infra/db/             # migrations/, repositories/
│   ├── scripts/evaluar-extraccion.js
│   └── test/ (unit, fixtures/sinteticos)
└── frontend/                     # sin cambios en HU-04
```

---

### ORT-101 · Configurar la base del proyecto backend

**Descripción:** crear la estructura mínima del backend en Express para alojar el módulo de extracción, con la configuración por entorno, los logs y el framework de pruebas.

**Criterios de aceptación:**
- `npm run dev`, `npm test` y `npm run lint` funcionan dentro de `backend/`.
- La configuración se valida al arrancar: si falta `OPENAI_API_KEY`, `DATABASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT_MS` o `LLM_TEMPERATURE`, el proceso falla con un mensaje claro.
- `.env` está en `.gitignore` y existe un `.env.example` sin secretos.
- El logger oculta la clave del LLM y los encabezados de autorización.
- `docker-compose.yml` levanta PostgreSQL local.

**Prioridad:** Highest · **Estimación:** 4 h

**Tareas técnicas:**
1. Inicializar `backend/package.json` con ESM, ESLint y Prettier.
2. Crear `src/config/index.js`, que valide las variables de entorno (con `ajv` o `envalid`).
3. Configurar `pino`, con `redact` para `apiKey` y `authorization`.
4. Configurar Vitest con dos carpetas: `test/unit` y `test/integration`.
5. Crear `docker-compose.yml` con PostgreSQL 16.
6. Agregar a la raíz del repositorio un README con los comandos de cada proyecto.

**Notas:** si el proyecto ya existe por otra historia, este ticket se reduce a la configuración del LLM y la ocultación de secretos en los logs.

---

### ORT-102 · Crear la migración inicial de `SOLICITUD` y `VERSION_ANALISIS`

**Descripción:** crear las tablas necesarias para persistir la solicitud y la versión 1 del análisis, según el modelo de datos de la sección 10.2.

**Criterios de aceptación:**
- La tabla `solicitud` tiene:
  - `canal`, con un CHECK que solo admite `formulario_web | correo | whatsapp | redes_sociales`.
  - `texto_original`, de tipo TEXT y NOT NULL.
  - `estado`, con un CHECK que admite los 6 estados.
  - `version_vigente_id` y `version_aprobada_id`, ambos nullable.
- La tabla `version_analisis` tiene:
  - `datos`, de tipo JSONB y NOT NULL.
  - `origen`, con un CHECK `LLM | ASESOR`.
  - `modelo_llm` y `version_prompt`, que son obligatorios cuando el origen es LLM (constraint).
  - Un índice UNIQUE en (`solicitud_id`, `numero_version`).
- La inmutabilidad de `texto_original` se garantiza con un trigger que impide el UPDATE de esa columna (RN-06).
- La migración tiene `up` y `down` y se ejecuta con éxito sobre una base vacía.

**Prioridad:** Highest · **Estimación:** 4 h

**Tareas técnicas:**
1. Configurar `node-pg-migrate`.
2. Escribir la migración `001_solicitud_version_analisis`.
3. Escribir el trigger `bloquear_update_texto_original`.
4. Escribir la FK circular `solicitud.version_vigente_id`, creada en un segundo paso con `DEFERRABLE`.
5. Crear un seed con 1 solicitud de prueba.

**Notas:** las tablas `HALLAZGO` y `AUDITORIA_REVISION` no se crean aquí; pertenecen a HU-08 y HU-15.

---

### ORT-103 · Definir el JSON Schema de extracción

**Descripción:** traducir el esquema del Taller 1 a JSON Schema compatible con el modo `strict` de OpenAI. Será la única fuente de verdad, compartida entre la extracción (HU-04) y la validación (HU-05).

**Criterios de aceptación:**
- El archivo `extraccion.schema.json` cubre todos los campos de la sección 4.
- Es compatible con el modo strict:
  - Todos los campos van en `required`.
  - La opcionalidad se expresa con `type: ["string","null"]`.
  - Se usa `additionalProperties: false`.
- `confianza_por_campo` y `evidencia_por_campo` tienen claves explícitas, una por campo de `datos_extraidos`, porque el modo strict no admite claves dinámicas.
- Están definidas las enumeraciones de `tipo_cliente` y de `idioma`. `canal_origen` no forma parte del esquema que se envía al LLM.
- Hay pruebas que demuestran que la salida de ejemplo de la HU es válida y que 3 salidas mal formadas son inválidas.

**Prioridad:** Highest · **Estimación:** 4 h

**Tareas técnicas:**
1. Escribir el esquema.
2. Crear `esquema/index.js`, que exporte el esquema y un validador Ajv compilado.
3. Escribir las pruebas unitarias de validez e invalidez.

**Notas:** el cambio de claves dinámicas a claves explícitas es una decisión técnica que conviene comunicar al equipo, porque ajusta ligeramente el esquema del Taller 1 sin cambiar su semántica.

---

### ORT-104 · Implementar el cliente LLM desacoplado

**Descripción:** crear la abstracción `LlmClient`, su implementación con OpenAI y su implementación simulada para pruebas sin red.

**Criterios de aceptación:**
- La interfaz es `extraer({ prompt, texto, schema }) → { contenido, modelo, uso, latenciaMs }`.
- `OpenAiClient`:
  - Usa salida estructurada con el esquema de ORT-103.
  - Toma la temperatura y el modelo de la configuración.
  - Aborta con un `LlmTimeoutError` cuando se supera `LLM_TIMEOUT_MS`.
- Los errores de red o de la API se traducen a `LlmProviderError`, sin exponer la clave.
- `MockLlmClient` devuelve respuestas grabadas por identificador de caso y registra cuántas llamadas recibió.
- Ninguna prueba unitaria hace llamadas reales a la red.

**Prioridad:** Highest · **Estimación:** 5 h

**Tareas técnicas:**
1. Crear `infra/llm/llm.client.js` con el contrato documentado con JSDoc.
2. Crear `openai.client.js` con `AbortController` para el timeout.
3. Crear `mock.client.js` con un mapa de fixtures.
4. Crear una factory que escoja la implementación según `LLM_PROVIDER=openai|mock`.
5. Escribir las pruebas unitarias de timeout y de traducción de errores.

**Notas:** los reintentos no van aquí; pertenecen a HU-05. Este cliente hace un solo intento por invocación.

---

### ORT-105 · Escribir y versionar el prompt de extracción v1.0

**Descripción:** redactar el prompt de sistema que implemente las reglas R1, R2, R5, R6 y R7 de la HU, y versionarlo como un archivo dentro del repositorio.

**Criterios de aceptación:**
- `prompts/extraccion-v1.0.md` incluye instrucciones explícitas para:
  - No inventar datos y usar `null` en lo no mencionado.
  - Usar como evidencia un fragmento literal del texto.
  - Normalizar las fechas sin suponer el año.
  - Poner las fechas relativas en `flexibilidad`.
  - Bajar la confianza en las inferencias.
- El prompt incluye 2 ejemplos (few-shot): uno completo y uno con datos faltantes.
- `version_prompt` se toma del nombre del archivo y se expone junto con el contenido.
- Con el LLM real, los 15 casos sintéticos producen JSON válido según el esquema en al menos el 90 % de los casos sin reintentos.

**Prioridad:** High · **Estimación:** 6 h

**Tareas técnicas:**
1. Redactar el prompt.
2. Crear un loader `cargarPrompt(version)`.
3. Hacer de 2 a 3 iteraciones de ajuste con el script de ORT-109.
4. Documentar los cambios en `prompts/CHANGELOG.md`.

**Notas:** cualquier cambio posterior crea un archivo nuevo (v1.1, v1.2…) y nunca edita uno existente, para conservar la trazabilidad que pide RNF-03.

---

### ORT-106 · Implementar el verificador de evidencias (anti-alucinación)

**Descripción:** implementar la regla R3, que comprueba que cada evidencia exista literalmente en el `texto_original`.

**Criterios de aceptación:**
- La normalización de texto ignora mayúsculas, tildes, espacios múltiples y saltos de línea.
- La función `verificarEvidencias(texto, evidencias)` devuelve `{ valido, camposInvalidos[] }`.
- Las evidencias con valor `null` no se verifican.
- Un campo con valor pero sin evidencia se reporta como inválido (R2).
- Las pruebas cubren tildes, puntuación, emojis, fragmentos parciales y evidencias inexistentes.

**Prioridad:** High · **Estimación:** 3 h

**Tareas técnicas:**
1. Crear la utilidad `normalizar(texto)` con NFD, eliminación de diacríticos, conversión a minúsculas y colapso de espacios.
2. Crear `evidencia.verificador.js`.
3. Escribir pruebas unitarias parametrizadas.

**Notas:** en la PoC la coincidencia es exacta, después de normalizar. La coincidencia difusa (fuzzy) queda como mejora futura si aparecen falsos positivos.

---

### ORT-107 · Implementar el servicio de extracción (orquestador)

**Descripción:** crear `ExtraccionService`, que orquesta la llamada al LLM, el post-procesamiento y la verificación, y que entrega un resultado válido o un error tipado a HU-05.

**Criterios de aceptación:**
- La firma es `extraer({ solicitudId, textoOriginal, canal }) → ResultadoExtraccion`.
- Hace exactamente 1 llamada a `LlmClient`.
- El sistema inyecta `canal_origen` desde el parámetro `canal`, sin tomarlo del LLM (R4).
- Normaliza las listas ausentes a `[]` y los valores vacíos a `null`.
- Si la verificación de evidencias falla, lanza un `ExtraccionInvalidaError` con los campos afectados y no persiste nada.
- El resultado expone `modelo_llm`, `version_prompt` y `latenciaMs`.
- No modifica `texto_original`.

**Prioridad:** Highest · **Estimación:** 6 h

**Tareas técnicas:**
1. Crear `extraccion.service.js` con inyección de `llmClient`, `promptLoader` y `verificador`.
2. Crear un mapper de post-procesamiento.
3. Crear las clases de error en `modules/extraccion/errores.js`.
4. Escribir pruebas unitarias con `MockLlmClient`.

**Notas:** el servicio se mantiene independiente de Express. HU-02 lo invocará desde `POST /solicitudes`, y HU-05 lo envolverá con los reintentos.

---

### ORT-108 · Persistir la extracción como versión 1

**Descripción:** crear el repositorio que guarda el resultado como `VERSION_ANALISIS` y actualiza la versión vigente de la solicitud.

**Criterios de aceptación:**
- Se inserta la versión con `numero_version = 1`, `origen = 'LLM'`, `datos` en JSONB, `modelo_llm`, `version_prompt` y `creado_por = null`.
- `solicitud.version_vigente_id` se actualiza en la misma transacción que la inserción.
- Si una de las dos operaciones falla, se hace rollback de ambas.
- Insertar dos veces la versión 1 de la misma solicitud viola el índice UNIQUE.
- `validada_en` queda en `null`; lo llena HU-11.

**Prioridad:** High · **Estimación:** 4 h

**Tareas técnicas:**
1. Crear `infra/db/repositories/versionAnalisis.repository.js`.
2. Crear un helper `withTransaction`.
3. Escribir pruebas de integración contra PostgreSQL en Docker (con `testcontainers` o la base de docker-compose).

**Notas:** con esto también queda cubierta la parte de persistencia de HU-07 (modelo y prompt).

---

### ORT-109 · Crear el conjunto sintético y el script de evaluación de calidad

**Descripción:** crear los 15 casos sintéticos con su salida esperada anotada, y un script que mida la calidad de la extracción contra el LLM real. Este script sirve como evidencia para el Definition of Done y para la demostración.

**Criterios de aceptación:**
- Hay 15 casos en `test/fixtures/sinteticos/`, cada uno con `entrada.txt`, `canal` y `esperado.json`. La distribución mínima es:
  - 3 completas
  - 4 incompletas
  - 2 con fechas ambiguas
  - 2 con menores (con y sin edades)
  - 2 mal redactadas o informales
  - 2 de tipo grupo académico u organización
- `npm run evaluar:extraccion` produce un reporte con:
  - Exactitud por campo obligatorio.
  - Porcentaje de campos inventados.
  - Latencia p50 y p95.
  - Costo estimado en tokens.
- El reporte se guarda en `backend/reportes/` con la fecha, el modelo y la versión del prompt.

**Prioridad:** High · **Estimación:** 7 h

**Tareas técnicas:**
1. Redactar los casos y anotar su salida esperada (revisión cruzada entre 2 personas).
2. Crear `scripts/evaluar-extraccion.js`.
3. Implementar la comparación por campo, con tolerancia en los textos libres (`tipo_experiencia`, `intereses`).
4. Grabar las respuestas reales del LLM como fixtures para ORT-110.

**Notas:** este ticket también resuelve HT-04. Los datos son 100 % sintéticos (RNF-02); está prohibido usar textos reales de clientes.

---

### ORT-110 · Automatizar los escenarios de aceptación sin red

**Descripción:** automatizar los 7 escenarios Gherkin de HU-04 con el LLM simulado y la base de pruebas.

**Criterios de aceptación:**
- Los escenarios 1 a 7 de la HU están implementados como pruebas que pasan en `npm test` sin conexión a internet.
- El escenario 4 (evidencia inventada) usa un fixture adulterado de forma deliberada.
- El escenario 7 verifica con el mock que se hizo exactamente 1 llamada al LLM.
- La cobertura del módulo `modules/extraccion` es de al menos 85 %.

**Prioridad:** High · **Estimación:** 5 h

**Tareas técnicas:**
1. Crear `test/integration/hu04.extraccion.test.js`.
2. Organizar los fixtures del mock por escenario.
3. Configurar la cobertura en Vitest.
4. Agregar un pipeline básico de CI (GitHub Actions) que ejecute lint y pruebas.

**Notas:** en el escenario 7, la medición de latencia real se hace con el script de ORT-109, no en las pruebas unitarias.

---

### ORT-111 · Preparar la documentación técnica y la demostración al PO

**Descripción:** documentar el módulo y preparar la demostración de validación de HU-04 con 3 casos.

**Criterios de aceptación:**
- `backend/docs/extraccion.md` documenta:
  - El flujo.
  - El contrato del servicio.
  - Los errores.
  - Las variables de entorno.
  - Cómo cambiar la versión del prompt.
- La demostración muestra 3 casos (completo, incompleto y con fecha ambigua) y el último reporte de evaluación.
- El PO firma la aceptación en el ticket de la HU.

**Prioridad:** Medium · **Estimación:** 2 h

**Tareas técnicas:**
1. Redactar el documento.
2. Crear el script `npm run demo:extraccion -- --caso=<id>`, que imprime el JSON resultante.
3. Ensayar la demostración.

**Notas:** como la interfaz no existe aún, la demostración se hace por consola o con un cliente HTTP.

---

## Resumen

| Ticket | Título | Prioridad | Horas | Depende de |
|---|---|---|---|---|
| ORT-101 | Base del proyecto backend | Highest | 4 | — |
| ORT-102 | Migración inicial de BD | Highest | 4 | 101 |
| ORT-103 | JSON Schema de extracción | Highest | 4 | 101 |
| ORT-104 | Cliente LLM desacoplado | Highest | 5 | 101, 103 |
| ORT-105 | Prompt de extracción v1.0 | High | 6 | 103, 104 (iteración con 109) |
| ORT-106 | Verificador de evidencias | High | 3 | 101 |
| ORT-107 | Servicio de extracción | Highest | 6 | 104, 105, 106 |
| ORT-108 | Persistencia de la versión 1 | High | 4 | 102, 107 |
| ORT-109 | Conjunto sintético y evaluación | High | 7 | 104 (puede empezar en paralelo) |
| ORT-110 | Pruebas de aceptación sin red | High | 5 | 107, 108, 109 |
| ORT-111 | Documentación y demostración | Medium | 2 | 110 |
| **Total** | | | **50 h** | |

**Ruta crítica:** 101 → 103 → 104 → 105 → 107 → 108 → 110 → 111.

**Trabajo en paralelo:** ORT-106 y la redacción de los casos de ORT-109 pueden avanzar desde el día 1.

**Ajuste de estimación:** las 50 h superan lo que normalmente representan 5 puntos. Como incluyen la base del backend y la base de datos, que se hacen una sola vez, sugiero re-estimar HU-04 en 8 puntos, o mover ORT-101 y ORT-102 a una historia técnica de configuración inicial (setup).