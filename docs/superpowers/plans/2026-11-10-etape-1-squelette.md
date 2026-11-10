# Train de nuit — Étape 1 « Squelette » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un train de grain roule en boucle à sens unique entre quatre gares : on clique une gare dans la frise, le train démarre, roule, ralentit, s'arrête, la frise glisse d'un cran et l'URL change.

**Architecture:** Une scène PixiJS v8 en TypeScript pur (aucun import de Vue) rend fond, poussière d'étoiles, montagnes, voie, train et reflet dans un `<canvas>` plein écran ; Vue 3 pose la frise et les routes par-dessus en HTML. Un seul composable (`useScene`) fait le pont. Tous les assets noirs sont recolorés au rendu par un filtre WebGL piloté par une unique couleur `uFond`. Les assets lourds sont convertis hors ligne par un script Python vers des WebP, décrits par un manifeste JSON que la scène lit au démarrage.

**Tech Stack:** Vue 3 + Vite + TypeScript + Pinia + Vue Router 4 + GSAP 3 + PixiJS 8 + Vitest + @vue/test-utils 2, aux versions que `npm create vite@latest` et `npm install` posent le jour de l'exécution. Les numéros exacts sont relevés dans le README une fois installés, ils ne sont pas décidés ici. Pipeline d'assets en Python 3.10 avec Pillow 12 et NumPy 2.

**Spec:** `docs/CONCEPT.md` (copie de référence dans le dépôt). Cette étape implémente le §13.1 ; les §§4.2 à 4.4, 5 (étoiles-voyageurs), 10 et 11 sont hors périmètre.

## Global Constraints

- Textes d'interface en **français** ; code, noms de fichiers, noms de symboles et commentaires techniques en **anglais** (§11).
- Type des gares, exactement : `type Gare = 'ici' | 'plus-loin' | 'la-haut' | 'ailleurs'`. Routes : `/ici`, `/plus-loin`, `/la-haut`, `/ailleurs` (§3).
- Ordre de la boucle, non modifiable : `ici → plus-loin → la-haut → ailleurs → ici` (§3).
- Le train ne recule **jamais** : aller à une gare « derrière » se fait en faisant le tour vers l'avant, **y compris avec le bouton retour du navigateur** (§3).
- Couleur de fond par défaut `#2E2313` (« vieille photo »). Cycle complet, dans cet ordre : `#2E2313`, `#141B2B`, `#151517`, `#13241D`, `#261725` (§6).
- Texte `#ececf0`, traits `#e6e6ea`, corps noirs `#0b0b0c`. Opacités de hiérarchie : `0.95 / 0.6 / 0.42 / 0.2` (§6).
- Typographie : **Inter** (Light 300 / Regular 400) pour les textes, **JetBrains Mono** pour les petites mentions (§6).
- Règle de recoloration, unique et universelle : **dans tous les assets, le noir devient la couleur du fond.** En shader : `rgb = mix(uFond, texel.rgb, luminance(texel.rgb))`, alpha inchangé (§6).
- La couleur change en fondu GSAP d'environ **1 s** ; le choix est mémorisé en `localStorage` **avec repli silencieux s'il est indisponible** (§6).
- Mentions de la frise en mono **9 px** espacé ; libellés exacts `À QUAI` et `PROCHAIN ARRÊT` (§3).
- `src/scene/**` n'importe **rien** de Vue, Pinia ou Vue Router. Cette règle est vérifiée par un test (Tâche 3).
- Aucun asset **brut** (`montagne/*.png`, `PTITRAIN_grain_vivant/**`) n'est commité : les sources restent hors du dépôt, dans `~/projet_zero/`. Les **sorties WebP** du pipeline, elles, sont commitées dans `public/assets/` (≈ 14 Mo). L'hébergeur construit depuis git et n'a aucun accès aux sources : un `public/assets/` ignoré livrerait un manifeste pointant dans le vide (§11, poids).

## Review Focus

Les cinq comportements que la spec implique mais qu'aucune tâche n'exerce spontanément. Chaque ligne est épinglée par un test dans la tâche indiquée.

1. **Bouton retour du navigateur** vers une gare déjà passée : le train doit partir **vers l'avant** et faire le tour, jamais reculer, et l'URL doit rester cohérente avec la gare visée. → Tâche 8.
2. **Clics répétés dans la frise pendant un trajet** : un second clic ne doit ni empiler deux trajets, ni figer `enRoute` à `true`, ni laisser `progression` au-dessus de 1. → Tâche 7.
3. **Manifeste ou image d'asset introuvable** (404, réseau coupé) : la scène doit continuer à afficher fond et poussière d'étoiles au lieu de rendre un canvas noir ou de lever une exception non rattrapée. → Tâche 5.
4. **`localStorage` indisponible** (navigation privée, cookies bloqués, quota dépassé) : lire et écrire la couleur de fond ne doit pas lever ; on retombe silencieusement sur la couleur par défaut. → Tâche 4.
5. **Viewport minuscule ou redimensionnement pendant un trajet** (largeur < 360 px, hauteur < 400 px, rotation mobile) : pas de division par zéro dans le cadrage, pas de densité de poussière nulle ou infinie. → Tâche 4.
6. **Lien partagé vers une gare lointaine** (`/la-haut` ouvert directement dans un onglet neuf) : la toute première navigation pose la gare sans voyage. Elle ne doit pas jouer un trajet de deux étapes depuis `ici` pendant que le visiteur attend. → Tâche 8.

---

## Structure des fichiers

```
tools/
  build_assets.py            pipeline : PNG sources → WebP + manifeste
  fixtures/                  mini-séquences pour les tests du pipeline
public/assets/               sorties du pipeline (généré, non commité sauf manifeste)
src/
  scene/                     TypeScript pur, aucun import de Vue
    events.ts                émetteur d'événements typé
    recolor.ts               filtre « le noir devient le fond » + helper pur
    palette.ts               cycle de couleurs de fond + persistance
    layout.ts                cadrage : cadre scène 2320×1217 → viewport
    assets.ts                chargement du manifeste et des séquences
    Sky.ts                   poussière d'étoiles + parallax
    Mountains.ts             séquence de montagnes liée à la progression
    Train.ts                 voie, séquences du train, machine à états, reflet
    Scene.ts                 application Pixi, boucle de rendu, assemblage
  stores/voyage.ts           gare, cible, enRoute, progression
  composables/useScene.ts    pont Vue ↔ scène
  components/NavFrise.vue    la frise en boucle
  components/EyeButton.vue   l'icône « œil »
  router/index.ts            les quatre routes
  App.vue                    <canvas> + couche HTML
```

---

### Task 1: Squelette du projet et outillage

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.gitignore`, `src/main.ts`, `src/App.vue`, `src/styles/base.css`
- Test: `src/__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `npm test` lance Vitest ; `npm run build` type-check puis build ; alias `@/` → `src/`.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/__tests__/smoke.test.ts
import { mount } from '@vue/test-utils'
import App from '@/App.vue'

test('App se monte et contient le canvas de la scène', () => {
  const wrapper = mount(App)
  expect(wrapper.find('canvas.scene').exists()).toBe(true)
})
```

À la Tâche 8, quand `App.vue` se mettra à créer la scène, ce test devra moquer `@/composables/useScene` : jsdom n'a pas de WebGL et PixiJS échouerait à s'initialiser.

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- --run`
Expected: FAIL — le module `@/App.vue` n'existe pas.

- [ ] **Step 3: Créer le projet**

`train-de-nuit/` **n'est pas vide** : `docs/` s'y trouve déjà. `npm create vite@latest .` y réclamerait un `--overwrite`, qui épargne `.git/` mais pas `docs/`. Générer donc le squelette **dans un dossier temporaire** (`npm create vite@latest train-de-nuit -- --template vue-ts` dans le scratchpad), puis recopier les fichiers produits dans le dépôt sans toucher à `docs/` ni à `.git/`.

Ajouter ensuite `pinia`, `vue-router`, `gsap`, `pixi.js`, et en dev `vitest`, `@vue/test-utils`, `jsdom`, `vue-tsc`. Configurer l'alias `@` dans `vite.config.ts` **et** dans `tsconfig.json`, et `test: { environment: 'jsdom', globals: true }`. `.gitignore` ignore `node_modules` et `dist` — **pas** `public/assets/`, qui est commité (voir les contraintes globales).

`App.vue` ne contient à ce stade qu'un `<canvas class="scene">` plein écran. `src/styles/base.css` définit les variables `--fond: #2E2313`, `--texte: #ececf0`, `--trait: #e6e6ea`, met `background: var(--fond)` sur `body`, marges à zéro, `overflow: hidden`, et importe Inter et JetBrains Mono depuis Google Fonts.

- [ ] **Step 4: Lancer les tests et `npm run build`**

Run: `npm test -- --run && npm run build`
Expected: test PASS, build sans erreur de types.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vue 3 + Vite + TS + Pinia + Router + GSAP + PixiJS"
```

---

### Task 2: Pipeline d'assets

Les mesures qui justifient les réglages, prises sur les sources : les montagnes n'ont qu'une seule couleur RGB (~196 gris), toute l'information est dans l'alpha — on ne stocke donc que l'alpha, en WebP niveaux de gris (46 Ko/image à 1280 px contre 190 Ko en RGBA). Les six séquences du train partagent le cadre 2320×1217 des rails : le rognage doit utiliser la **bbox union de la séquence entière**, sinon l'alignement entre images saute.

**Files:**
- Create: `tools/build_assets.py`, `tools/make_fixtures.py`
- Test: `tools/__tests__/build_assets.test.ts`

Les fixtures ne sont **pas** des images réelles : deux images de montagne pèsent déjà 7,3 Mo. `tools/make_fixtures.py <dossier>` fabrique des PNG synthétiques minuscules aux bons cadres (2320×1217 pour le train et les rails, 1918×472 pour les montagnes), avec quelques pixels opaques à des positions connues. La deuxième image de `02_locomotive` a son bord gauche **plus à gauche** que la première (580 contre 600), pour que l'assertion sur la bbox union porte sur une valeur chiffrée.

**Interfaces:**
- Produces: `public/assets/manifest.json` conforme au type `Manifest` ci-dessous, `public/assets/mountains/0001.webp…`, `public/assets/train/<sequence>/0001.webp…`, `public/assets/train/rails.webp`.

```ts
// forme exacte du manifeste, reprise telle quelle par src/scene/assets.ts
type Manifest = {
  stage: { width: 2320; height: 1217 }       // cadre commun des assets du train
  mountains: { count: number; width: number; height: number; path: string }
  rails: { path: string; x: number; y: number; width: number; height: number }
  train: Record<TrainSequence, { count: number; x: number; y: number; width: number; height: number; path: string }>
}
type TrainSequence = 'loco' | 'wagon' | 'loco-start' | 'wagon-start' | 'loco-stop' | 'wagon-stop'
```

`x` et `y` sont l'origine de la bbox union **dans le cadre 2320×1217, en pixels sources** ; `width`/`height` sont les dimensions **de sortie** (après réduction). `path` contient `{i}` comme marque-place d'index sur quatre chiffres, par exemple `assets/mountains/{i}.webp`.

Correspondance exacte entre dossiers sources et clés du manifeste, que le script applique telle quelle :

| Dossier source | Clé |
|---|---|
| `01_rails` | `rails` (hors de `train`) |
| `02_locomotive` | `loco` |
| `03_wagon` | `wagon` |
| `04_start_locomotive` | `loco-start` |
| `05_start_wagon` | `wagon-start` |
| `06_stop_locomotive` | `loco-stop` |
| `07_stop_wagon` | `wagon-stop` |

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// tools/__tests__/build_assets.test.ts
test('le pipeline écrit un manifeste et les WebP attendus', () => {
  execFileSync('python3', ['tools/build_assets.py', '--src', 'tools/fixtures', '--out', tmp])
  const m = JSON.parse(readFileSync(join(tmp, 'manifest.json'), 'utf8'))
  expect(m.stage).toEqual({ width: 2320, height: 1217 })
  expect(m.mountains.count).toBe(2)
  expect(m.mountains.width).toBe(1280)
  expect(m.train.loco.count).toBe(2)
  // bbox union : l'origine est le minimum sur toute la séquence, pas celle de la première image
  expect(m.train.loco.x).toBe(580)
  expect(existsSync(join(tmp, 'mountains/0001.webp'))).toBe(true)
  expect(existsSync(join(tmp, 'train/loco/0002.webp'))).toBe(true)
})

test('les images de montagne portent l’alpha source dans leur luminance', () => {
  // Pillow réécrit un L en RGB à l’enregistrement WebP : on ne teste donc pas le mode,
  // mais que les trois canaux sont égaux et valent l’alpha de la source au même point.
  const px = pixelOf(join(tmp, 'mountains/0001.webp'), 40, 10)   // lu par un court python3 -I
  expect(px.r).toBe(px.g)
  expect(px.g).toBe(px.b)
  expect(px.r).toBeCloseTo(FIXTURE_ALPHA_AT_40_10, -1)
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- --run tools`
Expected: FAIL — `tools/build_assets.py` n'existe pas.

- [ ] **Step 3: Écrire `tools/build_assets.py`**

Interface en ligne de commande : `python3 tools/build_assets.py --src <dossier> --out <dossier> [--mountain-width 1280] [--train-scale 0.5] [--quality 80] [--jobs N]`. Valeurs par défaut : largeur montagnes **1280**, échelle train **0,5**, qualité **80**, `method=6`, parallélisé avec `multiprocessing.Pool` à la manière de `outils/grain_train.py`.

Montagnes : prendre le canal alpha, redimensionner en Lanczos à la largeur demandée, écrire en WebP mode `L`. Train : pour chaque séquence, calculer la bbox union sur **toutes** les images, rogner chaque image à cette bbox, réduire de `--train-scale`, écrire en WebP RGBA. Les rails sont traités comme une séquence d'une seule image, avec leur propre bbox. Écrire le manifeste en dernier.

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- --run tools`
Expected: PASS.

- [ ] **Step 5: Générer les assets réels et vérifier le budget**

Run: `python3 tools/build_assets.py --src ../ --out public/assets && du -sh public/assets/*`
Expected: `mountains/` ≈ 7 Mo pour 160 images, `train/` ≈ 7 Mo pour 193 images. Si une séquence dépasse nettement, baisser `--quality` avant de continuer.

- [ ] **Step 6: Commit**

```bash
git add tools public/assets/manifest.json .gitignore
git commit -m "feat(tools): add asset pipeline producing grayscale mountain and trimmed train WebP"
```

---

### Task 3: Socle de la scène — événements, recoloration, cadrage

**Files:**
- Create: `src/scene/types.ts`, `src/scene/events.ts`, `src/scene/recolor.ts`, `src/scene/layout.ts`
- Test: `src/scene/__tests__/events.test.ts`, `src/scene/__tests__/recolor.test.ts`, `src/scene/__tests__/layout.test.ts`, `src/scene/__tests__/purity.test.ts`

**Interfaces:**
- Produces:
```ts
// types.ts — la seule source de ces types pour tout le projet, scène comme Vue
export type Gare = 'ici' | 'plus-loin' | 'la-haut' | 'ailleurs'
export type TrainSequence = 'loco' | 'wagon' | 'loco-start' | 'wagon-start' | 'loco-stop' | 'wagon-stop'
export type Trace = { id: string; phrase: string; prenom?: string; creeLe: number }   // utilisé à l'étape 2
export type Manifest = /* la forme définie à la Tâche 2, recopiée ici */

// events.ts
export type SceneEvents = {
  progress: (p: number) => void
  arrived: (gare: Gare) => void
  starHover: (t: Trace | null, x: number, y: number) => void
  birdFell: (x: number, y: number) => void
}
export function createEmitter<E>(): {
  on<K extends keyof E>(evt: K, cb: E[K]): () => void
  emit<K extends keyof E>(evt: K, ...args: Parameters<E[K]>): void
  clear(): void
}

// recolor.ts
export function recolorPixel(rgb: [number, number, number], fond: [number, number, number]): [number, number, number]
export function createRecolorFilter(fond: number): Filter   // Pixi, uniforme uFond
export function setRecolorFond(filter: Filter, fond: number): void

// layout.ts
export const STAGE = { width: 2320, height: 1217 } as const
export type Frame = { scale: number; offsetX: number; offsetY: number }
export function fitStage(viewportW: number, viewportH: number): Frame   // couvre, centré
```

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
// recolor.test.ts — la règle du §6, vérifiée sur les trois cas qui comptent
test('le noir devient exactement la couleur du fond', () =>
  expect(recolorPixel([0, 0, 0], [46, 35, 19])).toEqual([46, 35, 19]))
test('le blanc reste blanc', () =>
  expect(recolorPixel([255, 255, 255], [46, 35, 19])).toEqual([255, 255, 255]))
test('un gris moyen se place entre le fond et le blanc', () => {
  const [r] = recolorPixel([128, 128, 128], [46, 35, 19])
  expect(r).toBeGreaterThan(46); expect(r).toBeLessThan(255)
})

// layout.test.ts — Review Focus #5
test.each([[360, 400], [1, 1], [3840, 2160]])('fitStage(%i,%i) donne une échelle finie et positive', (w, h) => {
  const f = fitStage(w, h)
  expect(f.scale).toBeGreaterThan(0)
  expect(Number.isFinite(f.scale)).toBe(true)
})

// events.test.ts
test('on() renvoie une fonction de désabonnement qui coupe les appels suivants', () => { /* … */ })

// purity.test.ts — contrainte globale « la scène ne connaît pas Vue »
test('aucun fichier de src/scene n’importe vue, pinia ou vue-router', () => {
  for (const f of globSync('src/scene/**/*.ts')) {
    expect(readFileSync(f, 'utf8')).not.toMatch(/from ['"](vue|pinia|vue-router)['"]/)
  }
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test -- --run src/scene`
Expected: FAIL — modules introuvables.

- [ ] **Step 3: Implémenter les trois modules**

`recolorPixel` applique `mix(fond, rgb, luminance(rgb))` avec `luminance = 0.2126 r + 0.7152 g + 0.0722 b` normalisée sur 0–1, résultat arrondi.

`createRecolorFilter` porte la même formule dans un fragment shader Pixi v8, uniforme `uFond` en `vec3`. **Attention au piège de l'alpha prémultiplié** : l'entrée d'un filtre Pixi v8 est prémultipliée. Écrire `mix(uFond, texel.rgb, lum)` tel quel donnerait `uFond` sur chaque texel transparent, et le train apparaîtrait dans un rectangle visible. L'ordre obligatoire est donc : dé-prémultiplier (`rgb / max(a, 1e-5)`), appliquer le mélange, puis ressortir `vec4(c * a, a)`. `recolorPixel`, qui travaille en RGB droit, ne peut pas attraper cette erreur : c'est le contrôle visuel de la Tâche 10 qui la couvre.

`fitStage` couvre le viewport (`scale = max(vw / 2320, vh / 1217)`) et centre ; il traite une dimension nulle comme 1.

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- --run src/scene`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene
git commit -m "feat(scene): add typed emitter, black-to-background recolor filter and stage fitting"
```

---

### Task 4: Palette de fond et icône « œil »

**Files:**
- Create: `src/scene/palette.ts`, `src/components/EyeButton.vue`
- Test: `src/scene/__tests__/palette.test.ts`, `src/components/__tests__/EyeButton.test.ts`

**Interfaces:**
- Consumes: `setRecolorFond` (Tâche 3).
- Produces:
```ts
export const PALETTE = ['#2E2313', '#141B2B', '#151517', '#13241D', '#261725'] as const
export function nextFond(current: string): string      // cycle, revient au début
export function loadFond(): string                     // défaut si absent ou illisible
export function saveFond(fond: string): void           // ne lève jamais
```

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
test('le cycle boucle sur la première couleur', () => expect(nextFond('#261725')).toBe('#2E2313'))
test('une couleur inconnue retombe sur le défaut', () => expect(nextFond('#abcdef')).toBe('#2E2313'))

// Review Focus #4
test('loadFond rend le défaut quand localStorage lève', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied') })
  expect(loadFond()).toBe('#2E2313')
})
test('saveFond ne lève pas quand le quota est dépassé', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('QuotaExceeded') })
  expect(() => saveFond('#141B2B')).not.toThrow()
})
test('loadFond rend le défaut quand la valeur stockée n’est pas dans la palette', () => { /* … */ })

// EyeButton.test.ts
test('le bouton porte son aria-label et change de couleur au clic', () => {
  const w = mount(EyeButton)
  expect(w.get('button').attributes('aria-label')).toBe('Changer la couleur de la nuit')
  w.get('button').trigger('click')
  expect(w.emitted('change')![0]).toEqual(['#141B2B'])
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test -- --run palette EyeButton`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

`palette.ts` enveloppe chaque accès à `localStorage` dans un `try/catch` et valide la valeur lue contre `PALETTE`. `EyeButton.vue` est un `<button>` sans fond, contenant un œil en SVG inline au trait `var(--trait)`, qui émet `change` avec la couleur suivante ; il ne touche ni au DOM global ni à la scène lui-même.

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- --run palette EyeButton`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/palette.ts src/components/EyeButton.vue src/scene/__tests__ src/components/__tests__
git commit -m "feat: add background palette cycle with safe storage and eye button"
```

---

### Task 5: Chargement des assets et ciel de poussière

**Files:**
- Create: `src/scene/assets.ts`, `src/scene/Sky.ts`
- Test: `src/scene/__tests__/assets.test.ts`, `src/scene/__tests__/Sky.test.ts`

**Interfaces:**
- Consumes: `Manifest` (Tâche 2), `fitStage` (Tâche 3).
- Produces:
```ts
export async function loadManifest(url = '/assets/manifest.json'): Promise<Manifest | null>  // null si indisponible
export function framePath(pattern: string, index: number): string        // '{i}' → '0001'
export async function loadSequence(spec, opts: { onFrame?: (i: number) => void }): Promise<Texture[]>

// Sky.ts
export function dustCount(viewportW: number, viewportH: number, mobile: boolean): number
export function makeDust(count: number, seed: number, w: number, h: number): { x: number; y: number; r: number; a: number }[]
```

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
test('framePath remplit l’index sur quatre chiffres', () =>
  expect(framePath('assets/mountains/{i}.webp', 7)).toBe('assets/mountains/0007.webp'))

// Review Focus #3
test('loadManifest rend null au lieu de lever quand le fetch échoue', async () => {
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')))
  await expect(loadManifest()).resolves.toBeNull()
})
test('loadManifest rend null sur une réponse 404', async () => { /* … */ })

// Review Focus #5
test.each([[360, 400], [1, 1]])('dustCount(%i,%i) rend un entier > 0', (w, h) =>
  expect(dustCount(w, h, false)).toBeGreaterThan(0))
test('le mobile reçoit moins de poussière que le bureau à surface égale', () =>
  expect(dustCount(1440, 900, true)).toBeLessThan(dustCount(1440, 900, false)))
test('makeDust est déterministe à graine égale', () =>
  expect(makeDust(50, 7, 800, 600)).toEqual(makeDust(50, 7, 800, 600)))
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test -- --run assets Sky`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

`loadManifest` rattrape toute erreur réseau ou de parsing et rend `null` ; `loadSequence` charge les textures par `Assets.load` de Pixi, appelle `onFrame` à chaque image reçue pour permettre un affichage progressif, et ignore les images manquantes plutôt que de rejeter. `dustCount` est proportionnel à la surface du viewport avec un plancher, et divisé environ par trois en mobile (§11). `makeDust` tire ses positions avec un générateur pseudo-aléatoire à graine (mulberry32 ou équivalent), hors de la bande de la frise (haut de l'écran).

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- --run assets Sky`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/assets.ts src/scene/Sky.ts src/scene/__tests__
git commit -m "feat(scene): add resilient asset loading and seeded star dust field"
```

---

### Task 6: Montagnes

**Files:**
- Create: `src/scene/Mountains.ts`
- Test: `src/scene/__tests__/Mountains.test.ts`

**Interfaces:**
- Consumes: `loadSequence`, `framePath` (Tâche 5).
- Produces:
```ts
export const SWEEP_LEGS = 4           // une passe complète de la séquence par tour de boucle
export function mountainFrame(legs: number, count: number): number   // index 0-based, va-et-vient
export function createMountainFilter(): Filter                       // luminance → alpha
export class Mountains {
  constructor(container: Container, manifest: Manifest)
  setLegs(legs: number): void    // étapes parcourues depuis le début, fractionnaires, croît sans borne
  destroy(): void
}
```

Deux mesures commandent ce qui précède.

**Le va-et-vient.** D'une image à la suivante, l'alpha ne bouge que de 0,8 en moyenne ; entre la 160ᵉ et la 1ʳᵉ, il bouge de 23,8 : la séquence **ne boucle pas**. On la parcourt donc en aller-retour. L'unité est l'**étape** (un trajet d'une gare à la suivante) et non le trajet complet : avec `SWEEP_LEGS = 4`, une passe dure un tour de boucle entier, le mouvement reste « léger » comme au §6, et les deux demi-tours tombent sur des valeurs entières d'étapes — c'est-à-dire **à l'arrêt en gare**, jamais en marche.

**Le filtre.** Les images de montagne ne contiennent que de la luminance (Tâche 2) : affichées telles quelles, elles seraient des aplats gris opaques, et passées au filtre de recoloration elles donneraient la mauvaise clarté. `createMountainFilter` fait l'opération inverse du pipeline — `a = texel.r ; gl_FragColor = vec4(vec3(196.0 / 255.0) * a, a)` — et se place **avant** le filtre de recoloration.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
test('la première image est au départ', () => expect(mountainFrame(0, 160)).toBe(0))
test('la passe aller se termine après un tour de boucle', () => expect(mountainFrame(4, 160)).toBe(159))
test('le retour repasse par les mêmes images en sens inverse', () =>
  expect(mountainFrame(4 + 4 / 159, 160)).toBe(158))
test('le cycle complet fait deux tours de boucle et se referme sans saut', () =>
  expect(mountainFrame(8, 160)).toBe(0))
test('les demi-tours tombent sur un arrêt en gare', () => {
  // un demi-tour n’a lieu qu’à un nombre entier d’étapes
  expect(Number.isInteger(SWEEP_LEGS)).toBe(true)
})
test('l’index reste dans les bornes pour une distance quelconque', () => {
  for (const t of [0.3, 7.77, 1234.5]) {
    const i = mountainFrame(t, 160)
    expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(160)
  }
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- --run Mountains`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

`mountainFrame` ramène `legs / SWEEP_LEGS` dans `[0, 2)`, le multiplie par `count - 1` et replie la partie au-delà de `count - 1` (va-et-vient). La classe `Mountains` tient un `Sprite` dont elle échange la texture, lui applique `createMountainFilter` puis le filtre de recoloration, place la bande de montagnes au-dessus de la ligne d'horizon du cadre, et affiche la première image disponible tant que la séquence se charge.

- [ ] **Step 4: Lancer le test**

Run: `npm test -- --run Mountains`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/Mountains.ts src/scene/__tests__/Mountains.test.ts
git commit -m "feat(scene): add mountain sequence driven by travel distance"
```

---

### Task 7: Voie, train et machine à états — avec le store du voyage

**Files:**
- Create: `src/scene/Train.ts`, `src/stores/voyage.ts`
- Test: `src/scene/__tests__/Train.test.ts`, `src/stores/__tests__/voyage.test.ts`

**Interfaces:**
- Consumes: `loadSequence` (Tâche 5), `STAGE` (Tâche 3).
- Produces:
```ts
// Train.ts
export type TrainState = 'arret' | 'demarrage' | 'roule' | 'freinage'
// phase : 0→1 de l'étape en cours ; derniereEtape : seule une dernière étape déclenche le freinage
export function nextTrainState(state: TrainState, phase: number, derniereEtape: boolean): TrainState
export function sequenceFor(state: TrainState): TrainSequence[]                // [loco, wagon]
export class Train { constructor(container: Container, manifest: Manifest); update(dt: number, phase: number, derniereEtape: boolean): void; destroy(): void }

// stores/voyage.ts
export const GARES = ['ici', 'plus-loin', 'la-haut', 'ailleurs'] as const
export function forwardSteps(from: Gare, to: Gare): number    // 0 à 3, toujours vers l'avant
export function gareSuivante(g: Gare): Gare
export const useVoyage = defineStore('voyage', …)
// état : { gare: Gare; cible: Gare | null; enRoute: boolean; progression: number; legs: number }
// actions :
//   poserGare(g: Gare): void        — pose la gare sans voyage (première navigation, lien partagé)
//   partirVers(cible: Gare): void   — si enRoute, ne lance pas un second voyage : il redirige celui en cours
//   finirEtape(): void              — fin d'une étape : gare ← gareSuivante(gare), legs += 1, progression ← 0
```

**Un voyage se fait en étapes.** `forwardSteps` peut valoir 2 ou 3 : le train traverse alors des gares intermédiaires. Un voyage de N étapes est donc une suite de N étapes, et non une seule interpolation :

- `gare` avance d'un cran à la fin de **chaque** étape, pour que la frise glisse une fois par gare franchie, comme au §3 ;
- `progression` repart de 0 à chaque étape ;
- le train **démarre une seule fois**, traverse les gares intermédiaires sans s'arrêter, et ne freine qu'à la dernière étape.

Traverser sans s'arrêter est un choix que la spec ne tranche pas : il est signalé à Emmanuelle pour validation à la revue de l'étape 1.

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
// voyage.test.ts — la règle du §3
test('aller à la gare suivante fait un pas', () => expect(forwardSteps('ici', 'plus-loin')).toBe(1))
test('revenir en arrière fait le tour par l’avant', () => expect(forwardSteps('ailleurs', 'plus-loin')).toBe(2))
test('la gare précédente immédiate coûte trois pas, jamais moins un', () =>
  expect(forwardSteps('plus-loin', 'ici')).toBe(3))
test('rester sur place ne coûte rien', () => expect(forwardSteps('ici', 'ici')).toBe(0))

// Review Focus #2
test('un second départ pendant un trajet redirige celui en cours au lieu d’en empiler un', () => {
  const v = useVoyage()          // à quai à 'ici'
  v.partirVers('la-haut')
  v.progression = 0.4
  v.partirVers('ailleurs')
  expect(v.cible).toBe('ailleurs')   // la cible suit le dernier clic
  expect(v.enRoute).toBe(true)       // un seul voyage, toujours en cours
  expect(v.progression).toBe(0.4)    // l’étape en cours n’est pas réamorcée
})
test('finirEtape avance d’une gare et compte l’étape', () => {
  const v = useVoyage()
  v.partirVers('ailleurs')     // trois étapes depuis 'ici'
  v.finirEtape()
  expect(v.gare).toBe('plus-loin')
  expect(v.legs).toBe(1)
  expect(v.progression).toBe(0)
  expect(v.enRoute).toBe(true)         // on n’est pas arrivé
})
test('arriver à la cible termine le voyage', () => {
  const v = useVoyage()
  v.partirVers('plus-loin')
  v.finirEtape()
  expect(v.enRoute).toBe(false)
  expect(v.cible).toBe(null)
})
test('poserGare ne lance aucun voyage', () => {
  const v = useVoyage()
  v.poserGare('la-haut')
  expect(v.gare).toBe('la-haut'); expect(v.enRoute).toBe(false); expect(v.cible).toBe(null)
})
test('progression reste dans [0,1]', () => { /* bornée par l’action qui l’écrit */ })

// Train.test.ts
test('le train quitte l’arrêt par le démarrage', () => expect(nextTrainState('arret', 0, true)).toBe('demarrage'))
test('le train freine longuement avant la gare', () => expect(nextTrainState('roule', 0.75, true)).toBe('freinage'))
test('le freinage se termine à l’arrêt', () => expect(nextTrainState('freinage', 1, true)).toBe('arret'))
test('il traverse une gare intermédiaire sans freiner', () =>
  expect(nextTrainState('roule', 0.95, false)).toBe('roule'))
test('chaque état choisit la paire loco + wagon correspondante', () =>
  expect(sequenceFor('demarrage')).toEqual(['loco-start', 'wagon-start']))
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test -- --run Train voyage`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

`forwardSteps` calcule `(indexOf(to) - indexOf(from) + 4) % 4`. `partirVers` écrit `cible` et met `enRoute` à vrai ; appelée alors que `enRoute` est déjà vrai, elle **remplace** la cible sans toucher à `progression` ni relancer de voyage. `finirEtape` avance `gare` d'un cran, incrémente `legs`, remet `progression` à 0, et clôt le voyage (`enRoute` faux, `cible` nulle) quand `gare` a rejoint `cible`.

`nextTrainState` passe à `freinage` à partir de `phase >= 0.7` **et seulement si `derniereEtape`** — « il ralentit longuement à l'approche d'une gare » (§6).

La classe `Train` pose les rails en bande répétée qui défile, superpose loco et wagon à la même ligne de rail, et joue la séquence de l'état courant. **Elle ne gère pas le reflet** : le §6 parle du décor *et* du train retournés, c'est donc `Scene.ts` qui le rend, sur montagnes et train ensemble (Tâche 8).

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- --run Train voyage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/Train.ts src/stores/voyage.ts src/scene/__tests__/Train.test.ts src/stores/__tests__/voyage.test.ts
git commit -m "feat: add train state machine, rails, reflection and one-way journey store"
```

---

### Task 8: Assemblage de la scène, routes et pont Vue

**Files:**
- Create: `src/scene/Scene.ts`, `src/router/index.ts`, `src/composables/useScene.ts`, `src/components/gares/GareIci.vue`, `src/components/gares/GarePlusLoin.vue`, `src/components/gares/GareLaHaut.vue`, `src/components/gares/GareAilleurs.vue`
- Modify: `src/App.vue`, `src/main.ts`

Les quatre composants de gare sont les cibles des routes. À cette étape, seul `GareIci.vue` a du contenu — le nom, le titre et la phrase du §4.1, en haut à gauche, apparaissant en fondu à l'arrivée et disparaissant au départ. Les trois autres sont des coquilles vides qui recevront leur contenu aux étapes 3 et 4.
- Test: `src/router/__tests__/router.test.ts`, `src/composables/__tests__/useScene.test.ts`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces:
```ts
export class Scene {
  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean })
  init(): Promise<void>
  travelTo(gare: Gare): Promise<void>
  setFond(hex: string): void          // fondu GSAP d'environ 1 s
  on<K extends keyof SceneEvents>(evt: K, cb: SceneEvents[K]): () => void
  dispose(): void
}
export function useScene(canvas: Ref<HTMLCanvasElement | null>): { scene: Ref<Scene | null> }
```

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
test('la racine redirige vers ici', async () => {
  await router.push('/'); expect(router.currentRoute.value.path).toBe('/ici')
})
test.each(GARES)('la route /%s existe', async (g) => {
  await router.push(`/${g}`); expect(router.currentRoute.value.name).toBe(g)
})
test('une route inconnue retombe sur ici', async () => { /* … */ })

// les tests du routeur utilisent createMemoryHistory

// Review Focus #1 — le cœur de la spec
test('le retour navigateur vers une gare passée déclenche un trajet vers l’avant', async () => {
  const v = useVoyage()
  await router.push('/ici'); await router.push('/plus-loin')
  await router.back()                                   // vers /ici
  await flushPromises()
  expect(v.cible).toBe('ici')
  expect(forwardSteps('plus-loin', 'ici')).toBe(3)      // trois pas, pas un retour arrière
  expect(v.gare).not.toBe('ici')                        // on n’y est pas encore : le train roule
})

// Review Focus #6 — lien partagé
test('ouvrir directement /la-haut pose la gare sans jouer de voyage', async () => {
  const v = useVoyage()
  await router.push('/la-haut')      // toute première navigation
  await flushPromises()
  expect(v.gare).toBe('la-haut')
  expect(v.enRoute).toBe(false)
})

// Review Focus #2 — l’URL ne doit jamais désigner une autre gare que la cible
test('après deux clics rapides, l’URL et la cible désignent la même gare', async () => {
  const v = useVoyage()
  await router.push('/ici'); await flushPromises()
  await router.push('/la-haut')
  await router.push('/ailleurs')
  await flushPromises()
  expect(v.cible).toBe('ailleurs')
  expect(router.currentRoute.value.name).toBe('ailleurs')
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test -- --run router useScene`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

Le routeur déclare une route par gare, plus une redirection `/` → `/ici` et un `catch-all` vers `/ici`. Un garde global `afterEach` appelle `voyage.poserGare(gare)` **à la toute première navigation** et `voyage.partirVers(gare)` ensuite. Le changement d'URL est toujours *immédiat* — c'est le train qui met du temps à arriver — et `partirVers` redirigeant un voyage en cours au lieu de le refuser, l'URL et `cible` ne peuvent pas diverger.

`Scene.travelTo` lit `forwardSteps` pour savoir combien d'étapes faire, puis enchaîne dans **une seule** timeline GSAP : un démarrage, N phases de roulement, un freinage sur la dernière seulement. Elle émet `progress` à chaque image, `arrived` à la fin de **chaque** étape — c'est ce qui fait glisser la frise d'un cran par gare franchie — et appelle `finirEtape` sur le store à chacune. Si la cible change en cours de route, la timeline se prolonge d'autant d'étapes.

`Scene.ts` rend aussi le **reflet** (§6) : montagnes et train sont réunis dans un conteneur « décor », dupliqué sous la ligne de voie avec `scale.y = -1`, une opacité basse et un flou léger. `Scene.init` rattrape un échec d'initialisation WebGL et le signale sans lever, dans le même esprit que le Review Focus #3.

`useScene` crée la scène `onMounted`, la détruit `onBeforeUnmount`, relaie `progress` et `arrived` vers le store, pousse `legs` vers `Mountains.setLegs`, et observe le canvas avec un `ResizeObserver`. `App.vue` assemble le canvas, `<RouterView>`, `NavFrise` et `EyeButton`, et branche l'événement `change` de `EyeButton` sur `scene.setFond` **et** sur la variable CSS `--fond`.

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- --run && npm run build`
Expected: PASS, build sans erreur.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: assemble scene, one-way routing and Vue bridge"
```

---

### Task 9: La frise

**Files:**
- Create: `src/components/NavFrise.vue`
- Test: `src/components/__tests__/NavFrise.test.ts`

**Interfaces:**
- Consumes: `useVoyage`, `forwardSteps` (Tâche 7).
- Produces: un `<nav>` de liens `RouterLink`, une gare par entrée, qui glisse d'un cran à chaque arrivée.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
test('la gare courante porte la mention À QUAI', () => {
  const w = mount(NavFrise, { global: { plugins: [router, pinia] } })
  expect(w.get('[data-etat="a-quai"]').text()).toContain('À QUAI')
})
test('la gare suivante porte la mention PROCHAIN ARRÊT', () =>
  expect(/* … */).toContain('PROCHAIN ARRÊT'))
test('les gares déjà passées sont marquées passées', () => { /* data-etat="passee" */ })
test('la frise est une vraie navigation au clavier', () => {
  const w = mount(NavFrise, { /* … */ })
  expect(w.find('nav').exists()).toBe(true)
  expect(w.findAllComponents(RouterLink)).toHaveLength(4)
})
test('en route, le marqueur se place selon la progression', () => { /* style/left lié à progression */ })
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- --run NavFrise`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

Chaque gare rend un `RouterLink` portant `data-etat` valant `passee`, `a-quai`, `prochain` ou `a-venir`, stylé selon le tableau du §3 (point plein opacité 0.3 ; point plein + halo + libellé agrandi ; anneau + point central + halo ; anneau vide opacité 0.7). La gare à quai reste à une position fixe : c'est la piste entière qui est translatée, en transition CSS, de sorte que les gares glissent d'un cran vers la gauche à chaque arrivée. En route, un marqueur — point, halo et petite loco au-dessus — se place entre les deux gares à `progression`. En mobile, seules la gare courante et la suivante sont affichées (§11).

- [ ] **Step 4: Lancer le test**

Run: `npm test -- --run NavFrise`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/NavFrise.vue src/components/__tests__/NavFrise.test.ts
git commit -m "feat: add looping station timeline navigation"
```

---

### Task 10: Vérification de bout en bout

**Files:**
- Modify: `README.md`
- Test: la suite complète, puis un contrôle visuel.

- [ ] **Step 1: Lancer toute la suite et le build**

Run: `npm test -- --run && npm run build`
Expected: tous les tests PASS, build sans erreur de types.

- [ ] **Step 2: Contrôle visuel dans le navigateur**

Run: `npm run dev`, puis vérifier, dans cet ordre :

1. Le fond est `#2E2313` et le train roule.
2. **Aucun rectangle visible autour du train ni des montagnes**, sur chacune des cinq couleurs. Un rectangle signale l'erreur d'alpha prémultiplié de la Tâche 3 ; des aplats gris à la place du relief signalent le filtre de montagne manquant de la Tâche 6.
3. Un clic sur `là-haut` fait démarrer le train, rouler, freiner longuement, s'arrêter ; la frise a glissé d'un cran et l'URL est `/la-haut`.
4. Depuis `ici`, un clic sur `ailleurs` : le train **traverse** `plus-loin` et `là-haut` sans s'arrêter, la frise glisse **trois** fois, et il ne freine qu'à la dernière.
5. Le bouton retour du navigateur ramène à la gare précédente **en faisant le tour vers l'avant**, jamais en marche arrière.
6. L'œil fait défiler les cinq couleurs en fondu, le corps du train prend chaque couleur ; après rechargement, la couleur choisie est conservée.
7. `/la-haut` ouvert dans un onglet neuf affiche la gare **sans jouer de voyage**.
8. Les montagnes ne font pas de demi-tour visible pendant que le train roule.

- [ ] **Step 3: Écrire le README**

Installation, `npm run dev`, et la commande de régénération des assets avec la remarque que les sources vivent hors du dépôt, dans `~/projet_zero/`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and asset pipeline instructions"
```

---

## Choix visuels à faire valider à la revue de l'étape 1

Deux comportements que la spec ne tranche pas et que ce plan a tranchés pour avancer. Les deux se changent en une ligne.

1. **Traverser les gares intermédiaires sans s'arrêter.** Aller de `ici` à `ailleurs` fait trois étapes. Le train démarre une fois, passe devant `plus-loin` et `là-haut` sans s'arrêter, et ne freine qu'à la fin. L'autre lecture possible serait de marquer un arrêt à chaque gare traversée.
2. **Le va-et-vient des montagnes.** La séquence ne boucle pas : on la parcourt en aller-retour, une passe par tour de boucle, les demi-tours tombant toujours à l'arrêt en gare. Le mouvement n'est donc pas strictement toujours dans le même sens, contrairement au train.

## Ce qui reste au constructeur

- Le placement exact des montagnes, de la voie et du train dans le cadre, et la hauteur de la ligne d'horizon : la spec ne les chiffre pas. À régler visuellement contre le Figma, en gardant ces valeurs regroupées dans `layout.ts`.
- La vitesse du train et la durée d'un trajet : « lents, comme un souffle » (§6). Point de départ raisonnable, à ajuster à l'œil : environ 6 s par trajet, dont les deux dernières secondes en freinage.
- La forme exacte de l'œil en SVG, et le rendu fin du grain et du reflet.
