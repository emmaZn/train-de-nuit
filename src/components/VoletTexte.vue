<script setup lang="ts">
/**
 * Un morceau de texte qui se pose volet par volet, comme sur un tableau de
 * grande gare.
 *
 * **Le vrai texte est dans le DOM du premier au dernier instant.** Trois des
 * cinq lignes du panneau sont les seuls liens du site : un lecteur d'écran qui
 * lirait le défilé (« QXLMBDRP… ») serait pire que pas d'animation. Ce qui
 * tourne est donc une couche décorative, `aria-hidden`, posée **par-dessus** ;
 * c'est la même décision que les points de conduite, pour la même raison.
 *
 * Les glyphes de cette couche ne sont pas du texte non plus : le CSS les tire
 * d'un attribut (`data-g`). Ils n'entrent ni dans la recherche de la page, ni
 * dans une sélection copiée, ni dans `textContent`. Le contenu généré compte
 * pourtant dans le nom accessible d'un lien : `aria-hidden` sur la couche est la
 * seule chose qui garde les glyphes hors du nom des trois liens. Et le vrai texte n'est
 * masqué que par sa **couleur** : `visibility` ou `display` le sortiraient de
 * l'arbre d'accessibilité, justement ce qu'on protège.
 *
 * Mouvement réduit : `fige` pose le texte tout de suite, sans couche ni
 * minuterie — c'est l'appelant qui lit le réglage, ce composant ne le devine pas.
 * Contraste forcé : la couche est retirée par le CSS (voir la fin du fichier).
 * Si le réglage est levé en route, le défilé reprend où il en était.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { DECALAGE_CARACTERE, PAS_MS, dureeEnPas, glypheA } from './volets'

const props = defineProps<{
  texte: string
  /** Millisecondes avant le départ du premier caractère. */
  retard: number
  fige?: boolean
}>()

// Les images de volet écoulées depuis le montage. Un compteur plutôt que
// l'horloge : le défilé reste le même, et se laisse avancer pas à pas.
const pas = ref(0)
// Une fois posé, le texte l'est pour de bon : sans ce drapeau, l'horloge qui
// change de minute — donc `texte` — relancerait un défilé que personne n'a demandé.
const pose = ref(false)
// La couche est là **si et seulement si** la minuterie tourne : `demarrer` et
// `arreter` sont les seuls à l'écrire. Un `computed` sur `fige` et `pose` ne
// savait rien de la minuterie, et laissait le vrai texte transparent sous une
// couche que rien ne faisait avancer (réglage levé après avoir été posé).
// Elle est vraie dès le premier rendu quand le défilé va partir : `onMounted`
// vient trop tard, le vrai texte se montrerait une image avant d'être masqué.
const enCours = ref(!props.fige && props.texte.length > 0)
let minuterie = 0

const caracteres = computed(() => [...props.texte])
const depart = computed(() => Math.round(props.retard / PAS_MS))
const fin = computed(() => depart.value + dureeEnPas(caracteres.value.length))

const glyphes = computed(() =>
  caracteres.value.map((c, i) => glypheA(c, pas.value - depart.value - i * DECALAGE_CARACTERE)),
)

function arreter() {
  window.clearInterval(minuterie)
  minuterie = 0
  enCours.value = false
}

function demarrer() {
  if (minuterie || props.fige || pose.value || caracteres.value.length === 0) return
  enCours.value = true
  minuterie = window.setInterval(() => {
    pas.value++
    if (pas.value >= fin.value) {
      pose.value = true
      arreter()
    }
  }, PAS_MS)
}

onMounted(demarrer)
onBeforeUnmount(arreter)

// Le réglage peut changer dans les deux sens, et un texte vide peut s'emplir :
// le défilé s'arrête là où il est, et reprend là où il en était.
watch(() => [props.fige, caracteres.value.length], () => {
  if (props.fige) arreter()
  else demarrer()
})
</script>

<template>
  <span class="volet-texte">
    <span class="vrai" :class="{ tourne: enCours }" data-vrai>{{ texte }}</span>
    <span v-if="enCours" class="volets" aria-hidden="true" data-volets>
      <span v-for="(g, i) in glyphes" :key="i" class="glyphe" :data-g="g" />
    </span>
  </span>
</template>

<style scoped>
.volet-texte {
  position: relative;
  display: inline-block;
  white-space: pre;
}

/* Il s'efface par sa seule couleur : il reste dans le flux (même largeur, donc
   même place pour la couche) et dans l'arbre d'accessibilité. */
.tourne {
  color: transparent;
}

/* Même police, même interlettre, même origine que le texte dessous : la couche
   en hérite et tombe pile sur lui. Ni pointeur ni sélection — le lien est
   dessous, la couche ne s'interpose pas. */
.volets {
  position: absolute;
  top: 0;
  left: 0;
  white-space: pre;
  pointer-events: none;
  -webkit-user-select: none;
  user-select: none;
}

.glyphe::before {
  content: attr(data-g);
}

/* Le système impose alors les couleurs et `transparent` n'y survit pas : le
   vrai texte se rallumerait sous la couche, deux chaînes lettre contre lettre.
   Ces visiteurs lisent le texte posé, sans le défilé. */
@media (forced-colors: active) {
  .volets {
    display: none;
  }
}
</style>
