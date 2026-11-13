<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { SCENE_KEY } from '@/composables/useScene'
import type { Poignee } from '@/scene/Dissolve'
import type { Scene } from '@/scene/Scene'
import type { Trace } from '@/scene/types'
import { cadrageCiel } from '@/scene/layout'
import { tirerPlace } from '@/scene/stars'
import { useTraces } from '@/stores/traces'
import type { Envoi } from '@/stores/traces'
import { useVoyage } from '@/stores/voyage'

/**
 * Le formulaire de « là-haut » (CONCEPT.md §4.3) et l'ordre des opérations de
 * l'envoi : l'écriture part à l'appui sur Entrée, la phrase se défait sans
 * l'attendre, et **aucune étoile ne s'allume pour une phrase qui n'est pas
 * enregistrée**.
 */

/** §4.3 : quatre-vingts caractères, comptés comme `firestore.rules` les compte. */
const MAX_PHRASE = 80
/** Ce que les règles acceptent pour le prénom : au-delà, le document est refusé. */
const MAX_PRENOM = 24
/** Combien de candidats `tirerPlace` départage. */
const TIRAGES = 40
/** Passé ce délai, on rend l'écran au visiteur. L'écriture, elle, continue. */
const DELAI = 10_000
/**
 * §6.9 : une écriture Firestore ne s'annule pas. Dire « ça n'est pas parti »
 * serait un mensonge à retardement — le visiteur réécrirait, et Emmanuelle
 * modérerait un doublon.
 */
const MESSAGE = "on n'a pas pu confirmer"

const traces = useTraces()
/**
 * L'envoi parti et non réglé, et la phrase dont on n'a pas pu confirmer le
 * sort. Ils vivent dans le magasin et non ici, parce qu'ils **survivent au
 * formulaire** : le visiteur peut quitter « là-haut » pendant que l'écriture
 * vole. Un `ref` de composant laisserait le formulaire remonté en tirer un
 * second identifiant — un doublon à modérer — et un refus arrivé entre-temps
 * s'écrirait dans une référence morte : la phrase aurait quitté l'écran avec
 * le composant, sans un mot.
 *
 * `envoi` tient aussi les champs en lecture seule : tant que cette écriture-là
 * court, c'est elle qu'on redéfait et c'est elle qu'on effacera. Un texte
 * corrigé entre-temps ne partirait jamais, et serait effacé sans un mot.
 */
const { envoi, nonConfirmee } = storeToRefs(traces)
const { enRoute } = storeToRefs(useVoyage())
const scene = inject(SCENE_KEY, shallowRef<Scene | null>(null))

const phrase = ref('')
const prenom = ref('')
/** Verrou d'envoi : un second appui ne relance ni l'écriture ni la dissolution. */
const enVol = ref(false)
const champ = ref<HTMLInputElement | null>(null)

/**
 * Ce que dit la ligne. Une région live doit exister dans le DOM **avant** que
 * son contenu change : insérée avec son texte, elle n'est souvent annoncée ni
 * par NVDA, ni par JAWS, ni par VoiceOver — et c'est le seul canal par lequel
 * « on n'a pas pu confirmer » se dit à un lecteur d'écran.
 *
 * Deux chemins insèrent la région déjà pleine : le formulaire remonté sur une
 * phrase restée en souffrance, et le retour à quai (le `<p>` vit sous le
 * `v-if` du formulaire). Sur ceux-là seulement, le texte est posé après un
 * vrai tour de boucle d'événements. `nextTick` n'y suffirait pas : il se règle
 * dans la tâche qui insère, et l'arbre d'accessibilité se construit après
 * elle — le lecteur verrait encore la région apparaître avec son texte.
 * Le délai est une heuristique, pas une garantie : rien, dans jsdom, ne peut
 * vérifier ce qu'une aide technique annonce vraiment.
 */
const DELAI_REGION = 120
const dit = ref('')
let posePid: ReturnType<typeof setTimeout> | null = null
/** La région était-elle déjà dans le DOM au tour précédent ? */
let regionEnPlace = false

function annulerPose(): void {
  if (posePid !== null) clearTimeout(posePid)
  posePid = null
}

watch(
  [nonConfirmee, enRoute],
  ([souci, route]) => {
    annulerPose()
    const etaitLa = regionEnPlace
    regionEnPlace = !route
    if (route || !souci) {
      dit.value = ''
      return
    }
    // Déjà en place : son texte peut changer tout de suite, c'est bien un
    // changement de contenu dans une région qui existait.
    if (etaitLa) {
      dit.value = MESSAGE
      return
    }
    // Fraîchement insérée, et déjà quelque chose à dire : on attend.
    posePid = setTimeout(() => {
      posePid = null
      dit.value = MESSAGE
    }, DELAI_REGION)
  },
  { immediate: true },
)

/** La dissolution à l'écran. **Il faut toujours la conclure** (Dissolve.ts). */
let poignee: Poignee | null = null
let minuteur: ReturnType<typeof setTimeout> | null = null

const compte = computed(() => [...phrase.value].length)

/**
 * La saisie est bornée en points de code, jamais par `maxlength` : celui-ci
 * compte en unités UTF-16, où un emoji pèse deux, et une phrase affichée
 * « 40 / 80 » serait coupée. On en reprend en revanche le geste exact, qui est
 * le seul honnête : **c'est l'insertion qu'on rogne, jamais ce qui est déjà
 * écrit**. Couper par la fin effacerait le dernier point de code de la phrase
 * — pas celui qu'on vient de taper au milieu — et renverrait le curseur au
 * bout : une phrase amputée, sans que le visiteur voie ce qu'il a perdu.
 *
 * D'où la petite différence entre l'ancienne et la nouvelle valeur : préfixe
 * commun, suffixe commun, et entre les deux ce que le geste a remplacé par ce
 * qu'il insère. La place restante est ce que le remplacement libère.
 *
 * Cette différence est **ancrée sur le curseur**, qui est le seul témoin de
 * l'endroit où le visiteur a tapé. Sans lui, dans une suite de lettres
 * identiques — « aaaa… », mais aussi « bonne », « elle » — une comparaison
 * gourmande par le début croit que la saisie s'est faite au bout, et y renvoie
 * le curseur. C'est le symptôme même qu'on corrige. Le suffixe se mesure donc
 * d'abord, borné par ce qui suit le curseur ; le préfixe vient ensuite.
 */
function saisir(event: Event, max: number, avant: string): string {
  const el = event.target as HTMLInputElement
  const apres = [...el.value]
  // Vue ne repose pas une valeur qu'il croit inchangée : au quatre-vingt-unième
  // point de code le modèle ne bouge pas, et le champ garderait le surplus.
  if (apres.length <= max) return el.value

  const ancien = [...avant]
  // Le curseur, en points de code : `selectionStart` compte en unités UTF-16.
  const curseur = [...el.value.slice(0, el.selectionStart ?? el.value.length)].length

  // Le suffixe d'abord, et jamais au-delà du curseur : ce qui le suit n'a pas
  // été touché par la saisie.
  const maxQueue = Math.min(ancien.length, apres.length - curseur)
  let queue = 0
  while (
    queue < maxQueue &&
    ancien[ancien.length - 1 - queue] === apres[apres.length - 1 - queue]
  )
    queue += 1

  const maxTete = Math.min(ancien.length - queue, apres.length - queue)
  let tete = 0
  while (tete < maxTete && ancien[tete] === apres[tete]) tete += 1

  const remplaces = ancien.length - tete - queue
  const place = Math.max(0, max - (ancien.length - remplaces))
  const insere = apres.slice(tete, apres.length - queue).slice(0, place)
  const borne = [...ancien.slice(0, tete), ...insere, ...ancien.slice(tete + remplaces)].join('')

  el.value = borne
  // Le curseur au bout de ce qui est vraiment entré : à zéro place, il ne
  // bouge pas, et l'insertion est refusée comme `maxlength` la refuse.
  const position = [...borne].slice(0, tete + insere.length).join('').length
  el.setSelectionRange(position, position)
  return borne
}

function saisirPhrase(event: Event): void {
  phrase.value = saisir(event, MAX_PHRASE, phrase.value)
}

function saisirPrenom(event: Event): void {
  prenom.value = saisir(event, MAX_PRENOM, prenom.value)
}

/**
 * Où l'encre se tient vraiment : la boîte de contenu du champ, sans ses marges
 * intérieures. Les grains sont dessinés lettre à lettre depuis ce coin — un
 * rectangle pris au bord du champ les décalerait de toute sa marge.
 */
function cadrePhrase(): DOMRect {
  const el = champ.value
  if (!el) return new DOMRect(0, 0, 0, 0)
  const px = (v: string) => Number.parseFloat(v) || 0
  const r = el.getBoundingClientRect()
  const s = getComputedStyle(el)
  const gauche = px(s.paddingLeft) + px(s.borderLeftWidth)
  const haut = px(s.paddingTop) + px(s.borderTopWidth)
  return new DOMRect(
    r.left + gauche,
    r.top + haut,
    Math.max(0, el.clientWidth - gauche - px(s.paddingRight)),
    Math.max(0, el.clientHeight - haut - px(s.paddingBottom)),
  )
}

/** L'écriture part tout de suite, à une place tirée une seule fois. */
function demarrer(texte: string): Envoi {
  const prises = traces.etoiles.map((e) => ({ x: e.x, y: e.y }))
  // Les distances se mesurent en pixels d'écran : la hauteur libre varie avec x,
  // le carré normalisé ne dit plus « loin ».
  const { decalage, echelle } = cadrageCiel(window.innerWidth, window.innerHeight)
  const place = tirerPlace(
    prises,
    Math.random,
    TIRAGES,
    window.innerWidth,
    window.innerHeight,
    echelle,
    decalage,
  )
  const nom = prenom.value.trim()
  // C'est le magasin qui tient l'envoi et qui, seul, conclut l'écriture : une
  // promesse écoutée d'ici mourrait avec le composant.
  return traces.envoyer({
    phrase: texte,
    ...(nom ? { prenom: nom } : {}),
    x: place.x,
    y: place.y,
  })
}

function laisser(): void {
  if (enVol.value) return
  // Un envoi déjà parti se redéfait tel qu'il a été écrit, texte compris.
  const texte = envoi.value ? envoi.value.trace.phrase : phrase.value.trim()
  if (texte.length === 0 || [...texte].length > MAX_PHRASE) return

  enVol.value = true
  traces.signaler(null)
  const courant = envoi.value ?? demarrer(texte)
  // Mesuré avant de rendre la main au clavier : sur un téléphone, Entrée le
  // referme et la fenêtre change de taille à l'instant même. C'est
  // `Dissolve.resize` qui rattrape la place ; le cadre de départ, lui, doit
  // être celui du champ encore en place.
  const cadre = cadrePhrase()
  champ.value?.blur()
  // Sans attendre la réponse : le formulaire s'efface, la phrase se défait.
  poignee =
    scene.value?.beginDissolve(texte, cadre, {
      x: courant.trace.x,
      y: courant.trace.y,
    }) ?? null
  minuteur = setTimeout(surDelai, DELAI)
}

/**
 * L'écriture est acceptée. **`land` d'abord, et attendu** : c'est lui qui pose
 * l'étoile, au bout de la montée. `confirmer` la poserait par le magasin, deux
 * secondes et demie trop tôt, en plein vol du grain. Le magasin attend donc ce
 * retour-là, et appelle le formulaire qui est à l'écran — s'il y en a un.
 */
async function poser(t: Trace): Promise<void> {
  arreter()
  const p = reprendre()
  if (p) await p.land(t)
}

/**
 * L'envoi est réglé — par ce formulaire ou par un autre, puisque l'écriture
 * survit au démontage. C'est ici, et nulle part ailleurs, que l'écran reprend
 * sa place. Le verrou se lève avec l'effacement, pas avant : entre la réponse
 * et la fin de la montée, les champs seraient modifiables deux secondes et
 * demie, pour un texte effacé juste après.
 */
watch(envoi, (valeur) => {
  if (valeur !== null) return
  arreter()
  const p = reprendre()
  enVol.value = false
  if (nonConfirmee.value) {
    // Refusée : les grains se reforment, le texte reste au visiteur.
    p?.revert()
    return
  }
  // Acceptée : `poser` a déjà conclu la dissolution. Temps 5, le formulaire
  // revient vide.
  phrase.value = ''
  prenom.value = ''
})

/**
 * Le délai ne coupe pas l'écriture — Firestore réessaie tant que l'onglet est
 * ouvert. Il rend seulement l'écran, avec la phrase intacte dans le champ.
 */
function surDelai(): void {
  minuteur = null
  reprendre()?.revert()
  const courant = envoi.value
  if (courant) traces.signaler(courant.trace)
  enVol.value = false
}

/** Reprend la dissolution en cours, et la retire : on ne la conclut qu'une fois. */
function reprendre(): Poignee | null {
  const p = poignee
  poignee = null
  return p
}

function arreter(): void {
  if (minuteur !== null) clearTimeout(minuteur)
  minuteur = null
}

// Une écriture partie avec une instance précédente du formulaire se reprend
// telle quelle — même document, même phrase, même place —, et une phrase dont
// on n'a pas pu confirmer le sort revient dans le champ. Sans cela, le visiteur
// qui revient trouverait un champ vide et verrouillé, et sa phrase nulle part.
const repris = envoi.value?.trace ?? nonConfirmee.value
if (repris) {
  phrase.value = repris.phrase
  prenom.value = repris.prenom ?? ''
}

// C'est ce formulaire-ci qui fait monter le grain, tant qu'il est à l'écran.
traces.suivre(poser)

// Une poignée abandonnée laisserait son nœud de grains à l'écran, et sa
// timeline en vie, jusqu'au `dispose` de la scène.
onBeforeUnmount(() => {
  traces.oublier(poser)
  annulerPose()
  arreter()
  reprendre()?.revert()
})
</script>

<template>
  <div class="gare-la-haut">
    <!-- On n'écrit pas depuis un train qui roule : le formulaire arrive à
         quai, par dissolution, comme le reste des gares. -->
    <Transition name="dissoudre">
      <form
        v-if="!enRoute"
        class="trace"
        :data-envoi="enVol"
        @submit.prevent="laisser"
        @keydown.enter.prevent="laisser"
      >
        <h2 class="titre">Laisser une trace ?</h2>
        <input
          ref="champ"
          class="phrase"
          data-champ="phrase"
          type="text"
          autocomplete="off"
          aria-label="votre phrase"
          placeholder="une phrase, un mot, une pensée…"
          :value="phrase"
          :readonly="envoi !== null"
          @input="saisirPhrase"
        />
        <input
          class="prenom"
          data-champ="prenom"
          type="text"
          autocomplete="off"
          aria-label="votre prénom"
          placeholder="un prénom, si vous voulez"
          :value="prenom"
          :readonly="envoi !== null"
          @input="saisirPrenom"
        />
        <p class="meta">
          <span data-role="compteur">{{ compte }} / {{ MAX_PHRASE }}</span>
          <!-- Un vrai bouton, pas une mention : un champ en lecture seule ne
               fait pas remonter le clavier d'un téléphone, et après le délai
               ce serait le seul geste encore possible. -->
          <button type="submit" class="laisser" data-role="laisser">laisser ↵</button>
        </p>
        <!-- Toujours là, même muette : une région live insérée en même temps
             que son texte n'est souvent pas annoncée, et c'est par elle seule
             que « on n'a pas pu confirmer » se dit. -->
        <p class="dit" data-role="dit" aria-live="polite">{{ dit }}</p>
      </form>
    </Transition>
  </div>
</template>

<style scoped>
.gare-la-haut {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* À droite, dans le ciel, sans cadre (§4.3). */
.trace {
  position: absolute;
  top: 176px;
  right: 56px;
  width: 280px;
  pointer-events: auto;
  /* Temps 1 et 5 : le formulaire s'efface, puis revient. */
  transition: opacity 0.7s ease;
}

.trace[data-envoi='true'] {
  opacity: 0;
  pointer-events: none;
}

.titre {
  margin: 0 0 18px;
  font-size: 17px;
  font-weight: 300;
  letter-spacing: 0.01em;
  opacity: var(--moyen);
}

.phrase,
.prenom {
  display: block;
  width: 100%;
  margin: 0;
  /* Pas de marge à gauche : l'encre commence au bord du cadre qu'on mesure. */
  padding: 0 0 9px;
  border: 0;
  border-bottom: 1px solid rgb(from var(--trait) r g b / var(--murmure));
  background: none;
  color: var(--texte);
  caret-color: var(--trait);
  transition: border-color 0.6s ease;
}

/**
 * Exactement la police que `Dissolve.ts` rastérise (`POLICE`). Si les deux
 * divergent, les grains tombent à côté des lettres, et rien ne le dit : un
 * test compare les deux fichiers.
 */
.phrase {
  font: 300 17px var(--police-texte);
}

.prenom {
  margin-top: 26px;
  font: 300 14px var(--police-texte);
}

.phrase::placeholder,
.prenom::placeholder {
  color: var(--texte);
  opacity: var(--faible);
}

.phrase:focus,
.prenom:focus {
  outline: none;
  border-bottom-color: rgb(from var(--trait) r g b / var(--moyen));
}

.meta,
.dit {
  font-family: var(--police-mono);
  font-size: 10.5px;
  letter-spacing: 0.04em;
  opacity: var(--faible);
}

.meta {
  display: flex;
  justify-content: space-between;
  margin: 12px 0 0;
}

/* Un bouton qui ne se voit pas comme tel : le §4.3 ne montre que la mention.
   Son contour au clavier, lui, est laissé au navigateur.

   `font` ne couvre ni l'interlettrage ni la casse, et la feuille du navigateur
   les impose aux boutons : sans ces deux lignes, « laisser ↵ » se resserrerait
   à côté du compteur qui, lui, garde les 0,04 em de la ligne méta. */
.laisser {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: none;
  cursor: pointer;
}

/* La ligne n'est posée qu'une fois le formulaire revenu : elle ne s'efface
   donc jamais avec lui, et elle se lit sous le compteur. */
.dit {
  margin: 10px 0 0;
  opacity: var(--moyen);
}

/* Muette, elle ne doit pas écarter la ligne méta du bas du formulaire : un
   bloc vide ne fait pas de ligne, mais sa marge, elle, tiendrait. */
.dit:empty {
  margin: 0;
}

/* Tout ce qui apparaît ou disparaît le fait par dissolution (CONCEPT.md §2). */
.dissoudre-enter-active {
  transition: opacity 2.4s ease;
}

.dissoudre-leave-active {
  transition: opacity 1.2s ease;
}

.dissoudre-enter-from,
.dissoudre-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .trace {
    right: 16px;
    left: 16px;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .trace,
  .dissoudre-enter-active,
  .dissoudre-leave-active {
    transition-duration: 0.2s;
  }
}
</style>
