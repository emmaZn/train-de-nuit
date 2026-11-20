<script setup lang="ts">
/**
 * Le texte du panneau des prochains départs, posé sur le rideau.
 *
 * Le rideau est du décor, dans le canvas (`rideau.ts`) ; le texte est du DOM
 * parce que c'est du texte, et que trois de ses lignes sont des liens (focus clavier,
 * sélection, lecteur d'écran, mailto: — gratuits).
 *
 * Il vit hors des routes, comme `RepliquesOiseaux.vue` : l'URL change à l'instant
 * du clic, et dans une gare il serait détruit avant d'avoir pu s'effacer.
 *
 * Place : celle que la scène **émet**. Le texte ne calcule pas où est la plaque,
 * il la suit : `top` vient du `y` courant de la ref `RIDEAU_KEY` (animé, pas
 * posé), `left` du `RIDEAU.x`, le tout converti par le cadre. Ni cadre ni
 * position émise, pas de texte : rien n'est inventé en attendant la scène.
 *
 * Durée de vie : le texte existe tant que la plaque est **en vue**, pas tant
 * que le train est à quai. Le visiteur part rideau baissé, la scène le relève
 * d'elle-même, et le texte doit remonter avec elle — il n'est retiré qu'une
 * fois la plaque sortie de la fenêtre. Il est sinon absent, et ses liens avec
 * lui : un rideau rangé ne laisse aucun lien focalisable hors de l'écran.
 * Pendant la remontée (`remonte`) les liens ne reçoivent plus le pointeur.
 *
 * Le texte rétrécit avec le cadre ; sur petit écran il devient illisible — le
 * rendu détaché de la scène est celui de la tâche 7 du plan du rideau.
 */
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { FRAME_KEY, RIDEAU_KEY } from '@/composables/useScene'
import { CV, LINKEDIN, adresseMail } from '@/contenu/liens'
import { departsEteints, departsReels, formaterHeure } from '@/scene/horaires'
import type { Depart } from '@/scene/horaires'
import { RIDEAU } from '@/scene/rideau'
import { useVoyage } from '@/stores/voyage'

const frame = inject(FRAME_KEY, ref(null))
const rideau = inject(RIDEAU_KEY, ref(null))
const voyage = useVoyage()

// Le haut de la plaque, en pixels d'écran. C'est lui, et lui seul, que `place`
// et la visibilité lisent : ce qu'on place et ce qu'on décide de montrer ne
// peuvent pas se contredire.
const hautEcran = computed(() => {
  const f = frame.value
  const r = rideau.value
  return f && r ? f.offsetY + r.y * f.scale : null
})

// Le bas de la plaque est au-dessus du bord de la fenêtre : rien n'en reste à voir.
const horsDeLaFenetre = computed(() => {
  const f = frame.value
  return hautEcran.value === null || !f || hautEcran.value + RIDEAU.hauteur * f.scale <= 0
})

const visible = computed(
  () =>
    voyage.gare === 'ailleurs' &&
    hautEcran.value !== null &&
    // `baisse` est l'état visé : il est vrai dès le geste, plaque encore rangée.
    (rideau.value!.baisse || !horsDeLaFenetre.value),
)

// La plaque s'en va : le visiteur l'a relevée, ou le train s'ébranle et la scène
// la relève. `enRoute` couvre l'instant où le magasin a changé et pas encore la scène.
const remonte = computed(() => !rideau.value?.baisse || voyage.enRoute)

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
  ...departsEteints(maintenant.value, graine.value, 2),
])
const heure = computed(() => formaterHeure(maintenant.value))

// Assemblée au montage : un <a> sans href ne prend pas le focus clavier.
const mail = `mailto:${adresseMail()}`
const HREF = { linkedin: LINKEDIN, cv: CV, ecrire: mail } as const

// Taille de cadre, mise à l'échelle par `transform` : le texte n'est jamais
// mesuré en pixels d'écran, et `--biseau` ci-dessous reste en pixels de cadre.
const place = computed<Record<string, string>>(() => {
  const f = frame.value!
  return {
    left: `${f.offsetX + RIDEAU.x * f.scale}px`,
    top: `${hautEcran.value}px`,
    width: `${RIDEAU.largeur}px`,
    height: `${RIDEAU.hauteur}px`,
    transform: `scale(${f.scale})`,
  }
})
</script>

<template>
  <Transition name="dissoudre">
    <div v-if="visible" class="panneau" :class="{ remonte }" :style="place" role="region" aria-label="Prochains départs">
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
  /* Le retrait latéral, déclaré une seule fois : le bandeau d'en-tête
     l'annule pour aller d'un bord intérieur à l'autre du cadre. */
  --creux: 32px;
  /* La coupe des coins de la plaque. Le panneau est mis à l'échelle par
     `transform`, donc ce nombre est en pixels de **cadre** comme le `BISEAU` du
     canvas — mais à l'écran, les deux valent `12 × échelle`. Le bandeau
     d'en-tête s'y coupe aussi, sinon il peint deux triangles **hors de la
     plaque**. `PanneauDeparts.test.ts` les confronte en pixels d'écran. */
  --biseau: 12px;
  /* Le budget de place du panneau, en pixels de cadre. La plaque fait
     `RIDEAU.hauteur` (329 px) et doit tenir un bandeau et cinq lignes : c'est
     **ici** que la mise en page se décide, et `PanneauDeparts.test.ts` fait
     l'addition pour que personne n'ajoute une sixième ligne en silence.
     `--entete` compte l'écart qui sépare le bandeau des départs. Le corps du
     texte est le double de celui de la plaque de 440 px : à cette taille ce
     n'est pas le nombre de lignes qui grandit (spec, non-buts). */
  --entete: 80px;
  --ligne: 44px;
  --marge: 29px;
  padding: var(--marge) var(--creux);
  font-family: var(--police-mono);
  font-weight: 300;
  font-size: 26px;
  color: var(--texte);
  /* Le texte ne bloque rien : seuls les liens reçoivent le pointeur. */
  pointer-events: none;
}

/* L'en-tête est un **bandeau plein** : le fond prend la couleur du texte et le
   texte celle du fond. C'est le tour que fait déjà le cadran de l'horloge, dont
   les aiguilles sont creusées dans le blanc — « blanc ou absent » appliqué à
   l'envers, pas levé. Les deux couleurs viennent des variables, jamais d'un
   littéral : l'œil fait tourner trois couleurs de nuit.

   C'est lui, et non plus un filet tracé au canvas, qui sépare l'en-tête des
   départs. Sa hauteur est le **réglage de luminosité du panneau** : il est la
   chose la plus claire de la gare après la lanterne. */
.entete {
  display: flex;
  justify-content: space-between;
  margin-top: calc(-1 * var(--marge));
  margin-right: calc(-1 * var(--creux));
  /* Le bandeau et l'écart qui le sépare des départs tiennent ensemble dans
     `--entete` : une demi-ligne de blanc dessous, et rien d'arbitraire. */
  box-sizing: border-box;
  height: calc(var(--entete) - var(--ligne) / 2);
  margin-bottom: calc(var(--ligne) / 2);
  margin-left: calc(-1 * var(--creux));
  align-items: center;
  padding-top: 0;
  padding-right: var(--creux);
  padding-bottom: 0;
  padding-left: var(--creux);
  background: var(--texte);
  color: var(--fond);
  /* Les deux coins du haut suivent le biseau du cadre ; ceux du bas sont
     droits, le bandeau ne les touche pas. Sans cette coupe, le bandeau peint
     deux triangles de douze pixels **hors du panneau**, sur le mur — le fond
     opaque, lui, est un octogone. */
  clip-path: polygon(
    var(--biseau) 0,
    calc(100% - var(--biseau)) 0,
    100% var(--biseau),
    100% 100%,
    0 100%,
    0 var(--biseau)
  );
  /* Plein, pas à mi-teinte : l'opacité `--moyen` d'avant en ferait un gris. */
  opacity: 1;
  font-size: 22px;
  letter-spacing: 0.08em;
}

.lignes {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ligne {
  display: grid;
  grid-template-columns: 3.4em 1fr auto;
  align-items: center;
  gap: 20px;
  /* La hauteur vient du budget, pas d'un rembourrage : c'est elle que le garde
     de débordement multiplie par cinq. */
  box-sizing: border-box;
  height: var(--ligne);
  padding: 0 12px;
  margin: 0 -12px;
  color: inherit;
  text-decoration: none;
}

/* Les points de conduite entre la destination et le quai, comme sur un
   indicateur imprimé : la destination, des points, puis le statut calé à
   droite.

   Ce sont des points **dessinés** et non une chaîne de caractères. Un
   `content: '......'` serait lu à voix haute par un lecteur d'écran, sur
   chacune des cinq lignes, entre la destination et son statut — et trois de ces
   lignes sont les seuls liens de la page. `currentColor` les fait suivre
   l'inversion au survol sans règle de plus. */
.ligne > span:nth-child(2) {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.ligne > span:nth-child(2)::after {
  content: '';
  flex: 1;
  height: 6px;
  margin: 4px 0 0 0.7em;
  opacity: var(--faible);
  /* Butées franches : deux arrêts écartés feraient de chaque point un petit
     dégradé, c'est-à-dire la mi-teinte que la décision 12.2 refuse — et écrite
     à la main, pas laissée à l'anticrénelage. Plein ou absent, comme le reste. */
  background-image: radial-gradient(circle, currentColor 2px, transparent 2px);
  background-size: 12px 6px;
  background-repeat: repeat-x;
  background-position: left center;
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

/* Au retrait, le panneau s'efface sur place pendant une demi-seconde. Cliquer
   `CV` pendant un fondu poussait `/ailleurs/cv`, dont l'`afterEach` appelle
   `partirVers('ailleurs')` sur un train déjà en marche : il le **redirigeait**,
   et l'envoyait faire tout le tour de la boucle. Depuis le rideau, ce fondu
   se joue plaque sortie de la fenêtre, donc hors d'atteinte : la règle reste,
   parce que le jour où le retrait se fera plaque en vue le bug reviendrait
   sans bruit. `.remonte .reel` couvre la remontée elle-même. */
.dissoudre-leave-active .reel {
  pointer-events: none;
}

.dissoudre-enter-from,
.dissoudre-leave-to {
  opacity: 0;
}

/* Pendant la remontée, la plaque s'en va avec ses liens : la même coupe que le
   fondu ci-dessus, sur toute la durée où la plaque est encore en vue. Plus
   spécifique que `.reel`, qui rend le pointeur aux liens. */
.remonte .reel {
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .dissoudre-enter-active,
  .dissoudre-leave-active {
    transition-duration: 0.2s;
  }
}
</style>
