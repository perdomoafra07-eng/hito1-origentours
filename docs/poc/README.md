# Documentación de la PoC «Revisor inteligente de solicitudes» – OrigenTours

Grupo 11 · MAIT4202 · Hito 1. Documentos y diagramas construidos con GenAI (ChatGPT y Claude en paralelo, comparados e iterados).

## Especificación
- [especificacion-requerimientos.md](especificacion-requerimientos.md): alcance, actores, esquema JSON, casos de uso, requerimientos funcionales, reglas de negocio, requerimientos no funcionales, estados y endpoints.

## Diagramas (código fuente + imagen)
| Diagrama | Código | Imagen |
|---|---|---|
| Secuencia de la PoC | [secuencia.puml](diagramas/secuencia.puml) | [secuencia.png](diagramas/secuencia.png) |
| Casos de uso | [casos-de-uso.puml](diagramas/casos-de-uso.puml) | [casos-de-uso.png](diagramas/casos-de-uso.png) |
| Estados de la solicitud | [estados.puml](diagramas/estados.puml) | [estados.png](diagramas/estados.png) |
| Modelo de datos | [modelo-datos.mmd](diagramas/modelo-datos.mmd) | [modelo-datos.png](diagramas/modelo-datos.png) |
| Arquitectura AWS de la PoC | [arquitectura-aws.dot](diagramas/arquitectura-aws.dot) · [arquitectura-aws-diagrams.py](diagramas/arquitectura-aws-diagrams.py) | [arquitectura-aws.png](diagramas/arquitectura-aws.png) |
| Arquitectura objetivo (DiagramGPT) | — | [arquitectura-objetivo-diagramgpt.png](diagramas/arquitectura-objetivo-diagramgpt.png) |

## Backlog
- [user-stories.md](backlog/user-stories.md): 21 user stories en 6 épicas e historias técnicas.
- [HU-04-detalle.md](backlog/HU-04-detalle.md): user story HU-04 (extraer los datos a JSON) con criterios Gherkin.
- [HU-04-tickets-jira.md](backlog/HU-04-tickets-jira.md): 11 tickets de Jira (ORT-101 a ORT-111). ORT-101 está implementado en `backend/`.
