<script setup lang="ts">
/**
 * La commande du réverbère d'« ailleurs » : un bouton transparent posé sur le
 * mât, pour que le clavier et le lecteur d'écran atteignent la lampe que la
 * souris éteint d'un clic sur le canvas.
 *
 * Même parti que la commande de l'horloge (`PanneauDeparts.vue`) : le geste
 * passe par `Scene.basculerReverbere()`, qui tient la règle en un seul endroit,
 * et la boîte est **celle de la scène** — `CIBLE_REVERBERE`, le rectangle que
 * `Quai.reverbereTouche` teste, converti en pixels d'écran par le cadre.
 * La souris et le clavier visent ainsi exactement la même chose, et un réglage
 * de la lampe les déplace tous deux.
 *
 * L'état ne se devine pas : il vient de la scène, par `reverbere`. C'est elle
 * qui rallume la lampe d'office quand la gare quitte le champ — un jouet, pas
 * un réglage — et sans cet événement le bouton dirait « Allumer le réverbère »
 * sur une lampe rallumée au retour.
 */
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { FRAME_KEY, SCENE_KEY } from '@/composables/useScene'
import { cibleReverbere } from '@/scene/quai'
import { useVoyage } from '@/stores/voyage'

const frame = inject(FRAME_KEY, ref(null))
const scene = inject(SCENE_KEY, ref(null))
const voyage = useVoyage()

const allume = ref(true)

// La scène arrive après le montage : on s'abonne quand elle paraît, comme
// `StarTooltip`, et on lui demande son état courant plutôt que de le supposer.
let detacher: (() => void) | null = null
watch(
  scene,
  (courante) => {
    detacher?.()
    detacher = courante?.on('reverbere', (a) => { allume.value = a }) ?? null
    if (courante) allume.value = courante.reverbereAllume
  },
  { immediate: true },
)
onBeforeUnmount(() => detacher?.())

// Ni « ailleurs » ni cadre : pas de commande. Le bouton se pose sur la place
// **d'arrêt** du mât, comme la commande de l'horloge : en route il est
// désactivé, et le CSS le retire alors du test de survol.
const place = computed<Record<string, string> | null>(() => {
  if (voyage.gare !== 'ailleurs') return null
  const f = frame.value
  if (!f) return null
  // La même cible que `Quai.reverbereTouche`, à la même échelle : elle tient
  // 44 px d'écran à toute échelle, et les deux côtés la calculent pareil.
  const c = cibleReverbere(f.scale)
  return {
    left: `${f.offsetX + c.x0 * f.scale}px`,
    top: `${f.offsetY + c.y0 * f.scale}px`,
    width: `${(c.x1 - c.x0) * f.scale}px`,
    height: `${(c.y1 - c.y0) * f.scale}px`,
  }
})
</script>

<template>
  <!-- Pas de `@keydown` : un vrai bouton répond déjà à Entrée et à Espace par un
       `click`, et les deux gestionnaires feraient deux bascules. Même faute au
       pointeur : `useScene` écoute `pointerdown` sur `window` et `clicPx`
       bascule déjà le réverbère sur l'aire du mât — que ce bouton couvre.
       `@pointerdown.stop` laisse le `click` seul faire la bascule ; c'est le
       défaut corrigé le 20 novembre sur la commande de l'horloge.

       `aria-label` est **fixe** et `aria-pressed` porte seul l'état : c'est
       l'idiome du dépôt (la commande de l'horloge porte `aria-expanded` avec
       un nom fixe) et la pratique WAI-ARIA pour un bouton bascule. Un nom qui
       changerait *avec* `aria-pressed` s'annoncerait « Éteindre le réverbère,
       non pressé », qui se contredit à l'oreille. Pressé = la lampe est
       allumée, comme un interrupteur enfoncé. -->
  <button
    v-if="place"
    class="commande-reverbere"
    type="button"
    :aria-pressed="allume"
    aria-label="Réverbère"
    :disabled="voyage.enRoute"
    :style="place"
    @pointerdown.stop
    @click="scene?.basculerReverbere()"
  ></button>
</template>

<style scoped>
/* Transparente, jamais retirée : ni `display: none` ni `visibility: hidden`,
   qui la sortiraient de la tabulation. Le curseur est le seul indice, pour la
   souris, que le réverbère se clique. */
.commande-reverbere {
  position: fixed;
  box-sizing: border-box;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

/* Un bouton `disabled` reste touché par le test de survol et **avale**
   l'événement sans le laisser remonter. C'est une bande haute — le mât entier,
   ~210 px d'écran à 1512 — posée à la **place d'arrêt** du réverbère ; le train
   parti, la gare défile mais la bande reste, et pendant toute l'étape elle
   mangerait les clics qui y tombent, bulles d'étoiles comprises. C'est le
   défaut déjà corrigé sur le disque de l'horloge. Aucune des règles qui suivent
   ne parle du pointeur : rien ne vient l'écraser. */
.commande-reverbere:disabled {
  cursor: default;
  pointer-events: none;
}

.commande-reverbere:focus-visible {
  outline: 2px solid var(--texte);
  outline-offset: 2px;
}
</style>
