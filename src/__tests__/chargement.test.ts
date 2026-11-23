import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Grain } from '../scene/alea'
import { DEFAUT, PALETTE } from '../scene/palette'
import { GRAINE_CIEL, poussiereDeLaFenetre } from '../scene/Sky'
import { ATTENTE_MAX, FONDU, retirerEcran } from '../chargement'

function poserEcran() {
  document.body.innerHTML = '<div id="chargement"><i></i></div>'
  return document.querySelector<HTMLElement>('#chargement')!
}

describe("l'écran d'attente s'efface quand le train et le massif sont posés", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it("reste tant que la scène n'a rien posé", async () => {
    const ecran = poserEcran()
    retirerEcran(new Promise(() => {}))

    await vi.advanceTimersByTimeAsync(ATTENTE_MAX - 1)

    expect(ecran.isConnected).toBe(true)
    expect(ecran.classList.contains('parti')).toBe(false)
  })

  it('se fond, puis quitte le document, quand la scène est prête', async () => {
    const ecran = poserEcran()
    const fin = retirerEcran(Promise.resolve())

    // Le fondu part d'abord : c'est lui qu'on voit.
    await vi.advanceTimersByTimeAsync(0)
    expect(ecran.classList.contains('parti')).toBe(true)
    expect(ecran.isConnected).toBe(true)

    // Et l'écran ne part qu'une fois le fondu fini, sinon il saute.
    await vi.advanceTimersByTimeAsync(FONDU)
    await fin
    expect(ecran.isConnected).toBe(false)
  })

  it("s'efface seul si la scène ne tient jamais sa promesse", async () => {
    const ecran = poserEcran()
    const fin = retirerEcran(new Promise(() => {}))

    await vi.advanceTimersByTimeAsync(ATTENTE_MAX + FONDU)
    await fin

    expect(ecran.isConnected).toBe(false)
  })

  it("s'efface aussi quand la scène échoue", async () => {
    const ecran = poserEcran()
    const fin = retirerEcran(Promise.reject(new Error('pas de WebGL')))

    await vi.advanceTimersByTimeAsync(FONDU)
    await fin

    expect(ecran.isConnected).toBe(false)
  })

  it('ne tombe pas quand il n’y a pas d’écran', async () => {
    document.body.innerHTML = ''
    await expect(retirerEcran(Promise.resolve())).resolves.toBeUndefined()
  })
})

describe("l'écran d'attente d'index.html", () => {
  const html = readFileSync('index.html', 'utf8')

  it('se fond exactement le temps que le module attend', () => {
    // Plus court ici, l'écran saute en plein fondu ; plus long, le site reste
    // couvert par un voile déjà transparent.
    expect(html).toContain(`transition: opacity ${FONDU / 1000}s ease`)
  })

  it("part de la nuit que le visiteur a choisie, et d'aucune autre", () => {
    // Et à défaut de choix, de celle que le site prendra — pas de celle que
    // `base.css` déclare : le virage se verrait pendant toute l'attente.
    // Les trois couleurs sont recopiées à la main dans un script inline : il
    // s'exécute avant le bundle, il ne peut donc pas importer `palette.ts`.
    for (const couleur of PALETTE) expect(html).toContain(`nuit !== '${couleur}'`)
    expect(html.match(/nuit !== '/g)).toHaveLength(PALETTE.length)
    expect(html).toContain(`nuit = '${DEFAUT}'`)
    expect(html).toContain(`nuit-attente', nuit)`)
    // Et il ne suit pas `--fond`, que la scène réécrit pendant son fondu.
    expect(html).toContain(`background: var(--nuit-attente, ${DEFAUT})`)
  })

})

describe('le ciel de l’écran d’attente est celui de la scène', () => {
  const html = readFileSync('index.html', 'utf8')

  /**
   * Le script d'`index.html` recopie `Sky.ts` en JavaScript nu : il doit
   * peindre avant que le bundle n'existe, et le bundle importe Pixi. Ce test
   * est ce qui rend la recopie sûre — on l'exécute vraiment, et on compare
   * grain par grain.
   */
  function semeur(): string {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    const code = scripts.find((bout) => bout.includes('__poussiereDAttente'))
    expect(code, "aucun script d'index.html ne sème le ciel").toBeTruthy()
    return code as string
  }

  function poussiereDAttente(): (w: number, h: number) => Grain[] {
    const fenetre: Record<string, unknown> = {}
    // Pas de document, pas de canevas : le script s'arrête avant de peindre et
    // ne laisse que sa fonction. C'est exactement ce qu'on veut mesurer.
    new Function('window', 'document', semeur())(fenetre, {
      getElementById: () => null,
    })
    return fenetre.__poussiereDAttente as (w: number, h: number) => Grain[]
  }

  const FENETRES: Array<[number, number]> = [
    [1512, 771],
    [1920, 1080],
    [2560, 1440],
    [390, 844],
    [3440, 900],
    [820, 1180],
  ]

  it.each(FENETRES)('rend le même ciel que Sky.ts en %i × %i', (w, h) => {
    const attendu = poussiereDeLaFenetre(w, h)
    const obtenu = poussiereDAttente()(w, h)

    expect(obtenu.length).toBe(attendu.length)
    expect(obtenu.length).toBeGreaterThan(0)
    for (let i = 0; i < attendu.length; i += 1) {
      expect(obtenu[i].x).toBeCloseTo(attendu[i].x, 9)
      expect(obtenu[i].y).toBeCloseTo(attendu[i].y, 9)
      expect(obtenu[i].r).toBeCloseTo(attendu[i].r, 9)
      expect(obtenu[i].a).toBeCloseTo(attendu[i].a, 9)
    }
  })

  it('sème sur la graine de la scène, et la nomme', () => {
    expect(html).toContain(`var GRAINE = ${GRAINE_CIEL}`)
  })

  it('peint une seule fois par réveil, jamais à l’image', () => {
    // Pendant ces deux secondes, le fil principal parse un bundle de plus de
    // 500 ko : une boucle à l'image y gèlerait, et le ciel avec.
    // L'appel, pas le mot : le commentaire du script dit pourquoi il n'y est
    // pas, et doit pouvoir le nommer.
    expect(semeur()).not.toContain('requestAnimationFrame(')
  })
})
