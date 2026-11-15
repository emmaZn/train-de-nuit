<script setup lang="ts">
/**
 * Le texte du panneau des prochains départs, posé sur son cadre.
 *
 * Le cadre est du décor, dans le canvas ; le texte est du DOM parce que c'est
 * du texte, et que trois de ses lignes sont des liens (focus clavier,
 * sélection, lecteur d'écran, mailto: — gratuits).
 *
 * Il vit hors des routes, comme `RepliquesOiseaux.vue` : l'URL change à l'instant
 * du clic, et dans une gare il serait détruit avant d'avoir pu s'effacer. Sa
 * visibilité vient du magasin : à quai à « ailleurs ». Au départ il s'efface
 * **sur place**, sans suivre le cadre image par image (spec §6.6).
 *
 * Place : `PIECES.panneau` dans le repère de scène, passé par le `Frame`
 * (`offset + position × scale`). Rien n'est recopié : déplacer la pièce déplace
 * le texte. Le texte rétrécit avec le cadre ; sur petit écran il deviendra
 * illisible — la porte reste ouverte (taille plancher, ou panneau détaché de
 * son cadre sous `SEUIL_MOBILE`, étape 5), elle n'est pas réglée ici.
 */
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { FRAME_KEY } from '@/composables/useScene'
import { CV, LINKEDIN, adresseMail } from '@/contenu/liens'
import { PIECES } from '@/scene/quai'
import { departsEteints, departsReels, formaterHeure } from '@/scene/horaires'
import type { Depart } from '@/scene/horaires'
import { useVoyage } from '@/stores/voyage'

const frame = inject(FRAME_KEY, ref(null))
const voyage = useVoyage()

const visible = computed(() => voyage.gare === 'ailleurs' && !voyage.enRoute)

// Une graine par arrivée : les lignes éteintes ne bougent pas pendant l'arrêt,
// pour ne pas distraire de la lecture des trois liens.
const graine = ref(Math.floor(Math.random() * 2 ** 31))
const maintenant = ref(new Date())
let minuterie = 0

function armer() {
  window.clearInterval(minuterie)
  minuterie = window.setInterval(() => { maintenant.value = new Date() }, 15_000)
}

watch(visible, (v) => {
  if (v) {
    graine.value = Math.floor(Math.random() * 2 ** 31)
    maintenant.value = new Date()
    armer()
  } else window.clearInterval(minuterie)
}, { immediate: true })

onBeforeUnmount(() => window.clearInterval(minuterie))

const lignes = computed<Depart[]>(() => [
  ...departsReels(maintenant.value),
  ...departsEteints(maintenant.value, graine.value, 3),
])
const heure = computed(() => formaterHeure(maintenant.value))

// Assemblée au montage : un <a> sans href ne prend pas le focus clavier.
const mail = `mailto:${adresseMail()}`
const HREF = { linkedin: LINKEDIN, cv: CV, ecrire: mail } as const

const place = computed(() => {
  const f = frame.value
  if (!f) return null
  const { x, y, largeur, hauteur } = PIECES.panneau
  return {
    left: `${f.offsetX + x * f.scale}px`,
    top: `${f.offsetY + y * f.scale}px`,
    width: `${largeur}px`,
    height: `${hauteur}px`,
    transform: `scale(${f.scale})`,
  }
})
</script>

<template>
  <Transition name="dissoudre">
    <div v-if="visible && place" class="panneau" :style="place" role="region" aria-label="Prochains départs">
      <p class="entete">
        <span>PROCHAINS DÉPARTS</span>
        <span class="heure">{{ heure }}</span>
      </p>
      <ul class="lignes">
        <li v-for="(d, i) in lignes" :key="i">
          <RouterLink
            v-if="d.lien === 'cv'"
            class="ligne reel"
            :to="CV"
          >
            <span>{{ d.heure }}</span><span>{{ d.destination }}</span><span>{{ d.statut }}</span>
          </RouterLink>
          <a
            v-else-if="d.lien"
            class="ligne reel"
            :href="HREF[d.lien]"
            :target="d.lien === 'linkedin' ? '_blank' : undefined"
            :rel="d.lien === 'linkedin' ? 'noopener noreferrer' : undefined"
          >
            <span>{{ d.heure }}</span><span>{{ d.destination }}</span><span>{{ d.statut }}</span>
          </a>
          <div v-else class="ligne eteint">
            <span>{{ d.heure }}</span><span>{{ d.destination }}</span><span>{{ d.statut }}</span>
          </div>
        </li>
      </ul>
    </div>
  </Transition>
</template>

<style scoped>
.panneau {
  position: fixed;
  transform-origin: 0 0;
  box-sizing: border-box;
  padding: 14px 16px;
  font-family: var(--police-mono);
  font-weight: 300;
  font-size: 13px;
  color: var(--texte);
  /* Le texte ne bloque rien : seuls les liens reçoivent le pointeur. */
  pointer-events: none;
}

.entete {
  display: flex;
  justify-content: space-between;
  margin: 0 0 14px;
  font-size: 11px;
  letter-spacing: 0.08em;
  opacity: var(--moyen);
}

.lignes {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ligne {
  display: grid;
  grid-template-columns: 3.4em 1fr auto;
  gap: 10px;
  padding: 3px 6px;
  margin: 0 -6px;
  color: inherit;
  text-decoration: none;
}

.reel {
  opacity: var(--fort);
  pointer-events: auto;
}

.eteint {
  opacity: var(--faible);
}

/* La ligne s'inverse : fond clair, texte en couleur de fond. */
.reel:hover,
.reel:focus-visible {
  background: var(--texte);
  color: var(--fond);
  outline: none;
}

.dissoudre-enter-active {
  transition: opacity 1.2s ease;
}

.dissoudre-leave-active {
  transition: opacity 0.5s ease;
}

.dissoudre-enter-from,
.dissoudre-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .dissoudre-enter-active,
  .dissoudre-leave-active {
    transition-duration: 0.2s;
  }
}
</style>
