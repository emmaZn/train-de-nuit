<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { SCENE_KEY } from '@/composables/useScene'
import { ageRelatif } from '@/scene/dates'
import type { Trace } from '@/scene/types'

/** Gap between the star and the bubble, in CSS pixels. */
const ECART = 14
/** Widest the bubble gets; on a narrow phone it shrinks to the screen. */
const LARGEUR_MAX = 240
const MARGE = 16
/**
 * Tallest the bubble can be: a sentence is at most 80 characters, i.e. four
 * lines of 14 px at 240 px, plus the mono line. Decides when to flip below the
 * star; measuring the real box would mean showing it first, then moving it.
 */
const HAUTEUR_MAX = 110

type Survol = { trace: Trace; x: number; y: number; age: string; droite: boolean; dessus: boolean }

const scene = inject(SCENE_KEY, ref(null))
const survol = ref<Survol | null>(null)

function surEtoile(trace: Trace | null, x: number, y: number) {
  if (!trace) {
    // The scene reports `null` on every move that hits nothing: no change, no work.
    if (survol.value) survol.value = null
    return
  }
  // Same star, pointer drifting over it: the bubble stays where it was set.
  if (survol.value?.trace.id === trace.id) return
  const largeur = Math.min(LARGEUR_MAX, window.innerWidth - 2 * MARGE)
  survol.value = {
    trace,
    x,
    y,
    age: ageRelatif(trace.creeLe, Date.now()),
    // Flip left when the bubble would run past the right edge…
    droite: x + ECART + largeur <= window.innerWidth - MARGE,
    // …and below the point when it would run past the top.
    dessus: y - ECART - HAUTEUR_MAX >= 0,
  }
}

let detacher: (() => void) | null = null
watch(
  scene,
  (courante) => {
    detacher?.()
    detacher = courante?.on('starHover', surEtoile) ?? null
  },
  { immediate: true },
)
onBeforeUnmount(() => detacher?.())

const mention = computed(() => {
  const s = survol.value
  if (!s) return ''
  return [s.trace.prenom, s.age].filter(Boolean).join(' · ')
})

const position = computed(() => {
  const s = survol.value
  if (!s) return {}
  // Anchored by the edge nearest the star, so the box grows away from it
  // whatever the sentence length.
  return {
    ...(s.droite
      ? { left: `${s.x + ECART}px` }
      : { right: `${window.innerWidth - (s.x - ECART)}px` }),
    ...(s.dessus
      ? { bottom: `${window.innerHeight - (s.y - ECART)}px` }
      : { top: `${s.y + ECART}px` }),
  }
})
</script>

<template>
  <Transition name="bulle">
    <!-- aria-hidden : la liste masquée porte les mêmes phrases, la bulle ne ferait que les répéter. -->
    <div
      v-if="survol"
      :key="survol.trace.id"
      class="bulle"
      data-role="bulle"
      :data-cote="survol.droite ? 'droite' : 'gauche'"
      :data-sens="survol.dessus ? 'dessus' : 'dessous'"
      :style="position"
      aria-hidden="true"
    >
      <p class="phrase" data-role="phrase">{{ survol.trace.phrase }}</p>
      <p class="mention" data-role="mention">{{ mention }}</p>
    </div>
  </Transition>
</template>

<style scoped>
.bulle {
  position: fixed;
  z-index: 5;
  width: max-content;
  max-width: min(240px, calc(100vw - 32px));
  pointer-events: none;
}

.phrase {
  margin: 0;
  font-family: var(--police-texte);
  font-weight: 300;
  font-size: 14px;
  line-height: 1.4;
  color: var(--texte);
  opacity: var(--fort);
  overflow-wrap: anywhere;
}

.mention {
  margin: 4px 0 0;
  font-family: var(--police-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--texte);
  opacity: var(--moyen);
}

.bulle-enter-active {
  transition: opacity 0.35s ease;
}

.bulle-leave-active {
  transition: opacity 0.25s ease;
}

.bulle-enter-from,
.bulle-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .bulle-enter-active,
  .bulle-leave-active {
    transition: none;
  }
}
</style>
