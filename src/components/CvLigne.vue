<script setup lang="ts">
/**
 * Le CV, écrit comme une ligne de chemin de fer — par-dessus la gare, pas à
 * sa place (spec §6.8). Route imbriquée `/ailleurs/cv` : GareAilleurs le reçoit
 * dans son <RouterView />. Aller au CV n'est pas un voyage ; le retour ramène
 * à `/ailleurs`.
 *
 * **Une feuille de route** depuis le 22 novembre 2026 : une fiche de service
 * de chemin de fer, posée en papier sur la nuit. Choisie par la propriétaire
 * parmi trois papiers — la lettre, la feuille de route, le carnet. Le service
 * en haut, les haltes dessous, et le pied en deux colonnes.
 *
 * Ce n'était pas cela avant : la carrière y était dessinée comme une ligne de
 * rail, gros points pour les postes et petites haltes grises pour les
 * diplômes, en texte clair sur un voile sombre. La voie reste la métaphore du
 * site ; sur le papier, elle devient un tableau réglé.
 *
 * Premier endroit du site où l'on fait défiler : la barre est fine et dans la
 * palette (`scrollbar-width: thin`, couleur dérivée de --texte).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { HORS_DE_LA_VOIE, PARCOURS, TERMINUS } from '@/contenu/cv'
import { useLangue, useTextes } from '@/i18n'
import { adresseMail } from '@/contenu/liens'

/**
 * La feuille de route sépare ce que la voie mêlait : le **service**, qui sont
 * les postes, et les **haltes**, qui sont les diplômes. `PARCOURS` reste une
 * seule liste dans son ordre, et c'est ici qu'elle se coupe — le contenu n'a
 * pas à connaître la forme qui l'affiche, et le jour où elle rechange, il ne
 * bougera pas.
 */
const langue = useLangue()
const t = useTextes()
const parcours = computed(() => PARCOURS[langue.langue])

const POSTES = computed(() => parcours.value.filter((a) => !a.halte))
const HALTES = computed(() => parcours.value.filter((a) => a.halte))

// Assemblée au montage, jamais écrite en clair dans la source ni le HTML.
const mail = adresseMail()

// Le focus entre dans le CV à l'ouverture : c'est le conteneur (tabindex -1)
/** La sortie, par où qu'on la prenne : Échap, « retour », la croix. */
function partir(): void {
  router.push('/ailleurs')
}

// qui le reçoit, pas le lien « retour » — Page Down défile aussitôt, y compris
// sous Safari qui ne rend pas les zones défilantes focusables d'elles-mêmes,
// donc pas de tabindex="0" en plus. Échap ramène à /ailleurs, comme « retour ».
const cv = ref<HTMLElement | null>(null)
const router = useRouter()
function surTouche(e: KeyboardEvent) {
  if (e.key === 'Escape') partir()
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
  <div ref="cv" class="cv" tabindex="-1" role="region" :aria-label="t.cv.aria">
    <div class="feuille">
      <!-- Le bord perforé : du décor, et rien d'autre. Il disparaît sous 720 px,
           où la feuille n'a plus la largeur de se payer une marge vide. -->
      <div class="perfo" aria-hidden="true"></div>

      <div class="corps">
        <!-- Dans le coin du papier, et collée : le lien « retour » est en haut
             de la feuille et remonte hors de l'écran dès qu'on a lu. Elle
             descend avec la fin du corps, et ne quitte donc jamais la feuille. -->
        <button type="button" class="fermer" :aria-label="t.cv.fermer" @click="partir">
          <svg viewBox="0 0 13 13" aria-hidden="true" focusable="false">
            <path d="M0.5 0.5 L12.5 12.5 M12.5 0.5 L0.5 12.5" />
          </svg>
        </button>

        <div class="bandeau">
          <span class="titre">{{ t.cv.titre }}</span>
          <span class="numero">{{ t.cv.numero }}</span>
        </div>
        <div class="sousbandeau">
          <RouterLink class="retour" to="/ailleurs">{{ t.cv.retour }}</RouterLink>
        </div>

        <section class="service">
          <h2>{{ t.cv.service }}</h2>
          <ol class="rangs">
            <li v-for="p in POSTES" :key="p.intitule" class="rang">
              <span class="periode">{{ p.depuis }} → {{ p.jusqua }}</span>
              <span class="intitule">{{ p.intitule }}</span>
              <span class="depot">{{ p.lieu }}</span>
            </li>
          </ol>
        </section>

        <section class="haltes">
          <h2>{{ t.cv.haltes }}</h2>
          <ol class="rangs">
            <li v-for="h in HALTES" :key="h.intitule" class="rang halte">
              <span class="periode">{{ h.depuis }} → {{ h.jusqua }}</span>
              <span class="intitule">{{ h.intitule }}</span>
              <span class="depot">{{ h.lieu }}</span>
            </li>
          </ol>
        </section>

        <div class="pied">
          <section class="hors">
            <h2>{{ t.cv.horsDeLaVoie }}</h2>
            <p>{{ HORS_DE_LA_VOIE[langue.langue].join(' · ') }}</p>
          </section>
          <section class="terminus">
            <h2>{{ t.cv.terminus }}</h2>
            <p><a :href="`mailto:${mail}`">{{ mail }}</a></p>
            <p><a :href="`https://${TERMINUS.github}`" target="_blank" rel="noopener noreferrer">{{ TERMINUS.github }}</a></p>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * La feuille de route. Le CV n'est plus un voile sombre à texte clair : c'est
 * une **feuille de papier** posée sur la nuit.
 *
 * Elle porte donc ses propres couleurs — un papier et une encre —, qui ne sont
 * pas celles de la scène et n'ont pas à l'être : du papier, ça ne change pas de
 * teinte quand la nuit change. C'est la seule surface du site dans ce cas, et
 * c'est assumé.
 *
 * Les polices, en revanche, sont celles du site : `--police-texte` et
 * `--police-mono`. Une fiche de service se lit en chasse fixe, et le mono du
 * projet fait ce travail — rien de neuf à charger pour ça.
 */
.cv {
  position: fixed;
  inset: 0;
  /* Au-dessus de tout ce qui flotte : panneau 15, liste d'étoiles 10, bulles 5. */
  z-index: 20;
  overflow-y: auto;
  /* La gare reste visible derrière, assombrie — mais moins qu'avant (70 % contre
     78 %) : c'est la feuille qui porte le texte maintenant, le voile n'a plus à
     le rendre lisible, seulement à calmer le fond. */
  background: color-mix(in srgb, var(--fond) 70%, transparent);
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
  /* Le papier et l'encre se **dérivent de la nuit**, comme tout le reste du
     site. Je les avais d'abord codées en dur — un papier gris, une encre
     bleu-noir — et le test « aucune couleur en dur » m'a repris : il a raison,
     et le corriger donne mieux. L'œil change la couleur du fond, et la feuille
     change avec elle : c'est un papier posé dans cette nuit-là, éclairé par
     elle, et non une image collée par-dessus. */
  --papier: color-mix(in srgb, var(--texte) 86%, var(--fond));
  --encre: color-mix(in srgb, var(--fond) 94%, var(--texte));
  /* Les trois niveaux d'encre, comme le site a ses trois opacités. Plus hauts
     que ceux de la scène : sur du papier, une encre à 60 % passe sous le
     rapport de contraste que le texte fin demande. */
  --plein: 1;
  --demi: 0.8;
  --leger: 0.68;

  box-sizing: border-box;
  display: flex;
  max-width: 700px;
  margin: 72px auto 96px;
  background: var(--papier);
  color: var(--encre);
  font-family: var(--police-mono);
  box-shadow: 0 24px 60px rgb(0 0 0 / 55%);
}

/* De jour, **il n'y a plus de feuille** : la page est la feuille, et on écrit
   directement dessus.

   Sous l'inversion, « papier » et « encre » échangeraient leur sens — la
   plaque deviendrait un rectangle presque noir, plein écran, sur une page
   beige. On retire donc la plaque : sa dérivation, son ombre portée (un
   dégradé, que le jour ne veut nulle part) et son bord perforé. Le texte, lui,
   ne bouge pas : les trois niveaux d'encre se dérivent de `--encre` et suivent
   tout seuls. Ça amende la règle du 22 novembre, qui ne vaut que de nuit. */
:root[data-mode="jour"] .feuille {
  --papier: var(--fond);
  --encre: var(--texte);

  /* Un trait d'encre à la place de la plaque. Sans l'ombre portée ni le bord
     perforé, la feuille n'avait plus de bord du tout et le texte flottait sur
     la page : c'est la même matière que les filets du tableau, un simple
     trait, et il fait de la page une feuille au lieu d'un fond. */
  border: 1px solid var(--encre);
  box-shadow: none;
}

:root[data-mode="jour"] .perfo {
  display: none;
}

/* Le bord perforé : du décor, et rien d'autre — d'où l'`aria-hidden`. Les trous
   sont un dégradé répété, pas des éléments : il n'y a rien à lire dedans. */
.perfo {
  flex: none;
  width: 34px;
  border-right: 1px dashed color-mix(in srgb, var(--encre) 30%, transparent);
  background-image: radial-gradient(
    circle at 17px 14px,
    color-mix(in srgb, var(--encre) 22%, transparent) 0 3.5px,
    transparent 3.5px
  );
  background-size: 100% 30px;
  background-repeat: repeat-y;
}

.corps {
  flex: 1;
  min-width: 0;
  padding: 36px 40px 44px;
}

/* L'en-tête imprimé, comme sur une vraie fiche : un filet gras dessous. */
.bandeau {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  align-items: baseline;
  justify-content: space-between;
  /* La place de la croix, qui se pose dans ce coin sans occuper de hauteur. */
  padding-right: 30px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--encre);
}

.titre {
  font-family: var(--police-texte);
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.numero {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: var(--leger);
}

.sousbandeau {
  padding-bottom: 14px;
  margin-bottom: 30px;
  border-bottom: 1px solid color-mix(in srgb, var(--encre) 40%, transparent);
}

/* La commande principale de fermeture. Le remplissage puis la marge négative lui
   donnent une cible confortable au doigt sans rien déplacer autour. */
/*
 * La sortie. Le lien « retour » est en haut de la feuille : une fois qu'on a
 * lu, il est remonté hors de l'écran, et il fallait défiler pour sortir.
 *
 * Elle est **sur le papier**, dans son coin, et **collante** : elle suit la
 * lecture au lieu de la suivre des yeux depuis la fenêtre. Son conteneur est
 * `.corps`, donc elle redescend avec la fin de la feuille — elle ne la quitte
 * jamais, et n'a pas à choisir entre l'encre et la nuit.
 *
 * `margin-bottom` négatif : elle ne prend pas de hauteur, le bandeau reste à
 * sa place. Et elle porte le papier en fond, pour que le texte qui défile
 * dessous ne vienne pas s'y mêler.
 */
.fermer {
  position: sticky;
  top: 14px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  margin: -4px -8px -26px auto;
  padding: 0;
  border: 0;
  background: var(--papier);
  color: var(--encre);
  cursor: pointer;
  opacity: var(--leger);
  transition: opacity 0.2s;
}

.fermer:hover,
.fermer:focus-visible {
  opacity: var(--plein);
}

.fermer:focus-visible {
  outline: 1px solid var(--encre);
  outline-offset: 2px;
}

.fermer svg {
  width: 13px;
  height: 13px;
}

.fermer path {
  stroke: currentColor;
  stroke-width: 1;
  fill: none;
}

.retour {
  display: inline-block;
  padding: 12px 6px;
  margin: -12px -6px;
  font-size: 11.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: inherit;
  text-decoration: none;
  opacity: var(--demi);
}

.retour:hover {
  opacity: var(--plein);
}

.retour:focus-visible {
  opacity: var(--plein);
  outline: 1px solid var(--encre);
  outline-offset: 3px;
}

h2 {
  margin: 0 0 8px;
  font-family: var(--police-texte);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: var(--leger);
}

.service {
  margin-bottom: 30px;
}

.haltes {
  margin-bottom: 30px;
}

.rangs {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Une ligne de la fiche : période, poste, dépôt. La période en premier parce que
   c'est une fiche de service et qu'une fiche se lit par la colonne de gauche. */
.rang {
  display: grid;
  /* L'intitulé prend sa largeur naturelle et ne se brise **jamais** : c'est le
     nom du poste, et le couper sur trois lignes dans une colonne étroite le
     rend illisible. C'est le dépôt qui cède et passe à la ligne — il porte des
     noms longs (« Université Clermont Auvergne · Prépa Polytech ») et il les
     porte bien sur deux lignes. */
  grid-template-columns: auto max-content minmax(0, 1fr);
  gap: 4px 12px;
  align-items: baseline;
  padding: 11px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--encre) 14%, transparent);
}

.rang:last-child {
  border-bottom: 0;
}

.periode {
  font-size: 11.5px;
  white-space: nowrap;
  opacity: var(--demi);
}

.rang .intitule {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.depot {
  font-size: 12.5px;
  text-align: right;
  overflow-wrap: break-word;
  opacity: var(--demi);
}

/* Une halte est un diplôme : la même ligne, mais sans le gras du service. */
.halte .intitule {
  font-weight: 400;
  opacity: 0.85;
}

.halte .depot,
.halte .periode {
  opacity: var(--leger);
}

.pied {
  display: flex;
  flex-wrap: wrap;
  gap: 24px 40px;
  padding-top: 18px;
  border-top: 2px solid var(--encre);
}

.hors,
.terminus {
  flex: 1 1 200px;
  min-width: 0;
}

.hors p,
.terminus p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  opacity: var(--demi);
}

.terminus a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--encre) 35%, transparent);
}

.terminus a:hover,
.terminus a:focus-visible {
  border-bottom-color: var(--encre);
  outline: none;
  opacity: var(--plein);
}

.terminus a:focus-visible {
  outline: 1px solid var(--encre);
  outline-offset: 3px;
}

/* Sous le seuil, la feuille n'a plus la largeur de se payer une marge vide : le
   bord perforé s'en va, et les trois colonnes se rangent l'une sous l'autre. */
@media (max-width: 720px) {
  .feuille {
    margin: 56px 12px 64px;
  }

  .perfo {
    display: none;
  }

  .corps {
    padding: 28px 22px 34px;
  }

  .rang {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .depot {
    text-align: left;
  }
}

/* En contraste forcé, le papier n'est plus du papier : on rend la main au
   système plutôt que d'imposer une encre qu'il a justement remplacée. */
@media (forced-colors: active) {
  .feuille {
    background: Canvas;
    color: CanvasText;
    border: 1px solid CanvasText;
    box-shadow: none;
  }

  .retour,
  .terminus a {
    color: LinkText;
  }
}
</style>
