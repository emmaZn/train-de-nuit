import { markRaw, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Scene } from '@/scene/Scene'
import { loadFond, saveFond } from '@/scene/palette'
import { useTraces } from '@/stores/traces'
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
  const traces = useTraces()
  const { etoiles } = storeToRefs(traces)

  const detacher: Array<() => void> = []

  function poserFond(hex: string) {
    document.documentElement.style.setProperty('--fond', hex)
  }

  function appliquerFond(valeur: string) {
    fond.value = valeur
    saveFond(valeur)
    // On n'écrit pas la couleur ici : la scène la fait fondre sur une seconde
    // et l'émet à chaque image (CONCEPT §6). Écrire d'un coup ferait basculer
    // la tache de nuit du formulaire sur une nuit encore en train de changer.
    // Sans scène — avant l'init — il n'y a pas de fondu : on pose directement.
    if (scene.value) scene.value.setFond(valeur)
    else poserFond(valeur)
  }

  function surPointeur(event: PointerEvent) {
    const x = (event.clientX / window.innerWidth) * 2 - 1
    const y = (event.clientY / window.innerHeight) * 2 - 1
    scene.value?.setPointer(x, y)
    scene.value?.setPointerPx(event.clientX, event.clientY)
  }

  /**
   * A finger never moves over a star before it lands: the touch is the whole
   * gesture. The scene answers with `starHover`, a star or `null`, so a tap
   * that hits nothing closes the bubble by the same road.
   */
  function surAppui(event: PointerEvent) {
    scene.value?.setPointerPx(event.clientX, event.clientY)
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
    detacher.push(instance.on('fond', poserFond))

    // Registered before the first await: an unmount during `init` runs
    // `onBeforeUnmount` at once, and would find nothing to remove.
    window.addEventListener('pointermove', surPointeur, { passive: true })
    window.addEventListener('pointerdown', surAppui, { passive: true })

    await instance.init()
    instance.setFond(fond.value)
    instance.setVoyage(enRoute.value, etapesRestantes.value)
    instance.setLegs(legs.value)
    instance.setStars(etoiles.value)

    // The sky is decoration: it must never hold the scene back. `charger`
    // already swallows a read that fails; the catch is for what it might not.
    traces.charger(window.innerWidth).catch(() => {})

    // Pas d'écouteur `resize` ici : le renderer Pixi recadre lui-même, à la
    // frame où il connaît vraiment ses nouvelles dimensions.
  })

  watch([enRoute, etapesRestantes], ([route, restantes]) => {
    scene.value?.setVoyage(route, restantes)
  })

  watch(legs, (valeur) => {
    scene.value?.setLegs(valeur)
  })

  // The only road by which a star confirmed late joins the sky: its handle
  // has long since gone to `revert`, the store is what remains.
  watch(etoiles, (valeur) => {
    scene.value?.setStars(valeur)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', surPointeur)
    window.removeEventListener('pointerdown', surAppui)
    for (const off of detacher) off()
    scene.value?.dispose()
    scene.value = null
  })

  return { scene, fond, changerFond: appliquerFond }
}
