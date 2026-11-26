<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  ANCRE_FRISE,
  ANCRE_FRISE_MOBILE,
  SEUIL_MOBILE,
  ecartFrise,
  fonduFrise,
  margeVoie,
  margeVoieDroite,
  garesVisibles,
} from '@/scene/layout'
import { GARES, useVoyage } from '@/stores/voyage'
import { useTextes } from '@/i18n'

/** Les routes gardent le tiret, les libellés non. */
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
const t = useTextes()
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

const surTelephone = computed(() => largeur.value < SEUIL_MOBILE)
const ancre = computed(() => (surTelephone.value ? ANCRE_FRISE_MOBILE : ANCRE_FRISE))
const ecart = computed(() => ecartFrise(largeur.value, garesVisibles(largeur.value)))
const marge = computed(() => margeVoie(largeur.value))
const margeDroite = computed(() => margeVoieDroite(largeur.value))
const fondu = computed(() => fonduFrise(largeur.value))

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

    // La fenêtre est plus large que la boucle — six entrées pour quatre gares
    // — donc deux gares y figurent deux fois. À l'œil c'est ce qui donne à la
    // frise ses deux bords tenus ; au clavier, c'étaient deux destinations de
    // plus, du même nom et vers la même adresse. On garde donc le tour
    // complet, de la gare à quai à la dernière avant de revenir : les copies
    // qui débordent de part et d'autre ne sont plus que du dessin.
    const repete = decalage < 0 || decalage >= GARES.length

    // La clé est l'étape absolue : elle survit au glissement, donc la gare
    // garde son nœud du DOM et se déplace au lieu d'être recréée.
    return {
      cle: legs.value + decalage,
      station,
      libelle: t.value.gares[station],
      etat,
      decalage,
      repete,
    }
  })
})
</script>

<template>
  <nav
    class="frise"
    :aria-label="t.frise.aria"
    :style="{ '--ecart': `${ecart}px`, '--ancre': `${ancre}px`, '--marge': `${marge}px`, '--marge-droite': `${margeDroite}px`, '--fondu': `${fondu}px` }"
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
        :aria-hidden="entree.repete || undefined"
        :tabindex="entree.repete ? -1 : undefined"
      >
        <span class="point" aria-hidden="true"></span>
        <span class="libelle">{{ entree.libelle }}</span>
        <span v-if="entree.etat === 'a-quai'" class="mention">{{ t.frise.aQuai }}</span>
        <!-- Sur téléphone, la mention courte : la longue n'a pas la place et se
             faisait effacer aux deux tiers par le masque de la frise. -->
        <span v-else-if="entree.etat === 'prochain'" class="mention">{{
          surTelephone ? t.frise.prochainCourt : t.frise.prochainArret
        }}</span>
      </RouterLink>

    </div>

    <span class="halo" aria-hidden="true"></span>
    <span v-if="enRoute" class="marqueur" data-role="marqueur" aria-hidden="true"></span>
  </nav>
</template>

<style scoped>
.frise {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: calc(var(--haut-voie) + 52px);
  z-index: 2;
  overflow: hidden;
  /* Les gares qui sortent s'estompent des deux côtés, après une marge où la
     voie ne va pas du tout : c'est elle qui décolle la frise des bords. */
  mask-image: linear-gradient(
    to right,
    transparent var(--marge),
    #000 calc(var(--marge) + var(--fondu)),
    #000 calc(100% - var(--marge-droite) - var(--fondu)),
    transparent calc(100% - var(--marge-droite))
  );
}

.piste {
  position: absolute;
  top: var(--haut-voie);
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

/*
 * Les deux lignes d'une gare portent une **hauteur explicite**, et non celle
 * que la fonte propose. La bande est en `overflow: hidden` sur une hauteur
 * fixe, que `HAUTEUR_FRISE` reprend comme plafond du ciel, du rideau et de
 * l'infobulle : la colonne doit donc tenir dedans par construction, sans
 * dépendre de métriques. En `normal`, le mono du 25 novembre rendait 1,32 em
 * là où l'Inter d'avant en rendait 1,21, et « À QUAI » — la seule mention
 * sous un libellé de 16 px — se faisait couper le bas par le bord de la
 * bande ; pendant le `display=swap`, la fonte de secours la déplaçait encore.
 * Un test tient la somme : 44 - 5 + 9 + 14 + 16 x 1,2 + 5 + 9 = 95,2 px.
 */
.libelle {
  display: block;
  margin-top: 14px;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 300;
  white-space: nowrap;
  transition: font-size 1.2s ease;
}

.mention {
  display: block;
  margin-top: 5px;
  font-family: var(--police-mono);
  font-size: 9px;
  line-height: 1;
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
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--trait) 10%, transparent),
    0 0 14px 3px color-mix(in srgb, var(--trait) 28%, transparent);
}

.gare[data-etat='a-quai'] .libelle {
  font-size: 16px;
  opacity: var(--fort);
}

/* prochain arrêt : anneau + point central + halo */
.gare[data-etat='prochain'] .point {
  position: relative;
  background: none;
  box-shadow: 0 0 10px 2px color-mix(in srgb, var(--trait) 18%, transparent);
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

/* La voie s'éclaircit là où l'on se trouve. Le halo tient l'ancre comme le
   marqueur, donc il ne défile pas avec les gares : c'est le lieu qui est
   éclairé, pas une portion de voie. */
.halo {
  position: absolute;
  top: var(--haut-voie);
  left: var(--ancre);
  width: 260px;
  height: 1px;
  margin-left: -130px;
  background: linear-gradient(to right, transparent, var(--trait), transparent);
  opacity: 0.3;
  pointer-events: none;
}

/* Le marqueur tient l'ancre : le train est toujours « ici », ce sont les gares
   qui défilent dessous. Hors de la piste, donc rien à recalculer par image. */
.marqueur {
  position: absolute;
  top: calc(var(--haut-voie) - 4px);
  left: var(--ancre);
  width: 7px;
  height: 7px;
  background: var(--trait);
  border-radius: 50%;
  box-shadow: 0 0 12px 3px color-mix(in srgb, var(--trait) 30%, transparent);
}

/* De jour, la lueur s'en va et l'anneau prend sa place.

   Une lueur est de la lumière ; sur du papier, son négatif n'est qu'une tache
   (spec du 25/11, critère 8). Mais la gare « à quai » et le marqueur ont
   besoin d'une emphase, sans quoi la frise ne dit plus où l'on est : c'est un
   anneau d'encre net, séparé du point par un cran de papier. Aucun flou. */
:root[data-mode="jour"] .gare[data-etat='a-quai'] .point {
  box-shadow:
    0 0 0 2px var(--fond),
    0 0 0 3px var(--trait);
}

:root[data-mode="jour"] .gare[data-etat='prochain'] .point {
  box-shadow: none;
}

:root[data-mode="jour"] .marqueur {
  box-shadow:
    0 0 0 2px var(--fond),
    0 0 0 3px var(--trait);
}

/* La voie « s'éclaircit là où l'on se trouve » : de jour, elle ne peut pas —
   un dégradé d'encre en travers de la ligne serait une bavure. Le marqueur
   suffit à tenir le lieu. */
:root[data-mode="jour"] .halo {
  display: none;
}

.gare:focus-visible {
  outline: 1px solid var(--trait);
  outline-offset: 6px;
}

/*
 * Les trois transitions de la frise ne servent qu'aux **sauts** : en route,
 * `.piste` passe en `transition: none` et c'est la scène qui la déplace à
 * chaque image. Elles sont donc exactement ce que voit quelqu'un qui a
 * demandé moins de mouvement, et elles partent ensemble.
 *
 * Raccourcies, pas coupées (décidé le 23 novembre 2026) : 0,2 s est sous le
 * seuil où l'on lit un déplacement, mais la frise bouge encore — sans quoi on
 * perdrait le lien entre la gare qu'on quitte et celle où l'on arrive.
 */
@media (prefers-reduced-motion: reduce) {
  .piste,
  .voie,
  .libelle {
    transition-duration: 0.2s;
  }
}

/*
 * Sous 360 px, la frise rapetisse d'un cran.
 *
 * Le mono est plus large que l'Inter qu'il remplace (25 novembre 2026) : à
 * 320 px, « plus loin » à quai ne laissait plus la place au libellé suivant,
 * et les deux se touchaient. Deux points de corps rendent cette largeur-là
 * au reste. Au-dessus de 360, rien ne change : l'écartement suffit.
 */
@media (max-width: 359px) {
  .libelle {
    font-size: 11px;
  }

  .gare[data-etat='a-quai'] .libelle {
    font-size: 14px;
  }
}
</style>
