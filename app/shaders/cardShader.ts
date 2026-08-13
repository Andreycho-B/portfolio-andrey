export const cardVertexShader = /* glsl */ `
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

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
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