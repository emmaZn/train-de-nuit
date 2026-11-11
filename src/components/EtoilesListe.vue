<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ageRelatif } from '@/scene/dates'
import { useTraces } from '@/stores/traces'

const { etoiles } = storeToRefs(useTraces())

// Read once per list change: an age that ticked while a screen reader is
// walking the list would only be noise.
const lignes = computed(() => {
  const maintenant = Date.now()
  return etoiles.value.map((t) => ({
    id: t.id,
    phrase: t.phrase,
    mention: [t.prenom, ageRelatif(t.creeLe, maintenant)].filter(Boolean).join(' · '),
  }))
})
</script>

<template>
  <!-- La liste du §11 : les mêmes phrases que le ciel, pour qui ne survole pas. -->
  <section v-if="lignes.length > 0" class="etoiles">
    <ul tabindex="0" aria-label="Étoiles laissées par les voyageurs">
      <li v-for="ligne in lignes" :key="ligne.id">
        <span class="phrase">{{ ligne.phrase }}</span>
        <span class="mention"> — {{ ligne.mention }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
/* Hidden the way a screen reader still sees it: clipped to a pixel. Removing
   it from the layout or making it invisible would also remove it from the
   accessibility tree. */
.etoiles {
  position: fixed;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

/* Reached by keyboard, it shows itself: focus must land on something visible. */
.etoiles:focus-within {
  z-index: 10;
  top: 16px;
  left: 16px;
  width: min(360px, calc(100vw - 32px));
  height: auto;
  max-height: 40vh;
  margin: 0;
  padding: 12px 16px;
  overflow: auto;
  clip: auto;
  white-space: normal;
  background: var(--fond);
  border: 1px solid color-mix(in srgb, var(--trait) 30%, transparent);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--police-texte);
  font-weight: 300;
  font-size: 14px;
  line-height: 1.5;
}

li + li {
  margin-top: 8px;
}

.mention {
  font-family: var(--police-mono);
  font-size: 10px;
  opacity: var(--moyen);
}
</style>
