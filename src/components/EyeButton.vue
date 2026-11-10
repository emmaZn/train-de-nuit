<script setup lang="ts">
import { DEFAUT, nextFond } from '@/scene/palette'

withDefaults(defineProps<{ fond?: string }>(), { fond: DEFAUT })
defineEmits<{ change: [fond: string] }>()
</script>

<template>
  <button
    type="button"
    class="oeil"
    aria-label="Changer la couleur de la nuit"
    @click="$emit('change', nextFond(fond))"
  >
    <svg viewBox="0 0 24 16" width="24" height="16" aria-hidden="true" focusable="false">
      <path
        d="M1 8c4-6 18-6 22 0-4 6-18 6-22 0Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linejoin="round"
      />
      <circle cx="12" cy="8" r="2.6" fill="none" stroke="currentColor" stroke-width="1" />
    </svg>
  </button>
</template>

<style scoped>
.oeil {
  position: fixed;
  top: 22px;
  right: 24px;
  z-index: 3;
  padding: 6px;
  border: 0;
  background: none;
  color: var(--trait);
  opacity: var(--faible);
  cursor: pointer;
  transition: opacity 0.6s ease;
}

.oeil:hover,
.oeil:focus-visible {
  opacity: var(--fort);
}

.oeil:focus-visible {
  outline: 1px solid var(--trait);
  outline-offset: 4px;
}
</style>
