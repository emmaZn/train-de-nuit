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
    <!-- Duotone : l'intérieur est légèrement éclairé plutôt que rempli d'une
         couleur fixe, sans quoi il disparaîtrait sur la nuit encre et
         trancherait sur les autres couleurs du cycle.
         Le trait est affiné à 1,25 : la source est dessinée en 2, qui faisait
         le double des traits de 1 px de la voie et des points de gare. -->
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M2 12C2 12 5.63636 5 12 5C18.3636 5 22 12 22 12C22 12 18.3636 19 12 19C5.63636 19 2 12 2 12ZM12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
        fill="currentColor"
        fill-opacity="0.18"
      />
      <path
        d="M2 12C2 12 5.63636 5 12 5C18.3636 5 22 12 22 12C22 12 18.3636 19 12 19C5.63636 19 2 12 2 12ZM15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<style scoped>
/* Même marge que la voie, et centré sur la voie elle-même (18 px, la moitié
   des 36 px du bouton) : sans ces deux repères, l'œil flotte dans le coin
   sans s'aligner sur rien. */
.oeil {
  position: fixed;
  top: calc(var(--haut-voie) - 18px);
  right: var(--marge-ecran);
  z-index: 3;
  /* En flux, un SVG traîne son interligne : le bouton ferait 40 px de haut
     pour une icône de 24, et le centrage tomberait à côté. */
  display: flex;
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
