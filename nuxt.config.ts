export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['nuxt-security'],

  vite: {
    optimizeDeps: {
      include: ['three'],
    },
    ssr: {
      noExternal: ['three'],
    },
  },
})
