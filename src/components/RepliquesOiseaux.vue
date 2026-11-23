<script setup lang="ts">
/**
 * Les répliques des bouvreuils.
 *
 * Elles vivent ici, hors des routes : l'URL change à l'instant du clic sur une
 * autre gare, bien avant que le train ne bouge, et dans une gare le composant
 * serait détruit au milieu d'une phrase.
 *
 * Elles paraissent **toujours au même endroit**, en haut au centre, une à la
 * fois. Posées là, elles n'ont ni à éviter le train ni à suivre l'oiseau, et
 * `birdFell` n'a donc pas besoin de coordonnées.
 */
import { inject, onBeforeUnmount, ref, watch } from 'vue'
import { SCENE_KEY } from '@/composables/useScene'
import { useVoyage } from '@/stores/voyage'
import { duree, suivante, variante } from '@/components/repliques'
import { useLangue } from '@/i18n'

const scene = inject(SCENE_KEY, ref(null))
// Le bouton n'existe qu'où le gag existe : ailleurs, il épuiserait les
// quatorze phrases ordonnées sans que rien ne tombe.
const voyage = useVoyage()
const langue = useLangue()
const phrase = ref<string | null>(null)
let dites = 0
let minuterie = 0

/**
 * La pirouette part **avant** la chute, donc avant que la phrase ne soit
 * choisie. On pousse donc la variante en avance : la scène n'a jamais à
 * demander, et l'événement reste à sens unique.
 */
function annoncer() {
  scene.value?.setProchaineVariante(variante(dites))
}

function surChute() {
  const texte = suivante(dites, Math.random, langue.langue)
  dites += 1
  phrase.value = texte
  window.clearTimeout(minuterie)
  minuterie = window.setTimeout(() => {
    phrase.value = null
  }, duree(texte))
  annoncer()
}

let detacher: (() => void) | null = null
watch(
  scene,
  (valeur) => {
    detacher?.()
    detacher = valeur?.on('birdFell', surChute) ?? null
    annoncer()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  detacher?.()
  window.clearTimeout(minuterie)
})
</script>

<template>
  <div class="repliques" aria-live="polite">
    <p v-if="phrase" class="replique">{{ phrase }}</p>
  </div>
  <button
    v-if="voyage.gare === 'plus-loin' && !voyage.enRoute"
    class="tomber"
    type="button"
    @click="scene?.faireTomberUnOiseau()"
  >
    faire tomber un oiseau
  </button>
</template>

<style scoped>
.repliques {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.replique {
  position: absolute;
  top: 140px;
  left: 50%;
  margin: 0;
  transform: translateX(-50%);
  isolation: isolate;
  white-space: nowrap;
  font-family: var(--police-texte);
  font-weight: 300;
  font-size: 15px;
  color: var(--texte);
  opacity: var(--fort);
  animation: paraitre 0.35s ease-out both;
}

/*
 * Une tache de nuit derrière la phrase, comme la bulle d'étoile : elle se lit
 * par-dessus le grain du massif. Mélangée depuis `--fond`, elle suit l'œil.
 */
.replique::before {
  content: '';
  position: absolute;
  inset: -10px -28px;
  z-index: -1;
  background: radial-gradient(
    ellipse at center,
    color-mix(in srgb, var(--fond) 94%, transparent) 0%,
    color-mix(in srgb, var(--fond) 88%, transparent) 35%,
    color-mix(in srgb, var(--fond) 78%, transparent) 62%,
    color-mix(in srgb, var(--fond) 0%, transparent) 100%
  );
}

@keyframes paraitre {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(6px);
  }
}

/*
 * Les six pixels que la phrase montait en paraissant. Ailleurs, les gardes ne
 * font que raccourcir les fondus : un fondu n'est pas un mouvement, et le §11
 * en demande partout — « gares en fondu ». Ici il y avait un déplacement, le
 * seul du DOM à n'être gardé par rien, et c'est lui qu'on retire. La recette
 * de rechange garde `translateX(-50%)` hors des étapes : c'est le centrage de
 * la phrase, pas son entrée.
 */
@media (prefers-reduced-motion: reduce) {
  .replique {
    animation-name: paraitre-sur-place;
  }
}

@keyframes paraitre-sur-place {
  from {
    opacity: 0;
  }
}

.tomber {
  position: fixed;
  right: 16px;
  bottom: 12px;
  z-index: 5;
  padding: 4px;
  border: 0;
  background: none;
  opacity: 0;
  font: 10px var(--police-mono);
  color: var(--texte);
  cursor: pointer;
}

.tomber:focus-visible {
  opacity: 1;
  outline: 1px solid var(--texte);
}
</style>
