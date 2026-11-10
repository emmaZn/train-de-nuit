import { markRaw, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Scene } from '@/scene/Scene'
import { loadFond, saveFond } from '@/scene/palette'
import { useVoyage } from '@/stores/voyage'

/**
 * The one bridge between Vue and the scene. The scene knows nothing of Vue:
 * it is told what the store holds, and it reports back through events.
 */
export function useScene(canvas: Ref<HTMLCanvasElement | null>) {
  const scene = ref<Scene | null>(null)
  const fond = ref<string>(loadFond())
  const voyage = useVoyage()
  const { enRoute, etapesRestantes, legs } = storeToRefs(voyage)

  const detacher: Array<() => void> = []

  function appliquerFond(valeur: string) {
    fond.value = valeur
    saveFond(valeur)
    document.documentElement.style.setProperty('--fond', valeur)
    scene.value?.setFond(valeur)
  }

  function surPointeur(event: PointerEvent) {
    const x = (event.clientX / window.innerWidth) * 2 - 1
    const y = (event.clientY / window.innerHeight) * 2 - 1
    scene.value?.setPointer(x, y)
  }

  function surRedimensionnement() {
    scene.value?.resize()
  }

  onMounted(async () => {
    document.documentElement.style.setProperty('--fond', fond.value)
    if (!canvas.value) return

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    // markRaw : Pixi tient ses propres références, le rendre réactif le casserait.
    const instance = markRaw(new Scene(canvas.value, { reducedMotion }))
    scene.value = instance

    detacher.push(instance.on('progress', (p) => voyage.setProgression(p)))
    detacher.push(instance.on('arrived', () => voyage.finirEtape()))

    await instance.init()
    instance.setFond(fond.value)
    instance.setVoyage(enRoute.value, etapesRestantes.value)
    instance.setLegs(legs.value)

    window.addEventListener('pointermove', surPointeur, { passive: true })
    window.addEventListener('resize', surRedimensionnement, { passive: true })
  })

  watch([enRoute, etapesRestantes], ([route, restantes]) => {
    scene.value?.setVoyage(route, restantes)
  })

  watch(legs, (valeur) => {
    scene.value?.setLegs(valeur)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', surPointeur)
    window.removeEventListener('resize', surRedimensionnement)
    for (const off of detacher) off()
    scene.value?.dispose()
    scene.value = null
  })

  return { scene, fond, changerFond: appliquerFond }
}
