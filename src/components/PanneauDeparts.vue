<script setup lang="ts">
/**
 * Le panneau des prochains départs : la plaque, ses deux bras, son bandeau et
 * son texte — **tout** en DOM.
 *
 * Il y avait deux rendus, et il n'y en a plus qu'un (spec §4). Le canvas traçait
 * la plaque sur grand écran, le DOM la redessinait sous le seuil mobile ; mais
 * **un canvas ne peut jamais passer devant un élément du DOM**, et le panneau
 * doit passer devant la frise de navigation, qui en est un. Le rendu détaché
 * devient donc le seul, et `RideauLayer` a disparu : la scène garde l'état et la
 * position du rideau (`rideau.ts`), le DOM dessine.
 *
 * Ce qui s'en va avec la plaque du canvas, sans effort : la fumée de la
 * locomotive qui lui passait devant, la plaque fantôme derrière le panneau
 * détaché, et les deux rendus à tenir en accord.
 *
 * **La plaque garde la géométrie du cadre.** Elle fait `RIDEAU.largeur ×
 * RIDEAU.hauteur` pixels de cadre, mis à l'échelle par `transform: scale()`
 * comme le reste de ce qui se pose sur la scène : tout ce qui est écrit dans le
 * style est donc en pixels de **cadre**, et grandit avec elle. Promu à sa
 * hauteur d'écran fixe de 220 px, le rendu du téléphone serait resté un
 * timbre-poste sur un grand écran et **aurait cessé de couvrir l'horloge** au
 * delà de 1920 px, qui, elle, grandit avec la scène.
 *
 * **Il est centré sur la fenêtre**, et non posé à une abscisse de cadre : le
 * cadrage « cover » centre la scène, l'horloge est au milieu de la scène, elle
 * est donc au milieu de la fenêtre à toute taille — un panneau centré la couvre
 * partout. Sa largeur est bornée par la fenêtre moins deux gouttières : une
 * seule règle, continue, sans seuil, qui retombe d'elle-même sur la pleine
 * largeur d'un téléphone.
 *
 * Place : celle que la scène **émet**. Le texte ne calcule pas où est la plaque,
 * il la suit : `top` vient du `y` courant de la ref `RIDEAU_KEY` (animé, pas
 * posé), converti par le cadre. Ni cadre ni position émise, pas de panneau :
 * rien n'est inventé en attendant la scène. Et comme la scène interpole une
 * **fraction** de course et non un `y`, une fenêtre qui se redimensionne en
 * pleine descente ne fait pas sauter la plaque.
 *
 * Il vit hors des routes, comme `RepliquesOiseaux.vue` : l'URL change à l'instant
 * du clic, et dans une gare il serait détruit avant d'avoir pu s'effacer.
 *
 * Durée de vie : le panneau existe tant que la plaque est **en vue**, pas tant
 * que le train est à quai. Le visiteur part rideau baissé, la scène le relève
 * d'elle-même, et le texte doit remonter avec elle — il n'est retiré qu'une
 * fois la plaque sortie de la fenêtre. Il est sinon absent, et ses liens avec
 * lui : un rideau rangé ne laisse aucun lien focalisable hors de l'écran.
 * Pendant la remontée (`remonte`), ce sont les **lignes** qui sont `inert` : ni
 * pointeur, ni tabulation, ni Entrée — `pointer-events: none` seul ne fermerait
 * que le premier, et elles portent les trois seuls focalisables du panneau. La
 * plaque, elle, ne l'est **pas** : un nœud `inert` sort du test de survol du
 * navigateur comme s'il était `pointer-events: none`, et l'appui serait retombé
 * pendant 1,45 s sur ce qu'il y a dessous — le réverbère, qui s'éteint même en
 * marche, et l'horloge, qui rebaisserait le rideau. La plaque reste donc
 * cliquable, et son `pointerdown` continue d'arrêter ce qui tombe dessus.
 *
 * Le texte se pose **volet par volet** (`VoletTexte`), de haut en bas, comme un
 * tableau de grande gare : c'est l'événement, la descente n'en est que
 * l'approche. Les lignes partent quand la plaque arrive, le bandeau un peu
 * avant. Le vrai texte et ses `href` sont dans le DOM dès le montage ; ce qui
 * tourne est une couche décorative par-dessus. Plus de fondu à l'entrée : il
 * se jouait pendant la descente et faisait fondre ce que les volets posent.
 * Sous `prefers-reduced-motion`, le texte est posé d'emblée.
 *
 * La commande du rideau est un disque transparent posé sur l'horloge de la gare,
 * et elle **se retire** panneau baissé (spec §5) : l'horloge est alors dessous, et
 * la sortie est la croix du bandeau.
 */
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import VoletTexte from '@/components/VoletTexte.vue'
import { DEBUT_ENTETE_MS, DEBUT_LIGNES_MS, ECART_LIGNES_MS } from '@/components/volets'
import { FRAME_KEY, RIDEAU_KEY, SCENE_KEY } from '@/composables/useScene'
import { CV, LINKEDIN, adresseMail } from '@/contenu/liens'
import { departsEteints, departsReels, formaterHeure } from '@/scene/horaires'
import type { Depart } from '@/scene/horaires'
import { STAGE } from '@/scene/layout'
import { HALO_HORLOGE, HORLOGE } from '@/scene/quai'
import { BRAS, RIDEAU } from '@/scene/rideau'
import { useVoyage } from '@/stores/voyage'

const frame = inject(FRAME_KEY, ref(null))
const rideau = inject(RIDEAU_KEY, ref(null))
const scene = inject(SCENE_KEY, ref(null))
const voyage = useVoyage()

// Le cadre ne dit pas la largeur de la fenêtre : on la lit là, comme `NavFrise`,
// et on la relit à chaque cadre émis — la scène en émet un à chaque redimensionnement,
// et c'est ce qui fait suivre la gouttière pendant une animation.
const largeur = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const mesurer = () => { largeur.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', mesurer, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('resize', mesurer))
watch(frame, mesurer)

/**
 * Ce qu'on laisse entre la plaque et le bord de la fenêtre, en pixels
 * d'**écran** : la plaque ne touche jamais les bords, même quand l'échelle du
 * cadre la voudrait plus large que la fenêtre. C'est la seule mesure d'écran
 * du panneau ; tout le reste est en pixels de cadre.
 */
const GOUTTIERE = 12

/**
 * Les mesures du CSS dont le script a besoin, en pixels de **cadre** : la hauteur
 * du bandeau (`--entete` moins la demi-ligne d'écart qui le sépare des départs),
 * où se pose la croix. `PanneauDeparts.test.ts` les confronte à la source du style.
 */
const PLAQUE = { entete: 80, ligne: 44 } as const
const BANDEAU = PLAQUE.entete - PLAQUE.ligne / 2

/** Ce qu'un doigt exige, en pixels d'**écran** (WCAG 2.5.5) : le même nombre que `cibleReverbere`. */
const CIBLE = 44

/**
 * La croix de fermeture, en pixels de **cadre** : un carré de 44 px d'**écran**,
 * donc de `CIBLE / échelle` ici — le bandeau rétrécit avec le cadre, pas le
 * doigt. Elle est collée au bord intérieur droit du bandeau, l'heure juste avant.
 */
const cote = computed(() => CIBLE / (frame.value?.scale ?? 1))

/**
 * Où elle est dans la hauteur du bandeau : centrée quand la bande est assez
 * haute pour la porter, et sinon calée sur le **bas** de la bande, donc
 * débordant par le haut — au-dessus il n'y a que le bord de la plaque et le
 * ciel, en dessous il y a la première ligne, qui est un des trois liens. C'est
 * le même parti que la commande posée sur l'heure.
 */
const styleCroix = computed(() => {
  const t = cote.value
  return {
    width: `${t}px`,
    height: `${t}px`,
    marginTop: `${t <= BANDEAU ? (BANDEAU - t) / 2 : BANDEAU - t}px`,
  }
})

/**
 * La largeur de la plaque, en pixels de **cadre** : la sienne, sauf si la
 * fenêtre est trop étroite pour la porter — alors c'est la fenêtre, moins ses
 * deux gouttières, ramenée dans le repère du cadre. Une seule règle, continue,
 * sans seuil.
 */
const largeurCadre = computed(() => {
  const f = frame.value
  if (!f) return RIDEAU.largeur
  return Math.min(RIDEAU.largeur, (largeur.value - 2 * GOUTTIERE) / f.scale)
})

// Le haut de la plaque, en pixels d'écran. C'est lui, et lui seul, que `place`
// et la visibilité lisent : ce qu'on place et ce qu'on décide de montrer ne
// peuvent pas se contredire. La scène dit le `y` ; le cadre le convertit.
const hautEcran = computed(() => {
  const f = frame.value
  const r = rideau.value
  if (!f || !r) return null
  return f.offsetY + r.y * f.scale
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

// Une graine par descente du rideau : les lignes éteintes ne bougent pas tant
// qu'il reste baissé, pour ne pas distraire de la lecture des trois liens.
const graine = ref(Math.floor(Math.random() * 2 ** 31))
const maintenant = ref(new Date())
let minuterie = 0

function armer() {
  window.clearInterval(minuterie)
  minuterie = window.setInterval(() => { maintenant.value = new Date() }, 15_000)
}

watch(visible, (v) => {
  if (v) graine.value = Math.floor(Math.random() * 2 ** 31)
}, { immediate: true })

// L'heure n'avance que tant que le bandeau la montre : panneau absent, rien à tenir à jour.
watch(visible, (v) => {
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

/**
 * Le bord gauche de la plaque, en pixels d'écran : elle est **centrée sur la
 * fenêtre**. `transform-origin: 0 0` fait que l'échelle ne déplace pas ce
 * bord-là, elle n'étire la plaque que vers la droite et vers le bas.
 */
const gaucheEcran = computed(() => {
  const f = frame.value!
  return (largeur.value - largeurCadre.value * f.scale) / 2
})

// Taille de cadre, mise à l'échelle par `transform` : le texte n'est jamais
// mesuré en pixels d'écran, et le style du panneau non plus.
const place = computed<Record<string, string>>((): Record<string, string> => {
  const f = frame.value!
  return {
    left: `${gaucheEcran.value}px`,
    top: `${hautEcran.value}px`,
    width: `${largeurCadre.value}px`,
    height: `${RIDEAU.hauteur}px`,
    transform: `scale(${f.scale})`,
  }
})

/**
 * Les deux bras, en pixels de cadre : ils sont dans la plaque, donc dans son
 * échelle. Ils n'ont plus à éviter les libellés de la frise — le panneau passe
 * **devant** elle (spec §5), et deux traits fins la traversent. Ils reprennent
 * donc le retrait de la scène, `BRAS.retrait`.
 *
 * Leur hauteur est celle de la scène entière : le cadrage « cover » garantit
 * que `STAGE.height × échelle` dépasse la fenêtre, donc qu'ils montent toujours
 * au-delà de son bord haut. C'est le rognage qui les coupe, pas un calcul — la
 * plaque peut être n'importe où entre sa rangée et sa pose.
 */
const retraitBras = `${BRAS.retrait}px`
const hauteurBras = `${STAGE.height}px`

/**
 * L'appui s'arrête sur le panneau.
 *
 * `useScene` écoute `pointerdown` sur `window` : sans cette porte, un appui sur
 * une ligne éteinte (qui n'a pas de lien, donc rien à prendre) retomberait sur
 * `Scene.clicPx` et éteindrait le réverbère dont les deux tiers bas sont en
 * pleine vue sous la plaque. Le panneau est devant : c'est à lui d'arrêter ce
 * qui tombe dessus, et c'est ce que `pointer-events: auto` et cet arrêt font
 * ensemble. Les trois liens, eux, reçoivent leur `click` normalement — on
 * n'arrête que la remontée vers la fenêtre.
 *
 * **Ce qu'arrêter coûte, et qu'il faut rendre** : `useScene.surAppui` finit par
 * `setPointerPx`, et c'est ce qui ferme la bulle d'une étoile — « a tap that
 * hits nothing closes the bubble ». Un appui sur la plaque n'y arrive plus ; la
 * bulle resterait ouverte dessous et réapparaîtrait à la remontée du panneau. Le
 * panneau le dit donc lui-même, par `Scene.fermerBulleEtoile`, avant d'arrêter.
 *
 * **Le survol, lui, passe.** `useScene` fait voyager `setPointer` sur le même
 * `pointermove`, et c'est lui qui fait respirer la parallaxe du ciel : l'arrêter
 * figerait le ciel dès que le pointeur touche le panneau. Le prix est que le
 * survol atteint encore les étoiles que la plaque recouvre — la bulle est à
 * `z-index: 5`, donc derrière elle, et seul un débord de bulle peut se voir au
 * ras du bord de la plaque. Un ciel figé se voit bien davantage.
 */
function arreterAppui(e: PointerEvent) {
  // L'arrêt d'abord, la politesse ensuite : c'est lui qui ferme la route du
  // réverbère, et rien de ce qui suit ne doit pouvoir l'empêcher.
  e.stopPropagation()
  scene.value?.fermerBulleEtoile(e.clientX, e.clientY)
}

// L'`id` de la région, que la commande désigne par `aria-controls`. Il n'y a qu'un
// panneau des départs dans le site : l'identifiant peut être fixe.
const ID_PANNEAU = 'panneau-departs'

/**
 * La commande du rideau : un disque transparent posé sur l'horloge du canvas, de
 * la taille exacte de la cible de la souris (`horlogeTouchee`) : le même geste au
 * clavier qu'au pointeur, pour que les trois liens du panneau s'atteignent sans
 * souris. Elle passe par `Scene.basculerRideau()`, qui tient en un seul endroit
 * la règle (se baisse à l'arrêt, se relève toujours) — jamais par le rideau.
 *
 * **Elle est la commande d'ouverture, et seulement elle.** Rideau baissé elle se
 * retire (`null`, donc `v-if`) : l'horloge est dessous, et un disque resté en
 * piège sous la plaque, ou posé sur le bandeau, serait une seconde commande de
 * fermeture qui se disputerait la place de la croix. Elle revient dès que le
 * rideau n'est plus baissé, plaque encore en vue : le focus y retourne.
 */
const commande = computed<Record<string, string> | null>(() => {
  // Ni ailleurs ni cadre : pas de commande.
  if (voyage.gare !== 'ailleurs') return null
  const f = frame.value
  if (!f) return null
  // Panneau baissé, l'horloge est dessous : la commande se retire (spec §5), elle ne
  // reste pas en piège sous la plaque. La croix du bandeau est la sortie, et le
  // focus y entre à l'ouverture.
  if (rideau.value?.baisse) return null
  const r = HORLOGE.rayon * HALO_HORLOGE.rayon * f.scale
  return {
    left: `${f.offsetX + HORLOGE.x * f.scale - r}px`,
    top: `${f.offsetY + HORLOGE.y * f.scale - r}px`,
    width: `${2 * r}px`,
    height: `${2 * r}px`,
  }
})

const route = useRoute()
const commandeEl = ref<HTMLButtonElement | null>(null)
const croixEl = ref<HTMLButtonElement | null>(null)

/**
 * Échap ferme le panneau tant qu'il est baissé, et seulement alors : rangé, la
 * touche n'est pas à lui. Le CV reste au-dessus de tout, donc sa touche passe
 * d'abord : tant qu'il est ouvert, Échap le referme **lui**, et le panneau, qui
 * reste monté dessous (décision 7 de la spec du rideau), attend le suivant.
 * Passe par `Scene.basculerRideau()`, comme la croix et l'horloge.
 */
/**
 * Ferme, et **seulement** si le panneau est baissé : `basculerRideau` est une
 * bascule, et la croix reste atteignable pendant la remontée (la plaque doit
 * rester dans le chemin du pointeur). Un second appui — un double-tap — la
 * rebaisserait sans cette garde.
 */
function fermer() {
  if (!rideau.value?.baisse) return
  scene.value?.basculerRideau()
}

function surEchap(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented) return
  if (route.name === 'cv') return
  fermer()
}
onMounted(() => document.addEventListener('keydown', surEchap))
onBeforeUnmount(() => document.removeEventListener('keydown', surEchap))

/**
 * Le focus. Il **entre** dans le panneau à l'ouverture — sur la croix, le chemin
 * de sortie, qui précède les liens dans l'ordre du DOM — et **revient** à la
 * fermeture sur la commande de l'horloge.
 *
 * Sauf au départ du train : la commande est alors `disabled` et ne peut pas le
 * prendre. Un `focus()` sur elle serait avalé en silence, et le visiteur au
 * clavier resterait sans focus nulle part ; on le rend au corps du document.
 *
 * Et le focus n'est repris que s'il était à nous (dans la plaque, sur la
 * commande, ou nulle part) : si le visiteur l'a posé ailleurs, il y reste.
 *
 * Ce n'est pas un piège : rien ne retient Tab, rien n'est `inert` hors de la
 * liste, la page derrière reste visible donc atteignable.
 */
watch(() => rideau.value?.baisse ?? false, async (baisse, avant) => {
  if (baisse === avant) return
  await nextTick()
  if (baisse) {
    croixEl.value?.focus({ preventScroll: true })
    return
  }
  const actif = document.activeElement
  const aNous =
    !actif || actif === document.body || actif === commandeEl.value ||
    !!document.getElementById(ID_PANNEAU)?.contains(actif)
  if (!aNous) return
  const bouton = commandeEl.value
  if (bouton && !bouton.disabled) bouton.focus({ preventScroll: true })
  else if (actif instanceof HTMLElement && actif !== document.body) actif.blur()
})
</script>

<template>
  <!-- Hors du `v-if` du panneau : rangé, le panneau n'est plus là, et c'est alors
       qu'on a besoin de la commande. Pas de `@keydown` : un vrai bouton répond déjà
       à Entrée et à Espace par un `click`, et les deux gestionnaires feraient deux
       bascules. Même faute au pointeur : `useScene` écoute `pointerdown` sur `window` et
       `clicPx` bascule déjà le rideau sur l'aire de l'horloge — que ce bouton couvre.
       `@pointerdown.stop` laisse le `click` seul faire la bascule. `aria-label` fixe :
       le bouton ne porte aucun texte. `aria-expanded` dit l'état, `aria-controls` dit de
       quoi : le bouton et la région portent le même nom, et rien ne disait que l'un
       commande l'autre. Il n'est posé que quand la région existe — rangé, le panneau est
       retiré du DOM, et un renvoi dans le vide ne renseigne personne. -->
  <button
    v-if="commande"
    ref="commandeEl"
    class="commande"
    data-commande
    type="button"
    aria-label="Prochains départs"
    :aria-expanded="rideau?.baisse ?? false"
    :aria-controls="visible ? ID_PANNEAU : undefined"
    :disabled="voyage.enRoute"
    :style="commande"
    @pointerdown.stop
    @click="scene?.basculerRideau()"
  ></button>
  <Transition name="dissoudre">
    <div v-if="visible" :id="ID_PANNEAU" class="panneau" :class="{ remonte }" :style="place" role="region" aria-label="Prochains départs" @pointerdown="arreterAppui">
      <span class="bras" aria-hidden="true" :style="{ left: retraitBras, height: hauteurBras }" />
      <span class="bras" aria-hidden="true" :style="{ right: retraitBras, height: hauteurBras }" />
      <p class="entete">
        <span><VoletTexte texte="PROCHAINS DÉPARTS" :retard="DEBUT_ENTETE_MS" :fige="fige" /></span>
        <span class="heure"><VoletTexte :texte="heure" :retard="DEBUT_ENTETE_MS" :fige="fige" /></span>
        <!-- Visible, et non un disque transparent : c'est le chemin de sortie. Le
             dessin est masqué au lecteur d'écran, qui lit le nom du bouton. -->
        <button ref="croixEl" class="croix" type="button" aria-label="Fermer les prochains départs" :style="styleCroix" @click="fermer">
          <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"><path d="M14 14L30 30M30 14L14 30" /></svg>
        </button>
      </p>
      <!-- `inert` ici et pas sur la plaque : les trois liens sont les seuls
           focalisables du panneau, et un nœud `inert` cesse d'être visé par le
           pointeur — la plaque doit, elle, rester dans le chemin du pointeur
           pendant toute la remontée. -->
      <ul class="lignes" :inert="remonte || undefined">
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
   que l'horloge se clique.

   **Pas de `z-index` ici.** Posée sur l'horloge — panneau rangé — elle est un
   disque invisible de ~103 px en plein milieu du ciel : le monter au-dessus de
   la bulle d'étoile (5) lui ferait manger les clics qui y tombent, le défaut
   même que le `disabled` plus bas corrige pour la gare qui défile. Elle n'a
   besoin de passer devant que lorsqu'il y a un panneau devant lequel passer. */
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
   sans le laisser remonter. La commande est un disque invisible de ~103 px posé à la
   **place d'arrêt** de l'horloge ; le train parti, la gare défile mais le disque
   reste, et pendant toute l'étape un trou invisible mangeait les clics — donc les
   bulles des étoiles qui y tombaient. Aucune des règles qui suivent ne parle du
   pointeur : rien ne vient l'écraser. */
.commande:disabled {
  cursor: default;
  pointer-events: none;
}

.commande:focus-visible {
  outline: 2px solid var(--texte);
  outline-offset: 2px;
}

/* La plaque. Tout ce qui est écrit ici est en pixels de **cadre** : le
   `transform: scale()` les met à l'échelle de la fenêtre, texte compris.

   `z-index: 15` : devant la frise de navigation (2), l'œil (3), les bulles
   d'étoiles (5) et la liste (10) — c'est toute la raison pour laquelle la
   plaque a quitté le canvas, qui ne pouvait pas passer devant eux. Et sous le
   CV (20), qui reste au-dessus de tout.

   Le fond et le filet sont les siens : la plaque du canvas n'est plus là pour
   les porter. Le DOM n'est pas tenu à « blanc ou absent ». */
.panneau {
  position: fixed;
  z-index: 15;
  transform-origin: 0 0;
  box-sizing: border-box;
  background: var(--fond);
  border: 1px solid var(--texte);
  /* Le retrait latéral, déclaré une seule fois : le bandeau d'en-tête
     l'annule pour aller d'un bord intérieur à l'autre du cadre.

     32 px de cadre à l'origine, descendu à 26. La plaque est bornée par la
     gouttière sur une fenêtre étroite tandis que le texte garde l'échelle du
     cadre : à 390 px de large la piste des points de conduite se refermait de
     12 px de cadre, et les points — qui existent à toute autre largeur —
     disparaissaient. Les 12 px que ce retrait rend sont exactement ce qui
     manquait. */
  --creux: 26px;
  /* Le budget de place du panneau, en pixels de cadre. La plaque fait
     `RIDEAU.hauteur` (329 px) et doit tenir un bandeau et cinq lignes : c'est
     **ici** que la mise en page se décide, et `PanneauDeparts.test.ts` fait
     l'addition pour que personne n'ajoute une sixième ligne en silence.
     `--entete` compte l'écart qui sépare le bandeau des départs. Le corps du
     texte est doublé par rapport à l'ancienne plaque murale (13 px devenus
     26 px) : à cette taille ce n'est pas le nombre de lignes qui grandit
     (spec, non-buts). Ce n'est pas une homothétie de cette plaque-là —
     1127 × 329 contre 440 × 166, soit ×2,56 en largeur pour ×1,98 en hauteur :
     la hauteur fixe le corps, la largeur laisse de la place aux points de
     conduite. */
  --entete: 80px;
  --ligne: 44px;
  --marge: 29px;
  padding: var(--marge) var(--creux);
  font-family: var(--police-mono);
  font-weight: 300;
  font-size: 26px;
  color: var(--texte);
  /* Le panneau est devant tout : c'est lui qui arrête ce qui tombe dessus, et
     non plus une boîte de couverture calculée dans le canvas. `auto` couvre
     aussi le fond et les lignes éteintes, qui ne portent aucun lien. */
  pointer-events: auto;
}

/* L'en-tête est un **bandeau plein** : le fond prend la couleur du texte et le
   texte celle du fond. C'est le tour que fait déjà le cadran de l'horloge, dont
   les aiguilles sont creusées dans le blanc — « blanc ou absent » appliqué à
   l'envers, pas levé. Les deux couleurs viennent des variables, jamais d'un
   littéral : l'œil fait tourner trois couleurs de nuit.

   C'est lui, et non plus un filet tracé au canvas, qui sépare l'en-tête des
   départs. Sa hauteur est le **réglage de luminosité du panneau** : il est la
   chose la plus claire de la gare après la lanterne.

   Plus de coupe aux coins : la plaque est à coins droits (spec §4), le bandeau
   affleure donc ses deux coins du haut sans rien déborder. */
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
  /* Rien à droite : la croix y est collée, et c'est elle qui porte le retrait. */
  padding-right: 0;
  padding-bottom: 0;
  padding-left: var(--creux);
  background: var(--texte);
  color: var(--fond);
  /* Plein, pas à mi-teinte : l'opacité `--moyen` d'avant en ferait un gris. */
  opacity: 1;
  font-size: 22px;
  letter-spacing: 0.08em;
}

/* La croix : un carré plein aux couleurs du bandeau, dont la taille (44 px
   d'écran) est posée en ligne par le script. Elle a **son** fond et non celui
   du bandeau : quand la bande est plus basse que le doigt, elle déborde au
   ciel, et un trait sans fond y disparaîtrait. Pas de `z-index` : elle est dans
   la plaque (15), sous le CV (20). */
.croix {
  flex: none;
  align-self: flex-start;
  box-sizing: border-box;
  margin-left: 12px;
  padding: 0;
  border: 0;
  background: var(--texte);
  color: var(--fond);
  cursor: pointer;
}

.entete .heure {
  margin-left: auto;
}

.croix svg {
  display: block;
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
}

.croix:hover {
  background: var(--fond);
  color: var(--texte);
}

.croix:focus-visible {
  outline: 2px solid var(--fond);
  outline-offset: -5px;
}

.lignes {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Trois liens, trois lignes : aucune ne passe à la suivante. Sur une fenêtre
   étroite la plaque est bornée par la gouttière tandis que le texte garde
   l'échelle du cadre : la piste des points de conduite se referme alors la
   première, et c'est elle qui doit céder — pas la ligne, qui se couperait en
   deux et déborderait sa hauteur. */
.ligne {
  display: grid;
  grid-template-columns: 3.4em 1fr auto;
  align-items: center;
  gap: 20px;
  white-space: nowrap;
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

/* Les deux bras montent du haut de la plaque jusqu'au bord de la fenêtre, et
   **par-dessus la frise** : c'est le seul endroit où le panneau la traverse.
   Deux traits fins, et la navigation reste lisible. */
.bras {
  position: absolute;
  bottom: 100%;
  width: 2px;
  background: var(--texte);
  /* `auto` leur ferait avaler les appuis sur deux bandes qui montent jusqu'en
     haut de la fenêtre, frise comprise. */
  pointer-events: none;
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
   fondu ci-dessus, sur toute la durée où la plaque est encore en vue. */
.remonte .reel {
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .dissoudre-leave-active {
    transition-duration: 0.2s;
  }
}
</style>
