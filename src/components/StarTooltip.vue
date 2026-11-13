<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { SCENE_KEY } from '@/composables/useScene'
import { HAUTEUR_FRISE } from '@/scene/layout'
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
/**
 * Clearance kept between the bottom of the frise and the top of the bubble, so
 * a sentence never sits flush against the navigation.
 */
const DEGAGEMENT_FRISE = 8
/**
 * How far the patch of night bleeds above the bubble — the vertical half of the
 * `::before` inset below, which a test keeps in step. The bubble's own text is
 * not the whole bubble: without this, a bubble resting just under the frise put
 * its background over « À QUAI », which is the defect we set out to fix.
 */
const DEBORD_TACHE = 16

type Survol = { trace: Trace; x: number; y: number; age: string; gauche: number; dessus: boolean }

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
    // Beside the star, but never past either edge: clamped, not flipped, so a
    // star in the middle of a phone still gets a bubble that fits.
    gauche: Math.max(
      MARGE,
      Math.min(x + ECART, window.innerWidth - MARGE - largeur),
    ),
    // Below the point when it would run into the frise. The top 116 px are the
    // navigation, not the sky: measured against 0, a star just under the frise
    // wrote its sentence across « ici » and « PROCHAIN ARRÊT », and neither the
    // sentence nor the station could be read.
    dessus: y - ECART - HAUTEUR_MAX >= HAUTEUR_FRISE + DEGAGEMENT_FRISE,
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
  return {
    left: `${s.gauche}px`,
    ...(s.dessus
      ? { bottom: `${window.innerHeight - (s.y - ECART)}px` }
      : // Never high enough for the patch to reach the frise. `starHover` carries
        // the pointer, not the star, and hovering reaches 14 px: a star of the
        // very first row is caught from y = 102.
        { top: `${Math.max(s.y + ECART, HAUTEUR_FRISE + DEBORD_TACHE)}px` }),
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

/*
 * A patch of night behind the sentence, so it can be read over the white grain
 * of the massif. Black becomes the colour of the night everywhere (CONCEPT §6),
 * so the patch is mixed from `--fond` and follows the eye on its own.
 *
 * The last stop reaches 100 % on purpose. With `ellipse at center` the implicit
 * `farthest-corner` puts the middle of each side at 1/√2 ≈ 71 % of the ray:
 * stopping before that would leave the end of a long sentence on bare grain.
 * The price is an edge — the box cuts a gradient still ~60 % opaque, which
 * shows as a straight step on bright grain. Traded for legibility, on purpose:
 * docs/superpowers/specs/2026-11-13-bulle-lisible-design.md §2.
 */
.bulle::before {
  content: '';
  position: absolute;
  inset: -16px -28px;
  z-index: -1;
  background: radial-gradient(
    ellipse at center,
    color-mix(in srgb, var(--fond) 94%, transparent) 0%,
    color-mix(in srgb, var(--fond) 88%, transparent) 35%,
    color-mix(in srgb, var(--fond) 78%, transparent) 62%,
    color-mix(in srgb, var(--fond) 0%, transparent) 100%
  );
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
