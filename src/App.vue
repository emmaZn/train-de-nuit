<script setup lang="ts">
import { provide, ref } from 'vue'
import EyeButton from '@/components/EyeButton.vue'
import EtoilesListe from '@/components/EtoilesListe.vue'
import NavFrise from '@/components/NavFrise.vue'
import StarTooltip from '@/components/StarTooltip.vue'
import { SCENE_KEY, useScene } from '@/composables/useScene'

const canvas = ref<HTMLCanvasElement | null>(null)
const { scene, fond, changerFond } = useScene(canvas)

// La scène descend aux gares, qui lui demandent une dissolution.
provide(SCENE_KEY, scene)
</script>

<template>
  <canvas ref="canvas" class="scene"></canvas>
  <NavFrise />
  <RouterView />
  <StarTooltip />
  <EtoilesListe />
  <EyeButton :fond="fond" @change="changerFond" />
</template>

<style scoped>
.scene {
  position: fixed;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
</style>
