export const cardVertexShader = /* glsl */ `
  uniform float uVelocity;
  uniform float uZoneCenter;
  varying vec2 vUv;
  varying float vWorldX;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Doblado cilíndrico local sutil en la tarjeta
    pos.z -= pow(pos.x, 2.0) * 0.08;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldX = worldPosition.x;

    // Profundidad continua Z: se hunden hacia el fondo a la derecha sin colisionar
    float normX = clamp((worldPosition.x + 3.5) / 7.0, 0.0, 1.0);
    worldPosition.z -= pow(normX, 1.5) * 0.8;

    // Transformación a View Space (posición respecto a la lente de la cámara)
    vec4 mvPosition = viewMatrix * worldPosition;

    // Distorsión de lente (ojo de pez / barrel distortion)
    float radius = length(mvPosition.xy);

    // Énfasis del lado izquierdo de la pantalla: la lente se exagera hacia la izquierda (x negativa)
    float sideWeight = 1.0 + 0.8 * smoothstep(0.0, -3.0, mvPosition.x);

    // Empuje convexo esférico: a mayor distancia del centro visual, más se abomba hacia la cámara (-Z)
    mvPosition.z += pow(radius * 0.28, 2.2) * 0.45 * sideWeight;

    // Leve deformación radial en X e Y para simular la curvatura óptica de la lente
    mvPosition.xy *= 1.0 + pow(radius * 0.2, 2.0) * 0.06 * sideWeight;

    // Atracción gravitatoria: rampa exponencial monótona anclada a la pantalla (uZoneCenter = halfW * 0.93, calculado por viewport en ClusterContra).
    // Arranca en ZONE_START_REL con máscara 0 y crece saturando suavemente hacia ZONE_MAX hasta que el fade desaparece la tarjeta: nunca baja ni cambia bruscamente de dirección.
    // Fila superior: atrae el borde superior hacia arriba; fila inferior: atrae las puntas hacia abajo.
    const float ZONE_START_REL = 0.78;
    const float ZONE_K = 8.0;
    const float ZONE_MAX = 2.5;
    float zoneRelX = mvPosition.x / uZoneCenter;
    float zoneMask = max(ZONE_MAX * (1.0 - exp(-ZONE_K * (zoneRelX - ZONE_START_REL))), 0.0);
    float zoneRowSign = sign(mvPosition.y);
    float zoneEdge = zoneRowSign > 0.0 ? uv.y : 1.0 - uv.y;
    float zoneCurve = (exp(2.0 * zoneEdge) - 1.0) / (exp(2.0) - 1.0);
    mvPosition.y += 0.3 * zoneMask * zoneCurve * zoneRowSign;

    gl_Position = projectionMatrix * mvPosition;
  }
`

export const cardFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uRadius;
  uniform float uOpacity;
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform float uTextureAspect;
  uniform float uHasTexture;
  uniform vec4 uFadeEdges;
  uniform float uVelocity;

  varying vec2 vUv;
  varying float vWorldX;

  float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 p = vUv - 0.5;
    vec2 halfSize = vec2(0.5);
    float radius = uRadius;
    float dist = roundedBoxSDF(p, halfSize, radius);

    float aa = fwidth(dist) * 1.5;
    float alpha = 1.0 - smoothstep(-aa, aa, dist);

    // Fade horizontal de bordes: las tarjetas se disuelven al entrar/salir del viewport
    float edgeFade = 1.0;
    edgeFade *= smoothstep(uFadeEdges.x, uFadeEdges.y, vWorldX);
    edgeFade *= 1.0 - smoothstep(uFadeEdges.z, uFadeEdges.w, vWorldX);
    alpha *= edgeFade;

    vec3 color = uColor;

    if (uHasTexture > 0.5) {
      float cardAspect = uResolution.x / uResolution.y;
      float texAspect = uTextureAspect;

      vec2 scale = vec2(1.0);
      if (texAspect > cardAspect) {
        scale.x = cardAspect / texAspect;
      } else {
        scale.y = texAspect / cardAspect;
      }

      vec2 coverUv = vec2(0.5) + (vUv - 0.5) * scale;

      vec4 texColor = texture2D(uTexture, coverUv);

      // Motion blur direccional: 2 muestras extra a lo largo del eje U
      float blur = clamp(abs(uVelocity) * 0.04, 0.0, 0.05);
      if (blur > 0.001) {
        vec4 sample1 = texture2D(uTexture, coverUv + vec2(blur * 0.5, 0.0));
        vec4 sample2 = texture2D(uTexture, coverUv - vec2(blur * 0.5, 0.0));
        texColor = (texColor + sample1 + sample2) / 3.0;
      }

      // Saturation boost (1.4x)
      vec3 luminance = vec3(dot(texColor.rgb, vec3(0.299, 0.587, 0.114)));
      texColor.rgb = luminance + 1.4 * (texColor.rgb - luminance);

      // Contrast boost
      texColor.rgb = (texColor.rgb - 0.5) * 1.15 + 0.5;

      // Clamp to valid range
      texColor.rgb = clamp(texColor.rgb, 0.0, 1.0);

      color = mix(color, texColor.rgb, 0.95);
    }

    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`