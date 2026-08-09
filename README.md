# andreyrondon.dev

Portafolio personal de Andrey Rondón. Sitio estático generado con Nuxt 4 y Vue 3, desplegado en Vercel.

## Stack

- Nuxt 4 (modo SSG)
- Vue 3
- TypeScript
- pnpm

## Scripts

```bash
pnpm install          # Instalar dependencias
pnpm dev              # Servidor de desarrollo en http://localhost:3000
pnpm generate         # Build de producción (SSG) hacia .output/public/
pnpm preview           # Previsualizar build de producción
```

## Estructura

```
app/
  app.vue              # Componente raíz
  pages/
    index.vue          # Página principal
nuxt.config.ts         # Configuración Nuxt
public/                # Assets estáticos (favicon, robots.txt)
pnpm-workspace.yaml    # Configuración pnpm (build approvals)
tsconfig.json          # Configuración TypeScript
```

## Deploy

Production se sirve desde Vercel como sitio estático (preset `static`).

## Licencia

MIT. Ver [LICENSE](./LICENSE).