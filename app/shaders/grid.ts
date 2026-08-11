export const gridFragmentShader = /* glsl */ `
uniform vec2 uResolution;
uniform float uTime;
uniform float uGridSize;
uniform float uLineOpacity;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  vec2 gridUv = fract(uv * uGridSize);
  vec2 gridLine = abs(gridUv - 0.5);
  float lineDist = min(gridLine.x, gridLine.y);

  float lineWidth = 0.01;
  float lineIntensity = 1.0 - smoothstep(0.0, lineWidth, lineDist);
  float alpha = lineIntensity * uLineOpacity;

  gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
}
`

export const gridVertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`
