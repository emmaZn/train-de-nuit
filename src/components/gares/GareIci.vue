<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useVoyage } from '@/stores/voyage'

const { enRoute } = storeToRefs(useVoyage())
</script>

<template>
  <Transition name="dissoudre">
    <div v-if="!enRoute" class="ici">
      <header class="signature">
        <p class="nom">Emmanuelle Zenou</p>
        <p class="titre">Front End Web Developer</p>
      </header>
      <p class="phrase">Chaque étoile est quelqu'un qui est passé par ici.</p>
    </div>
  </Transition>
</template>

<style scoped>
.ici {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.signature {
  position: absolute;
  top: 136px;
  left: 56px;
}

.nom {
  margin: 0;
  font-size: 19px;
  font-weight: 300;
  letter-spacing: 0.01em;
  opacity: var(--fort);
}

.titre {
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 300;
  opacity: var(--faible);
}

.phrase {
  position: absolute;
  top: 224px;
  left: 56px;
  margin: 0;
  max-width: 28ch;
  font-size: 15px;
  font-weight: 300;
  line-height: 1.7;
  opacity: var(--moyen);
}

/* Tout ce qui apparaît ou disparaît le fait par dissolution (CONCEPT.md §2). */
.dissoudre-enter-active {
  transition: opacity 2.4s ease;
}

.dissoudre-leave-active {
  transition: opacity 1.2s ease;
}

.dissoudre-enter-from,
.dissoudre-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .signature,
  .phrase {
    left: 16px;
    right: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dissoudre-enter-active,
  .dissoudre-leave-active {
    transition-duration: 0.2s;
  }
}
</style>
