import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['nuxt-security'],

  security: {
    headers: {
      xFrameOptions: 'DENY',
      permissionsPolicy: {
        camera: [],
        'display-capture': [],
        fullscreen: [],
        geolocation: [],
        microphone: [],
        'interest-cohort': [],
      },
      contentSecurityPolicy: {
        'script-src': [
          "'self'",
          "https:",
          "'unsafe-inline'",
          "'strict-dynamic'",
          "'nonce-{{nonce}}'",
        ],
      },
    },
  },
})
