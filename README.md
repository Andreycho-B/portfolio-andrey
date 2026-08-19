# andreyrondon.dev

Portafolio personal de Andrey Rondón. Sitio estático generado con Nuxt 4 y Vue 3, desplegado en Vercel.

## Stack

- Nuxt 4 (modo SSG / `generate`)
- Vue 3 + TypeScript
- three.js (render WebGL directo)
- lottie-web (saludo animado de la portada)
- nuxt-security (headers de seguridad; CSP aplicada por `vercel.json`)
- pnpm

## Scripts

```bash
pnpm install          # Instalar dependencias
pnpm dev              # Servidor de desarrollo en http://localhost:3000
pnpm generate         # Build de producción (SSG) hacia .output/public/
pnpm preview          # Previsualizar build de producción
pnpm typecheck        # Verificación de tipos (vue-tsc)
```

## Estructura

```
app/
  app.vue                    # Componente raíz (favicon, viewport, reset)
  pages/index.vue            # Overlay HTML: portada + modo lista ✦ carrusel con FLIP, proyectos
  components/WebGLScene.vue  # Escena THREE reutilizable (SceneContext, context lost/restored)
  components/ClusterContra.vue # Marquee WebGL: 32 tarjetas con curva Contra + cinta
  components/ConstellationGrid.vue # Fondo de constelación (canvas 2D, física de nodos)
  components/DotPattern.vue  # Fondo de puntos detrás del carrusel (espejo WebGL del canvas 2D)
  components/IntroGate.vue   # Portada: ConstellationGrid + saludo Lottie + botón enter
  components/LottieAnimation.vue # Carga lottie-web (solo cliente, renderer SVG)
  composables/useWebGLTier.ts  # Detección WebGL y DPR
  shaders/cardShader.ts       # Shaders GLSL (doblado, fade de bordes, blur)
  shaders/dotPatternShader.ts # Shader del fondo de puntos (máscara elíptica)
public/
  fonts/                     # Space Grotesk Variable + Le Murmure (woff2)
  images/projects/           # Texturas de las tarjetas (webp)
  lottie/                    # intro.json (saludo de la portada)
.github/workflows/           # CI: build (generate) + security (audit, semgrep)
nuxt.config.ts               # Configuración Nuxt
vercel.json                  # Headers de seguridad (CSP, HSTS, …)
pnpm-workspace.yaml          # Configuración pnpm (build approvals)
tsconfig.json                # Configuración TypeScript
```

## Deploy

Production se sirve desde Vercel como sitio estático (preset `static`).

## Licencia

MIT. Ver [LICENSE](./LICENSE).