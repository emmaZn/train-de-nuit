<script setup lang="ts">
import { useTextes } from '@/i18n'

const t = useTextes()
</script>

<template>
  <!-- Le pied de page du site, et non celui d'une gare : il reste là quand le
       train roule, comme la frise et l'œil. Une seule ligne, en petit. -->
  <footer class="signature">
    <p>
      <span>Emmanuelle Zenou</span><span class="separateur"> · </span
      ><span class="metier">{{ t.ici.titre }}</span>
    </p>
  </footer>
</template>

<style scoped>
/*
 * En bas, au centre — Emmanuelle, le 24 novembre 2026 : « Emmanuelle Zenou on
 * pouvait le laisser en footer en petit tout le temps, pas que sur "ici" ».
 *
 * Le §4.1 du CONCEPT la posait en haut à gauche de « ici », avec le titre sur
 * une seconde ligne et en grand : **il ne décrit plus la scène**. « Pas
 * d'égotrip » (§2) tient quand même, et mieux qu'avant : le nom est partout,
 * mais plus petit que n'importe quel autre texte du site.
 */
.signature {
  position: fixed;
  bottom: var(--marge-ecran);
  left: 50%;
  z-index: 3;
  /* Sans ça, le `z-index: -1` de la tache l'enverrait derrière le canvas. */
  isolation: isolate;
  transform: translateX(-50%);
  /* Rien à cliquer ici : le pied de page ne doit pas voler le survol des
     étoiles ni des oiseaux qui passent sous lui. */
  pointer-events: none;
}

.signature p {
  margin: 0;
  font-family: var(--police-texte);
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.02em;
  white-space: nowrap;
  text-align: center;
  color: var(--texte);
  opacity: var(--faible);
}

.separateur {
  opacity: 0.55;
}

/*
 * La même tache qu'ailleurs. En bas de l'écran la ligne tombe sur le reflet,
 * et sur une fenêtre courte sur le corps de la loco, où elle devenait
 * illisible. Mêmes arrêts que la bulle, à la virgule — ils fixent l'arête, et
 * un test les compare.
 *
 * **Resserrée le 25 novembre 2026** : l'horizon est descendu sur les écrans
 * larges, la ligne s'est rapprochée du reflet, et la tache se voyait. Elle
 * garde juste de quoi détacher le texte — en deçà, son dégradé se raidit et
 * dessine une arête au lieu de s'éteindre.
 */
.signature::before {
  content: '';
  position: absolute;
  inset: -14px -56px;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(
    ellipse at center,
    color-mix(in srgb, var(--fond) 94%, transparent) 0%,
    color-mix(in srgb, var(--fond) 88%, transparent) 35%,
    color-mix(in srgb, var(--fond) 78%, transparent) 62%,
    color-mix(in srgb, var(--fond) 0%, transparent) 100%
  );
}

/*
 * Sur un écran court — un téléphone couché fait 390 px de haut —, la frise en
 * prend 96 et le massif tout le reste : à `--marge-ecran` du bas, la ligne
 * tombe en plein sur le corps de la loco. La tache la tenait, mais on la
 * voyait : un nuage noir posé sur le train.
 *
 * Emmanuelle, le 24 novembre 2026 : « on peut enlever le nuage noir derrière
 * le texte, et descendre le texte plus bas ». Les deux vont ensemble — sans la
 * tache et à sa hauteur d'avant, la ligne disparaissait dans le grain. Seize
 * pixels la posent dans la bande sombre sous le reflet, où elle n'a plus
 * besoin de rien derrière elle.
 *
 * Seize et non six : six la colle au bord, et sur un iPhone couché la barre
 * d'accueil est là.
 */
@media (max-height: 480px) {
  .signature {
    bottom: 16px;
  }

  .signature::before {
    display: none;
  }
}

/* Sur un téléphone, le nom et le titre ne tiennent pas sur une ligne : le
   métier passe dessous plutôt que de déborder des deux bords. */
@media (max-width: 460px) {
  .signature p {
    white-space: normal;
    max-width: calc(100vw - 2 * var(--marge-ecran));
    line-height: 1.5;
  }

  .separateur {
    display: none;
  }

  .metier {
    display: block;
  }
}
</style>
