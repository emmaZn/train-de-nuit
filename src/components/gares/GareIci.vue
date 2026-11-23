<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useVoyage } from '@/stores/voyage'
import { useTextes } from '@/i18n'
import PlaqueGrainee from '@/components/PlaqueGrainee.vue'

const { enRoute } = storeToRefs(useVoyage())
const t = useTextes()
</script>

<template>
  <Transition name="dissoudre">
    <div v-if="!enRoute" class="ici">
      <PlaqueGrainee class="mot">
        <p class="phrase">{{ t.ici.phrase }}</p>
        <p class="mention">{{ t.ici.mention }}</p>
      </PlaqueGrainee>
    </div>
  </Transition>
</template>

<style scoped>
.ici {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/*
 * La plaque de « ici », à gauche — Emmanuelle, le 24 novembre 2026, après
 * sept propositions : c'est la seule qui ait pris, et « ok nice pour ici ».
 *
 * Les deux gares qu'elle trouve poétiques — les oiseaux et la gare — ont un
 * **objet** ; « ici » n'en avait aucun, et sa phrase était posée à même le
 * ciel. La plaque en est un, et c'est son fond qui la rend lisible : **il n'y
 * a plus de tache de nuit ici**, le dégradé du 23 novembre est retiré.
 *
 * « Bienvenue » est parti avec. Ce n'est pas une demande explicite : c'est ce
 * qu'elle a validé en disant « nice » devant une plaque qui n'en portait pas.
 * La mention en tient lieu, et deux lignes de service au-dessus d'une phrase
 * de deux lignes feraient trop.
 */
.mot {
  top: 212px;
  left: var(--marge-ecran);
  width: 536px;
  max-width: calc(100vw - 2 * var(--marge-ecran));
}

/* Le texte de la plaque est dans son :deep(), le composant possédant la boîte. */
.mot :deep(.dedans) {
  padding: 22px 24px 19px;
}

/*
 * Tout en mono, y compris la phrase — sa décision du 24 novembre. J'avais
 * déconseillé le mono au motif que c'est « la voix de l'appareil » ; c'est
 * elle qui a raison : **une plaque est un objet de la gare, pas une parole de
 * voyageur**, et elle parle donc la langue de la frise et du panneau.
 */
.phrase {
  margin: 0;
  font-family: var(--police-mono);
  font-size: 16px;
  line-height: 1.45;
  letter-spacing: 0.02em;
  opacity: var(--fort);
}

.mention {
  margin: 12px 0 0;
  font-family: var(--police-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  opacity: var(--faible);
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
  .mot {
    top: 132px;
    left: 16px;
    width: auto;
    right: 16px;
    max-width: none;
  }

  .mot :deep(.dedans) {
    padding: 18px 18px 16px;
  }

  .phrase {
    font-size: 14px;
  }

  .mention {
    font-size: 9px;
    letter-spacing: 0.1em;
  }
}

/* Un écran court — un téléphone en paysage fait 844 px de large et prend donc
   la branche large : le mot remonte pour ne pas croiser le pied de page. */
@media (max-height: 480px) {
  .mot {
    top: 118px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dissoudre-enter-active,
  .dissoudre-leave-active {
    transition-duration: 0.2s;
  }
}
</style>
