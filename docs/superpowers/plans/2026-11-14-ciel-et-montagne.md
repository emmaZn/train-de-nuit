# Le ciel et la montagne — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une étoile de voyageur n'est jamais derrière la montagne, et le ciel où elle peut se poser fait au moins 60 px au-dessus du sommet, sur tous les formats.

**Architecture:** L'enveloppe de la crête est mesurée hors ligne et figée en données. Toute la géométrie nouvelle (région libre, règle de dégagement, tirage) vit en fonctions pures dans `scene/layout.ts` et `scene/stars.ts`, testables sans canvas. La scène et les composants ne font que les consommer.

**Tech Stack:** Vue 3, TypeScript, PixiJS, Three.js, Vitest. Script de mesure en Python (Pillow + numpy), hors du bundle.

**Spec:** `docs/superpowers/specs/2026-11-13-ciel-et-montagne-design.md`

## Global Constraints

- **Textes d'interface en français ; code, noms de fichiers et commentaires techniques en anglais** (CONCEPT §11), sauf les noms de gares.
- **`HORIZON` (921) ne bouge pas.** C'est une constante de scène partagée : rails, train, voile du pied et massif y sont calés.
- **Rien n'est recopié** : `HAUTEUR_FRISE` s'importe, la hauteur de frise est la somme de `--haut-voie` et des 52 px de `NavFrise.vue`, et un test existant (`src/scene/__tests__/layout.test.ts`) le vérifie en lisant les deux fichiers.
- `CIEL_SOMMET = 60`. La frise passe de 116 à 96 px (`--haut-voie` 64 → 44, les 52 px de libellés inchangés).
- **Aucun seuil de format écrit à la main.** L'échelle du massif se résout ; elle est continue en hauteur de fenêtre.
- Mouvement réduit (`prefers-reduced-motion`) : rien de ce qui change ici n'introduit d'animation.

## Review Focus

Ce que la spec implique et qu'aucun test de tâche n'exerce, du plus probable au moins probable :

1. **Une région libre de hauteur nulle ou négative.** Sur une fenêtre minuscule, le bas de la frise peut passer sous la crête. `projeter` diviserait par zéro et poserait les étoiles en `NaN`. → test ajouté en tâche 3.
2. **Les colonnes sans massif.** Sur format court, les bords d'écran n'ont aucune crête ; sans plancher, la région descendrait jusqu'au bas du cadre et les étoiles se poseraient sur les rails, le train et le reflet. → test ajouté en tâche 3.
3. **Un redimensionnement continu.** L'échelle résolue change à chaque pixel de hauteur : le massif ne doit ni scintiller ni se recharger à chaque image. → test ajouté en tâche 4 (continuité de la fonction) ; le non-rechargement se vérifie à l'œil en tâche 6.
4. **Une trace aux bornes.** Les règles Firestore autorisent `y = 0` et `y = 1` exactement : les deux doivent tomber dans la région, pas à un pixel en dehors. → test ajouté en tâche 3.
5. **Une fenêtre plus large que 1,9:1.** C'est le seul cas où le cadrage laisse du jeu vertical ; ailleurs il vaut zéro et la règle doit passer directement à l'échelle. → test ajouté en tâche 4.

---

### Task 1: l'enveloppe de la crête

**Files:**
- Create: `tools/crete_massif.py`
- Create: `src/scene/crete.ts`
- Test: `src/scene/__tests__/crete.test.ts`

**Interfaces:**
- Produit : `CRETE: readonly number[]` (60 valeurs, lignes du cadre source 3840 × 944, `y` croissant vers le bas), `CRETE_BIN = 64`, `MARGE_CRETE: number`.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { CRETE, CRETE_BIN, MARGE_CRETE } from '@/scene/crete'
import { MOUNTAIN_SOURCE, MOUNTAIN_CONTENU } from '@/scene/layout'

test('la crête couvre le cadre source, paquet par paquet', () => {
  expect(CRETE.length * CRETE_BIN).toBe(MOUNTAIN_SOURCE.width)
})

test('le sommet de la crête est celui que le cadrage déclare', () => {
  // `MOUNTAIN_CONTENU.top` est mesuré sur la même séquence : les deux doivent
  // se rejoindre, sinon l'un des deux a dérivé.
  expect(Math.min(...CRETE)).toBeGreaterThanOrEqual(MOUNTAIN_CONTENU.top - 2)
  expect(Math.min(...CRETE)).toBeLessThanOrEqual(MOUNTAIN_CONTENU.top + 2)
})

test('la marge absorbe le halo de l’étoile', () => {
  // RAYON_HALO = 9 dans StarLayer : « jamais derrière la montagne » vaut pour
  // le halo, pas seulement pour le point.
  expect(MARGE_CRETE).toBeGreaterThanOrEqual(9)
})
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run: `npx vitest run src/scene/__tests__/crete.test.ts`
Expected: FAIL — `Cannot find module '@/scene/crete'`.

- [ ] **Step 3: Écrire `tools/crete_massif.py`**

Lit `~/projet_zero/montagne_hd/tramage/webp/*.webp` (180 images, un tour complet en boucle), prend pour chaque colonne la ligne la plus haute où `alpha > 8` sur **toutes** les images, agrège par paquets de 64 colonnes **en prenant le minimum du paquet** — le choix conservateur — et écrit `src/scene/crete.ts`.

L'en-tête du fichier généré porte la date, la commande, et le fait que **la séquence source vit hors du dépôt** (`~/projet_zero/`) : le script n'est rejouable que sur une machine qui l'a. `src/scene/crete.ts` est donc une source à part entière, commitée.

- [ ] **Step 4: Générer, puis poser `MARGE_CRETE`**

Run: `python3 -I tools/crete_massif.py`
Expected: `src/scene/crete.ts` écrit, 60 valeurs.

`MARGE_CRETE` se pose à la main dans le script, avec son calcul en commentaire : écart GLSL / rendu de référence, échantillonnage à 2°, et le rayon du halo (9 px) plus celui de la cible de survol (14 px).

- [ ] **Step 5: Lancer le test pour le voir passer**

Run: `npx vitest run src/scene/__tests__/crete.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add tools/crete_massif.py src/scene/crete.ts src/scene/__tests__/crete.test.ts
git commit -m "feat(massif): mesurer la crête sur un tour, et la figer"
```

---

### Task 2: la frise à 96 et l'œil sur la ligne

**Files:**
- Modify: `src/styles/base.css` (`--haut-voie`)
- Modify: `src/components/EyeButton.vue`
- Modify: `src/scene/layout.ts` (`HAUTEUR_FRISE`)
- Test: `src/scene/__tests__/layout.test.ts`

**Interfaces:**
- Produit : `HAUTEUR_FRISE = 96`.

- [ ] **Step 1: Écrire le test qui échoue**

Le test existant qui lit les deux fichiers et vérifie la somme reste en place. Ajouter :

```ts
test('la frise fait 96 px', () => {
  expect(HAUTEUR_FRISE).toBe(96)
})

test('l’œil se pose sur la ligne de voie, pas au-dessus', async () => {
  // Il était centré dans la bande au-dessus de la voie ; cette bande passe de
  // 64 à 44 px et un bouton de 36 px n'y tient plus proprement.
  const css = (await import('@/components/EyeButton.vue?raw')).default
  expect(css).toMatch(/top:\s*calc\(var\(--haut-voie\)\s*-\s*18px\)/)
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `npx vitest run src/scene/__tests__/layout.test.ts`
Expected: FAIL sur les deux (96 attendu contre 116 ; le `top` de l'œil ne correspond pas).

- [ ] **Step 3: Appliquer**

`--haut-voie: 44px` dans `base.css` ; `HAUTEUR_FRISE = 96` dans `layout.ts` ; dans `EyeButton.vue`, `top: calc(var(--haut-voie) - 18px)` — la moitié de la hauteur du bouton, pour que son centre tombe sur la ligne — et le commentaire mis à jour : il s'aligne désormais sur la voie elle-même.

- [ ] **Step 4: Lancer les tests pour les voir passer**

Run: `npx vitest run src/scene/__tests__/layout.test.ts`
Expected: PASS, dont le test de somme qui lit les deux fichiers.

- [ ] **Step 5: Regarder dans l'appli**

`npm run dev`. La frise respire encore, l'œil est traversé par la ligne à son extrémité droite, et le point d'« ailleurs » ne le touche pas.

- [ ] **Step 6: Commit**

```bash
git add src/styles/base.css src/components/EyeButton.vue src/scene/layout.ts src/scene/__tests__/layout.test.ts
git commit -m "feat(frise): la resserrer à 96 px, et poser l'œil sur la ligne"
```

---

### Task 3: la région libre

**Files:**
- Modify: `src/scene/layout.ts`
- Modify: `src/scene/stars.ts`
- Test: `src/scene/__tests__/layout.test.ts`, `src/scene/__tests__/stars.test.ts`

**Interfaces:**
- Consomme : `CRETE`, `CRETE_BIN`, `MARGE_CRETE` (tâche 1) ; `HAUTEUR_FRISE` (tâche 2).
- Produit :
  - `hautDuVoilePx(viewportW: number, viewportH: number, decalage: number): number` — `HORIZON - DEGRADE_HAUTEUR` projeté à l'écran. C'est le plancher de la région.
  - `cretePx(xPx: number, viewportW: number, viewportH: number, echelle: number, decalage: number): number` — l'ordonnée de la crête sous cette colonne d'écran, **plancher compris**.
  - `regionCiel(xPx, viewportW, viewportH, echelle, decalage): { top: number; height: number }`.
  - `projeter(place: Place, viewportW, viewportH, echelle, decalage): { px: number; py: number }` — signature élargie ; `bandeCiel` disparaît.

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
test('là où il n’y a pas de massif, la région s’arrête au haut du voile', () => {
  // Bords d'écran sur format court : sans plancher, une étoile se poserait
  // sur les rails, le train ou le reflet.
  expect(cretePx(2, 844, 390, 1.555, 26)).toBeCloseTo(hautDuVoilePx(844, 390, 26), 0)
})

test('la région ne descend jamais sous le haut du voile', () => {
  for (const x of [0, 200, 422, 700, 844]) {
    const r = regionCiel(x, 844, 390, 1.555, 26)
    expect(r.top + r.height).toBeLessThanOrEqual(hautDuVoilePx(844, 390, 26) + 0.5)
  }
})

test('une région écrasée garde une hauteur utilisable', () => {
  // Fenêtre minuscule : le bas de la frise peut passer sous la crête. Sans
  // plancher de hauteur, `projeter` diviserait par zéro.
  const r = regionCiel(400, 800, 200, 2.2, 0)
  expect(r.height).toBeGreaterThan(0)
  expect(Number.isFinite(r.height)).toBe(true)
})

test('les bornes 0 et 1 tombent dans la région, pas à côté', () => {
  // Les règles Firestore autorisent y = 0 et y = 1 exactement.
  const r = regionCiel(700, 1512, 771, 2.153, 11)
  expect(projeter({ x: 700 / 1512, y: 0 }, 1512, 771, 2.153, 11).py).toBeCloseTo(r.top, 0)
  expect(projeter({ x: 700 / 1512, y: 1 }, 1512, 771, 2.153, 11).py).toBeCloseTo(r.top + r.height, 0)
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `npx vitest run src/scene/__tests__/layout.test.ts src/scene/__tests__/stars.test.ts`
Expected: FAIL — `cretePx` et `regionCiel` n'existent pas.

- [ ] **Step 3: Implémenter**

`cretePx` projette la crête du cadre source vers l'écran par le même chemin que `cadreMontagnes` / `fitStage`, ajoute `MARGE_CRETE`, et **plafonne au haut du voile** (`HORIZON - DEGRADE_HAUTEUR`, projeté) : c'est ce qui couvre les colonnes sans massif. `regionCiel` va du bas de la frise à cette ordonnée, avec une hauteur minimale strictement positive. `projeter` s'appuie dessus.

- [ ] **Step 4: Lancer les tests pour les voir passer**

Run: `npx vitest run src/scene/__tests__/layout.test.ts src/scene/__tests__/stars.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/layout.ts src/scene/stars.ts src/scene/__tests__/
git commit -m "feat(ciel): tailler la région libre sous la crête, et lui donner un plancher"
```

---

### Task 4: la règle de dégagement

**Files:**
- Modify: `src/scene/layout.ts`
- Test: `src/scene/__tests__/layout.test.ts`

**Interfaces:**
- Produit : `cadrageCiel(viewportW: number, viewportH: number): { decalage: number; echelle: number }`.

- [ ] **Step 1: Écrire les tests qui échouent**

Les valeurs viennent du tableau de la spec (§3), à frise 96 :

```ts
test.each([
  [1512, 771, 11, 2.153],
  [1280, 800, 0, 2.160],
  [1440, 900, 0, 2.2],
  [1728, 1117, 0, 2.2],
  [390, 844, 0, 2.2],
  [844, 390, 26, 1.555],
])('cadrage de %ix%i', (w, h, decalage, echelle) => {
  const c = cadrageCiel(w, h)
  expect(c.decalage).toBeCloseTo(decalage, 0)
  expect(c.echelle).toBeCloseTo(echelle, 2)
})

test('le jeu vertical est nul dès que la fenêtre est pilotée par sa hauteur', () => {
  // Seules les fenêtres plus larges que ~1,9:1 en laissent.
  expect(cadrageCiel(1440, 900).decalage).toBe(0)
  expect(cadrageCiel(1512, 771).decalage).toBeGreaterThan(0)
})

test('l’échelle est continue en hauteur de fenêtre', () => {
  // Elle est résolue, pas posée : un massif qui sauterait d'un pixel de
  // redimensionnement serait visible.
  for (let h = 380; h < 900; h += 1) {
    const a = cadrageCiel(1000, h).echelle
    const b = cadrageCiel(1000, h + 1).echelle
    expect(Math.abs(a - b)).toBeLessThan(0.02)
  }
})

test('la cible de 60 px est tenue partout', () => {
  for (const [w, h] of [[1512,771],[1280,800],[1440,900],[390,844],[844,390],[1024,600]]) {
    const { decalage, echelle } = cadrageCiel(w, h)
    const sommet = Math.min(...colonnes(w).map((x) => cretePx(x, w, h, echelle, decalage)))
    expect(sommet - HAUTEUR_FRISE).toBeGreaterThanOrEqual(CIEL_SOMMET - 0.5)
  }
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `npx vitest run src/scene/__tests__/layout.test.ts`
Expected: FAIL — `cadrageCiel` n'existe pas.

- [ ] **Step 3: Implémenter `cadrageCiel`**

Décaler d'abord, au plus du jeu de couverture (`-offsetY` de `fitStage`, nul quand la fenêtre est pilotée par sa hauteur) et au plus de ce que `PLANCHER_REFLET` autorise. Si `CIEL_SOMMET` n'est pas atteint, **résoudre l'échelle** : la plus grande dans `[min, ECHELLE_MONTAGNES]` qui tienne la cible. La résolution doit être déterministe et assez fine pour que le test de continuité passe.

- [ ] **Step 4: Lancer les tests pour les voir passer**

Run: `npx vitest run src/scene/__tests__/layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/layout.ts src/scene/__tests__/layout.test.ts
git commit -m "feat(ciel): dégager le sommet par règle, sans seuil de format"
```

---

### Task 5: le tirage dans l'espace déformé

**Files:**
- Modify: `src/scene/stars.ts`
- Test: `src/scene/__tests__/stars.test.ts`

**Interfaces:**
- Consomme : `regionCiel` (tâche 3).
- Produit : `tirerPlace(prises, alea, tirages, viewportW, viewportH, echelle, decalage)` — le quatrième argument `rapport` disparaît, remplacé par le cadrage, et les distances se mesurent en pixels d'écran.

- [ ] **Step 1: Écrire le test qui échoue**

`stars.test.ts` fournit déjà un `alea` déterministe ; le réutiliser.

```ts
test('les places ne s’entassent pas sous le sommet', () => {
  // La hauteur libre varie avec x : une distance mesurée en espace normalisé
  // ne veut plus dire « loin à l'écran ». Sous le sommet, où elle vaut 60 px,
  // l'ancien tirage posait des étoiles à quelques pixels l'une de l'autre.
  const [W, H, E, D] = [1512, 771, 2.153, 11]
  const prises: Place[] = []
  for (let i = 0; i < 40; i++) prises.push(tirerPlace(prises, alea, 40, W, H, E, D))
  const posees = prises.map((p) => projeter(p, W, H, E, D))
  let minimum = Infinity
  for (let i = 0; i < posees.length; i++)
    for (let j = i + 1; j < posees.length; j++)
      minimum = Math.min(minimum, Math.hypot(posees[i].px - posees[j].px, posees[i].py - posees[j].py))
  // Deux cibles de survol (14 px) ne doivent pas se recouvrir.
  expect(minimum).toBeGreaterThan(28)
})
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run: `npx vitest run src/scene/__tests__/stars.test.ts`
Expected: FAIL — des paires trop proches sous le sommet.

- [ ] **Step 3: Implémenter**

`tirerPlace` projette chaque candidat avant de mesurer, au lieu de pondérer `x` par un rapport constant. Le quatrième argument `rapport` disparaît ; son site d'appel est `GareLaHaut.vue`.

- [ ] **Step 4: Lancer le test pour le voir passer**

Run: `npx vitest run src/scene/__tests__/stars.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/stars.ts src/scene/__tests__/stars.test.ts
git commit -m "feat(ciel): tirer les places à l'écran, pas dans le carré normalisé"
```

---

### Task 6: le câblage de la scène

**Files:**
- Modify: `src/scene/Scene.ts`, `src/scene/Relief.ts`, `src/scene/Sky.ts`, `src/scene/StarLayer.ts`, `src/scene/Dissolve.ts`
- Modify: `src/components/gares/GareLaHaut.vue`
- Test: les suites existantes de ces modules

**Interfaces:**
- Consomme : `cadrageCiel` (tâche 4), `regionCiel` / `projeter` (tâche 3), `tirerPlace` (tâche 5).

- [ ] **Step 1: Écrire le test qui échoue**

```ts
test('le grain monte là où l’étoile s’allumera vraiment', () => {
  // `Dissolve` et `StarLayer` doivent lire la même région : sinon la traînée
  // vise une place que l'étoile n'occupera pas. On compare les deux chemins
  // de projection sur la même place et le même cadrage.
  const place = { x: 0.46, y: 0.3 }
  const { decalage, echelle } = cadrageCiel(1512, 771)
  expect(cibleDuGrain(place, 1512, 771)).toEqual(projeter(place, 1512, 771, echelle, decalage))
})
```

`cibleDuGrain` est le chemin que `Dissolve` emprunte aujourd'hui pour viser sa
place ; si la tâche montre qu'il n'est pas isolable, l'extraire est le
changement minimal qui rend l'égalité vérifiable.

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run: `npx vitest run src/scene/__tests__ src/components/__tests__`
Expected: FAIL — les deux projections divergent.

- [ ] **Step 3: Câbler**

`Scene` appelle `cadrageCiel` au cadrage et au redimensionnement, passe le décalage à `fitStage` et l'échelle à `Relief`. `Sky` reçoit la même région que `StarLayer` et n'y dessine sa poussière que dedans. `Dissolve`, `StarLayer` et `GareLaHaut` prennent la nouvelle signature de `projeter` / `tirerPlace`. **Ne pas recharger le massif à chaque changement d'échelle** : seule l'ouverture de la caméra change.

- [ ] **Step 4: Lancer toute la suite**

Run: `npx vitest run && npx vue-tsc -b`
Expected: PASS, types sans erreur.

- [ ] **Step 5: Regarder dans l'appli**

`npm run dev`, émulateurs et seed en place. Vérifier, dans cet ordre :
- aucune étoile ni poussière **dans** la montagne, à aucun moment de sa rotation ;
- redimensionner lentement en hauteur : le massif change de taille sans sauter ni clignoter ;
- une fenêtre large et basse : le massif rapetisse, les rails restent visibles ;
- laisser une trace : le grain monte à la place où l'étoile s'allume.

- [ ] **Step 6: Commit**

```bash
git add src/scene src/components
git commit -m "feat(ciel): brancher la région libre sur la scène entière"
```
