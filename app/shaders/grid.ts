export const gridVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const gridFragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uGridSize;
  uniform float uLineOpacity;

  void main() {
    vec2 coord = vUv * uGridSize;
    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = min(grid.x, grid.y);
    float alpha = 1.0 - min(line, 1.0);
    alpha *= uLineOpacity;

    vec3 color = vec3(0.05, 0.05, 0.05);
    gl_FragColor = vec4(color, alpha);
  }
`
