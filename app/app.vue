<script setup lang="ts">
const faviconSvg = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<circle cx="16" cy="16" r="16" fill="#ffffff"/>` +
    `<path d="M16 1 L19 13 L31 16 L19 19 L16 31 L13 19 L1 16 L13 13 Z" fill="#15131a"/>` +
    `</svg>`,
)

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: faviconSvg },
    { rel: 'preconnect', href: 'https://api.fontshare.com', crossorigin: '' },
    { rel: 'preconnect', href: 'https://cdn.fontshare.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,900&display=swap' },
  ],
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style>
@import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,900&display=swap');

@font-face {
  font-family: 'Cabinet Grotesk';
  src: url('/fonts/CabinetGrotesk-900.woff2') format('woff2');
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Cabinet Grotesk';
  src: url('/fonts/CabinetGrotesk-800.woff2') format('woff2');
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}

.font-display {
  font-family: 'Cabinet Grotesk', sans-serif !important;
  font-weight: 900 !important;
}

html,
body {
  margin: 0;
  padding: 0;
}
</style>
