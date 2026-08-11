<script setup lang="ts">
const faviconSvg = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<rect width="32" height="32" fill="#ffffff"/>` +
    `<text x="16" y="22" text-anchor="middle" font-family="Georgia, serif" font-size="16" font-weight="700" fill="#15131a" letter-spacing="-0.5">AR</text>` +
    `</svg>`,
)

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: faviconSvg },
  ],
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
