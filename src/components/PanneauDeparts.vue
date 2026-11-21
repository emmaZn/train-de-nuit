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
 * Pendant la remontée (`remonte`) le panneau est `inert` : ni pointeur, ni
 * tabulation, ni Entrée — `pointer-events: none` seul ne fermerait que le premier.
 *
 * Le texte se pose **volet par volet** (`VoletTexte`), de haut en bas, comme un
 * tableau de grande gare : c'est l'événement, la descente n'en est que
 * l'approche. Les lignes partent quand la plaque arrive, le bandeau un peu
 * avant. Le vrai texte et ses `href` sont dans le DOM dès le montage ; ce qui
 * tourne est une couche décorative par-dessus. Plus de fondu à l'entrée : il
 * se jouait pendant la descente et faisait fondre ce que les volets posent.
 * Sous `prefers-reduced-motion`, le texte est posé d'emblée.
 *
 * Le texte rétrécit avec le cadre ; sous `SEUIL_MOBILE` il deviendrait illisible,
 * alors le panneau se **détache** de la scène (classe `detache`) : il se pose sur
 * la fenêtre, entre deux gouttières, à taille d'écran. C'est le même état du
 * rideau (`baisse`, `y`) rendu deux fois, jamais un second état. La commande, elle,
 * se déplace, et c'est le même bouton : panneau rangé, elle se montre en cadran
 * épinglé avec l'heure (en portrait l'horloge est hors champ, mais on ne le teste
 * pas : une fenêtre large et basse la ramène dans le champ) ; panneau posé, elle
 * redevient un disque invisible de 44 px sur l'heure du bandeau, qu'un cadran à elle
 * ferait passer sur les liens.
 */
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import VoletTexte from '@/components/VoletTexte.vue'
import { DEBUT_ENTETE_MS, DEBUT_LIGNES_MS, ECART_LIGNES_MS } from '@/components/volets'
import { FRAME_KEY, RIDEAU_KEY, SCENE_KEY } from '@/composables/useScene'
import { CV, LINKEDIN, adresseMail } from '@/contenu/liens'
import { departsEteints, departsReels, formaterHeure } from '@/scene/horaires'
import type { Depart } from '@/scene/horaires'
import { ANCRE_FRISE_MOBILE, MARGE_VOIE, SEUIL_MOBILE } from '@/scene/layout'
import { HALO_HORLOGE, HORLOGE } from '@/scene/quai'
import { RIDEAU, yPoseA, yRangeA } from '@/scene/rideau'
import { useVoyage } from '@/stores/voyage'

const frame = inject(FRAME_KEY, ref(null))
const rideau = inject(RIDEAU_KEY, ref(null))
const scene = inject(SCENE_KEY, ref(null))
const voyage = useVoyage()

// Le cadre ne dit pas la largeur de la fenêtre : on la lit là, comme `NavFrise`,
// et on la relit à chaque cadre émis — la scène en émet un à chaque redimensionnement,
// et c'est ce qui fait suivre le seuil pendant une animation.
const largeur = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const mesurer = () => { largeur.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', mesurer, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('resize', mesurer))
watch(frame, mesurer)
const detache = computed(() => largeur.value < SEUIL_MOBILE)

// La hauteur du panneau détaché, en pixels d'écran : posée en ligne **et** lue par
// `horsDeLaFenetre`, pour que la plaque ne soit retirée qu'une fois son vrai bas
// sorti de la fenêtre. Le CSS de `.detache` additionne la même somme
// (`--marge + --entete + 5 × --ligne + 2 de filet`), et un test la confronte.
const HAUTEUR_DETACHE = 220

// Les mesures du CSS de `.detache`, dont la commande a besoin pour se poser sur
// l'heure du bandeau : gouttière, filet, creux, hauteur du bandeau (`--entete` moins
// la demi-ligne d'écart), cible tactile (44 px : ce qu'un doigt exige, et en portrait
// le seul moyen de refermer le panneau) et largeur de l'heure (5 signes × (0,6 + 0,08) em × 13 px).
const DETACHE = { gouttiere: 12, filet: 1, creux: 14, bandeau: 28, cible: 44, largeurHeure: 5 * (0.6 + 0.08) * 13 } as const

/**
 * Les bras restent (spec §11) : la scène ne trace plus les siens sous le seuil, le
 * panneau détaché porte deux barres.
 *
 * Leur retrait est en pixels d'**écran**, et non repris en pourcentage de la plaque
 * de scène. Les repères de la navigation sont à distance **fixe** des bords de la
 * fenêtre, tandis qu'un pourcentage d'un panneau qui fait la largeur de l'écran
 * grandit avec elle : il finissait par leur tomber dessus — sur l'ancre de la frise
 * à 386 px (44,4 contre 44), en plein dans « ail|leurs » à 663, et sur le bouton de
 * l'œil aux deux tailles. C'est l'anti-but nommé de la spec : « Perdre la
 * navigation. Les bras existent pour ça : s'ils coûtaient la frise, ils ne
 * serviraient à rien. » (Le réglage du rendu **attaché**, lui, est bon : `BRAS.retrait`
 * place les bras entre les libellés, et il n'est pas touché.)
 *
 * Le bras tient donc dans la **bande libre** qui va du bord de la fenêtre au premier
 * repère — l'ancre à gauche (`ANCRE_FRISE_MOBILE`, dont le point de la gare à quai
 * déborde d'un pixel, voir `.point` dans `NavFrise.vue`), l'œil à droite
 * (`MARGE_VOIE`, « exactement là où l'œil commence », voir `DEGAGEMENT_OEIL`) — et il
 * se **centre** dedans : la moitié qui reste de chaque côté dégage aussi leurs
 * anneaux de focus. La plus étroite des deux bandes décide, pour que les deux bras
 * gardent le même retrait. Il est mesuré depuis le bord **intérieur** du panneau —
 * gouttière plus filet — parce que c'est là que `position: absolute` les pose.
 *
 * `PanneauDeparts.test.ts` le confronte aux deux repères, lus dans leurs sources,
 * aux largeurs usuelles.
 */
const LARGEUR_BRAS = 2
const DEBORD_POINT = 1
const BANDE_LIBRE = Math.min(ANCRE_FRISE_MOBILE - DEBORD_POINT, MARGE_VOIE)
const BORD_PANNEAU = DETACHE.gouttiere + DETACHE.filet
const retraitBras = `${(BORD_PANNEAU + BANDE_LIBRE - LARGEUR_BRAS) / 2 - BORD_PANNEAU}px`

// Le haut de la plaque, en pixels d'écran. C'est lui, et lui seul, que `place`
// et la visibilité lisent : ce qu'on place et ce qu'on décide de montrer ne
// peuvent pas se contredire.
const hautEcran = computed(() => {
  const f = frame.value
  const r = rideau.value
  if (!f || !r) return null
  if (!detache.value) return f.offsetY + r.y * f.scale
  // Détaché, la plaque de scène n'existe plus : sa course ne dicte pas celle du
  // panneau. On en garde la **fraction** (0 rangé, 1 posé, un peu plus au rebond) et on
  // la remet sur la hauteur du panneau. À 0, son bas est à 0 : sorti, exactement, à
  // toute taille — l'invariant qu'avait la plaque (`hautEcran + hauteur = -8`). À 1,
  // il se pose là où la plaque se posait.
  const rangee = yRangeA(f)
  const course = yPoseA(f) - rangee
  const fraction = course === 0 ? (r.baisse ? 1 : 0) : (r.y - rangee) / course
  const posee = f.offsetY + yPoseA(f) * f.scale
  return -HAUTEUR_DETACHE + fraction * (posee + HAUTEUR_DETACHE)
})

// Le bas de la plaque est au-dessus du bord de la fenêtre : rien n'en reste à voir.
const horsDeLaFenetre = computed(() => {
  const f = frame.value
  const hauteur = detache.value ? HAUTEUR_DETACHE : RIDEAU.hauteur * (f?.scale ?? 0)
  return hautEcran.value === null || !f || hautEcran.value + hauteur <= 0
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

// Une graine par descente du rideau : les lignes éteintes ne bougent pas tant
// qu'il reste baissé, pour ne pas distraire de la lecture des trois liens.
const graine = ref(Math.floor(Math.random() * 2 ** 31))
const maintenant = ref(new Date())
let minuterie = 0

function armer() {
  window.clearInterval(minuterie)
  minuterie = window.setInterval(() => { maintenant.value = new Date() }, 15_000)
}

// Le cadran épinglé montre l'heure : il la tient juste même panneau rangé, c'est-à-dire
// précisément quand il est seul à l'écran.
const cadranMontre = computed(() => detache.value && voyage.gare === 'ailleurs' && frame.value !== null)
const horlogeVive = computed(() => visible.value || cadranMontre.value)

watch(visible, (v) => {
  if (v) graine.value = Math.floor(Math.random() * 2 ** 31)
}, { immediate: true })

watch(horlogeVive, (v) => {
  if (v) {
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

// Mouvement réduit : le texte est posé tout de suite, sans volets. Le réglage
// se lit ici et non dans `VoletTexte`, qui ne devine rien. Il est suivi dans les
// deux sens : posé, les volets s'arrêtent là où ils sont ; levé, ils reprennent
// (ou, si le texte était déjà posé, le laissent posé).
const reglage = window.matchMedia?.('(prefers-reduced-motion: reduce)')
const fige = ref(reglage?.matches ?? false)
const suivreReglage = (e: { matches: boolean }) => { fige.value = e.matches }
reglage?.addEventListener('change', suivreReglage)
onBeforeUnmount(() => reglage?.removeEventListener('change', suivreReglage))

// Les lignes se posent de haut en bas ; les trois cellules d'une ligne partent
// ensemble, comme les volets d'une même rangée.
const retardLigne = (i: number) => DEBUT_LIGNES_MS + i * ECART_LIGNES_MS

// Assemblée au montage : un <a> sans href ne prend pas le focus clavier.
const mail = `mailto:${adresseMail()}`
const HREF = { linkedin: LINKEDIN, cv: CV, ecrire: mail } as const

// Taille de cadre, mise à l'échelle par `transform` : le texte n'est jamais
// mesuré en pixels d'écran, et `--biseau` ci-dessous reste en pixels de cadre.
const place = computed<Record<string, string>>((): Record<string, string> => {
  const f = frame.value!
  // Détaché : le CSS pose gouttières et taille, il ne reste que la descente.
  if (detache.value) return { top: `${hautEcran.value}px`, height: `${HAUTEUR_DETACHE}px` }
  return {
    left: `${f.offsetX + RIDEAU.x * f.scale}px`,
    top: `${hautEcran.value}px`,
    width: `${RIDEAU.largeur}px`,
    height: `${RIDEAU.hauteur}px`,
    transform: `scale(${f.scale})`,
  }
})

/**
 * La commande clavier du rideau, posée sur l'horloge du canvas : le même geste
 * que le clic sur l'horloge, pour que les trois liens du panneau s'atteignent
 * sans souris. Elle passe par `Scene.basculerRideau()`, qui tient en un seul
 * endroit la règle (se baisse à l'arrêt, se relève toujours) — jamais par le
 * rideau directement.
 *
 * Elle couvre la même aire que la cible de la souris, `horlogeTouchee` : un
 * disque de `HORLOGE.rayon * HALO_HORLOGE.rayon`, converti en pixels d'écran
 * comme `place`. Le cadre existe et on est « ailleurs » : c'est sa seule
 * condition, car elle sert justement quand le panneau est rangé.
 */
// Détaché, le panneau passe par-dessus l'horloge dans une fenêtre large et basse.
// `useScene` écoute `pointerdown` sur `window` et bascule le rideau sur l'horloge :
// l'appui sur un lien le relèverait avant que le `click` n'arrive. Attaché, la plaque
// ne croise jamais l'horloge, et on laisse remonter.
function arreterAppui(e: Event) {
  if (detache.value) e.stopPropagation()
}

// L'`id` de la région, que la commande désigne par `aria-controls`. Il n'y a qu'un
// panneau des départs dans le site : l'identifiant peut être fixe.
const ID_PANNEAU = 'panneau-departs'

// Le cadran dessiné : sous le seuil, panneau rangé. Posé, c'est le bandeau qui montre l'heure.
//
// **Pas en route.** `voyage.gare` reste « ailleurs » jusqu'au premier `finirEtape`
// (≈ 9 s) ; dès que le panneau est sorti (≈ 1,5 s après le départ) `visible` tombe,
// et un cadran de 52 px avec l'heure s'épinglait là, sous le pouce, désactivé
// pendant tout le reste de l'étape. `Scene.basculerRideau` refuse de baisser en
// route : il ne répondait pas, et rien n'est perdu à ne pas le dessiner.
const cadranDessine = computed(() => detache.value && !visible.value && !voyage.enRoute)

const commande = computed<Record<string, string> | null>(() => {
  // Ni ailleurs ni cadre : pas de commande.
  if (voyage.gare !== 'ailleurs') return null
  const f = frame.value
  if (!f) return null
  if (detache.value) {
    // Panneau rangé : il n'y a aucune horloge à l'écran, le CSS épingle un cadran.
    if (!visible.value) return {} as Record<string, string>
    // Panneau posé : un disque invisible sur l'heure du bandeau — le même objet que
    // sur grand écran, posé sur le cadran qui est là. Il suit le panneau, et reste
    // dans la bande du bandeau, qui n'a pas de lien. Invisible, mais de 44 px.
    const haut = hautEcran.value ?? 0
    return {
      left: `${largeur.value - DETACHE.gouttiere - DETACHE.filet - DETACHE.creux - DETACHE.largeurHeure / 2 - DETACHE.cible / 2}px`,
      // Centré sur la bande : il déborde de 8 px de part et d'autre du bandeau, et
      // s'arrête 8 px avant les lignes, qui seules portent des liens.
      top: `${haut + DETACHE.filet + DETACHE.bandeau / 2 - DETACHE.cible / 2}px`,
      width: `${DETACHE.cible}px`,
      height: `${DETACHE.cible}px`,
    }
  }
  const r = HORLOGE.rayon * HALO_HORLOGE.rayon * f.scale
  return {
    left: `${f.offsetX + HORLOGE.x * f.scale - r}px`,
    top: `${f.offsetY + HORLOGE.y * f.scale - r}px`,
    width: `${2 * r}px`,
    height: `${2 * r}px`,
  }
})
</script>

<template>
  <!-- Hors du `v-if` du panneau : rangé, le panneau n'est plus là, et c'est alors
       qu'on a besoin de la commande. Pas de `@keydown` : un vrai bouton répond déjà
       à Entrée et à Espace par un `click`, et les deux gestionnaires feraient deux
       bascules. Même faute au pointeur : `useScene` écoute `pointerdown` sur `window` et
       `clicPx` bascule déjà le rideau sur l'aire de l'horloge — que ce bouton couvre.
       `@pointerdown.stop` laisse le `click` seul faire la bascule. `aria-label` fixe, sauf le cadran dessiné (sous le seuil, panneau rangé), dont le nom reprend l'heure vue (WCAG 2.5.3). `aria-expanded` dit l'état, `aria-controls` dit de quoi : le bouton et la région portent le même nom, et rien ne disait que l'un commande l'autre. Il n'est posé que quand la région existe — rangé, le panneau est retiré du DOM, et un renvoi dans le vide ne renseigne personne. -->
  <button
    v-if="commande"
    class="commande"
    :class="{ visible: cadranDessine, 'sur-bandeau': detache && visible }"
    data-commande
    type="button"
    :aria-label="cadranDessine ? `${heure} Prochains départs` : 'Prochains départs'"
    :aria-expanded="rideau?.baisse ?? false"
    :aria-controls="visible ? ID_PANNEAU : undefined"
    :disabled="voyage.enRoute"
    :style="commande"
    @pointerdown.stop
    @click="scene?.basculerRideau()"
  >{{ cadranDessine ? heure : '' }}</button>
  <Transition name="dissoudre">
    <div v-if="visible" :id="ID_PANNEAU" class="panneau" :class="{ remonte, detache }" :inert="remonte || undefined" :style="place" role="region" aria-label="Prochains départs" @pointerdown="arreterAppui">
      <template v-if="detache">
        <span class="bras" aria-hidden="true" :style="{ left: retraitBras, height: `${Math.max(0, hautEcran ?? 0)}px` }" />
        <span class="bras" aria-hidden="true" :style="{ right: retraitBras, height: `${Math.max(0, hautEcran ?? 0)}px` }" />
      </template>
      <p class="entete">
        <span><VoletTexte texte="PROCHAINS DÉPARTS" :retard="DEBUT_ENTETE_MS" :fige="fige" /></span>
        <span class="heure"><VoletTexte :texte="heure" :retard="DEBUT_ENTETE_MS" :fige="fige" /></span>
      </p>
      <ul class="lignes">
        <li v-for="(d, i) in lignes" :key="i">
          <RouterLink
            v-if="d.lien === 'cv'"
            class="ligne reel"
            :to="CV"
          >
            <span><VoletTexte :texte="d.heure" :retard="retardLigne(i)" :fige="fige" /></span><span><VoletTexte :texte="d.destination" :retard="retardLigne(i)" :fige="fige" /></span><span><VoletTexte :texte="d.statut" :retard="retardLigne(i)" :fige="fige" /></span>
          </RouterLink>
          <a
            v-else-if="d.lien"
            class="ligne reel"
            :href="HREF[d.lien]"
            :target="d.lien === 'linkedin' ? '_blank' : undefined"
            :rel="d.lien === 'linkedin' ? 'noopener noreferrer' : undefined"
          >
            <span><VoletTexte :texte="d.heure" :retard="retardLigne(i)" :fige="fige" /></span><span><VoletTexte :texte="d.destination" :retard="retardLigne(i)" :fige="fige" /></span><span><VoletTexte :texte="d.statut" :retard="retardLigne(i)" :fige="fige" /></span>
          </a>
          <div v-else class="ligne eteint">
            <span><VoletTexte :texte="d.heure" :retard="retardLigne(i)" :fige="fige" /></span><span><VoletTexte :texte="d.destination" :retard="retardLigne(i)" :fige="fige" /></span><span><VoletTexte :texte="d.statut" :retard="retardLigne(i)" :fige="fige" /></span>
          </div>
        </li>
      </ul>
    </div>
  </Transition>
</template>

<style scoped>
/* Transparente, jamais retirée : ni `display: none` ni `visibility: hidden`, qui
   la sortiraient de la tabulation. Le curseur est le seul indice, pour la souris,
   que l'horloge se clique. */
.commande {
  position: fixed;
  box-sizing: border-box;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

/* Un bouton `disabled` reste touché par le test de survol et **avale** l'événement
   sans le laisser remonter. En rendu attaché la commande est un disque invisible de
   ~103 px posé à la **place d'arrêt** de l'horloge ; le train parti, la gare défile
   mais le disque reste, et pendant toute l'étape un trou invisible mangeait les
   clics — donc les bulles des étoiles qui y tombaient. Aucune des règles qui suivent
   ne parle du pointeur : rien ne vient l'écraser. */
.commande:disabled {
  cursor: default;
  pointer-events: none;
}

.commande:focus-visible {
  outline: 2px solid var(--texte);
  outline-offset: 2px;
}

/* Sous le seuil : un petit cadran épinglé en bas à droite, qui montre l'heure du
   tableau. Le même bouton, déplacé — pas un second. */
.commande.visible {
  /* Une marge basse choisie à l'œil. Ce n'est pas un dégagement de frise : la
     frise est collée en haut de la fenêtre, il n'y a rien en bas. */
  right: 12px;
  bottom: 108px;
  /* Au-dessus du panneau, qui le recouvrirait sinon : même `z-index: auto`, et il
     vient après le bouton dans le gabarit. Rien d'autre ne flotte à 1. */
  z-index: 1;
  width: 52px;
  height: 52px;
  border: 2px solid var(--texte);
  background: var(--fond);
  color: var(--texte);
  font-family: var(--police-mono);
  font-size: 13px;
}

/* Posée sur l'heure du bandeau (panneau posé) : le disque invisible de la gare, sur
   le cadran qui est là. Au-dessus du panneau, qui la recouvrirait sinon. */
.commande.sur-bandeau {
  z-index: 1;
}

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
     texte est doublé par rapport à l'ancienne plaque (13 px devenus 26 px) : à
     cette taille ce n'est pas le nombre de lignes qui grandit (spec, non-buts).
     Ce n'est pas une homothétie de la plaque — 1127 × 329 contre 440 × 166, soit
     ×2,56 en largeur pour ×1,98 en hauteur : la hauteur fixe le corps, la
     largeur laisse de la place aux points de conduite. */
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
     deux triangles de 12 px de cadre **hors de la plaque** — le fond
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

/* Posé sur la fenêtre, à taille lisible : le budget de place est redéclaré en
   pixels d'écran, et la plaque a son propre fond puisque celle du canvas n'est
   pas là où le texte se pose. Le DOM n'est pas tenu à « blanc ou absent ». */
.detache {
  left: 12px;
  right: 12px;
  transform: none;
  /* Un appui sur un lien traverse déjà (`.reel` est `auto`) et c'est `arreterAppui`
     qui le ferme. `auto` protège le reste du panneau — bandeau, lignes éteintes,
     fond — que `.panneau: none` laisserait passer jusqu'à l'horloge. */
  pointer-events: auto;
  --creux: 14px;
  /* Pas de biseau ici : détaché, le panneau ne redéclare ni `clip-path` ni
     `border-radius`, son cadre est un rectangle à filet. Un biseau sur le seul
     bandeau y creusait deux encoches de `--fond` entre le filet et le bandeau
     inversé, dans les deux coins du haut. À zéro, le `polygon` dégénère en
     rectangle — comme `pointsBiseau` côté canvas. `0px` et non `0` : sans unité,
     `calc(100% - var(--biseau))` est invalide et le `clip-path` tombe en entier. */
  --biseau: 0px;
  --entete: 44px;
  --ligne: 32px;
  --marge: 14px;
  font-size: 14px;
  background: var(--fond);
  border: 1px solid var(--texte);
}

/* Les deux bras montent du haut de la plaque jusqu'au bord de la fenêtre. */
.bras {
  position: absolute;
  bottom: calc(100% + 1px);
  width: 2px;
  background: var(--texte);
  /* Hérité de `.detache`, `auto` leur ferait avaler les appuis sur deux bandes de
     2 px qui montent jusqu'en haut de la fenêtre. */
  pointer-events: none;
}

.detache .entete {
  font-size: 13px;
}

/* Trois liens, trois lignes : aucun ne passe à la suivante. */
.detache .ligne {
  gap: 10px;
  white-space: nowrap;
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
  .dissoudre-leave-active {
    transition-duration: 0.2s;
  }
}
</style>
