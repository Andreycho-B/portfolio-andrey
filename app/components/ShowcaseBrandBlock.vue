<script setup lang="ts">
interface Props {
  tagline: string
  wordmark: string
}

defineProps<Props>()
</script>

<template>
  <div
    class="brand-block"
    role="banner"
    :aria-label="`${tagline} ${wordmark}`"
  >
    <span class="brand-tagline">{{ tagline }}</span>
    <svg
      class="brand-spark"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 1 L13.5 9.5 L22 12 L13.5 14.5 L12 23 L10.5 14.5 L2 12 L10.5 9.5 Z"
        fill="currentColor"
      />
    </svg>
    <span class="brand-wordmark">{{ wordmark }}</span>
  </div>
</template>

<style scoped>
.brand-block {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  padding: 2.5rem 0;
}

.brand-tagline {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--color-ink);
}

.brand-spark {
  width: 16px;
  height: 16px;
  color: var(--color-ink);
  flex-shrink: 0;
}

.brand-wordmark {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 44px;
  line-height: 1;
  font-weight: 600;
  color: var(--color-ink);
  letter-spacing: -0.01em;
}

@media (min-width: 1024px) {
  .brand-block {
    padding: 3.5rem 0;
  }
}

@media (max-width: 767px) {
  .brand-wordmark {
    font-size: 32px;
  }
  .brand-block {
    padding: 2rem 0;
  }
}
</style>
