import { markRaw, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Scene } from '@/scene/Scene'
import { loadFond, saveFond } from '@/scene/palette'
import { useVoyage } from '@/stores/voyage'

/**
 * How a component reaches the scene: `App.vue` provides it, a station injects
 * it. `null` until the canvas is mounted — a component asks for the scene, it
 * never builds one.
 */
export const SCENE_KEY: InjectionKey<Ref<Scene | null>> = Symbol('scene')

/**
 * The one bridge between Vue and the scene. The scene knows nothing of Vue:
 * it is told what the store holds, and it reports back through events.
 */
export function useScene(canvas: Ref<HTMLCanvasElement | null>) {
  // `shallowRef` : la scène est déjà `markRaw`, et c'est elle qu'on partage —
  // une référence profonde en rendrait un type que `SCENE_KEY` ne reconnaît pas.
  const scene = shallowRef<Scene | null>(null)
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

    // Pas d'écouteur `resize` ici : le renderer Pixi recadre lui-même, à la
    // frame où il connaît vraiment ses nouvelles dimensions.
    window.addEventListener('pointermove', surPointeur, { passive: true })
  })

  watch([enRoute, etapesRestantes], ([route, restantes]) => {
    scene.value?.setVoyage(route, restantes)
  })

  watch(legs, (valeur) => {
    scene.value?.setLegs(valeur)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', surPointeur)
    for (const off of detacher) off()
    scene.value?.dispose()
    scene.value = null
  })

  return { scene, fond, changerFond: appliquerFond }
}
