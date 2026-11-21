<script setup lang="ts">
/**
 * Le CV, écrit comme une ligne de chemin de fer — par-dessus la gare, pas à
 * sa place (spec §6.8). Route imbriquée `/ailleurs/cv` : GareAilleurs le reçoit
 * dans son <RouterView />. Aller au CV n'est pas un voyage ; le retour ramène
 * à `/ailleurs`.
 *
 * Trois lignes par arrêt, rien d'autre. Les postes sont de gros points
 * lumineux, les diplômes de petites haltes grises.
 *
 * Premier endroit du site où l'on fait défiler : la barre est fine et dans la
 * palette (`scrollbar-width: thin`, couleur dérivée de --texte).
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { HORS_DE_LA_VOIE, PARCOURS, TERMINUS } from '@/contenu/cv'
import { adresseMail } from '@/contenu/liens'

// Assemblée au montage, jamais écrite en clair dans la source ni le HTML.
const mail = adresseMail()

// Le focus entre dans le CV à l'ouverture : c'est le conteneur (tabindex -1)
// qui le reçoit, pas le lien « retour » — Page Down défile aussitôt, y compris
// sous Safari qui ne rend pas les zones défilantes focusables d'elles-mêmes,
// donc pas de tabindex="0" en plus. Échap ramène à /ailleurs, comme « retour ».
const cv = ref<HTMLElement | null>(null)
const router = useRouter()
function surTouche(e: KeyboardEvent) {
  if (e.key === 'Escape') router.push('/ailleurs')
}

/**
 * Qui avait le focus avant que le CV ne le prenne — le lien « CV · QUAI 2 » du
 * panneau des départs, qui reste monté pendant tout ce temps : le rideau ne réagit
 * pas au CV, il reste où il est (décision 7 de la spec du rideau). La mémoire du
 * focus vaut d'ailleurs pour tout lien qui l'avait. Sans cette
 * mémoire, fermer le CV lâchait le focus sur `<body>` : on se retrouvait en haut de l'ordre de tabulation, et il
 * fallait retraverser la frise, la gare, les répliques d'oiseaux et la liste
 * d'étoiles pour revenir au panneau.
 */
let rendreLeFocusA: HTMLElement | null = null

onMounted(() => {
  const avant = document.activeElement
  rendreLeFocusA = avant instanceof HTMLElement ? avant : null
  cv.value?.focus({ preventScroll: true })
  window.addEventListener('keydown', surTouche)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', surTouche)
  const cible = rendreLeFocusA
  rendreLeFocusA = null
  // **Pas tout de suite.** Tant que le CV est ouvert, `App.vue` pose `inert`
  // sur les deux `.dessous` — dont celui qui porte le panneau des départs, donc
  // le lien par lequel on est arrivé. `focus()` sur un élément à l'ancêtre
  // inerte ne fait rien, en silence, et le focus retombe sur `<body>` : le
  // symptôme même qu'on corrige. `nextTick` rend la main après la purge
  // complète, `inert` retiré, quel que soit l'ordre des mises à jour.
  //
  // `isConnected` : un élément sorti du document entre-temps ne prendrait pas
  // le focus, et le lui demander quand même laisserait croire que si.
  if (cible) void nextTick(() => {
    if (cible.isConnected) cible.focus({ preventScroll: true })
  })
})
</script>

<template>
  <div ref="cv" class="cv" tabindex="-1" role="region" aria-label="Curriculum vitæ">
    <div class="feuille">
      <RouterLink class="retour" to="/ailleurs">← retour</RouterLink>

      <ol class="voie">
        <li v-for="a in PARCOURS" :key="a.intitule" class="arret" :class="{ halte: a.halte }">
          <p class="intitule">{{ a.intitule }}</p>
          <p class="lieu">{{ a.lieu }}</p>
          <p class="dates">{{ a.depuis }} → {{ a.jusqua }}</p>
        </li>
      </ol>

      <section class="hors">
        <h2>hors de la voie</h2>
        <p>{{ HORS_DE_LA_VOIE.join(' · ') }}</p>
      </section>

      <section class="terminus">
        <h2>terminus</h2>
        <p><a :href="`mailto:${mail}`">{{ mail }}</a></p>
        <p><a :href="`https://${TERMINUS.github}`" target="_blank" rel="noopener noreferrer">{{ TERMINUS.github }}</a></p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.cv {
  position: fixed;
  inset: 0;
  /* Au-dessus de tout ce qui flotte (bulle d'étoile, répliques : z-index 5). */
  z-index: 20;
  overflow-y: auto;
  /* La gare reste visible derrière, assombrie ; le voile ne fait que porter le texte. */
  background: color-mix(in srgb, var(--fond) 78%, transparent);
  color: var(--texte);
  outline: none;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--texte) 25%, transparent) transparent;
}

.cv::-webkit-scrollbar {
  width: 6px;
}

.cv::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--texte) 25%, transparent);
  border-radius: 3px;
}

.feuille {
  box-sizing: border-box;
  max-width: 560px;
  margin: 0 auto;
  padding: 112px 24px 96px;
}

.retour {
  display: inline-block;
  margin-bottom: 48px;
  font-family: var(--police-mono);
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.08em;
  color: inherit;
  text-decoration: none;
  opacity: var(--moyen);
}

.retour:hover {
  opacity: var(--fort);
}

/* La commande principale de fermeture. Monter l'opacité de --moyen à --fort
   est trop faible pour elle : au clavier, elle porte le même anneau que l'œil
   et les gares de la frise. */
.retour:focus-visible {
  opacity: var(--fort);
  outline: 1px solid var(--trait);
  outline-offset: 4px;
}

.voie {
  position: relative;
  margin: 0;
  padding: 0 0 0 36px;
  list-style: none;
}

/* Le filet. */
.voie::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: var(--texte);
  opacity: var(--faible);
}

.arret {
  position: relative;
  padding-bottom: 32px;
}

.arret p {
  margin: 0;
}

/* Un poste : gros point lumineux, avec halo. */
.arret::before {
  content: '';
  position: absolute;
  left: -36px;
  top: 6px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--texte);
  box-shadow: 0 0 10px 3px color-mix(in srgb, var(--texte) 45%, transparent);
}

/* Un diplôme : petite halte grise. */
.arret.halte::before {
  left: -34px;
  top: 8px;
  width: 7px;
  height: 7px;
  background: var(--texte);
  opacity: var(--faible);
  box-shadow: none;
}

.intitule {
  font-size: 17px;
  font-weight: 300;
  line-height: 1.4;
  opacity: var(--fort);
}

.lieu {
  margin-top: 2px;
  font-size: 14px;
  font-weight: 300;
  opacity: var(--moyen);
}

.dates {
  margin-top: 6px;
  font-family: var(--police-mono);
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 0.08em;
  opacity: var(--faible);
}

.halte .intitule {
  opacity: var(--moyen);
}

.hors,
.terminus {
  margin-top: 40px;
  padding-left: 36px;
}

h2 {
  margin: 0 0 8px;
  font-family: var(--police-mono);
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: var(--faible);
}

.hors p,
.terminus p {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 300;
  line-height: 1.7;
  opacity: var(--moyen);
}

.terminus a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--texte) 25%, transparent);
}

.terminus a:hover,
.terminus a:focus-visible {
  border-bottom-color: var(--texte);
  outline: none;
}

@media (max-width: 720px) {
  .feuille {
    padding: 88px 16px 64px;
  }
}
</style>
