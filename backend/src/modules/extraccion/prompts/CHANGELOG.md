# Prompts de extracción

## extraccion-v1.1

Agrega R9: si un mismo campo trae cifras o datos contradictorios, la confianza baja de 0,7, el campo entra en `campos_ambiguos` y la evidencia es el fragmento de la primera mención. Esta versión es la que carga el servicio por defecto. La v1.0 no se modifica.

## extraccion-v1.0

Primera versión. Incluye las reglas R1, R2, R3, R5, R6 y R7, y dos ejemplos: una solicitud completa y otra incompleta con fecha relativa. El canal lo asigna el sistema y no forma parte del esquema que ve el modelo.
