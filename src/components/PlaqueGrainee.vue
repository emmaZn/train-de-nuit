<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CELLULE_CADRE, TROUS, bruit } from '@/scene/grain'

/**
 * Le cadre d'une plaque, cuit au grain.
 *
 * **Il ne dessine que le trait.** Le fond opaque est du CSS, pris sur
 * `--fond` : sinon il faudrait redessiner le canevas à chaque fois que l'œil
 * change la couleur de la nuit, et le fond retarderait d'une image sur le
 * reste de la scène.
 *
 * Quatre segments droits, sans biseau — c'est ce qu'Emmanuelle a demandé le
 * 24 novembre 2026, et c'est ce qui distingue ces plaques du cartouche du
 * panneau des départs, dont les quatre coins sont coupés à 45°.
 *
 * Le trait est en cellules et non en `border` : un `border` est la seule chose
 * du site qui ne serait pas du grain (CONCEPT §2).
 */
const bloc = ref<HTMLElement | null>(null)
const toile = ref<HTMLCanvasElement | null>(null)

/** La cellule, en pixels d'écran. Le projet la compte en pixels de cadre. */
const CELLULE = CELLULE_CADRE

/** Ce que le trait garde d'intensité : celle d'un trait de champ au repos. */
const OPACITE = 0.6

function segment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / CELLULE))
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    const y = y0 + ((y1 - y0) * i) / n
    const colonne = Math.round(x / CELLULE)
    const ligne = Math.round(y / CELLULE)
    // Le bruit se tire sur la cellule, jamais sur le pixel : un
    // redimensionnement ne doit pas rebattre les trous.
    if (bruit(colonne, ligne, 0) < TROUS) continue
    ctx.fillRect(colonne * CELLULE, ligne * CELLULE, CELLULE, CELLULE)
  }
}

function cuire(): void {
  const el = bloc.value
  const cv = toile.value
  if (!el || !cv) return
  const w = Math.round(el.clientWidth)
  const h = Math.round(el.clientHeight)
  if (w === 0 || h === 0) return

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  cv.width = Math.round(w * dpr)
  cv.height = Math.round(h * dpr)
  cv.style.width = `${w}px`
  cv.style.height = `${h}px`

  const ctx = cv.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  // La couleur du trait est lue au moment du dessin : elle suit le thème.
  const trait = getComputedStyle(el).getPropertyValue('--trait').trim() || '#e6e6ea'
  ctx.fillStyle = trait
  ctx.globalAlpha = OPACITE
  const b = CELLULE / 2
  segment(ctx, b, b, w - b, b)
  segment(ctx, w - b, b, w - b, h - b)
  segment(ctx, w - b, h - b, b, h - b)
  segment(ctx, b, h - b, b, b)
  ctx.globalAlpha = 1
}

let observateur: ResizeObserver | null = null

onMounted(() => {
  cuire()
  // La hauteur suit le contenu, qui suit la langue et la largeur de fenêtre :
  // c'est la boîte qui dit quand recuire, pas un événement de fenêtre.
  if (typeof ResizeObserver !== 'undefined' && bloc.value) {
    observateur = new ResizeObserver(() => cuire())
    observateur.observe(bloc.value)
  }
})

onBeforeUnmount(() => {
  observateur?.disconnect()
  observateur = null
})

watch(bloc, () => cuire())

defineExpose({ cuire })
</script>

<template>
  <div ref="bloc" class="plaque">
    <!-- Le cadre d'abord : il est sous le texte, et ne capte rien. -->
    <canvas ref="toile" class="cadre" aria-hidden="true"></canvas>
    <div class="dedans">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/*
 * Le fond est ici, en CSS, et non dans le canevas : il suit `--fond`, donc
 * l'œil, sans qu'on redessine quoi que ce soit. C'est lui qui éteint le massif
 * derrière la plaque — le même procédé que le corps du train et que le
 * cartouche du panneau des départs, et c'est ce qui rend toute tache de nuit
 * inutile ici.
 */
.plaque {
  position: absolute;
  background: var(--fond);
  pointer-events: auto;
}

.cadre {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
}

.dedans {
  position: relative;
}
</style>
