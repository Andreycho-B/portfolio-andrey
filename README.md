# andreyrondon.dev

Portafolio personal de Andrey Rondón. Sitio estático generado con Nuxt 4 y Vue 3, desplegado en Vercel.

## Stack

- Nuxt 4 (modo SSG / `generate`)
- Vue 3 + TypeScript
- three.js (render WebGL directo)
- nuxt-security (headers de seguridad; CSP aplicada por `vercel.json`)
- @playwright/test (suite e2e local, sin CI)
- pnpm

## Scripts

```bash
pnpm install          # Instalar dependencias
pnpm dev              # Servidor de desarrollo en http://localhost:3000
pnpm generate         # Build de producción (SSG) hacia .output/public/
pnpm preview          # Previsualizar build de producción
pnpm typecheck        # Verificación de tipos (vue-tsc)
pnpm test:e2e         # Suite e2e (Playwright contra el build SSG)
```

## Estructura

```
app/
  app.vue                    # Componente raíz (favicon, viewport, reset)
  pages/index.vue            # Orquestación: IntroGate + WebGLScene con LiveCard
  components/IntroGate.vue   # Portada: ConstellationGrid + botón "ingresar con sonido"
  components/ConstellationGrid.vue # Fondo de constelación (canvas 2D, 2 capas, física de nodos)
  components/WebGLScene.vue  # Escena THREE reutilizable (SceneContext, context lost/restored)
  components/LiveCard.vue    # Tarjeta polaroid en canvas 2D (CanvasTexture)
  composables/useWebGLTier.ts  # Detección WebGL y DPR
public/
  fonts/                     # Space Grotesk Variable + Le Murmure (woff2)
  robots.txt
tests/e2e/portfolio.spec.ts  # Suite Playwright: gate, escena, tarjeta, back-nav, mobile
playwright.config.ts         # webServer: generate + preview (localhost:3000)
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