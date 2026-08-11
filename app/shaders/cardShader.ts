export const cardVertexShader = /* glsl */ `
  uniform float uCurvature;
  uniform float uTime;
  uniform vec2 uResolution;

  varying vec2 vUv;
  varying float vCurvature;

  void main() {
    vUv = uv;
    vCurvature = uCurvature;

    vec3 pos = position;
    float x = pos.x;
    pos.z = -uCurvature * x * x;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

export const cardFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uRadius;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vCurvature;

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
    float edgeGlow = smoothstep(0.45, 0.5, length(p));
    color = mix(color, color * 0.85, edgeGlow * 0.3);

    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`
