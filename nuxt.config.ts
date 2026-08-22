export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: import.meta.dev },

  modules: ['nuxt-security'],

  security: {
    headers: {
      contentSecurityPolicy: false,
    },
  },

  vite: {
    optimizeDeps: {
      include: ['three'],
    },
    ssr: {
      noExternal: ['three'],
    },
  },
})
