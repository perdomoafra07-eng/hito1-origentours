# HU-04 · Extraer los datos a JSON estructurado

## 1. Ficha

| Atributo | Valor |
|---|---|
| Épica | E2 – Procesamiento inteligente (LLM) |
| Prioridad | P0 · primera historia a desarrollar |
| Trazabilidad | CU-02 · RF-02 · RN-04 · RNF-02, RNF-03, RNF-04, RNF-05 |
| Estimación sugerida | 5 puntos |
| Sprint | 1 |

## 2. Historia

> **Como** asesor de viajes de OrigenTours,
> **quiero** que el sistema convierta el texto libre de una solicitud de cotización a un JSON estructurado con los datos del viaje, su nivel de confianza y la evidencia textual de cada uno,
> **para** dejar de transcribir manualmente cada solicitud y partir de una base confiable y verificable al revisarla.

## 3. Valor de negocio

Hoy la actividad 3, «Revisar la solicitud», depende de que el asesor lea e interprete el texto a mano. Eso genera variabilidad entre asesores y varias rondas de preguntas al cliente. Esta historia es el núcleo de la PoC por dos razones:

- **Las demás historias dependen de ella.** Sin un JSON estructurado no hay validación de reglas (HU-08 a HU-11), ni preguntas de seguimiento (HU-12), ni revisión humana (HU-14 y siguientes).
- **Valida la hipótesis central de la PoC:** que un LLM puede extraer los datos sin inventar información.
- **La evidencia por campo construye confianza.** El asesor puede comprobar de dónde salió cada dato en lugar de creerle al modelo.

## 4. Alcance

**Incluye:**
- Un servicio de backend que recibe el `texto_original`, el `canal_origen` y el `solicitudId`, y hace una sola llamada a la API de OpenAI con el prompt de extracción y el esquema del Taller 1.
- Mapear la respuesta del LLM al esquema de la sección 4.
- Asignar `canal_origen` desde el sistema, sin inferirlo.
- Verificar que cada evidencia exista en el texto original (control anti-alucinación).
- Persistir el resultado como versión 1 de `VERSION_ANALISIS`, con origen `LLM`.
- Una versión inicial del prompt, identificada (por ejemplo, `extraccion-v1.0`).

**No incluye (pertenece a otras historias):**

| Fuera de alcance | Historia |
|---|---|
| Validación del esquema y reintentos | HU-05 |
| Manejo del fallo definitivo y vuelta a `RECEIVED` | HU-06 |
| Reglas de completitud y consistencia | HU-08 a HU-10 |
| Generación de preguntas | HU-12 |
| Pantallas del frontend | HU-14 |
| Anonimización con el Privacy Vault (no aplica en la PoC, que usa datos sintéticos) | Piloto |

## 5. Entrada y salida esperadas

**Ejemplo de entrada** (canal `whatsapp`):
> «Hola! Somos una pareja con nuestros dos hijos de 8 y 12 años, queremos ir al Eje Cafetero del 20 al 27 de diciembre de 2026. Salimos desde Bogotá. Nos interesa el café y el avistamiento de aves. Mi hijo menor es celíaco.»

**Salida esperada (resumida):**
```json
{
  "canal_origen": "whatsapp",
  "idioma": "es",
  "datos_extraidos": {
    "tipo_cliente": "grupo",
    "tipo_experiencia": "turismo de naturaleza y cultura cafetera",
    "destino": "Eje Cafetero",
    "intereses": ["café", "avistamiento de aves"],
    "fechas": {"inicio": "2026-12-20", "fin": "2026-12-27", "flexibilidad": null},
    "numero_viajeros": {"adultos": 2, "menores": 2, "edades_menores": [8, 12]},
    "restricciones": {"alimentarias": ["celiaquía (hijo menor)"], "movilidad": [], "logisticas": []},
    "presupuesto_referencia": null,
    "ciudad_origen": "Bogotá"
  },
  "confianza_por_campo": {"destino": 0.97, "fechas": 0.95, "tipo_cliente": 0.75, "presupuesto_referencia": null},
  "evidencia_por_campo": {"destino": "ir al Eje Cafetero", "fechas": "del 20 al 27 de diciembre de 2026", "presupuesto_referencia": null}
}
```

## 6. Reglas de la historia

| ID | Regla |
|---|---|
| R1 | Lo que el cliente no menciona queda en `null`, o en `[]` si es una lista. El modelo nunca completa con supuestos (RN-04). |
| R2 | Todo campo con valor lleva una confianza entre 0 y 1 y una evidencia. Los campos en `null` tienen confianza y evidencia en `null`. |
| R3 | La evidencia debe ser un fragmento literal del `texto_original`. La comparación tolera mayúsculas, tildes y espacios. Si un fragmento no se encuentra, la extracción se marca como inválida y pasa al flujo de reintento de HU-05. |
| R4 | `canal_origen` lo asigna el sistema con el catálogo `formulario_web \| correo \| whatsapp \| redes_sociales`. Se ignora cualquier valor que proponga el LLM. |
| R5 | Las fechas se normalizan a AAAA-MM-DD solo si el texto permite determinarlas sin suponer nada. Si falta el año o la fecha es relativa («para Semana Santa», «en vacaciones»), queda en `null` y la expresión del cliente va en `fechas.flexibilidad`. |
| R6 | Se permiten clasificaciones con evidencia: por ejemplo, «una pareja» se interpreta como 2 adultos. Estas clasificaciones deben reflejarse en una confianza menor. |
| R7 | `tipo_cliente` solo admite `individual \| grupo \| grupo_academico \| organizacion`. |
| R8 | El `texto_original` no se modifica en ningún momento (RN-06). |

## 7. Criterios de aceptación (Gherkin)

```gherkin
Escenario 1: Extracción de una solicitud completa
  Dado una solicitud registrada en estado PROCESSING con un texto que menciona todos los datos obligatorios
  Cuando el sistema ejecuta la extracción
  Entonces se obtiene un JSON con todos los campos obligatorios con valor
  Y cada campo con valor tiene confianza entre 0 y 1 y una evidencia literal del texto
  Y se guarda como versión 1 con origen LLM

Escenario 2: Datos no mencionados
  Dado una solicitud que no menciona presupuesto ni ciudad de origen
  Cuando el sistema ejecuta la extracción
  Entonces presupuesto_referencia y ciudad_origen son null
  Y su confianza y evidencia son null

Escenario 3: Fecha ambigua
  Dado una solicitud que dice "queremos viajar en Semana Santa"
  Cuando el sistema ejecuta la extracción
  Entonces fechas.inicio y fechas.fin son null
  Y fechas.flexibilidad contiene "en Semana Santa"

Escenario 4: Evidencia inventada (control anti-alucinación)
  Dado que el LLM devuelve una evidencia que no existe en el texto original
  Cuando el sistema verifica las evidencias
  Entonces la extracción se marca como inválida
  Y se entrega al flujo de reintento de HU-05 sin persistirse como versión

Escenario 5: Canal asignado por el sistema
  Dado una solicitud registrada con canal "correo"
  Y que el LLM devuelve canal_origen "whatsapp"
  Cuando el sistema construye el JSON final
  Entonces canal_origen es "correo"

Escenario 6: Menores sin edades
  Dado una solicitud que dice "vamos 2 adultos y 3 niños"
  Cuando el sistema ejecuta la extracción
  Entonces numero_viajeros.menores es 3 y edades_menores es []
  Y no se inventan edades

Escenario 7: Llamada única y tiempo de respuesta
  Dado cualquier solicitud del conjunto sintético
  Cuando el sistema ejecuta la extracción
  Entonces se realiza exactamente una llamada al LLM (sin contar los reintentos de HU-05)
  Y la extracción termina en menos de 20 s, para dejar margen a la meta de 30 s de punta a punta
```

## 8. Requerimientos no funcionales aplicables

- **Seguridad:** la clave de OpenAI se lee de `.env` o de Parameter Store y nunca aparece en logs ni en el repositorio.
- **Trazabilidad:** el servicio deja disponibles el `modelo_llm` y la `version_prompt` usados. HU-07 se encarga de persistirlos.
- **Calidad:** el cliente LLM está detrás de una interfaz, para poder simularlo en las pruebas sin red (HT-02).
- **Configuración:** el modelo, la temperatura (recomendada en 0) y el timeout se configuran por variables de entorno.

## 9. Dependencias

| Dependencia | Tipo | Nota |
|---|---|---|
| HT-04 · Conjunto de solicitudes sintéticas | Bloqueante para la demostración | Mínimo 15 casos: completas, incompletas, ambiguas, con menores y mal redactadas |
| HT-02 · LLM simulado | Bloqueante para las pruebas | Respuestas grabadas por caso |
| Tablas `SOLICITUD` y `VERSION_ANALISIS` | Técnica | Migración inicial de PostgreSQL con JSONB |
| Cuenta y clave de OpenAI | Externa | Con presupuesto controlado |

## 10. Definition of Ready
- [x] Esquema JSON aprobado (Taller 1)
- [x] Catálogo de canal unificado
- [ ] Conjunto sintético con salida esperada anotada por caso
- [ ] Modelo de OpenAI seleccionado

## 11. Definition of Done
- Los 7 escenarios pasan como pruebas automáticas sin red.
- Medición de calidad sobre el conjunto sintético con estas metas:
  - Exactitud en campos obligatorios de al menos 85 %.
  - 0 % de campos inventados, es decir, con evidencia no encontrada en el texto.
- El prompt queda versionado en el repositorio.
- El código está revisado y no hay secretos en el repositorio.
- El Product Owner lo valida en una demostración con 3 casos.

## 12. Riesgos

| Riesgo | Mitigación |
|---|---|
| El LLM infiere datos que el cliente no dio | Regla R1 en el prompt, verificación de evidencias (R3) y temperatura 0 |
| Fechas mal normalizadas por falta de año o expresiones relativas | Regla R5; casos específicos en el conjunto sintético |
| Latencia o costo variables | Una sola llamada, timeout configurado y medición en la demostración |
| La confianza que reporta el LLM no está calibrada | En la PoC se usa solo como señal visual y no se toman decisiones automáticas con ella |

## 13. Preguntas abiertas para el equipo
1. ¿Cuál es el umbral de «confianza baja» que HU-14 resaltará en la interfaz? La propuesta es 0,7.
2. ¿La extracción debe manejar solicitudes en inglés en la PoC, o basta con español?
3. ¿Qué modelo de OpenAI se usará? Conviene uno con salida estructurada nativa (JSON Schema) para reducir los reintentos.