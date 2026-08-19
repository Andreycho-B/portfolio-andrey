// Fondo de puntos del carrusel renderizado DENTRO de la escena WebGL (cuadro espejo del canvas 2D).
// Evita apilar un canvas 2D debajo del canvas WebGL transparente: en algunos motores la capa 2D
// cubierta deja de componerse y el patrón desaparece (Safari iOS / Brave). El canvas 2D sigue
// dibujando (única fuente) y se sube como textura cada frame.
export const dotPatternVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const dotPatternFragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform vec2 uMaskCenter;
  uniform vec2 uMaskRadii;
  uniform float uMaskFadeEnd;

  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uTexture, vUv);
    // Máscara elíptica izquierda replicada del CSS (center 20 %/50 %, radios 45 %/65 %,
    // fade lineal hasta el 80 % del radio): la fracción es calibrable desde el componente.
    vec2 d = (vUv - uMaskCenter) / uMaskRadii;
    float t = length(d);
    float maskAlpha = clamp(1.0 - t / uMaskFadeEnd, 0.0, 1.0);
    gl_FragColor = vec4(tex.rgb, tex.a * maskAlpha * uOpacity);
  }
`