<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { LANGUES, useLangue, useTextes } from '@/i18n'
import type { Langue } from '@/i18n'

const magasin = useLangue()
const { langue } = storeToRefs(magasin)
const t = useTextes()

/** Ce que le bouton promet, dans la langue qu'il propose — jamais l'inverse. */
const promesse = (l: Langue): string =>
  l === 'fr' ? t.value.commandes.versFrancais : t.value.commandes.versAnglais
</script>

<template>
  <!-- Deux segments plutôt qu'une bascule : « EN » seul n'aurait pas dit si
       c'est la langue actuelle ou celle qu'on propose. -->
  <div class="langues" role="group" :aria-label="t.commandes.langue">
    <button
      v-for="l in LANGUES"
      :key="l"
      type="button"
      class="langue"
      :data-langue="l"
      :aria-pressed="langue === l"
      :title="promesse(l)"
      @click="magasin.choisir(l)"
    >
      {{ l.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped>
/* Sur la ligne de la voie, comme l'œil, et à sa droite : c'est l'œil qui se
   décale, de la largeur de ce bloc-ci. Les deux sont les seules commandes
   permanentes du site, elles tiennent ensemble dans le coin. */
.langues {
  position: fixed;
  /* Centré sur la voie comme l'œil : la moitié de la hauteur du texte, et non
     la moitié d'une boîte de bouton — il n'y en a pas ici. */
  top: calc(var(--haut-voie) - 6px);
  right: var(--marge-ecran);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 7px;
}

/* La même matière que la ligne méta du formulaire : mono, petit, espacé. */
.langue {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--trait);
  font-family: var(--police-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  line-height: 1;
  opacity: var(--murmure);
  cursor: pointer;
  transition: opacity 0.6s ease;
}

.langue[aria-pressed='true'] {
  opacity: var(--fort);
  cursor: default;
}

.langue:hover,
.langue:focus-visible {
  opacity: var(--fort);
}

.langue:focus-visible {
  outline: 1px solid var(--trait);
  outline-offset: 4px;
}
</style>
