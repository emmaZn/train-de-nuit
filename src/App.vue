<script setup lang="ts">
import { ref } from 'vue'
import EyeButton from '@/components/EyeButton.vue'
import NavFrise from '@/components/NavFrise.vue'
import { useScene } from '@/composables/useScene'

const canvas = ref<HTMLCanvasElement | null>(null)
const { fond, changerFond } = useScene(canvas)
</script>

<template>
  <canvas ref="canvas" class="scene"></canvas>
  <NavFrise />
  <RouterView />
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
