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
import { REPLIQUES, duree, suivante, variante } from '@/components/repliques'

const scene = inject(SCENE_KEY, ref(null))

// TEMPORAIRE : le sélecteur de modèle de poteau, pour trancher à l'œil.
// À retirer avant de fondre la branche.
const modeles = ref<string[]>([])
const modeleActif = ref(0)
function choisirModele(i: number) {
  modeleActif.value = i
  scene.value?.setModelePoteau(i)
}
const phrase = ref<string | null>(null)
let dites = 0
let minuterie = 0

/**
 * La pirouette part **avant** la chute, donc avant que la phrase ne soit
 * choisie. On pousse donc la variante en avance : la scène n'a jamais à
 * demander, et l'événement reste à sens unique.
 */
function annoncer() {
  scene.value?.setProchaineVariante(variante(REPLIQUES[dites] ?? ''))
}

function surChute() {
  const texte = suivante(dites, Math.random)
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
    modeles.value = valeur?.modelesPoteau ?? []
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
  <nav v-if="modeles.length" class="modeles" aria-label="Modèle de poteau">
    <button
      v-for="(nom, i) in modeles"
      :key="nom"
      type="button"
      :class="{ actif: i === modeleActif }"
      @click="choisirModele(i)"
    >
      {{ nom }}
    </button>
  </nav>
  <button class="tomber" type="button" @click="scene?.faireTomberUnOiseau()">
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

/* TEMPORAIRE, avec le sélecteur ci-dessus. */
.modeles {
  position: fixed;
  left: 16px;
  bottom: 14px;
  z-index: 5;
  display: flex;
  gap: 14px;
  font: 10px var(--police-mono);
  letter-spacing: 0.04em;
}

.modeles button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: rgba(236, 236, 240, 0.3);
  cursor: pointer;
}

.modeles button:hover {
  color: rgba(236, 236, 240, 0.7);
}

.modeles button.actif {
  color: rgba(236, 236, 240, 0.95);
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
