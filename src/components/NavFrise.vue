<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  ANCRE_FRISE,
  ANCRE_FRISE_MOBILE,
  SEUIL_MOBILE,
  ecartFrise,
  garesVisibles,
} from '@/scene/layout'
import type { Gare } from '@/scene/types'
import { GARES, useVoyage } from '@/stores/voyage'

/** Les routes gardent le tiret, les libellés non. */
const LIBELLES: Record<Gare, string> = {
  ici: 'ici',
  'plus-loin': 'plus loin',
  'la-haut': 'là-haut',
  ailleurs: 'ailleurs',
}

/**
 * Une seule gare derrière : elle sort par la gauche dès le début du trajet.
 * Devant, on en garde toujours quatre rendues même si l'écran n'en montre que
 * deux — sinon la cible d'un tour complet ne serait nulle part, et plus rien
 * ne porterait « PROCHAIN ARRÊT ».
 */
const AVANT = 1
const APRES = 4

type Etat = 'passee' | 'a-quai' | 'prochain' | 'a-venir'

const voyage = useVoyage()
const { gare, enRoute, etapesRestantes, legs, progression } = storeToRefs(voyage)

/**
 * La frise étale ses gares sur la largeur : quatre sur un écran, deux sur un
 * téléphone. L'écartement se calcule plutôt que de vivre en dur dans le CSS,
 * pour qu'il soit vérifiable par un test.
 */
const largeur = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const mesurer = () => {
  largeur.value = window.innerWidth
}
onMounted(() => window.addEventListener('resize', mesurer, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('resize', mesurer))

const ancre = computed(() => (largeur.value < SEUIL_MOBILE ? ANCRE_FRISE_MOBILE : ANCRE_FRISE))
const ecart = computed(() => ecartFrise(largeur.value, garesVisibles(largeur.value)))

/**
 * Position de la frise, en crans, fractionnaire pendant le trajet : c'est elle
 * qui fait défiler les gares en continu au lieu de les faire sauter d'un cran
 * une fois arrivé. Le marqueur, lui, ne bouge plus — il tient l'ancre, et ce
 * sont les gares qui passent dessous.
 */
const position = computed(() => legs.value + (enRoute.value ? progression.value : 0))

const entrees = computed(() => {
  const base = GARES.indexOf(gare.value)
  // En route, le prochain arrêt est la cible, pas une gare qu'on traverse.
  // Le compte vient du store, seul endroit où il est juste à toute étape.
  const distanceCible = enRoute.value ? etapesRestantes.value : 1

  return Array.from({ length: AVANT + APRES + 1 }, (_, i) => {
    const decalage = i - AVANT
    const index = (((base + decalage) % GARES.length) + GARES.length) % GARES.length
    const station = GARES[index]

    let etat: Etat
    if (enRoute.value) {
      if (decalage <= 0) etat = 'passee'
      else if (decalage === distanceCible) etat = 'prochain'
      else etat = 'a-venir'
    } else if (decalage < 0) etat = 'passee'
    else if (decalage === 0) etat = 'a-quai'
    else if (decalage === 1) etat = 'prochain'
    else etat = 'a-venir'

    // La clé est l'étape absolue : elle survit au glissement, donc la gare
    // garde son nœud du DOM et se déplace au lieu d'être recréée.
    return { cle: legs.value + decalage, station, libelle: LIBELLES[station], etat, decalage }
  })
})
</script>

<template>
  <nav
    class="frise"
    aria-label="Les gares du voyage"
    :style="{ '--ecart': `${ecart}px`, '--ancre': `${ancre}px` }"
  >
    <div class="piste" :class="{ 'en-route': enRoute }" :style="{ '--legs': position }">
      <span class="voie" aria-hidden="true"></span>

      <RouterLink
        v-for="entree in entrees"
        :key="entree.cle"
        class="gare"
        :to="`/${entree.station}`"
        :data-etat="entree.etat"
        :data-gare="entree.station"
        :data-decalage="entree.decalage"
        :style="{ '--cle': entree.cle }"
      >
        <span class="point" aria-hidden="true"></span>
        <span class="libelle">{{ entree.libelle }}</span>
        <span v-if="entree.etat === 'a-quai'" class="mention">À QUAI</span>
        <span v-else-if="entree.etat === 'prochain'" class="mention">PROCHAIN ARRÊT</span>
      </RouterLink>

    </div>

    <span v-if="enRoute" class="marqueur" data-role="marqueur" aria-hidden="true">
      <span class="loco"></span>
    </span>
  </nav>
</template>

<style scoped>
.frise {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 96px;
  z-index: 2;
  overflow: hidden;
  /* Les gares qui sortent s'estompent des deux côtés. */
  mask-image: linear-gradient(to right, transparent, #000 60px, #000 calc(100% - 60px), transparent);
}

.piste {
  position: absolute;
  top: 44px;
  left: 0;
  height: 1px;
  transform: translateX(calc(var(--ancre) - var(--legs) * var(--ecart)));
  /* En route, la position change à chaque image : une transition la ferait
     traîner derrière le train. Elle ne sert qu'aux sauts, quand la scène ne
     peut pas animer — mouvement réduit, ou pas de WebGL. */
  transition: transform 1.2s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.piste.en-route {
  transition: none;
}

.voie {
  position: absolute;
  top: 0;
  left: calc(-4 * var(--ecart));
  width: calc(40 * var(--ecart));
  height: 1px;
  background: var(--trait);
  opacity: var(--murmure);
}

.gare {
  position: absolute;
  top: -5px;
  left: calc(var(--cle) * var(--ecart));
  display: block;
  width: var(--ecart);
  color: var(--texte);
  text-decoration: none;
  transition: opacity 1.2s ease;
}

.point {
  display: block;
  width: 9px;
  height: 9px;
  margin-left: -1px;
  border: 1px solid var(--trait);
  border-radius: 50%;
}

.libelle {
  display: block;
  margin-top: 14px;
  font-size: 13px;
  font-weight: 300;
  white-space: nowrap;
  transition: font-size 1.2s ease;
}

.mention {
  display: block;
  margin-top: 5px;
  font-family: var(--police-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  opacity: var(--faible);
  white-space: nowrap;
}

/* passée : petit point plein, estompé */
.gare[data-etat='passee'] {
  opacity: 0.3;
}

.gare[data-etat='passee'] .point {
  background: var(--trait);
  transform: scale(0.62);
}

/* à quai : point plein + halo, libellé plus grand */
.gare[data-etat='a-quai'] .point {
  background: var(--trait);
  box-shadow: 0 0 0 4px rgb(230 230 234 / 10%), 0 0 14px 3px rgb(230 230 234 / 28%);
}

.gare[data-etat='a-quai'] .libelle {
  font-size: 16px;
  opacity: var(--fort);
}

/* prochain arrêt : anneau + point central + halo */
.gare[data-etat='prochain'] .point {
  position: relative;
  background: none;
  box-shadow: 0 0 10px 2px rgb(230 230 234 / 18%);
}

.gare[data-etat='prochain'] .point::after {
  content: '';
  position: absolute;
  inset: 2px;
  background: var(--trait);
  border-radius: 50%;
}

/* à venir : anneau vide */
.gare[data-etat='a-venir'] {
  opacity: 0.7;
}

/* Le marqueur tient l'ancre : le train est toujours « ici », ce sont les gares
   qui défilent dessous. Hors de la piste, donc rien à recalculer par image. */
.marqueur {
  position: absolute;
  top: 40px;
  left: var(--ancre);
  width: 7px;
  height: 7px;
  background: var(--trait);
  border-radius: 50%;
  box-shadow: 0 0 12px 3px rgb(230 230 234 / 30%);
}

.loco {
  position: absolute;
  top: -11px;
  left: -3px;
  width: 13px;
  height: 6px;
  border: 1px solid var(--trait);
  border-radius: 2px 3px 0 0;
  opacity: var(--moyen);
}

.gare:focus-visible {
  outline: 1px solid var(--trait);
  outline-offset: 6px;
}

@media (prefers-reduced-motion: reduce) {
  .piste {
    transition-duration: 0.2s;
  }
}
</style>
