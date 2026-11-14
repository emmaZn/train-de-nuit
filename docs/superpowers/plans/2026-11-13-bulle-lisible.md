# Bulle de survol lisible — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La phrase d'une étoile survolée se lit partout — elle ne traverse plus la frise, et elle ne se perd plus dans le grain du massif.

**Architecture:** Deux changements dans un seul composant, `src/components/StarTooltip.vue`. Le premier est une correction de logique (le seuil de bascule haut/bas, testable) ; le second est purement visuel (un `::before` derrière la bulle, vérifié à l'œil dans l'appli). Rien d'autre n'est touché : ni la scène, ni la bande du ciel, ni les données.

**Tech Stack:** Vue 3 (`<script setup>` + style scoped), Vitest + `@vue/test-utils`.

**Spec:** `docs/superpowers/specs/2026-11-13-bulle-lisible-design.md`

## Global Constraints

- **Repartir du fichier commité.** `git checkout -- src/components/StarTooltip.vue` avant de commencer. Un jetable de comparaison tourne encore dessus et **ne doit pas être raboté** : ses lettres ne veulent plus dire la même chose que dans la spec (`data-tache='b'` y désigne la v1, celle qu'on garde).
- **Le noir devient la couleur du fond** (CONCEPT §6) : tout fond se prend sur `--fond`, jamais sur une couleur figée.
- **Ne pas recopier `116`** : `HAUTEUR_FRISE` s'importe de `@/scene/layout`.
- La hiérarchie du texte ne change pas : `.phrase` à `--fort`, `.mention` à `--moyen`.
- Textes d'interface en français ; code et commentaires techniques en anglais (CONCEPT §11).

## Review Focus

Ce que la spec implique et qu'il faut pointer, du plus probable au moins probable :

1. **Une étoile entre 124 et 247 px du haut** — tout le bug est là, et c'est la seule plage où l'ancien et le nouveau code diffèrent. → testé, tâche 1, étape 1.
2. **La borne haute, 248 px** — la première étoile qui doit encore basculer au-dessus. Un seuil posé un cran trop haut priverait tout le ciel de la bascule. → testé, tâche 1, étape 1.
3. **Une étoile juste sous la frise, 116–123 px** — elle donnait déjà « dessous » avant ; le changement ne doit pas la casser. → couvert par le test existant à y = 20.
4. **Une ligne méta sans prénom** (âge seul) : la bulle rétrécit et la tache doit rétrécir avec elle, puisqu'elle est posée en `inset` sur la boîte. Pas de test unitaire possible — un style scoped ne se résout pas dans jsdom. → vérification à l'œil, tâche 2.
5. **`color-mix()` absent** (Safari < 16.2, Chrome < 111) : la tache devient transparente et on retombe sur le rendu d'aujourd'hui. Dégradation acceptée, pas de repli à écrire. → noté, non testé.

Limite connue et **hors périmètre** (non-but de la spec : on ne touche pas au placement au-delà du seuil) : dans une fenêtre de moins de 248 px de haut, une bulle « dessous » peut dépasser le bas de l'écran. La bande du ciel s'arrête à mi-hauteur, donc le cas ne se produit pas ailleurs.

---

### Task 1: le seuil de bascule

**Files:**
- Modify: `src/components/StarTooltip.vue`
- Test: `src/components/__tests__/StarTooltip.test.ts`

**Interfaces:**
- Consomme : `HAUTEUR_FRISE` (= 116) depuis `@/scene/layout`.
- Produit : rien de nouveau à l'extérieur. L'attribut `data-sens` garde ses deux valeurs, `'dessus'` et `'dessous'`.

- [ ] **Step 1: Écrire les tests qui échouent**

À ajouter dans `src/components/__tests__/StarTooltip.test.ts`, dans le style des tests voisins (`fausseScene`, `monter`, `trace` y sont déjà définis) :

```ts
test('sous la frise, la bulle descend au lieu de traverser la navigation', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 300, 200)
  await wrapper.vm.$nextTick()
  const bulle = wrapper.get('[data-role="bulle"]')
  expect(bulle.attributes('data-sens')).toBe('dessous')
  expect((bulle.element as HTMLElement).style.top).toBe('214px')
})

test('assez bas, la bulle repasse au-dessus du point', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 300, 248)
  await wrapper.vm.$nextTick()
  expect(wrapper.get('[data-role="bulle"]').attributes('data-sens')).toBe('dessus')
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `npx vitest run src/components/__tests__/StarTooltip.test.ts`
Expected: le premier test ÉCHOUE (`expected 'dessus' to be 'dessous'`) ; le second PASSE déjà.

- [ ] **Step 3: Déplacer le seuil**

Dans `src/components/StarTooltip.vue` :
- importer `HAUTEUR_FRISE` depuis `@/scene/layout` ;
- ajouter `const DEGAGEMENT_FRISE = 8`, avec un commentaire disant ce qu'il laisse respirer ;
- remplacer `dessus: y - ECART - HAUTEUR_MAX >= 0` par `dessus: y - ECART - HAUTEUR_MAX >= HAUTEUR_FRISE + DEGAGEMENT_FRISE`, et remplacer le commentaire « Below the point when it would run past the top » par la raison réelle : les 116 px du haut sont la navigation, pas le ciel.

- [ ] **Step 4: Lancer les tests pour les voir passer**

Run: `npx vitest run src/components/__tests__/StarTooltip.test.ts`
Expected: PASS, 14 tests. Les deux tests de bascule existants (y = 300 et y = 20) restent verts.

- [ ] **Step 5: Commit**

```bash
git add src/components/StarTooltip.vue src/components/__tests__/StarTooltip.test.ts
git commit -m "fix(ciel): sortir la bulle de la frise, et la mesurer contre elle"
```

---

### Task 2: la tache de nuit

**Files:**
- Modify: `src/components/StarTooltip.vue` (bloc `<style scoped>` uniquement)

**Interfaces:**
- Consomme : la variable CSS `--fond`, animée par l'œil.
- Produit : rien. Aucun attribut, aucune classe nouvelle — la règle vise `.bulle` directement.

- [ ] **Step 1: Poser la tache**

Dans le `<style scoped>` de `src/components/StarTooltip.vue`, ajouter une règle `.bulle::before` : `content: ''`, `position: absolute`, `inset: -16px -28px`, `z-index: -1`, et pour fond

```css
  background: radial-gradient(
    ellipse at center,
    color-mix(in srgb, var(--fond) 94%, transparent) 0%,
    color-mix(in srgb, var(--fond) 88%, transparent) 35%,
    color-mix(in srgb, var(--fond) 78%, transparent) 62%,
    color-mix(in srgb, var(--fond) 0%, transparent) 100%
  );
```

Commenter en une phrase pourquoi le dernier arrêt va à 100 % et ce que cela coûte : `farthest-corner` place le milieu des côtés vers 71 % du rayon, la boîte y coupe un dégradé encore opaque, et cela laisse une arête sur le grain clair — arbitrage acté dans la spec, §2.

- [ ] **Step 2: Vérifier que rien n'a cassé**

Run: `npx vitest run src/components/__tests__/StarTooltip.test.ts && npx vue-tsc -b`
Expected: 14 tests PASS, types sans erreur.

- [ ] **Step 3: Regarder dans l'appli**

`npm run dev` (émulateurs et seed déjà en place). Survoler une étoile dont la bulle tombe sur le grain du massif, puis vérifier, dans cet ordre :
- la phrase **et** la ligne méta se lisent ;
- une étoile juste sous la frise écrit bien au-dessous d'elle ;
- l'œil fait le tour des trois couleurs, **`noir` compris** — c'est la seule des trois que la spec laisse non vérifiée ;
- une étoile sans prénom (ligne méta plus courte) : la tache rétrécit avec la bulle.

- [ ] **Step 4: Commit**

```bash
git add src/components/StarTooltip.vue
git commit -m "feat(ciel): poser une nuit derrière la phrase, pour qu'elle se lise sur le grain"
```
