export const bulgeVertexShader = /* glsl */ `
uniform float uCurvature;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normal;

  float distFromCenterSq = dot(uv - 0.5, uv - 0.5);
  float bulgeFactor = (1.0 - distFromCenterSq) * uCurvature;

  vec3 displacedPosition = position + normal * bulgeFactor;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}
`

export const bulgeFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uRadius;

varying vec2 vUv;

float roundedBoxSDF(vec2 p, vec2 halfSize, float radius) {
  return length(max(abs(p) - halfSize + vec2(radius), 0.0)) - radius;
}

void main() {
  vec2 centered = vUv - 0.5;
  float dist = roundedBoxSDF(centered, vec2(0.5), uRadius);

  float aaWidth = fwidth(dist) * 1.5;
  float alphaMask = 1.0 - smoothstep(-aaWidth, aaWidth, dist);

  if (alphaMask < 0.001) discard;

  gl_FragColor = vec4(uColor, uOpacity * alphaMask);
}
`