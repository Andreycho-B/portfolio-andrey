---
name: contra-visual-polish
description: >-
  Protocolo de calibración e iteración forense en 3 ciclos para el carrusel WebGL
  estilo Contra en Three.js/GLSL, auditando trayectoria, rotación 3D, deformación
  de vértices y renderizado de fragmentos.
---

# Contra Visual Polish Protocol (3-Loop Verification)

Este protocolo define el procedimiento sistemático para iterar y calibrar visualmente la escena WebGL hasta alcanzar paridad estética y geométrica con la referencia.

## Ciclos de Iteración (3 Loops)

### Loop 1: Topología y Desacople
1. Eliminar deformaciones divergentes en el shader (`zoneMask`, `uZoneCenter`).
2. Aplicar la función de trayectoria sigmoidea continua $Y(x)$ y profundidad $Z(x)$.
3. Verificar en navegador local que el efecto "reloj de arena" y los "spikes" exteriores desaparecen.

### Loop 2: Orientación 3D (Pitch, Yaw, Roll) y Óptica
1. Calcular e inyectar en CPU las rotaciones $(\text{rot}_X, \text{rot}_Y, \text{rot}_Z)$ de cada tarjeta.
2. Calibrar curvatura cilíndrica local $z' = -k \cdot x^2$ en el Vertex Shader.
3. Calibrar FOV y posición $Z$ de la cámara para encuadrar la apertura izquierda sin distorsión extrema.

### Loop 3: Tratamiento de Color, Texturas, Movimiento y Espacio Negativo
1. Ajustar el contraste y la saturación en el Fragment Shader para evitar *banding*.
2. Verificar el canal horizontal del texto HTML (`lista ✦ CARRUSEL`).
3. Validar suavidad de inercia y motion blur a 60 FPS con interacciones de rueda y touch.
