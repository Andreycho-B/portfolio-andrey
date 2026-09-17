<script setup lang="ts">
export interface ProjectItem {
  id: string
  number: string
  title: string
  subtitle: string
  category: string
  description: string
  url: string
  badge: string
  tags: string[]
}

defineEmits<{
  'close': []
}>()

const projects: ProjectItem[] = [
  {
    id: 'ai-agent-standard',
    number: '01',
    title: 'Estándar para Agentes',
    subtitle: 'AI AGENT ENGINEERING STANDARD',
    category: 'Gobernanza & Arquitectura de IA · 2026',
    description:
      'Marco canónico de 32 documentos técnicos normativos (CC BY 4.0) que rige la interacción, memoria viva, protocolos operativos y calidad de código para agentes autónomos de inteligencia artificial.',
    url: 'https://github.com/Andreycho-B/ai-agent-engineering-standard.git',
    badge: 'GitHub · Open Source',
    tags: ['v4.5', '32 Estándares', 'CC BY 4.0', 'Prompt Engineering'],
  },
  {
    id: 'tu-super',
    number: '02',
    title: 'Tu Súper',
    subtitle: 'SUPERMERCADO DIGITAL REACTIVO',
    category: 'E-Commerce & Plataforma Web · 2026',
    description:
      'Plataforma de compras y supermercado digital contemporáneo de alta velocidad con catálogo reactivo, gestión de pedidos en tiempo real y experiencia de usuario fluida sin fricciones.',
    url: 'https://tusuperfront.onrender.com/home',
    badge: 'Web App · Live Production',
    tags: ['Vue 3', 'Catálogo Dinámico', 'E-Commerce', 'Fullstack'],
  },
  {
    id: 'mias-hamburguesas',
    number: '03',
    title: 'Mías Hamburguesas de Lujo',
    subtitle: 'GASTRONOMÍA GOURMET & EXPERIENCIA DIGITAL',
    category: 'Food Experience & Carrito Flotante · 2026',
    description:
      'Experiencia interactiva de alta gama para hamburguesería de autor, con menú dinámico, carrito de compras flotante reactivo y diseño visual gastronómico contemporáneo.',
    url: 'https://mias-hamburguesas-de-lujoo.pages.dev/',
    badge: 'Cloudflare Pages · En Vivo',
    tags: ['Svelte', 'Vite', 'Carrito Flotante', 'UI Gourmet'],
  },
]
</script>

<template>
  <div class="projects-list-overlay" role="region" aria-label="Lista de proyectos de Andrey Rondón">
    <div class="projects-list-container">
      <!-- Encabezado Editorial -->
      <header class="list-header">
        <div class="list-header__left">
          <span class="list-header__tag">PROYECTOS DESTACADOS // 2026</span>
          <h2 class="list-header__title">Índice de Proyectos</h2>
        </div>
        <button
          class="list-header__close"
          type="button"
          aria-label="Cerrar vista de lista y volver al carrusel"
          @click="$emit('close')"
        >
          <span>volver al carrusel</span>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" class="close-icon" aria-hidden="true">
            <path d="M12 4L4 12M4 4l8 8" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      <div class="list-divider" aria-hidden="true" />

      <!-- Listado de Proyectos -->
      <ul class="projects-grid">
        <li v-for="project in projects" :key="project.id" class="project-row">
          <a
            :href="project.url"
            target="_blank"
            rel="noopener noreferrer"
            class="project-link"
            :aria-label="`${project.title} — Abrir enlace externo`"
          >
            <div class="project-left">
              <span class="project-number">{{ project.number }}</span>
              <div class="project-headings">
                <div class="project-category-row">
                  <span class="project-category">{{ project.category }}</span>
                  <span class="project-badge">{{ project.badge }}</span>
                </div>
                <h3 class="project-title">
                  {{ project.title }}
                  <span class="project-arrow" aria-hidden="true">↗</span>
                </h3>
                <span class="project-subtitle">{{ project.subtitle }}</span>
                <p class="project-description">{{ project.description }}</p>
                <div class="project-tags">
                  <span v-for="tag in project.tags" :key="tag" class="tag-pill">{{ tag }}</span>
                </div>
              </div>
            </div>

            <div class="project-action" aria-hidden="true">
              <span class="action-label">visitar proyecto</span>
              <div class="action-circle">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" class="arrow-svg">
                  <path d="M2.5 11.5L11.5 2.5M4 2.5h7.5V10" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
            </div>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
@font-face {
  font-family: 'Space Grotesk Variable';
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url('/fonts/space-grotesk-variable.woff2') format('woff2');
}

@font-face {
  font-family: 'Le Murmure';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/LeMurmure-Regular.woff2') format('woff2');
}

.projects-list-overlay {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 80px 24px 100px;
  user-select: text;
  -webkit-user-select: text;
}

.projects-list-container {
  width: 100%;
  max-width: 1060px;
  margin: 0 auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 24px;
}

.list-header__tag {
  display: block;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #0066ff;
  margin-bottom: 6px;
}

.list-header__title {
  margin: 0;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 800;
  font-size: clamp(2rem, 4vw, 3rem);
  letter-spacing: -0.03em;
  color: #15131a;
  line-height: 1.05;
}

.list-header__close {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 16px;
  background: #ffffff;
  border: 1px solid #15131a;
  border-radius: 14px;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #15131a;
  cursor: pointer;
  outline: none;
  transition:
    background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.2s ease,
    transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.list-header__close .close-icon {
  width: 14px;
  height: 14px;
}

.list-header__close:hover {
  background: #15131a;
  color: #ffffff;
}

.list-divider {
  width: 100%;
  height: 1px;
  background: rgba(21, 19, 26, 0.12);
  margin-bottom: 32px;
}

.projects-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.project-row {
  background: #ffffff;
  border: 1px solid rgba(21, 19, 26, 0.10);
  border-radius: 20px;
  transition:
    border-color 0.25s ease,
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.project-row:hover {
  border-color: #0066ff;
  transform: translateY(-3px);
  box-shadow: 0 16px 36px rgba(0, 102, 255, 0.08);
}

.project-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 36px;
  text-decoration: none;
  color: inherit;
  gap: 28px;
}

.project-left {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  flex: 1;
}

.project-number {
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 800;
  font-size: 1.25rem;
  letter-spacing: 0.08em;
  color: #9ca3af;
  margin-top: 4px;
  transition: color 0.2s ease;
}

.project-row:hover .project-number {
  color: #0066ff;
}

.project-headings {
  flex: 1;
}

.project-category-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.project-category {
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 600;
  font-size: 0.6875rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6b7280;
}

.project-badge {
  display: inline-block;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 600;
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0066ff;
  background: rgba(0, 102, 255, 0.08);
  padding: 3px 8px;
  border-radius: 6px;
}

.project-title {
  margin: 0 0 4px;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 800;
  font-size: clamp(1.4rem, 2.4vw, 1.85rem);
  letter-spacing: -0.02em;
  color: #15131a;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s ease;
}

.project-arrow {
  display: inline-block;
  font-size: 1.2rem;
  color: #9ca3af;
  transition:
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.2s ease;
}

.project-row:hover .project-title {
  color: #0066ff;
}

.project-row:hover .project-arrow {
  color: #0066ff;
  transform: translate(4px, -4px);
}

.project-subtitle {
  display: block;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 12px;
}

.project-description {
  margin: 0 0 16px;
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 400;
  font-size: 0.9375rem;
  line-height: 1.55;
  color: #4b5563;
  max-width: 680px;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-pill {
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 500;
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  color: #374151;
  background: #f3f4f6;
  padding: 4px 10px;
  border-radius: 999px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.project-row:hover .tag-pill {
  background: #edf3ff;
  color: #0052ff;
}

.project-action {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.action-label {
  font-family: 'Space Grotesk Variable', sans-serif;
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9ca3af;
  transition: color 0.2s ease;
}

.action-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #15131a;
  transition:
    background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.25s ease,
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.arrow-svg {
  width: 16px;
  height: 16px;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.project-row:hover .action-label {
  color: #0066ff;
}

.project-row:hover .action-circle {
  background: #0066ff;
  color: #ffffff;
  transform: scale(1.08);
}

.project-row:hover .arrow-svg {
  transform: translate(2px, -2px);
}

@media (max-width: 768px) {
  .projects-list-overlay {
    padding: 68px 16px 90px;
  }

  .list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .project-link {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px 20px;
    gap: 20px;
  }

  .project-left {
    gap: 16px;
  }

  .project-action {
    width: 100%;
    justify-content: space-between;
    padding-top: 14px;
    border-top: 1px solid rgba(21, 19, 26, 0.08);
  }
}
</style>
