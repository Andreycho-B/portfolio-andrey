export const bokehFragmentShader = /* glsl */ `
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 centered = uv - 0.5;
  float dist = length(centered);

  // Gaussian radial falloff
  float gaussian = exp(-dot(centered, centered) * 4.0);

  // Time-driven palette rotation
  float t = uTime * 0.15;
  float phase1 = sin(t) * 0.5 + 0.5;
  float phase2 = sin(t + 2.094) * 0.5 + 0.5;
  float phase3 = sin(t + 4.188) * 0.5 + 0.5;

  // Three-color swirl
  vec3 color = uColor1 * phase1 + uColor2 * phase2 + uColor3 * phase3;
  color *= gaussian * 0.3;

  gl_FragColor = vec4(color, gaussian * 0.25);
}
`

export const bokehVertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`
