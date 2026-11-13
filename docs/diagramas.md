# Hito 1 – Parte II, Actividad 1: Construyendo diagramas con GenAI
Grupo 11 – Caso OrigenTours

## Prompt 1: Diagrama de secuencia en PlantUML (app de transporte similar a Uber)
Prompt usado en ChatGPT y en Claude: "Dame un ejemplo de un diagrama de secuencia en PlantUML de una app de transporte similar a Uber"

### Respuesta de ChatGPT

Actores y componentes: Pasajero, App del pasajero, Backend, Servicio de geolocalización, Conductor, Servicio de pagos.

```plantuml
@startuml
title Diagrama de Secuencia - Aplicación de Transporte

autonumber

actor Pasajero
participant "App Pasajero" as App
participant "Backend" as Backend
participant "Servicio de Geolocalización" as Geo
participant "App Conductor" as DriverApp
actor Conductor
participant "Servicio de Pagos" as Payment

== Solicitud del viaje ==

Pasajero -> App: Ingresar destino
App -> Backend: Solicitar cotización
Backend -> Geo: Consultar conductores cercanos
Geo --> Backend: Lista de conductores disponibles
Backend --> App: Mostrar tarifa estimada

Pasajero -> App: Confirmar solicitud
App -> Backend: Crear solicitud de viaje

== Asignación del conductor ==

Backend -> DriverApp: Enviar solicitud de viaje
DriverApp -> Conductor: Mostrar solicitud

alt Conductor acepta
    Conductor -> DriverApp: Aceptar viaje
    DriverApp -> Backend: Confirmar aceptación
    Backend --> App: Conductor asignado
    App --> Pasajero: Mostrar datos del conductor

    == Inicio del viaje ==

    Conductor -> DriverApp: Marcar llegada
    DriverApp -> Backend: Notificar llegada
    Backend --> App: Notificar al pasajero

    Pasajero -> App: Confirmar encuentro
    Conductor -> DriverApp: Iniciar viaje
    DriverApp -> Backend: Actualizar estado a "En curso"
    Backend --> App: Notificar inicio del viaje

    == Finalización y pago ==

    Conductor -> DriverApp: Finalizar viaje
    DriverApp -> Backend: Enviar distancia y duración
    Backend -> Payment: Procesar cobro
    Payment --> Backend: Confirmar pago
    Backend --> App: Notificar viaje finalizado
    Backend --> DriverApp: Confirmar pago

    App --> Pasajero: Mostrar resumen y recibo

else Conductor rechaza
    Conductor -> DriverApp: Rechazar viaje
    DriverApp -> Backend: Notificar rechazo
    Backend -> Geo: Buscar otro conductor
    Geo --> Backend: Nuevos conductores disponibles
    Backend -> DriverApp: Enviar nueva solicitud
end

@enduml
```

ChatGPT acompañó el código con un resumen conceptual del flujo en 5 pasos (solicitud, asignación, aceptación, ejecución, pago) y una tabla explicando los elementos UML usados (actor, participant, ->, -->, alt/else, ==, autonumber).

### Respuesta de Claude

Flujo completo de un viaje: solicitud, asignación de conductor, recorrido y pago.

```plantuml
@startuml
title Flujo de un viaje - App de transporte

skinparam sequenceMessageAlign center
autonumber

actor Pasajero
actor Conductor
participant "App Pasajero" as AppP
participant "App Conductor" as AppC
participant "API Gateway" as API
participant "Servicio de Viajes" as Viajes
participant "Servicio de Emparejamiento" as Match
participant "Servicio de Tarifas" as Tarifas
participant "Servicio de Pagos" as Pagos
database "Base de Datos" as DB

== Solicitud del viaje ==
Pasajero -> AppP : Ingresa destino
AppP -> API : POST /viajes (origen, destino)
API -> Tarifas : calcularTarifaEstimada()
Tarifas --> API : tarifa estimada
API --> AppP : tarifa + tiempo estimado
Pasajero -> AppP : Confirma solicitud
AppP -> API : POST /viajes/confirmar
API -> Viajes : crearViaje()
Viajes -> DB : guardar viaje (estado: SOLICITADO)

== Emparejamiento ==
Viajes -> Match : buscarConductorCercano(ubicación)
Match -> DB : consultar conductores disponibles
DB --> Match : lista de conductores

loop hasta que un conductor acepte
    Match -> AppC : notificar solicitud de viaje (push)
    alt Conductor acepta
        Conductor -> AppC : Acepta viaje
        AppC -> API : PUT /viajes/{id}/aceptar
        API -> Viajes : asignarConductor()
        Viajes -> DB : actualizar estado: ACEPTADO
        Viajes --> AppP : notificar conductor asignado
        AppP --> Pasajero : muestra conductor y placa
    else Rechaza o expira el tiempo
        AppC --> Match : rechazo / timeout
        Match -> Match : siguiente conductor
    end
end

== Recorrido ==
loop cada 5 segundos
    AppC -> API : enviar ubicación GPS
    API -> Viajes : actualizarUbicación()
    Viajes --> AppP : ubicación en tiempo real
end

Conductor -> AppC : Inicia viaje
AppC -> API : PUT /viajes/{id}/iniciar
API -> Viajes : cambiar estado: EN_CURSO

Conductor -> AppC : Finaliza viaje
AppC -> API : PUT /viajes/{id}/finalizar
API -> Viajes : cambiar estado: FINALIZADO

== Pago y calificación ==
Viajes -> Tarifas : calcularTarifaFinal()
Tarifas --> Viajes : monto final
Viajes -> Pagos : cobrar(pasajero, monto)

alt Pago exitoso
    Pagos --> Viajes : pago aprobado
    Viajes --> AppP : recibo del viaje
    Viajes --> AppC : ganancia del viaje
else Pago fallido
    Pagos --> Viajes : pago rechazado
    Viajes --> AppP : solicitar otro método de pago
end

Pasajero -> AppP : Califica al conductor
AppP -> API : POST /calificaciones
API -> DB : guardar calificación
@enduml
```

Claude explicó los elementos usados: autonumber, secciones == ==, loop para el reintento de emparejamiento y el GPS, alt/else para los caminos alternos y --> para las respuestas.

### Análisis comparativo del grupo
- Claude propuso una arquitectura más rica: API Gateway, microservicios (Viajes, Emparejamiento, Tarifas, Pagos), base de datos, endpoints REST explícitos, estados del viaje (SOLICITADO, ACEPTADO, EN_CURSO, FINALIZADO), un loop de reintento con timeout, seguimiento GPS en tiempo real, pago fallido y calificación.
- ChatGPT fue más didáctico (resumen conceptual y tabla de elementos UML) e incluyó detalles de experiencia de usuario (marcar llegada, confirmar encuentro), pero con un backend monolítico, sin base de datos y modelando el reintento con alt en lugar de loop.
- El mismo prompt produjo enfoques distintos: comparar modelos agrega valor antes de elegir uno.

## Prompt 2: Renderizado del diagrama
Prompt usado en ambos: "Me puedes mostrar la gráfica de ese lenguaje?"

### ChatGPT
No renderizó el diagrama. Entregó el enlace a PlantUML Online para generarlo desde el código, una imagen de referencia ilustrativa tomada de un sitio de diseño de sistemas (aclarando que no corresponde al código) y una guía de lectura del diagrama (líneas de vida, mensajes, bloques alt/else, tiempo descendente).

### Claude
Renderizó una gráfica del diagrama directamente en la conversación, en versión simplificada: agrupó participantes (API, tarifas y notificaciones dentro de "App móvil" y "Viajes") y omitió los bloques alt y el loop de GPS para que se leyera bien, explicando esas decisiones. Remitió a PlantUML Online para la imagen exacta del código.

### Análisis comparativo del grupo
Ninguno de los dos ejecuta PlantUML realmente. Claude se acercó más al objetivo generando una visualización propia y explicando sus simplificaciones; ChatGPT fue más transparente al delegar el renderizado en la herramienta adecuada. Para resultados exactos, el código debe pegarse en plantuml.com o renderizarse con una extensión del IDE.

## Prompt 3: Arquitectura AWS con la librería Diagrams (Python)
Prompt usado en ambos: "Ahora ayúdame a crear el diagrama de arquitectura utilizando la librería Diagrams y Python para pintarla suponiendo que uso AWS"

### ChatGPT
Entregó un script Python con la librería Diagrams basado en ECS Fargate, RDS PostgreSQL, Lambda, API Gateway, Cognito, DynamoDB, ElastiCache, SQS/SNS, S3 y CloudWatch. Acompañó el código con una tabla de componentes y responsabilidades, el flujo explicado en 6 pasos, instrucciones de instalación (pip install diagrams + Graphviz) y mejoras sugeridas: WebSocket para tiempo real, pasarela de pagos tipo Stripe y Auto Scaling. Incluyó imágenes de referencia tomadas de la web y recomendó diferenciar el diagrama de secuencia (comportamiento dinámico) del de arquitectura (infraestructura).

### Claude
Entregó el script arquitectura_aws.py con una arquitectura orientada a eventos: borde con Route 53, CloudFront y WAF; Cognito; API Gateway REST y WebSocket; seis microservicios en EKS (Viajes, Matching, Tarifas, Ubicación, Pagos, Notificaciones); Kinesis para el GPS en vivo; EventBridge, SQS y SNS; datos en Aurora, DynamoDB, ElastiCache Redis (geo-índice) y S3; CloudWatch y Stripe. Aclaró que no podía ejecutar el script en su entorno y dio las instrucciones para correrlo localmente.

### Análisis comparativo del grupo
Ambos coinciden en el núcleo (API Gateway, Cognito, DynamoDB, SQS/SNS, S3, CloudWatch) y ninguno renderiza la imagen desde el chat: el script debe ejecutarse localmente con la librería Diagrams y Graphviz. ChatGPT fue más didáctico (tabla, flujo, consideraciones); Claude más profundo en arquitectura de eventos y tiempo real (Kinesis, EventBridge, WebSocket, geo-índice). Para la PoC tomaremos el núcleo común y lo simplificaremos: una PoC no necesita microservicios ni streaming.
