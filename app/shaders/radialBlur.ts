import * as THREE from 'three'

export const radialBlurShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uVelocity: { value: 0 },
    uBlurStrength: { value: 0.5 },
    uSamples: { value: 8 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uVelocity;
    uniform float uBlurStrength;
    uniform int uSamples;
    varying vec2 vUv;

    void main() {
      vec2 center = vec2(0.5, 0.5);
      vec2 dir = vUv - center;
      float dist = length(dir);

      // No blur when velocity is zero (idle state)
      float blurAmount = uBlurStrength * uVelocity * dist;
      vec4 color = vec4(0.0);
      float total = 0.0;

      for (int i = 0; i < 16; i++) {
        if (i >= uSamples) break;
        float t = float(i) / float(uSamples - 1) - 0.5;
        vec2 offset = normalize(dir) * t * blurAmount;
        float weight = 1.0 - abs(t) * 2.0;
        color += texture2D(tDiffuse, vUv + offset) * weight;
        total += weight;
      }

      gl_FragColor = color / max(total, 0.001);
    }
  `,
}
