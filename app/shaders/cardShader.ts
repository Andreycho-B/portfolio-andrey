export const cardVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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

  varying vec2 vUv;

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