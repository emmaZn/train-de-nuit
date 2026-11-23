<script setup lang="ts">
// Coquille de la gare « ailleurs ». Son contenu arrive aux étapes 3 et 4 du
// cadrage : câbles et bouvreuils, formulaire, poteau indicateur.
// Le CV (`/ailleurs/cv`) s'ouvre dedans, par-dessus la gare, par dissolution.
</script>

<template>
  <div class="gare-ailleurs">
    <RouterView v-slot="{ Component }">
      <Transition name="dissoudre">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </div>
</template>

<style scoped>
/* Tout ce qui apparaît ou disparaît le fait par dissolution (CONCEPT.md §2). */
.dissoudre-enter-active {
  transition: opacity 1.2s ease;
}

.dissoudre-leave-active {
  transition: opacity 0.5s ease;
}

.dissoudre-enter-from,
.dissoudre-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .dissoudre-enter-active,
  .dissoudre-leave-active {
    transition-duration: 0.2s;
  }
}
</style>
