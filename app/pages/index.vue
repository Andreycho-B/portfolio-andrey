<template>
  <main class="page">
    <header class="header">
      <p class="role">Portfolio</p>
      <h1 class="name">Andrey Rondón</h1>
      <p class="status">En construcción</p>
    </header>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  background: #0a0a0a;
  color: #fafafa;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

.header {
  max-width: 32rem;
  text-align: center;
}

.role {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  letter-spacing: 0.125em;
  text-transform: uppercase;
  color: #a3a3a3;
}

.name {
  margin: 0 0 1rem;
  font-size: clamp(2.5rem, 8vw, 5rem);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.status {
  margin: 0;
  font-size: 1rem;
  color: #737373;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none;
    transition: none;
  }
}
</style>