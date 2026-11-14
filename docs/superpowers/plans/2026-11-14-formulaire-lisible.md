# Formulaire lisible — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une tache de nuit derrière le formulaire de « là-haut », pour que ses quatre textes se lisent quand il tombe sur le grain du massif.

**Architecture:** Un seul `::before` sur `.trace`, dégradé radial mélangé depuis `--fond`, posé derrière le contenu. Même recette que `.bulle::before` dans `StarTooltip.vue`, redimensionnée pour un bloc qui fait une dizaine de lignes au lieu d'une ou deux.

**Tech Stack:** CSS scopé dans le SFC Vue, `color-mix()` (Chrome 111+, Safari 16.2+), Vitest pour le garde-fou de source.

**Spec:** `docs/superpowers/specs/2026-11-14-formulaire-lisible-design.md`

## Global Constraints

- La tache se prend sur **`--fond`**, jamais sur une couleur figée : « dans tous les assets, le noir devient la couleur du fond » (CONCEPT §6). L'icône œil fait défiler les fonds ; la tache doit suivre sans retouche.
- **Pas de cadre, pas de boîte, pas de panneau** (CONCEPT §2, §4.3). La tache a une arête : dérogation déjà actée pour la bulle, reprise ici — rien de plus.
- **Ne pas toucher au texte** : ni couleur, ni graisse, ni opacité. La hiérarchie du §6 (0.95 / 0.6 / 0.42 / 0.2) tient le ton du site.
- **Ne pas toucher à la place du formulaire** : `top: 176px; right: 56px; width: 280px`, et `left/right: 16px` sous 720 px. Non-but explicite du cadrage.
- Textes d'interface en français ; code et commentaires techniques en anglais.

## Review Focus

Ce que le cadrage implique mais qu'aucun test n'exerce de lui-même.

1. **La tache vole les survols d'étoiles.** `.trace` porte `pointer-events: auto`, et un `::before` positionné fait partie de la boîte cliquable de son élément : débordant de 16 à 28 px, il capterait le pointeur au-dessus d'étoiles qui ne sont pas sous le formulaire. Le survol cesserait de marcher sur une bande tout autour. → Tâche 1.
2. **La tache ne s'efface pas avec le formulaire.** Les temps 1 et 5 du §4.3 font passer `.trace` à `opacity: 0` pendant l'envoi. Un `::before` hérite de l'opacité du parent — mais seulement s'il reste un `::before` : posé sur un frère, il resterait affiché pendant la dissolution. → Tâche 1.
3. **Une couleur figée au lieu de `--fond`.** Invisible sur le fond par défaut, criard dès qu'on fait défiler l'œil. → Tâche 1.
4. **L'arête sur téléphone.** Le bloc passe de 280 px à toute la largeur ; un `inset` réglé pour le bureau peut laisser l'arête du dégradé en plein milieu de l'écran. → épreuve à l'œil, étape 4.
5. **Le mouvement réduit.** `.trace` a déjà sa règle `prefers-reduced-motion` ; la tache ne doit introduire aucune animation propre. → Tâche 1.

---

## Structure des fichiers

```
src/components/gares/GareLaHaut.vue          la tache, dans le <style scoped>
src/components/__tests__/GareLaHaut.test.ts  le garde-fou de source
```

---

### Task 1: La tache de nuit

**Files:**
- Modify: `src/components/gares/GareLaHaut.vue` (bloc `<style scoped>`)
- Test: `src/components/__tests__/GareLaHaut.test.ts`

**Interfaces:**
- Consomme : `--fond`, posée sur `:root` par `useScene`.
- Produit : rien pour d'autres tâches.

- [ ] **Step 1: Écrire le test qui échoue**

Vitest ne charge pas le CSS scopé d'un SFC : le test lit la source avec `?raw`, comme le fait déjà le test de la police. Il ne prouve pas le rendu — il épingle trois invariants que le cadrage fixe et qu'une retouche pourrait défaire en silence.

```ts
test('la tache de nuit suit le fond, reste derrière, et ne vole pas le pointeur', () => {
  const bloc = /\.trace::before\s*\{([^}]*)\}/.exec(source)?.[1] ?? ''
  expect(bloc).toMatch(/var\(--fond\)/)       // §6 : jamais une couleur figée
  expect(bloc).not.toMatch(/#[0-9a-f]{3,6}/i) // ni en dur, même en secours
  expect(bloc).toMatch(/z-index:\s*-1/)       // derrière le texte
  expect(bloc).toMatch(/pointer-events:\s*none/) // Review Focus #1
  expect(bloc).not.toMatch(/animation|transition/) // Review Focus #5
})
```

Le nom du sélecteur porte à lui seul le Review Focus #2 : si la tache passait
d'un `::before` à un frère, elle cesserait d'hériter de l'opacité du formulaire
— et le bloc extrait ici serait vide, donc le test tomberait.

```ts
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/components/__tests__/GareLaHaut.test.ts -t 'tache de nuit'`
Expected: FAIL — `.trace::before` n'existe pas, le bloc extrait est vide.

- [ ] **Step 3: Poser `.trace::before`**

Partir de `.bulle::before` dans `src/components/StarTooltip.vue` : dégradé radial elliptique, arrêts mélangés depuis `--fond` par `color-mix`, dernier arrêt à 100 %. Ajouter `pointer-events: none`. Régler l'`inset` sur un bloc d'une dizaine de lignes, et non d'une ou deux — la recette de la bulle est le point de départ, pas une copie.

Le commentaire au-dessus dit **pourquoi** : la dérogation à « sans cadre », et que l'arête est le prix de la lisibilité. Celui de la bulle est le modèle.

- [ ] **Step 4: Lancer, vérifier que ça passe**

Run: `npx vitest run src/components/__tests__/GareLaHaut.test.ts`
Expected: PASS, et le reste du fichier inchangé.

- [ ] **Step 5: Vérifier la suite entière**

Run: `npm run test:run` puis `npm run build`
Expected: 406 tests + le nouveau, build propre.

- [ ] **Step 6: L'épreuve à l'œil, sur les deux formats**

`npm run dev`, gare `/la-haut`, massif bien en vue. Contrôler, dans cet ordre :
le placeholder, le compteur et `laisser ↵` se lisent sur le grain le plus clair ;
l'arête du dégradé ne coupe pas l'image en deux, **à 1512 px comme à 390 px** ;
le survol d'une étoile proche du formulaire marche encore ; l'icône œil fait
suivre la tache sur chaque fond ; et l'envoi d'une phrase efface la tache
avec le formulaire, d'un seul mouvement.

C'est l'épreuve qui compte : le test de l'étape 1 ne dit rien du rendu.

- [ ] **Step 7: Commit**

```bash
git add src/components/gares/GareLaHaut.vue src/components/__tests__/GareLaHaut.test.ts docs/superpowers/specs/2026-11-14-formulaire-lisible-design.md docs/superpowers/plans/2026-11-14-formulaire-lisible.md
git commit -m "feat(la-haut): poser une nuit derrière le formulaire"
```
