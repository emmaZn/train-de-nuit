<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import CommandeReverbere from '@/components/CommandeReverbere.vue'
import EyeButton from '@/components/EyeButton.vue'
import EtoilesListe from '@/components/EtoilesListe.vue'
import NavFrise from '@/components/NavFrise.vue'
import PanneauDeparts from '@/components/PanneauDeparts.vue'
import RepliquesOiseaux from '@/components/RepliquesOiseaux.vue'
import StarTooltip from '@/components/StarTooltip.vue'
import { FRAME_KEY, RIDEAU_KEY, SCENE_KEY, useScene } from '@/composables/useScene'

const canvas = ref<HTMLCanvasElement | null>(null)
const { scene, fond, frame, rideau, changerFond } = useScene(canvas)

// La scène descend aux gares, qui lui demandent une dissolution.
provide(SCENE_KEY, scene)
provide(FRAME_KEY, frame)
provide(RIDEAU_KEY, rideau)

// Le CV s'écrit par-dessus la gare : tout ce qui est dessous, derrière le
// voile, ne doit ni prendre le focus ni se laisser activer à l'aveugle.
const route = useRoute()
const cvOuvert = computed(() => route.name === 'cv')
</script>

<template>
  <canvas ref="canvas" class="scene"></canvas>
  <!-- Sans boîte propre : ne change aucune mise en page, ne porte que `inert`. -->
  <div class="dessous" :inert="cvOuvert || undefined">
    <NavFrise />
  </div>
  <RouterView />
  <div class="dessous" :inert="cvOuvert || undefined">
    <RepliquesOiseaux />
    <!-- Avant le panneau des départs : les deux boîtes `fixed` sont au même
         `z-index`, et c'est l'ordre du gabarit qui décide qui est au-dessus.
         La plaque posée croise le mât ; montée après, elle garde ses trois
         liens au-dessus de la commande du réverbère. -->
    <CommandeReverbere />
    <!-- Hors des routes : il doit pouvoir s'effacer après le changement d'URL. -->
    <PanneauDeparts />
    <StarTooltip />
    <EtoilesListe />
    <EyeButton :fond="fond" @change="changerFond" />
  </div>
</template>

<style scoped>
.dessous {
  display: contents;
}

.scene {
  position: fixed;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
</style>
