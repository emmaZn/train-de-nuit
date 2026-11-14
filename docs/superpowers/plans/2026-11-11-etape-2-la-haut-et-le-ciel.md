# Train de nuit — Étape 2 « là-haut + le ciel » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On écrit une phrase dans la gare « là-haut », elle se défait en grains sous nos yeux, un grain monte et s'allume en étoile dans un ciel qui porte au plus 120 étoiles — enregistrée chez Firebase, visible des autres une fois approuvée.

**Architecture:** Firestore est lu une seule fois au chargement, par une requête bornée (`approuvee == true`, `creeLe` décroissant, `limit(N)`) qui est aussi ce qui plafonne le ciel. Les traces descendent dans la scène par `setStars()` ; la scène ne connaît ni Vue ni Firebase. L'envoi est une poignée : la dissolution part dès la touche Entrée, et l'étoile ne se pose qu'au succès de l'écriture (`land`) ou se défait à l'échec (`revert`). Tout se construit sur l'émulateur Firestore local, avec un projet `demo-…` qui rend la production inatteignable par construction.

**Tech Stack:** l'existant — Vue 3, Vite, TypeScript, Pinia, Vue Router 5, GSAP 3, PixiJS 8, Three, Vitest 5 — plus `firebase` (SDK web v12+), `firebase-tools` et `@firebase/rules-unit-testing` en devDependencies, aux versions que `npm install` pose le jour de l'exécution. Java 21 ou plus, épinglé par mise.

**Spec:** `docs/superpowers/specs/2026-11-11-etape-2-la-haut-et-le-ciel-design.md`, qui prolonge `docs/CONCEPT.md` §4.3, §5, §10, §11. En cas de contradiction, le cadrage gagne.

## Global Constraints

- Textes d'interface en **français** ; code, noms de fichiers, symboles et commentaires techniques en **anglais** (§11 du concept).
- **Jamais `git add -A`, `git add .` ni `git commit -a`.** `src/scene/palette.ts` porte une modification non commitée d'Emmanuelle qui ne fait pas partie de cette étape. Chaque commit liste ses chemins explicitement.
- `src/scene/**` n'importe **ni Vue, ni Pinia, ni Vue Router, ni `firebase`**. Le test de pureté existe (`src/scene/__tests__/purity.test.ts`) et la tâche 5 l'étend à Firebase.
- Schéma d'une trace, exactement : `phrase` (1 à 80), `prenom?` (0 à 24), `creeLe` (serverTimestamp), `approuvee` (false à la création), `x` et `y` (nombres, 0 à 1).
- `x` est normalisé sur la **largeur de la fenêtre** ; `y` sur la **bande de ciel** — 0 juste sous la frise, 1 à mi-hauteur de la fenêtre. Jamais sur la fenêtre entière.
- Hauteur de la frise : **116 px** (`--haut-voie` 64 + 52), bande fixe en haut de l'écran.
- Limite du ciel : **120** au-dessus de `SEUIL_MOBILE` (720 px, déjà dans `layout.ts`), **50** au-dessous. Fixée au chargement.
- Éclat, copié du §5 : `Math.max(0.16, Math.exp(-ageJours / 18))`. Halo seulement si `eclat > 0.55`. Amplitude du scintillement : `0.12 + 0.35 * eclat`.
- Place d'une nouvelle étoile : la plus éloignée des autres parmi **40 tirages**, dans la bande de ciel.
- Animation d'envoi : **3,5 s** au total (cadrage §6.3 : 3,5 à 4 s). Délai maximal d'écriture : **10 s**.
- Mouvement réduit (`prefers-reduced-motion`) : pas de dissolution — l'étoile apparaît —, pas de scintillement.
- Identifiant de projet émulateur : `demo-train-de-nuit`. Aucune commande ne touche un projet Firebase réel dans ce plan.
- Versions : celles que `npm install` pose le jour de l'exécution, relevées dans le README une fois installées.

## Review Focus

Les cinq comportements que le cadrage implique mais qu'aucune tâche n'exerce spontanément. Chaque ligne est épinglée par un test dans la tâche indiquée.

1. **Entrée pressée deux fois, ou pendant l'animation** : une seule trace part, un seul document est écrit, une seule étoile se pose. Le second appui ne doit ni relancer la dissolution, ni créer un doublon. → Tâche 7.
2. **Réseau coupé ou lent** : les quatre chemins doivent tenir — succès, échec immédiat, délai dépassé puis succès tardif, délai dépassé sans suite. Dans aucun des quatre une étoile ne s'allume pour une trace non enregistrée, et dans aucun des quatre la phrase n'est perdue. → Tâche 7.
3. **80 caractères avec accents, apostrophes typographiques et emoji** : le compteur du formulaire et la règle Firestore doivent compter pareil, sinon une phrase affichée « 80 / 80 » est refusée par la base. Une phrase faite d'espaces est refusée des deux côtés. → Tâche 1 (règles) et Tâche 7 (compteur).
4. **`localStorage` absent ou corrompu** (navigation privée, JSON invalide, entrée sans `x`/`y`) : la lecture rend une liste vide sans lever, et le ciel se charge quand même. → Tâche 4.
5. **Téléphone en paysage** (390 × 844 tourné, soit 844 × 390) : la frise occupe 30 % de la hauteur ; aucune étoile ne doit tomber sous elle, et la bulle de survol se retourne quand elle sortirait de l'écran. → Tâche 5 (bande) et Tâche 8 (bulle).

---

## Structure des fichiers

```
mise.toml                       + java = "temurin-21"
firebase.json                   émulateurs Firestore + interface
.firebaserc                     projet demo-train-de-nuit
firestore.rules                 les règles de `traces`
firestore.indexes.json          l'index composite approuvee ASC + creeLe DESC
vitest.rules.config.ts          seconde suite, environnement node
tools/
  seed_traces.mjs               ~200 traces approuvées dans l'émulateur
src/
  firebase.ts                   init, bascule émulateur, App Check dormant
  scene/
    stars.ts                    éclat, halo, scintillement, tirage de place,
                                projection sur la bande, test d'impact
    dates.ts                    âge relatif en français
    StarLayer.ts                la couche Pixi des étoiles-voyageuses (classe `Stars`)
    Dissolve.ts                 phrase → grains → le grain qui monte → l'étoile
    layout.ts                   + HAUT_VOIE, HAUTEUR_FRISE, bandeCiel()
  stores/
    traces.ts                   la requête, la limite, l'écriture
    traces-locales.ts           ses propres étoiles, stockage à repli silencieux
  components/
    StarTooltip.vue             la phrase au survol
    EtoilesListe.vue            la liste masquée visuellement, pour le clavier
    gares/GareLaHaut.vue        le formulaire « Laisser une trace ? »
  rules/__tests__/              tests des règles, contre l'émulateur
```

---

### Task 1: Émulateur, règles et index

**Files:**
- Modify: `mise.toml`, `package.json`, `vite.config.ts`, `.gitignore`
- Create: `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `vitest.rules.config.ts`, `tools/seed_traces.mjs`
- Test: `src/rules/__tests__/traces.rules.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: un émulateur Firestore sur le projet `demo-train-de-nuit`, `npm run emulators`, `npm run test:rules`, `npm run seed`.

- [ ] **Step 1: Épingler Java et poser l'outillage**

Ajouter `java = "temurin-21"` dans `[tools]` de `mise.toml`, avec un commentaire disant pourquoi : la CLI Firebase v15 a retiré le support des Java antérieurs à 21, et l'émulateur Firestore est un programme Java. Puis `mise install`, et `npm install --save firebase`, `npm install --save-dev firebase-tools @firebase/rules-unit-testing`.

Run: `java -version`
Expected: une version **21.x ou plus**. Rien du reste de ce plan ne tourne sans elle.

Ajouter `*-debug.log` à `.gitignore` : `firebase-tools` écrit `firestore-debug.log` à la racine à chaque lancement.

- [ ] **Step 2: Écrire la configuration de l'émulateur**

`.firebaserc` pointe sur `demo-train-de-nuit`. `firebase.json` déclare l'émulateur `firestore` (port 8080), l'`ui` (port 4000), et les chemins `firestore.rules` / `firestore.indexes.json`. `firestore.indexes.json` contient **un** index composite sur la collection `traces` : `approuvee` ASC puis `creeLe` DESC — c'est exactement la requête du ciel, et l'émulateur ne l'exigera pas alors que la production, si.

- [ ] **Step 3: Écrire les tests de règles (ils échouent)**

`src/rules/__tests__/traces.rules.test.ts`, avec `@firebase/rules-unit-testing` et `initializeTestEnvironment({ projectId: 'demo-train-de-nuit' })`. Les cas, un test chacun :

```ts
test('une trace non approuvée est illisible')
test('une trace approuvée est lisible')
test('création acceptée : phrase de 80 caractères, prenom absent, approuvee false, x et y dans 0..1')
test('création refusée : phrase vide')
test('création refusée : phrase de 81 caractères')
test('création refusée : prenom de 25 caractères')
test('création refusée : approuvee true')
test('création refusée : creeLe fourni à la main au lieu de request.time')
test('création refusée : x hors de 0..1')
test('création refusée : y absent')
test('création refusée : un champ inconnu en plus')
// Review Focus #3 — le compteur du formulaire comptera pareil (Tâche 7)
test('création acceptée : 80 caractères comptés en points de code, accents, ’ et emoji compris')
test('création refusée : une phrase faite uniquement d’espaces')
test('mise à jour et suppression toujours refusées')
```

- [ ] **Step 4: Sortir les tests de règles de la suite principale**

`vite.config.ts` inclut `src/**/*.test.ts` : sans rien faire, les tests de règles tourneraient aussi sous `npm run test:run`, en jsdom et sans émulateur, et échoueraient à chaque étape de chaque tâche suivante. Ajouter `exclude: [...configDefaults.exclude, 'src/rules/**']` dans le bloc `test` de `vite.config.ts`.

Run: `npm run test:run`
Expected: toujours **225 tests passés**, inchangé.

- [ ] **Step 5: Lancer les tests de règles, vérifier qu'ils échouent**

Créer `vitest.rules.config.ts` (environnement `node`, `include: ['src/rules/**/*.test.ts']`) et les scripts `package.json` :
`"emulators": "firebase emulators:start"`,
`"test:rules": "firebase emulators:exec --only firestore \"vitest run --config vitest.rules.config.ts\""`.
Run: `npm run test:rules`
Expected: FAIL — aucune règle n'existe encore, tout passe ou tout casse selon le défaut.

- [ ] **Step 6: Écrire `firestore.rules`**

Partir des règles du §10 du concept, en ajoutant ce que les tests exigent : `keys().hasOnly(['phrase','prenom','creeLe','approuvee','x','y'])`, `prenom is string`, `x is number && x >= 0 && x <= 1`, idem `y`, et le refus d'une phrase vide après `trim()`. Si `size()` sur une chaîne ne compte pas les points de code comme le fera le formulaire, c'est le test du Review Focus #3 qui le dira : dans ce cas, borner côté règles sur la valeur qui **laisse passer** 80 points de code et laisser le compteur faire foi côté client — une phrase refusée après coup est le seul résultat inacceptable.

- [ ] **Step 7: Lancer les tests de règles, vérifier qu'ils passent**

Run: `npm run test:rules`
Expected: PASS, tous.

- [ ] **Step 8: Écrire le script de semis**

Le semis doit **contourner les règles** : elles refusent `approuvee: true` à la création et interdisent d'antidater `creeLe`. Il passe donc par `initializeTestEnvironment(...).withSecurityRulesDisabled(...)` de `@firebase/rules-unit-testing`, déjà en devDependency. `tools/seed_traces.mjs` écrit **200** traces `approuvee: true` dans l'émulateur, phrases courtes variées, `prenom` présent une fois sur trois, `creeLe` étalé de « il y a une heure » à « il y a trois ans », `x` et `y` tirés dans 0..1. Script `"seed": "node tools/seed_traces.mjs"`. Sans lui, personne ne peut juger « 120 étoiles » à l'œil, qui est le réglage qu'Emmanuelle a demandé à voir tourner.

- [ ] **Step 9: Commit**

```bash
git add mise.toml package.json package-lock.json vite.config.ts .gitignore firebase.json .firebaserc firestore.rules firestore.indexes.json vitest.rules.config.ts tools/seed_traces.mjs src/rules
git commit -m "feat(firebase): run the sky on a local emulator, with rules and an index"
```

---

### Task 2: `src/firebase.ts`

**Files:**
- Create: `src/firebase.ts`
- Test: `src/__tests__/firebase.test.ts`

**Interfaces:**
- Consumes: la tâche 1 (projet `demo-train-de-nuit`, port 8080).
- Produces: `db: Firestore`, `nouvelId(): string`, `surEmulateur(): boolean`.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
test('surEmulateur est vrai quand aucune clé de projet réel n’est fournie')
test('nouvelId rend deux identifiants différents sans toucher au réseau')
test('App Check ne s’initialise pas quand on est sur l’émulateur')
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/__tests__/firebase.test.ts`
Expected: FAIL — `src/firebase.ts` n'existe pas.

- [ ] **Step 3: Implémenter `src/firebase.ts`**

Lit la configuration dans `import.meta.env` (`VITE_FIREBASE_*`) et retombe sur `{ projectId: 'demo-train-de-nuit' }` quand elles manquent. `connectFirestoreEmulator` n'est appelé qu'alors, **une seule fois** — le rechargement à chaud de Vite réexécute le module, une seconde connexion lève. `nouvelId()` rend `doc(collection(db, 'traces')).id` : l'identifiant existe avant l'écriture, ce dont la tâche 4 a besoin pour que renvoyer après un délai réutilise le même document au lieu d'en créer un second. App Check s'initialise avec `ReCaptchaV3Provider` **seulement** si `VITE_RECAPTCHA_KEY` est présente et qu'on n'est pas sur l'émulateur.

- [ ] **Step 4: Lancer, vérifier que ça passe**

Run: `npx vitest run src/__tests__/firebase.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/firebase.ts src/__tests__/firebase.test.ts
git commit -m "feat(firebase): initialise the client, emulator first and App Check dormant"
```

---

### Task 3: `stars.ts` et `dates.ts` — tout le calcul du ciel, sans pixels

**Files:**
- Create: `src/scene/stars.ts`, `src/scene/dates.ts`
- Modify: `src/scene/layout.ts`, `src/scene/types.ts`
- Test: `src/scene/__tests__/stars.test.ts`, `src/scene/__tests__/dates.test.ts`, `src/scene/__tests__/layout.test.ts`

**Interfaces:**
- Consumes: `SEUIL_MOBILE` de `layout.ts`.
- Produces:

```ts
// layout.ts
export const HAUT_VOIE = 64
export const HAUTEUR_FRISE = 116
export function bandeCiel(viewportH: number): { top: number; height: number }

// types.ts — Trace gagne x et y
export type Trace = { id: string; phrase: string; prenom?: string; creeLe: number; x: number; y: number }

// stars.ts
export const ETOILES_MAX_BUREAU = 120
export const ETOILES_MAX_MOBILE = 50
export type Place = { x: number; y: number }
export type EtoilePosee = { trace: Trace; px: number; py: number }
export function limiteEtoiles(viewportW: number): number
export function eclat(ageJours: number): number
export function aHalo(e: number): boolean
export function amplitudeScintillement(e: number): number
export function projeter(place: Place, viewportW: number, viewportH: number): { px: number; py: number }
export function tirerPlace(prises: Place[], alea: () => number, tirages?: number): Place
export function etoileSous(px: number, py: number, posees: EtoilePosee[], rayon: number): Trace | null

// dates.ts
export function ageRelatif(creeLe: number, maintenant: number): string
```

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
// stars.test.ts
test('limiteEtoiles rend 50 au-dessous de SEUIL_MOBILE et 120 au-dessus')
test('eclat(0) vaut 1 et décroît avec l’âge')
test('eclat ne descend jamais sous 0.16, même à dix ans')
test('aHalo est vrai au-dessus de 0.55 et faux en dessous')
test('amplitudeScintillement vaut 0.12 à éclat nul et 0.47 à éclat plein')
// Review Focus #5 — téléphone en paysage
test.each([[1440, 900], [844, 390], [390, 844]])(
  'projeter ne pose jamais une étoile sous la frise (%i x %i)', ...)
test('projeter rend la même place relative quelle que soit la fenêtre')
test('tirerPlace tombe dans la bande 0..1 sur les deux axes')
test('tirerPlace s’éloigne des places déjà prises')
test('tirerPlace est déterministe à alea égal')
test('etoileSous rend l’étoile la plus proche dans le rayon')
test('etoileSous rend null quand rien n’est dans le rayon')
test('etoileSous rend null sur une liste vide')

// dates.test.ts
test.each([
  [30_000, 'à l’instant'],
  [3 * 3600_000, 'aujourd’hui'],
])('ageRelatif %i ms rend %s', ...)
test('ageRelatif rend « hier » pour la veille au calendrier, pas pour 24 h pile')
test('ageRelatif rend « il y a 3 jours », « il y a 2 mois »')
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/scene/__tests__/stars.test.ts src/scene/__tests__/dates.test.ts`
Expected: FAIL — modules introuvables.

- [ ] **Step 3: Implémenter `layout.ts`, `stars.ts` et `dates.ts`**

Les formules du §5 sont copiées telles quelles dans les constantes globales ci-dessus. Deux points que les signatures ne déterminent pas :

`bandeCiel` et `projeter` — la bande va du bas de la frise à la mi-hauteur de la fenêtre, et `y = 0` est son haut :

```ts
export function bandeCiel(viewportH: number) {
  const top = HAUTEUR_FRISE
  return { top, height: Math.max(viewportH / 2 - top, 1) }
}
// projeter : px = place.x * viewportW ; py = top + place.y * height
```

`ageRelatif` compare des **jours calendaires locaux** (minuit à minuit), pas des tranches de 24 h : « hier » doit dire hier.

- [ ] **Step 4: Lancer, vérifier que ça passe**

Run: `npx vitest run src/scene/__tests__/stars.test.ts src/scene/__tests__/dates.test.ts`
Expected: PASS

- [ ] **Step 5: Épingler la hauteur de la frise à une seule source**

Les 116 px vivent en deux morceaux : `--haut-voie: 64px` dans `src/styles/base.css`, et le `+ 52px` dans `src/components/NavFrise.vue`. Ajouter dans `src/scene/__tests__/layout.test.ts` un test qui lit **les deux fichiers**, en extrait les deux nombres et vérifie que leur somme vaut `HAUTEUR_FRISE`. N'en épingler qu'un ne garantirait rien : des nombres qui divergeraient en silence poseraient des étoiles sous la frise.

- [ ] **Step 6: Commit**

```bash
git add src/scene/stars.ts src/scene/dates.ts src/scene/layout.ts src/scene/types.ts src/scene/__tests__/stars.test.ts src/scene/__tests__/dates.test.ts src/scene/__tests__/layout.test.ts
git commit -m "feat(sky): brightness, placement and the band the stars live in"
```

---

### Task 4: Le store des traces

**Files:**
- Create: `src/stores/traces.ts`, `src/stores/traces-locales.ts`
- Test: `src/stores/__tests__/traces.test.ts`, `src/stores/__tests__/traces-locales.test.ts`

**Interfaces:**
- Consumes: `db`, `nouvelId()` (tâche 2) ; `Trace`, `Place`, `limiteEtoiles` (tâche 3).
- Produces:

```ts
export type Brouillon = { phrase: string; prenom?: string; x: number; y: number }
export type Envoi = { trace: Trace; promesse: Promise<void> }
export const useTraces = defineStore('traces', ...)
// état :   etoiles: Trace[]
// actions : charger(viewportW: number): Promise<void>
//           ecrire(b: Brouillon): Envoi
//           confirmer(t: Trace): void
// traces-locales.ts
export function loadMiennes(): Trace[]
export function saveMienne(t: Trace): void
```

- [ ] **Step 1: Écrire les tests qui échouent**

Firestore est mocké (`vi.mock('@/firebase')`) : cette suite ne touche pas l'émulateur.

```ts
// traces-locales.test.ts — Review Focus #4
test('loadMiennes rend [] quand localStorage est absent')
test('loadMiennes rend [] sur un JSON invalide, sans lever')
test('loadMiennes ignore une entrée sans x ou sans y')
test('saveMienne ne lève pas quand le quota est dépassé')
test('saveMienne puis loadMiennes rend la trace, x et y compris')

// traces.test.ts
test('charger demande 120 sur grand écran et 50 sur téléphone')
test('charger trie par date décroissante et n’en garde pas plus que la limite')
test('charger fusionne ses propres étoiles locales et dédoublonne par id')
test('charger rend une liste vide, sans lever, quand la requête échoue')
test('ecrire rend tout de suite une trace avec un id, avant que l’écriture aboutisse')
test('ecrire pose approuvee: false et creeLe en serverTimestamp')
test('confirmer ajoute l’étoile à la liste et au stockage local')
test('une étoile non confirmée n’est jamais écrite dans le stockage local')
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/stores/__tests__/`
Expected: FAIL — modules introuvables.

- [ ] **Step 3: Implémenter les deux modules**

`traces-locales.ts` suit exactement le motif de `src/scene/palette.ts` : chaque lecture et chaque écriture dans un `try` qui se tait. `ecrire` utilise `nouvelId()` puis `setDoc` — et non `addDoc` — pour que l'identifiant existe avant le réseau : un renvoi après délai réécrit alors **le même** document, et la règle `update: false` empêche le doublon. `charger` lit une fois, sans `onSnapshot`.

- [ ] **Step 4: Lancer, vérifier que ça passe**

Run: `npx vitest run src/stores/__tests__/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/traces.ts src/stores/traces-locales.ts src/stores/__tests__
git commit -m "feat(sky): read the sky once, bounded, and keep your own star at hand"
```

---

### Task 5: La couche des étoiles dans la scène

**Files:**
- Create: `src/scene/StarLayer.ts`
- Modify: `src/scene/Scene.ts`, `src/scene/__tests__/purity.test.ts`
- Test: `src/scene/__tests__/StarLayer.test.ts`

**Interfaces:**
- Consumes: `stars.ts` (tâche 3).
- Produces:

```ts
export class Stars {
  constructor(parent: Container, opts: { reducedMotion: boolean })
  setStars(traces: Trace[], viewportW: number, viewportH: number): void
  resize(viewportW: number, viewportH: number): void
  /** Rend la trace sous le pointeur, ou null. N'émet rien : la scène décide. */
  hit(px: number, py: number): Trace | null
  update(dt: number, maintenant: number): void
  /** Éteint une étoile en fondu. Appelé par `setStars` lui-même quand une
   *  nouvelle arrivée pousse la plus ancienne hors de la limite. */
  fadeOut(id: string): void
  destroy(): void
}
// Scene gagne :
setStars(traces: Trace[]): void
setPointerPx(px: number, py: number): void   // émet starHover
```

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
test('setStars pose chaque trace à la place que projeter donne')
test('resize reprojette sans changer la place relative')
test('hit rend la trace sous le pointeur et null ailleurs')
test('setStars au-delà de la limite ne garde que les plus récentes')
test('une arrivée au-delà de la limite éteint la plus ancienne en fondu')
test('setStars est idempotent par id : une étoile déjà posée n’est ni redessinée ni réanimée')
test('fadeOut retire l’étoile de la cible des survols')
test('en mouvement réduit, update ne fait pas scintiller')
// purity.test.ts
test('src/scene n’importe pas firebase')
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/scene/__tests__/StarLayer.test.ts src/scene/__tests__/purity.test.ts`
Expected: FAIL

- [ ] **Step 3: Implémenter `StarLayer.ts` et brancher la scène**

La couche vit **en coordonnées d'écran**, pas dans le conteneur `monde` que `fitStage` cadre en « cover » : c'est la décision du cadrage (§5), sans quoi les trois quarts des étoiles sortiraient du champ sur un téléphone. Elle n'a **pas** la parallaxe de la poussière : une étoile qu'on vise doit rester où le test d'impact la croit. `fadeOut` sert à la sortie de limite du cadrage §6.4. `setStars` est **idempotent par `id`** : il sera rappelé chaque fois que le store change, et une étoile déjà posée par `land()` ne doit pas se rallumer une seconde fois. `Scene.setPointerPx` appelle `hit` et émet `starHover` — déjà déclaré dans `events.ts`.

- [ ] **Step 4: Lancer, vérifier que ça passe**

Run: `npx vitest run src/scene/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scene/StarLayer.ts src/scene/Scene.ts src/scene/__tests__/StarLayer.test.ts src/scene/__tests__/purity.test.ts
git commit -m "feat(sky): draw the travellers' stars in screen space"
```

---

### Task 6: La dissolution

**Files:**
- Create: `src/scene/Dissolve.ts`
- Modify: `src/scene/Scene.ts`
- Test: `src/scene/__tests__/Dissolve.test.ts`

**Interfaces:**
- Consumes: `Stars` (tâche 5), `Place` (tâche 3).
- Produces:

```ts
export type Grain = { x: number; y: number; a: number }
/** Fonction pure : un tampon alpha devient des grains. Testable sans canvas. */
export function grainsDepuisAlpha(alpha: Uint8ClampedArray, w: number, h: number, pas: number, seuil: number): Grain[]
export type Poignee = {
  /** L’écriture a abouti : le grain monte, l’étoile s’allume. */
  land(trace: Trace): Promise<void>
  /** L’écriture a échoué : les grains se reforment en phrase. */
  revert(): Promise<void>
}
// Scene gagne :
beginDissolve(phrase: string, from: DOMRect, place: Place): Poignee
```

- [ ] **Step 1: Écrire les tests qui échouent**

`setup.ts` fait rendre `null` à `getContext` : seule la partie pure est testée, la rastérisation ne l'est pas.

```ts
test('grainsDepuisAlpha ne rend que les pixels au-dessus du seuil')
test('grainsDepuisAlpha échantillonne selon le pas et rend l’alpha en 0..1')
test('grainsDepuisAlpha rend [] sur un tampon vide')
test('land puis revert : le second est ignoré, la poignée ne joue qu’une fin')
test('revert avant la fin de la dissolution attend qu’elle soit finie')
test('en mouvement réduit, land pose l’étoile sans animer')
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/scene/__tests__/Dissolve.test.ts`
Expected: FAIL

- [ ] **Step 3: Implémenter `Dissolve.ts`**

Les cinq temps du §4.3 en une timeline GSAP de **3,5 s** : la phrase se défait de gauche à droite, les grains se resserrent vers le centre en s'éteignant, un seul grain monte en courbe (~2,5 s de la durée totale), l'étoile s'allume d'un halo qui grossit puis se pose. La rastérisation dessine la phrase dans un canvas hors écran avec la police et la taille du formulaire, attend `document.fonts.ready`, et passe son tampon alpha à `grainsDepuisAlpha`. **Un état d'attente est obligatoire** : si l'écriture est plus lente que la dissolution, les grains convergés patientent jusqu'à `land` ou `revert`.

- [ ] **Step 4: Lancer, vérifier que ça passe**

Run: `npx vitest run src/scene/__tests__/Dissolve.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scene/Dissolve.ts src/scene/Scene.ts src/scene/__tests__/Dissolve.test.ts
git commit -m "feat(sky): undo a sentence into grains and send one up as a star"
```

---

### Task 7: Le formulaire de « là-haut »

**Files:**
- Modify: `src/components/gares/GareLaHaut.vue`, `src/composables/useScene.ts` (la clé `SCENE_KEY`), `src/App.vue` (le `provide`)
- Test: `src/components/__tests__/GareLaHaut.test.ts`

**Interfaces:**
- Consumes: `useTraces` (tâche 4), `tirerPlace` (tâche 3), `beginDissolve` (tâche 6).
- Produces: le pont par lequel un composant atteint la scène, à figer ici et à réutiliser tel quel :

```ts
// src/composables/useScene.ts
export const SCENE_KEY: InjectionKey<Ref<Scene | null>> = Symbol('scene')
```

`App.vue` fait le `provide`, `GareLaHaut.vue` l'`inject`, et le test injecte une fausse scène dont `beginDissolve` est espionné. Sans cette clé, deux exécutants inventeraient deux mécanismes.

**Copie exacte, du §4.3 — à ne pas réécrire :** titre `Laisser une trace ?` (Inter Light 17 px) ; placeholder `une phrase, un mot, une pensée…` ; placeholder du prénom `un prénom, si vous voulez` ; ligne méta en mono 10,5 px, compteur `0 / 80` à gauche, `laisser ↵` à droite.

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
test('le formulaire porte les libellés et placeholders exacts du §4.3')
test('le compteur affiche 0 / 80 au départ')
// Review Focus #3
test('le compteur compte en points de code : un emoji compte pour 1')
test('au-delà de 80 points de code, la saisie est bornée et laisser ↵ refuse')
test('une phrase faite d’espaces n’est pas envoyable')
// Review Focus #1
test('Entrée pressée deux fois n’écrit qu’une seule trace')
test('Entrée pendant l’animation ne relance pas la dissolution')
// Review Focus #2 — les quatre chemins
test('succès : la dissolution part avant la réponse, puis l’étoile se pose et le champ se vide')
test('échec : les grains se reforment, le champ garde le texte, une ligne mono s’affiche')
test('délai dépassé : la ligne dit « on n’a pas pu confirmer », le texte reste dans le champ')
test('succès tardif après le délai : l’étoile se pose, le champ se vide, rien n’est écrit deux fois')
test('après le délai, un second Entrée n’écrit aucun second document')
test('aucun des quatre chemins n’écrit dans le stockage local sans confirmation')
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/components/__tests__/GareLaHaut.test.ts`
Expected: FAIL — la gare est une coquille vide.

- [ ] **Step 3: Implémenter le formulaire**

Le déroulé du §9 du cadrage, dans cet ordre : Entrée → `tirerPlace` → `ecrire` (l'identifiant existe immédiatement) → `beginDissolve` sans attendre → `land` au succès, `revert` à l'échec ou au délai de **10 s**. Un verrou d'envoi empêche le second appui. **Tant qu'un `Envoi` n'est pas réglé, Entrée se rattache à sa promesse au lieu d'appeler `ecrire`** : sans cela, un renvoi après « on n'a pas pu confirmer » tirerait un nouvel identifiant et une nouvelle place, et Emmanuelle modérerait le doublon que tout ce déroulé cherche à éviter. Au succès tardif, l'étoile se pose sans dissolution — il n'y a plus de phrase à l'écran — et le champ se vide. La ligne d'erreur dit **« on n'a pas pu confirmer »**, jamais « ça n'est pas parti » : l'écriture, elle, continue.

- [ ] **Step 4: Lancer, vérifier que ça passe**

Run: `npx vitest run src/components/__tests__/GareLaHaut.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/gares/GareLaHaut.vue src/composables/useScene.ts src/App.vue src/components/__tests__/GareLaHaut.test.ts
git commit -m "feat(la-haut): the form that turns a sentence into a star"
```

---

### Task 8: Le survol, la bulle et la liste au clavier

**Files:**
- Create: `src/components/StarTooltip.vue`, `src/components/EtoilesListe.vue`
- Modify: `src/App.vue`
- Test: `src/components/__tests__/StarTooltip.test.ts`, `src/components/__tests__/EtoilesListe.test.ts`

**Interfaces:**
- Consumes: `starHover` (tâche 5), `ageRelatif` (tâche 3), `useTraces` (tâche 4).
- Produces: rien pour les autres tâches.

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
test('la bulle montre la phrase en Inter Light 14 px et la ligne mono 10 px')
test('la ligne mono joint le prénom et l’âge relatif par « · »')
test('sans prénom, la ligne mono ne montre que l’âge')
// Review Focus #5
test('près du bord droit, la bulle se retourne vers la gauche')
test('près du bord haut, la bulle passe au-dessous du point')
test('la bulle disparaît quand starHover rend null')
test('la liste masquée nomme chaque étoile récente, phrase et âge')
test('la liste est atteignable au clavier et invisible à l’écran')
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/components/__tests__/StarTooltip.test.ts src/components/__tests__/EtoilesListe.test.ts`
Expected: FAIL

- [ ] **Step 3: Implémenter les deux composants**

`EtoilesListe.vue` est la liste masquée visuellement du §11, pas un `display: none` — elle doit rester lisible par un lecteur d'écran et atteignable au clavier. `StarTooltip.vue` se retourne quand elle sortirait de l'écran, ce qui arrive tout le temps sur un téléphone.

- [ ] **Step 4: Lancer, vérifier que ça passe**

Run: `npx vitest run src/components/__tests__/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/StarTooltip.vue src/components/EtoilesListe.vue src/App.vue src/components/__tests__/StarTooltip.test.ts src/components/__tests__/EtoilesListe.test.ts
git commit -m "feat(sky): read a star's sentence, by pointer, by finger or by keyboard"
```

---

### Task 9: Le pont, l'appui au doigt, et la documentation remise d'accord

**Files:**
- Modify: `src/composables/useScene.ts`, `docs/CONCEPT.md`, `README.md`
- Test: `src/composables/__tests__/useScene.test.ts`

**Interfaces:**
- Consumes: toutes les tâches précédentes.
- Produces: le câblage complet.

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
test('useScene charge les traces au montage et les descend par setStars')
test('une étoile ajoutée au store après coup redescend par setStars')
test('pointermove transmet les coordonnées en pixels à la scène')
test('pointerdown révèle l’étoile touchée et un appui ailleurs la referme')
test('un échec de chargement laisse la scène démarrer quand même')
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/composables/__tests__/useScene.test.ts`
Expected: FAIL

- [ ] **Step 3: Câbler `useScene`**

`useScene` **surveille `traces.etoiles`** et rappelle `setStars` à chaque changement : c'est le seul chemin par lequel une étoile confirmée tardivement rejoint le ciel, la poignée étant déjà partie en `revert`. L'écouteur `pointermove` existe déjà pour la parallaxe : il transmet en plus `setPointerPx(event.clientX, event.clientY)`. `pointerdown` fait la même chose pour le doigt, et un appui qui ne touche aucune étoile referme la bulle.

- [ ] **Step 4: Lancer, vérifier que ça passe**

Run: `npx vitest run src/composables/`
Expected: PASS

- [ ] **Step 5: Remettre la documentation d'accord**

Dans `docs/CONCEPT.md`, les cinq corrections listées au §12 du cadrage : §5 (les anciennes sortent du ciel, et la place se tire une fois), §4.3 (3,5 s), §10 (`x` et `y`, règles), §11 (l'appui au doigt), §9 (le contrat de la scène : `beginDissolve` et la poignée). Dans `README.md`, la section « Où en est le projet » : l'étape 2 est faite, et comment lancer l'émulateur et semer les traces.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useScene.ts src/composables/__tests__/useScene.test.ts docs/CONCEPT.md README.md
git commit -m "feat(sky): wire the sky to Vue, and bring the concept back in line"
```

---

### Task 10: Vérification de bout en bout

**Files:** aucun, sauf correctifs.

- [ ] **Step 1: Suite complète**

Run: `npm run test:run`
Expected: PASS, et le compte de tests est supérieur aux 225 de départ.

- [ ] **Step 2: Règles**

Run: `npm run test:rules`
Expected: PASS

- [ ] **Step 3: Types et build**

Run: `npm run build`
Expected: aucune erreur `vue-tsc`.

- [ ] **Step 4: À l'œil, avec 200 traces**

`npm run emulators`, puis `npm run seed`, puis `npm run dev`. Vérifier, dans cet ordre : le ciel se remplit sans blanchir ; aucune étoile sous la frise, fenêtre réduite en paysage ; le survol montre la phrase ; une phrase envoyée se défait et monte ; l'étoile reste en place après rechargement ; la basculer en `approuvee` dans l'interface de l'émulateur la fait apparaître au rechargement suivant.

- [ ] **Step 5: Revue finale**

Un relecteur frais, contexte neuf, modèle le plus capable, sur toute la branche — comme à l'étape 1 (`docs/superpowers/journal-etape-1.md`).

- [ ] **Step 6: Commit des correctifs éventuels, chemins explicites**
