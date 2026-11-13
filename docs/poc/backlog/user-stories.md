# Backlog de User Stories – MVP «Revisor inteligente de solicitudes de cotización» (OrigenTours)

Cada historia sigue el formato *Como… quiero… para…*, con sus criterios de aceptación y la trazabilidad a los casos de uso (CU), requerimientos funcionales (RF) y reglas de negocio (RN) del documento.

---

## Épica 1 – Acceso y registro de solicitudes

**HU-01 · Iniciar sesión como asesor** · P0 · CU-00, RF-10
*Como* asesor de viajes, *quiero* autenticarme en el sistema *para* acceder a las solicitudes y a su análisis de forma segura.
- Con credenciales válidas se accede a la bandeja de solicitudes. Con credenciales inválidas se muestra un error genérico.
- Todas las rutas de consulta, corrección, aprobación y rechazo exigen sesión de asesor.
- Cada acción posterior queda asociada al `asesor_id` autenticado.

**HU-02 · Registrar una solicitud manualmente** · P0 · CU-01, RF-01
*Como* asesor, *quiero* pegar el texto de una solicitud recibida por correo o WhatsApp, indicando canal y remitente, *para* que el sistema la analice.
- Son obligatorios el texto, el canal y el remitente. El texto vacío se rechaza.
- La solicitud se guarda en estado `RECEIVED` con su texto original, que no se puede modificar (RN-06).
- `POST /solicitudes` responde 201 con el análisis completo de forma síncrona.

**HU-03 · Enviar una solicitud desde el formulario web público** · P0 · CU-01, RF-01, RF-10
*Como* visitante sin cuenta, *quiero* escribir mi solicitud en un formulario web *para* pedir una cotización sin depender de otro canal.
- El canal se registra automáticamente como `formulario_web`, con el correo de contacto como remitente.
- El visitante solo ve una confirmación de recepción, nunca el análisis, los hallazgos ni las preguntas.
- El formulario tiene protección básica contra abuso (límite de envíos o captcha).

---

## Épica 2 – Procesamiento inteligente (LLM)

**HU-04 · Extraer los datos a JSON estructurado** · P0 · CU-02, RF-02, RN-04
*Como* asesor, *quiero* que el sistema convierta el texto libre al esquema JSON del Taller 1 *para* no tener que transcribir los datos a mano.
- La salida incluye `datos_extraidos`, `confianza_por_campo` y `evidencia_por_campo`.
- Los datos no mencionados quedan en `null`. Si un campo tiene valor pero no tiene evidencia en el texto, se considera un error de extracción.
- Se usa una sola llamada al LLM para la extracción (RNF-04). El resultado se guarda como versión 1 con origen `LLM`.

**HU-05 · Validar la estructura del JSON y reintentar** · P0 · CU-03, RF-03
*Como* sistema, *quiero* validar la respuesta del LLM contra el esquema *para* garantizar que lo que sigue en el flujo trabaje con datos bien formados.
- Se verifican tipos, enumeraciones (`tipo_cliente`, `canal_origen`) y el formato de fecha AAAA-MM-DD.
- Si la respuesta es inválida, se hacen como máximo 2 reintentos con una instrucción de corrección.
- Solo una extracción válida pasa a la validación de negocio.

**HU-06 · Gestionar el fallo de extracción** · P1 · CU-12, RF-03
*Como* asesor, *quiero* saber cuándo la extracción falló *para* poder reintentarla sin perder la solicitud.
- Si la extracción sigue fallando tras 2 reintentos, la solicitud vuelve a `RECEIVED` y la API responde 422.
- El frontend muestra un mensaje claro y un botón «Reintentar».
- También se manejan el timeout del LLM y los errores de red, sin dejar la solicitud atascada en `PROCESSING`.

**HU-07 · Trazabilidad de la extracción** · P0 · RNF-03
*Como* responsable de la PoC, *quiero* que cada versión con origen LLM guarde el modelo y la versión del prompt *para* poder comparar resultados y auditar el comportamiento del modelo.
- `modelo_llm` y `version_prompt` son obligatorios cuando el origen es LLM y nulos cuando el origen es ASESOR.

---

## Épica 3 – Validación con reglas de negocio

**HU-08 · Detectar campos obligatorios faltantes** · P0 · CU-04, RF-04, RN-01
*Como* asesor, *quiero* que el sistema me diga qué datos obligatorios faltan *para* no descubrirlo en una tercera ronda de preguntas al cliente.
- Se genera un hallazgo `FALTANTE / BLOQUEANTE` por cada uno de estos datos ausentes: tipo de cliente, destino o tipo de experiencia, fecha de inicio, fecha de fin, adultos, menores y ciudad de origen.
- La falta de presupuesto o de restricciones genera un hallazgo `ADVERTENCIA`.
- Cada hallazgo registra tipo, campo, código de regla, descripción y severidad.

**HU-09 · Detectar inconsistencias en fechas** · P0 · CU-05, RN-02
*Como* asesor, *quiero* que se detecten fechas imposibles *para* no cotizar sobre datos erróneos.
- Si la fecha de fin no es posterior a la de inicio, se genera una `CONTRADICCION`.
- Si alguna fecha es anterior a la fecha de registro, se genera una `CONTRADICCION`.

**HU-10 · Validar la información de los menores** · P0 · CU-05, RN-03
*Como* asesor, *quiero* saber si hay menores sin edad conocida *para* poder aplicar tarifas y restricciones de actividades.
- Si `menores` es mayor que 0 y faltan edades, o el número de edades no coincide con el número de menores, se genera un hallazgo.

**HU-11 · Asignar el estado según el resultado de la validación** · P0 · Sección 9
*Como* asesor, *quiero* que cada solicitud quede en un estado claro *para* priorizar mi trabajo.
- Si hay hallazgos, la solicitud pasa a `NEEDS_INFORMATION`. Si no los hay, pasa a `PENDING_REVIEW`.
- Una versión que supera la validación de reglas recibe la marca `validada_en`.

---

## Épica 4 – Preguntas de seguimiento

**HU-12 · Generar preguntas de seguimiento** · P0 · CU-06, RF-05, RN-05
*Como* asesor, *quiero* recibir una pregunta sugerida por cada hallazgo *para* responder al cliente en una sola ronda.
- Se hace una sola llamada al LLM con el JSON extraído y los hallazgos, y se genera exactamente una pregunta por hallazgo.
- Las preguntas se redactan en el idioma de la solicitud, en tono cordial y sin datos inventados.
- Si no hay hallazgos, no se llama al LLM.
- Las preguntas nunca se envían al cliente automáticamente.

**HU-13 · Editar las preguntas sugeridas** · P0 · CU-08, RF-07
*Como* asesor, *quiero* ajustar el texto de las preguntas *para* adaptarlas al tono de la agencia y al cliente.
- La pregunta editada se guarda en `pregunta_final` y se conserva la `pregunta_sugerida` original.
- La acción queda registrada en auditoría.

---

## Épica 5 – Revisión humana (human-in-the-loop)

**HU-14 · Consultar el resultado del análisis** · P0 · CU-07, RF-06
*Como* asesor, *quiero* ver juntos el texto original, los datos extraídos, los hallazgos y las preguntas *para* revisar todo de un vistazo.
- Cada campo muestra su valor, su confianza y su evidencia, y al pasar el cursor se resalta el fragmento correspondiente del texto original.
- Los campos con confianza baja (por ejemplo, menor a 0,7) se destacan visualmente.
- Los hallazgos se distinguen por severidad: bloqueante o advertencia.

**HU-15 · Corregir los datos extraídos** · P0 · CU-08, CU-14, RF-07, RN-06
*Como* asesor, *quiero* corregir los campos mal extraídos *para* que el análisis refleje lo que el cliente realmente pidió.
- Cada corrección crea una nueva versión con origen `ASESOR`, número consecutivo y el `creado_por` del asesor. Las versiones anteriores no se sobrescriben.
- Tras cada corrección se vuelven a ejecutar las reglas y se recalculan los hallazgos y el estado.
- `PUT /solicitudes/{id}/resultado` responde 200 con la versión validada, sus hallazgos y el estado.

**HU-16 · Descartar un hallazgo** · P1 · Modelo de datos (HALLAZGO.estado)
*Como* asesor, *quiero* marcar un hallazgo como descartado, con una justificación, *para* que no siga apareciendo cuando ya sé la respuesta por otra vía.
- El hallazgo pasa a `DESCARTADO` y la acción queda en auditoría.

**HU-17 · Aprobar el análisis** · P0 · CU-09, RF-08, RN-07
*Como* asesor, *quiero* aprobar el análisis de la versión vigente *para* dejarlo listo y responder al cliente.
- Solo se puede aprobar la versión vigente validada. En cualquier otro caso, la API responde 409 Conflict.
- Se permite aprobar con hallazgos abiertos, que quedan registrados.
- Al aprobar, el estado pasa a `APPROVED`, se registra `version_aprobada_id` y se crea un registro de auditoría con el asesor, la fecha y hora, y la versión.

**HU-18 · Rechazar la solicitud con un motivo** · P0 · CU-15, RF-08, RN-08
*Como* asesor, *quiero* rechazar una solicitud indicando el motivo *para* dejar constancia de por qué no se atenderá.
- El motivo es obligatorio. Sin motivo, la API responde 400.
- El estado pasa a `REJECTED` y se crea un registro de auditoría con el estado anterior, el estado nuevo y el motivo.
- `APPROVED` y `REJECTED` son estados finales y no admiten más acciones.

---

## Épica 6 – Gestión y trazabilidad (P1)

**HU-19 · Listar las solicitudes registradas** · P1 · CU-10, RF-09
*Como* asesor, *quiero* ver una bandeja con todas las solicitudes, su estado, canal y fecha *para* organizar mi trabajo.
- La bandeja se puede filtrar por estado y canal y se ordena por fecha de recepción.

**HU-20 · Reprocesar una solicitud** · P1 · CU-11
*Como* asesor, *quiero* volver a lanzar la extracción de una solicitud *para* recuperarla tras un fallo o probar un prompt mejorado.
- Está disponible desde `RECEIVED`, y desde los estados revisables con confirmación previa.
- El reprocesamiento crea una nueva versión con origen LLM sin borrar las anteriores.

**HU-21 · Consultar el historial de versiones y la auditoría** · P1 · CU-13, RF-09
*Como* asesor, *quiero* ver la línea de tiempo de versiones, cambios y acciones *para* entender cómo evolucionó el análisis.
- Se muestran todas las versiones con su origen, autor y fecha, y las diferencias de campos entre versiones.
- Se muestran las acciones de auditoría: CORREGIR, APROBAR y RECHAZAR.

---

## Historias técnicas habilitadoras

| ID | Historia | Origen |
|---|---|---|
| HT-01 | Gestionar la clave de OpenAI fuera del código (`.env` en `.gitignore` y SSM Parameter Store en AWS); exponer el sistema solo por HTTPS. | RNF-01 |
| HT-02 | Crear una suite de pruebas automáticas sin red, con el LLM y PostgreSQL simulados, que cubra cada regla RN y cada transición de estado. | RNF-06 |
| HT-03 | Medir el tiempo de punta a punta de `POST /solicitudes` y fijar un timeout al LLM para cumplir la meta de menos de 30 s. | RNF-05 |
| HT-04 | Crear un conjunto de solicitudes sintéticas (completas, incompletas, contradictorias, con menores y mal redactadas) para la demostración y las pruebas. | RNF-02, Objetivo |
| HT-05 | Desplegar en AWS con CloudFront + S3, una EC2 y RDS en una subred privada. | Alcance |

---

## Observaciones del analista (conviene resolverlas antes del sprint 1)

1. **Canal inconsistente:** el esquema JSON usa `correo | redes_sociales | formulario_web | whatsapp`, pero el modelo de datos usa `FORMULARIO_WEB, EMAIL, WHATSAPP`. Hay que unificar el catálogo.
2. **Reglas de consistencia sin definir:** el diagrama de secuencia menciona «nº personas vs presupuesto» y «restricciones vs destino», pero ninguna RN las especifica. O se definen como reglas concretas o se sacan del MVP.
3. **El visitante «inicia sesión»:** esto contradice la idea de un «cliente sin cuenta». Sugiero eliminar CU-00 para el visitante.
4. **Transición `NEEDS_INFORMATION → PENDING_REVIEW`:** debería ocurrir solo cuando una corrección revalidada deja la versión sin hallazgos (bloqueantes o de cualquier tipo, según se decida). Falta definir si las advertencias por sí solas dejan la solicitud en `NEEDS_INFORMATION`.

**Orden sugerido de entrega:** Sprint 1 cubre HU-01 a HU-05, HU-08 a HU-11 y HT-02 (flujo de extracción y validación). Sprint 2 cubre HU-12 a HU-15, HU-17, HU-18 y HU-07. Sprint 3 cubre las historias P1 y el despliegue.

¿Quieres que lo convierta en un documento para compartir con el grupo, o en una hoja tipo backlog con estimaciones en puntos?