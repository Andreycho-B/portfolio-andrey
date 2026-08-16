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

    // Transformación a View Space
    vec4 mvPosition = viewMatrix * worldPosition;

    // Distorsión óptica de lente suave con énfasis asimétrico izquierdo
    float radius = length(mvPosition.xy);
    float sideWeight = 1.0 + 0.45 * smoothstep(0.0, -3.0, mvPosition.x);

    mvPosition.z += pow(radius * 0.22, 2.0) * 0.35 * sideWeight;
    mvPosition.xy *= 1.0 + pow(radius * 0.18, 2.0) * 0.04 * sideWeight;

    gl_Position = projectionMatrix * mvPosition;
  }
`

export const cardFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uRadius;
  uniform float uOpacity;
  uniform sampler2D uTexture;
  uniform float uCardAspect;
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
      float cardAspect = uCardAspect;
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

      // Calibración sutil de saturación y contraste sin posterización ni banding
      vec3 luminance = vec3(dot(texColor.rgb, vec3(0.299, 0.587, 0.114)));
      texColor.rgb = luminance + 1.15 * (texColor.rgb - luminance);
      texColor.rgb = (texColor.rgb - 0.5) * 1.08 + 0.5;
      texColor.rgb = clamp(texColor.rgb, 0.0, 1.0);

      color = mix(color, texColor.rgb, 0.98);
    }

    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`