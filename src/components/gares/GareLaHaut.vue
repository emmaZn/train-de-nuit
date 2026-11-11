<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { SCENE_KEY } from '@/composables/useScene'
import type { Poignee } from '@/scene/Dissolve'
import type { Scene } from '@/scene/Scene'
import { bandeCiel } from '@/scene/layout'
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
/** Le tirage par défaut de `tirerPlace`, redit pour atteindre le quatrième argument. */
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
const { enRoute } = storeToRefs(useVoyage())
const scene = inject(SCENE_KEY, shallowRef<Scene | null>(null))

const phrase = ref('')
const prenom = ref('')
const message = ref('')
/** Verrou d'envoi : un second appui ne relance ni l'écriture ni la dissolution. */
const enVol = ref(false)
const champ = ref<HTMLInputElement | null>(null)

/**
 * L'envoi parti et non réglé. Entrée s'y rattache au lieu de rappeler
 * `ecrire` : les règles interdisent l'`update`, un second appel tirerait un
 * nouvel identifiant et laisserait un doublon à modérer.
 *
 * Il tient aussi les champs en lecture seule, et c'est le même fait qui le
 * veut : tant que cette écriture-là court, c'est elle qu'on redéfait et c'est
 * elle qu'on effacera. Un texte corrigé entre-temps ne partirait jamais, et
 * serait effacé sans un mot — on montrerait une phrase en en enregistrant une
 * autre. Le verrou se lève de lui-même dès que l'écriture est réglée.
 */
const envoi = shallowRef<Envoi | null>(null)
/** La dissolution à l'écran. **Il faut toujours la conclure** (Dissolve.ts). */
let poignee: Poignee | null = null
let minuteur: ReturnType<typeof setTimeout> | null = null

const compte = computed(() => [...phrase.value].length)

function borner(valeur: string, max: number): string {
  const points = [...valeur]
  return points.length > max ? points.slice(0, max).join('') : valeur
}

/**
 * La saisie est bornée en points de code, jamais par `maxlength` : celui-ci
 * compte en unités UTF-16, où un emoji pèse deux, et une phrase affichée
 * « 40 / 80 » serait coupée.
 */
function saisir(event: Event, max: number): string {
  const el = event.target as HTMLInputElement
  const borne = borner(el.value, max)
  // Vue ne repose pas une valeur qu'il croit inchangée : au quatre-vingt-unième
  // point de code le modèle ne bouge pas, et le champ garderait le surplus.
  if (el.value !== borne) el.value = borne
  return borne
}

function saisirPhrase(event: Event): void {
  phrase.value = saisir(event, MAX_PHRASE)
}

function saisirPrenom(event: Event): void {
  prenom.value = saisir(event, MAX_PRENOM)
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
  const bande = bandeCiel(window.innerHeight)
  // Le quatrième argument n'est pas facultatif : sans lui le tirage mesure dans
  // le carré normalisé, où 17 px de haut pèsent autant que 72 px de large, et
  // les étoiles se posent les unes sur les autres.
  const place = tirerPlace(prises, Math.random, TIRAGES, window.innerWidth / bande.height)
  const nom = prenom.value.trim()
  const parti = traces.ecrire({
    phrase: texte,
    ...(nom ? { prenom: nom } : {}),
    x: place.x,
    y: place.y,
  })
  // Une seule conclusion par envoi, quelle que soit sa fin : c'est elle qui
  // garantit qu'on ne confirme jamais deux fois, ni jamais trop tôt.
  void parti.promesse.then(
    () => reussir(parti),
    () => echouer(),
  )
  return parti
}

function laisser(): void {
  if (enVol.value) return
  // Un envoi déjà parti se redéfait tel qu'il a été écrit, texte compris.
  const texte = envoi.value ? envoi.value.trace.phrase : phrase.value.trim()
  if (texte.length === 0 || [...texte].length > MAX_PHRASE) return

  enVol.value = true
  message.value = ''
  const courant = envoi.value ?? demarrer(texte)
  envoi.value = courant
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
 * secondes et demie trop tôt, en plein vol du grain.
 */
async function reussir(parti: Envoi): Promise<void> {
  arreter()
  const p = reprendre()
  if (p) await p.land(parti.trace)
  // Le verrou se lève avec l'effacement, pas avant : entre la réponse et la
  // fin de la montée, les champs seraient modifiables pendant deux secondes
  // et demie, pour un texte effacé juste après.
  envoi.value = null
  traces.confirmer(parti.trace)
  // Temps 5 : le formulaire revient vide.
  phrase.value = ''
  prenom.value = ''
  message.value = ''
  enVol.value = false
}

/** L'écriture est refusée : rien n'a été écrit, un renvoi peut repartir à neuf. */
function echouer(): void {
  arreter()
  envoi.value = null
  reprendre()?.revert()
  message.value = MESSAGE
  enVol.value = false
}

/**
 * Le délai ne coupe pas l'écriture — Firestore réessaie tant que l'onglet est
 * ouvert. Il rend seulement l'écran, avec la phrase intacte dans le champ.
 */
function surDelai(): void {
  minuteur = null
  reprendre()?.revert()
  message.value = MESSAGE
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

// Une poignée abandonnée laisserait son nœud de grains à l'écran, et sa
// timeline en vie, jusqu'au `dispose` de la scène.
onBeforeUnmount(() => {
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
        <p v-if="message" class="dit" data-role="dit" aria-live="polite">{{ message }}</p>
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
