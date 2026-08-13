# andreyrondon.dev

Portafolio personal de Andrey Rondón. Sitio estático generado con Nuxt 4 y Vue 3, desplegado en Vercel.

## Stack

- Nuxt 4 (modo SSG / `generate`)
- Vue 3 + TypeScript
- three.js (render WebGL directo)
- nuxt-security (headers + SRI)
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
  app.vue                    # Componente raíz (favicon, viewport)
  pages/index.vue            # Overlay HTML: modo lista ✦ carrusel con FLIP, proyectos
  components/WebGLScene.vue  # Escena THREE reutilizable (SceneContext)
  components/ClusterContra.vue # Marquee WebGL: 32 tarjetas con curva Contra
  composables/useWebGLTier.ts  # Detección WebGL y DPR
  shaders/cardShader.ts       # Shaders GLSL (doblado, fade de bordes, blur)
public/
  fonts/                     # Space Grotesk Variable + Le Murmure (woff2)
  images/projects/           # Texturas de las tarjetas (webp)
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