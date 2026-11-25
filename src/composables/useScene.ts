import { markRaw, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { remettreEcran, retirerEcran } from '@/chargement'
import { Scene } from '@/scene/Scene'
import { HORIZON } from '@/scene/layout'
import type { Frame } from '@/scene/layout'
import { COULEURS, loadMode, saveMode } from '@/scene/palette'
import type { Mode } from '@/scene/palette'
import { sensDuGlissement, surUnElementInteractif } from '@/scene/glissement'
import { garePrecedente, gareSuivante } from '@/scene/types'
import { useTraces } from '@/stores/traces'
import { useVoyage } from '@/stores/voyage'

/**
 * How a component reaches the scene: `App.vue` provides it, a station injects
 * it. `null` until the canvas is mounted — a component asks for the scene, it
 * never builds one.
 */
export const SCENE_KEY: InjectionKey<Ref<Scene | null>> = Symbol('scene')

/**
 * Le cadre de la scène (échelle et décalage du `fitStage`), tel que Vue le
 * connaît : `null` tant que la scène n'a pas cadré. Ce qui se pose en DOM sur
 * un point de la scène en tire sa place.
 */
export const FRAME_KEY: InjectionKey<Ref<Frame | null>> = Symbol('frame')

/**
 * Où est le rideau des départs, tel que la scène l'a dit : `y` est le bord haut
 * de la plaque en pixels de cadre (le repère de `FRAME_KEY`), `baisse` l'état
 * visé. `null` tant que la scène n'a rien émis — jamais un `y` qui ne soit pas
 * un nombre : elle ne dit rien plutôt que cela (`SceneEvents['rideau']`).
 */
export type EtatRideau = { y: number; baisse: boolean }
export const RIDEAU_KEY: InjectionKey<Ref<EtatRideau | null>> = Symbol('rideau')

/** Le réglage système « réduire les animations ». Lu à chaque fois, pas figé. */
function mouvementReduit(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * The one bridge between Vue and the scene. The scene knows nothing of Vue:
 * it is told what the store holds, and it reports back through events.
 */
export function useScene(canvas: Ref<HTMLCanvasElement | null>) {
  // `shallowRef` : la scène est déjà `markRaw`, et c'est elle qu'on partage —
  // une référence profonde en rendrait un type que `SCENE_KEY` ne reconnaît pas.
  const scene = shallowRef<Scene | null>(null)
  const mode = ref<Mode>(loadMode())
  const frame = shallowRef<Frame | null>(null)
  const rideau = shallowRef<EtatRideau | null>(null)
  const voyage = useVoyage()
  // La route, pour une seule question : le CV est-il ouvert ? La scène, elle,
  // n'en saura jamais rien — c'est le pont qui connaît les deux mondes.
  const route = useRoute()
  const router = useRouter()
  /**
   * Le geste en cours, s'il peut encore devenir un glissement.
   *
   * `consomme` est la règle déjà écrite dans `clicPx` — « un clic ne fait
   * qu'une chose » — portée au geste entier : si l'appui a touché l'horloge,
   * le réverbère, un oiseau ou un carreau, le doigt a déjà dit ce qu'il
   * voulait, et le faire aussi changer de gare en ferait deux.
   */
  let geste: { id: number; x: number; y: number; temps: number; consomme: boolean } | null = null
  /** Une bascule de mode est-elle déjà partie ? Elle finit par un rechargement. */
  let bascule = false
  const { cible, enRoute, etapesRestantes, gare, legs } = storeToRefs(voyage)
  const traces = useTraces()
  const { etoiles } = storeToRefs(traces)

  const detacher: Array<() => void> = []

  /**
   * Les couleurs du mode sur la racine, et le mode lui-même.
   *
   * `data-mode` est ce que lit `base.css` — et la feuille du CV, qui s'efface
   * de jour. Les trois tokens sont écrits en ligne par-dessus : le script de
   * tête d'`index.html` fait déjà le premier geste, celui-ci le refait quand
   * le mode change, et surtout **même quand il n'y a pas de scène** — pas de
   * canevas, pas de WebGL : la page a quand même ses couleurs.
   */
  function poserMode(valeur: Mode) {
    const racine = document.documentElement
    racine.dataset.mode = valeur
    const couleurs = COULEURS[valeur]
    racine.style.setProperty('--fond', couleurs.fond)
    racine.style.setProperty('--texte', couleurs.texte)
    racine.style.setProperty('--trait', couleurs.trait)
  }

  /**
   * Où tombe la ligne de voie à l'écran, en pixels, pour le CSS.
   *
   * Le pied de page en a besoin : il se tient dans la bande sombre **sous la
   * voie**, et cette bande n'a pas la même hauteur selon le format — la voie
   * descend avec la scène depuis que le cadrage suit le viewport. Une valeur
   * en dur l'aurait collée au bord ici et noyée dans le reflet là.
   *
   * `frame.offsetY` porte déjà le décalage vertical du cadrage : c'est la
   * même chaîne que celle qui pose le décor, et non une seconde façon de
   * calculer la même chose.
   */
  function poserVoie(f: Frame) {
    const y = HORIZON * f.scale + f.offsetY
    document.documentElement.style.setProperty('--y-voie', `${Math.round(y)}px`)
  }

  /**
   * La bascule : on écrit le choix, l'écran d'attente remonte, la page
   * recharge, et le site réarrive dans l'autre mode.
   *
   * **Pourquoi recharger.** Un fondu d'une seconde entre la nuit et le papier
   * passerait par un gris plat plein écran, et les deux modes n'ont pas le
   * même jeu d'images du train : recharger règle les deux d'un coup, puisque
   * le mode est alors connu avant le premier dessin. C'est l'écran d'attente
   * qu'on réutilise, pas une dissolution neuve — le départ et l'arrivée sont
   * le geste du site, à l'endroit.
   */
  async function basculerMode(valeur: Mode) {
    // Une seule bascule à la fois : l'écran d'attente ne couvre le bouton
    // qu'une image après le clic, et Entrée maintenue en tire plusieurs.
    if (bascule) return
    bascule = true
    mode.value = valeur
    saveMode(valeur)
    // L'écran remonte dans la couleur **où l'on va** : sinon le rechargement
    // couperait d'un fond à l'autre au moment où la page revient.
    document.documentElement.style.setProperty('--nuit-attente', COULEURS[valeur].fond)
    await remettreEcran(mouvementReduit())
    window.location.reload()
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
   *
   * **Rien ne descend tant que le CV est ouvert.** Il est `position: fixed;
   * inset: 0; z-index: 20` et vit hors des deux `.dessous` : chaque appui le
   * vise, et le chemin de l'événement ne passe donc **pas** par `.panneau`,
   * dont le `stopPropagation` est la seule chose qui ferme encore cette route.
   * Sans cette garde, un appui au milieu du CV tombait sur l'horloge — que la
   * tâche 1 a posée au milieu de la scène, donc au milieu de la fenêtre — et
   * baissait le panneau derrière le voile ; un peu à droite, il éteignait la
   * lampe. La garde est ici et non dans `Scene`, qui ne connaît pas les routes :
   * c'est la forme de `PanneauDeparts.surEchap`.
   */
  function surAppui(event: PointerEvent) {
    if (route.name === 'cv') return
    // Faire tomber un oiseau ne doit pas aussi ouvrir la bulle d'une étoile :
    // un clic ne fait qu'une chose.
    const pris = scene.value?.clicPx(event.clientX, event.clientY) ?? false
    geste = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      temps: event.timeStamp,
      consomme: pris || surUnElementInteractif(event.target),
    }
    if (pris) return
    scene.value?.setPointerPx(event.clientX, event.clientY)
  }

  /**
   * Le doigt se lève : si sa course était un glissement, on change de gare.
   *
   * **Pourquoi ici et non dans un composant à lui** : c'est le seul endroit
   * qui sache si l'appui a déjà servi à quelque chose. Un composant posé
   * par-dessus ne verrait que des coordonnées, et rallumerait une fenêtre tout
   * en faisant partir le train.
   *
   * Le CV est exclu comme il l'est des appuis : il défile, et sur toute la
   * fenêtre.
   */
  function surRelache(event: PointerEvent) {
    const depart = geste
    geste = null
    if (!depart || depart.id !== event.pointerId || depart.consomme) return
    if (route.name === 'cv') return
    const sens = sensDuGlissement(
      event.clientX - depart.x,
      event.clientY - depart.y,
      event.timeStamp - depart.temps,
      depart.x,
      window.innerWidth,
    )
    if (!sens) return
    /*
     * D'où l'on compte : de la gare **visée** quand le train roule, et non de
     * celle qu'il vient de quitter.
     *
     * `voyage.gare` reste la gare de départ pendant tout le trajet. Compter
     * depuis elle rendait deux gestes de suite inutiles — le second redemandait
     * la gare déjà visée — et faisait partir « en arrière » vers l'avant-
     * dernière au lieu de revenir sur ses pas. Un glissement répond à ce qu'on
     * a sous les yeux, et ce qu'on a sous les yeux pendant un trajet, c'est où
     * l'on va.
     */
    const depuis = (enRoute.value && cible.value) || gare.value
    const suivante = sens === 'suivante' ? gareSuivante(depuis) : garePrecedente(depuis)
    // `partirVers` redirige un voyage en cours plutôt que de le refuser : on
    // peut donc glisser pendant que le train roule, comme on peut cliquer une
    // gare de la frise. C'est le routeur qui mène, ici comme là — la frise et
    // le pouce ne doivent pas avoir deux chemins différents.
    void router.push(`/${suivante}`)
  }

  /** Le doigt sort de l'écran, ou le système reprend la main : ce n'était rien. */
  function surAnnulation() {
    geste = null
  }

  onMounted(async () => {
    poserMode(mode.value)
    if (!canvas.value) {
      // Pas de canevas, donc pas de scène, donc rien à attendre : l'écran
      // d'attente n'a personne pour le relever.
      retirerEcran(Promise.resolve())
      return
    }

    const reducedMotion = mouvementReduit()
    // markRaw : Pixi tient ses propres références, le rendre réactif le casserait.
    const instance = markRaw(new Scene(canvas.value, { reducedMotion, mode: mode.value }))
    scene.value = instance

    // L'écran d'attente d'`index.html` s'efface quand le train et le massif
    // sont posés — ni avant, ni au gré d'un délai inventé. On ne l'attend pas :
    // le reste du montage n'a pas à en dépendre.
    retirerEcran(instance.pret)

    detacher.push(instance.on('progress', (p) => voyage.setProgression(p)))
    detacher.push(instance.on('arrived', () => voyage.finirEtape()))
    detacher.push(instance.on('mode', poserMode))
    detacher.push(instance.on('frame', (f) => { frame.value = f; poserVoie(f) }))
    // Un objet neuf à chaque émission : `shallowRef` ne réagit qu'à un changement de référence.
    detacher.push(instance.on('rideau', (y, baisse) => { rideau.value = { y, baisse } }))

    // Registered before the first await: an unmount during `init` runs
    // `onBeforeUnmount` at once, and would find nothing to remove.
    window.addEventListener('pointermove', surPointeur, { passive: true })
    window.addEventListener('pointerdown', surAppui, { passive: true })
    window.addEventListener('pointerup', surRelache, { passive: true })
    window.addEventListener('pointercancel', surAnnulation, { passive: true })

    await instance.init()
    // Après `init` : c'est ce geste qui descend le mode dans les couches que
    // l'init vient de construire — la gare, les vitres, les étoiles.
    instance.setMode(mode.value)
    instance.setGare(gare.value)
    instance.setVoyage(enRoute.value, etapesRestantes.value, cible.value)
    instance.setLegs(legs.value)
    instance.setStars(etoiles.value)

    // The sky is decoration: it must never hold the scene back. `charger`
    // already swallows a read that fails; the catch is for what it might not.
    traces.charger(window.innerWidth).catch(() => {})

    // Pas d'écouteur `resize` ici : le renderer Pixi recadre lui-même, à la
    // frame où il connaît vraiment ses nouvelles dimensions.
  })

  watch([enRoute, etapesRestantes, cible], ([route, restantes, but]) => {
    scene.value?.setVoyage(route, restantes, but)
  })

  watch(legs, (valeur) => {
    scene.value?.setLegs(valeur)
  })

  // La scène a besoin de savoir où est « plus loin » sur la ligne, pour y
  // poser ses câbles. Elle ne connaît que le nom de la gare quittée.
  watch(gare, (valeur) => {
    scene.value?.setGare(valeur)
  })

  // The only road by which a star confirmed late joins the sky: its handle
  // has long since gone to `revert`, the store is what remains.
  watch(etoiles, (valeur) => {
    scene.value?.setStars(valeur)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', surPointeur)
    window.removeEventListener('pointerdown', surAppui)
    window.removeEventListener('pointerup', surRelache)
    window.removeEventListener('pointercancel', surAnnulation)
    for (const off of detacher) off()
    scene.value?.dispose()
    scene.value = null
  })

  return { scene, mode, frame, rideau, basculerMode }
}
