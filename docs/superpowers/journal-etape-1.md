# SDD ledger — plan: docs/superpowers/plans/2026-11-10-etape-1-squelette.md

Spec: docs/CONCEPT.md (lue). Exécution : Native (inline), branche etape-1-squelette, commits locaux, aucun push (choix explicite d'Emmanuelle).

## Pre-flight scan (interfaces partagées)

| Produit par | Consommé par | Vérification | Résultat |
|---|---|---|---|
| T2 `manifest.json` (forme JSON) | T3 `types.ts` type `Manifest` | la forme JSON et le type TS doivent coïncider clé pour clé | OK — T3 recopie la forme de T2 ; `types.ts` est la seule déclaration |
| T3 `setRecolorFond`, `PALETTE` | T4 `palette.ts`, `EyeButton.vue` | nom et signature | OK |
| T3 `fitStage`, `STAGE`, `Manifest` | T5 `assets.ts`, `Sky.ts` | noms, types | OK |
| T5 `loadSequence`, `framePath` | T6 `Mountains.ts`, T7 `Train.ts` | signature de `loadSequence` | CONFLIT — le paramètre `spec` n'a pas de type nommé → ruling ci-dessous |
| T3 `TrainSequence` | T2 clés du manifeste, T7 `sequenceFor` | les six clés doivent être identiques des deux côtés | OK — table de correspondance figée en T2 |
| T7 `useVoyage`, `forwardSteps`, `gareSuivante` | T8 routeur, T9 `NavFrise.vue` | noms d'actions et d'état | OK |
| T7 `Train.update(dt, phase, derniereEtape)` | T8 `Scene.ts` | la dernière étape seule freine | OK |
| T6 `Mountains.setLegs` | T8 `useScene` relaie `legs` | nom | OK |

Ruling: `loadSequence(spec)` n'a pas de type nommé dans le plan — je déclare `SequenceSpec = { count: number; path: string; x: number; y: number; width: number; height: number }` dans `types.ts` et le manifeste le réutilise pour `rails` et chaque entrée de `train` — coût si faux : un renommage.
Ruling: le plan annonçait Vue Router 4 et Pinia 3 ; `npm install` a posé vue-router 5.5.0 et pinia 4.1.0 — je garde ce que `latest` installe, comme la section Tech Stack le prévoit, et j'adapte les API si elles ont bougé — coût si faux : des appels de routeur à réécrire.

## Exécution

Task 1: Ruling: le dépôt n'avait aucun commit, donc `task-start` n'a pas pu produire de BASE — la BASE de la tâche 1 est le commit racine a47faf1 lui-même — coût si faux : une plage de revue décalée d'un commit.
Task 1: Ruling: les briefs générés reprennent mot pour mot les sections du plan, que j'ai écrites dans cette même session et qui sont intégralement dans mon contexte — je travaille à partir du plan plutôt que de relire chaque brief — coût si faux : une valeur du plan lue de mémoire au lieu d'être copiée.
Task 1: complete (commit racine a47faf1, tests: npx vitest run → 1/1 pass, npm run build → OK)
Task 2: complete (commit 66e13b6, tests: npx vitest run tools → 4/4 pass ; assets réels : 160 montagnes 7,7 Mo + 193 images de train 8,9 Mo = 17 Mo, conforme à l'ordre de grandeur prévu)
Task 3: Ruling: le plan laissait `loadSequence(spec)` sans type nommé ; `types.ts` déclare `SequenceSpec` et `RailsSpec` et le manifeste les réutilise — coût si faux : un renommage.
Task 3: Ruling: `tsconfig.app.json` inclut `tools/**/*.ts`, qui utilise les modules node: — j'ai ajouté `node` aux `types` ; et un `setupFiles` bouchonne `getContext` que jsdom n'implémente pas et que Pixi sonde à l'import, pour garder la sortie de test propre — coût si faux : un test qui dépendrait vraiment d'un contexte canvas passerait inaperçu.
Task 3: complete (commit b3993a0, tests: npx vitest run → 21/21 pass, npm run build → OK)
Task 4: complete (commit e4b1a6b, tests: npx vitest run → 33/33 pass, npm run build → OK)
Task 5: Ruling: le plan demandait que la poussière évite la bande de la frise ; CONCEPT.md §6 dit qu'elle est partout, et c'est la place d'une étoile-voyageuse (§5, étape 2) qui doit éviter la frise, pas le fond — une bande vide en haut de l'écran se verrait. La poussière couvre donc tout le ciel — coût si faux : la frise moins lisible sur un fond chargé.
Task 5: Ruling: les classes de rendu Pixi (Sky, Mountains, Train, Scene) ne peuvent pas être exercées sous jsdom, qui n'a pas de WebGL. Leur logique est sortie en fonctions pures testées ; les classes elles-mêmes sont couvertes par le contrôle visuel de la tâche 10 — coût si faux : une erreur de rendu qui ne se voit qu'à l'œil.
Task 5: complete (commit 465d165, tests: npx vitest run → 49/49 pass, npm run build → OK)
Task 6: complete (commit b20a524, tests: npx vitest run Mountains → 8/8 pass, npm run build → OK)
Task 7: Ruling: le plan donnait `Train.update(dt, phase, derniereEtape)` ; j'ai ajouté un 4e paramètre `enRoute`, sans lequel un train à quai repartirait tout seul puisque `nextTrainState('arret', …)` rend toujours `demarrage` — coût si faux : un paramètre de plus à passer depuis Scene.
Task 7: complete (commit 13a83d9, tests: npx vitest run → 84/84 pass, npm run build → OK)
Task 8: Ruling: le plan donnait `travelTo(gare)` ; la scène ne connaît pas l'ordre des gares, qui vit dans le store Vue. Elle expose `setVoyage(enRoute, etapesRestantes)` et le pont lui pousse l'état — coût si faux : une API de scène à renommer.
Task 8: Ruling: le plan faisait enchaîner les étapes par une timeline GSAP ; je les fais avancer dans le ticker, parce qu'une cible redirigée en vol prolonge alors le voyage sans reconstruire de timeline. GSAP reste pour le fondu de couleur (§6) — coût si faux : un enchaînement d'étapes moins facile à mettre en pause.
Task 8: Ruling: l'événement `arrived` ne transporte plus de gare : la scène compte les étapes, le store tient la gare ; la faire transiter obligeait à inventer une valeur — coût si faux : nul, le pont ignorait déjà l'argument.
Task 8: complete (commit fe817e0, tests: npx vitest run → 96/96 pass, npm run build → OK)
Task 9: Ruling: le plan ne disait pas ce que « prochain arrêt » désigne pendant un voyage de plusieurs étapes. La frise marque la cible, et les gares seulement traversées restent « à venir » : c'est bien le prochain *arrêt*, pas la prochaine gare — coût si faux : une mention sur la mauvaise gare pendant un trajet long.
Task 9: complete (commit 70dfd26, tests: npx vitest run → 106/106 pass, npm run build → OK)
Task 10: Ruling: correction de la ruling de la tâche 5 — « les classes Pixi ne sont pas testables sous jsdom » était trop large. Une Scene construite sans init() n'a pas de contexte WebGL : c'est exactement l'état d'un navigateur sans WebGL, et ce chemin est testable. src/scene/__tests__/Scene.test.ts l'exerce — coût si faux : nul, c'est une couverture en plus.
Task 10: le contrôle visuel a trouvé trois défauts qu'aucun test ne voyait, tous corrigés en RED→GREEN (commit d82149e) :
  1. chemins du manifeste relatifs -> Pixi les résolvait contre la route (/ici/assets/...), 404, index.html renvoyé, « source image could not be decoded » : aucune texture, décor vide.
  2. manifeste en unités mélangées (x,y sources / width,height sortie) -> train dessiné à la moitié de sa taille, flottant au-dessus de la voie.
  3. aucune arrivée quand la scène ne peut pas animer (mouvement réduit ou pas de WebGL) -> voyage bloqué à jamais, gare inatteignable.
Task 10: contrôle visuel complet à 1280x832, les 8 points du plan passés : fond par défaut et train qui roule ; aucun rectangle autour du train ni des montagnes sur les 5 couleurs, relief visible ; trajet d'une étape avec freinage et URL à jour ; ici->ailleurs traverse 2 gares, la frise glisse 3 fois, freinage à la dernière seulement ; bouton retour reparti vers l'avant ; les 5 couleurs en fondu, corps du train recoloré, choix conservé après rechargement ; /la-haut en chargement neuf reste à quai sans voyage ; montagnes qui tournent sans demi-tour visible en marche.
Task 10: complete (tests: npx vitest run → 116/116 pass, npm run build → OK, contrôle visuel navigateur OK)

## Revue finale (relecteur frais, contexte neuf, modèle le plus capable)

Final: 3 Critical, 4 Important, 8 Minor. Re-graded par effet : les 3 Critical et 4 Important tiennent ; Minor 8 corrigé au passage car c'était une ligne. Une passe de correction unique, chaque correctif en RED→GREEN (commit 00e3f38, suite 125/125).
Final: fixed C1 cadrage périmé au redimensionnement — vérifié à la source (ResizePlugin.js:31-37 reporte en requestAnimationFrame) — pas de test unitaire possible sans WebGL, vérifié à la main en redimensionnant la fenêtre à 900x420.
Final: fixed C2 etapesRestantes à 0 en route vers la gare occupée — tests « revenir vers la gare occupée coûte le tour complet » et « …sans étape escamotée » RED→GREEN, suite 125/125, puis vérifié à l'écran : quatre crans de frise à ~6 s d'intervalle.
Final: fixed C3 montagnes figées pendant l'étape puis saut de 40 images — test « la distance poussée aux montagnes avance pendant une étape » RED→GREEN, puis vérifié à l'écran : profil changé entre 2 s et 5 s du même trajet.
Final: fixed I1 freinage verrouillé après redirection — test « une étape qui n'est plus la dernière relance le train » RED→GREEN.
Final: fixed I2/I3 chargement — la couleur mémorisée, le parallax et le cadrage ne dépendent plus des 396 images ; la séquence d'arrêt est chargée en premier ; chargement en parallèle.
Final: fixed I4 — src/composables/__tests__/useScene.test.ts écrit ; c'est lui qui épingle C2, C3 et I1.
Final: Ruling: je décline le reflet « qui coupe les roues » (Minor 3). Les roues et les rails sont *sous* la ligne de mire (y 921..959 contre HORIZON=921) : les refléter vers le haut les ferait apparaître au-dessus de la voie. Capturer 0..HORIZON est le bon cadrage. J'ai seulement arrondi la hauteur de texture, qui était à 460,5 — coût si faux : un reflet amputé d'une bande de 22 px.
Final: minor (deferred): loadManifest ne valide pas la forme du manifeste ; un manifeste lisible mais partiel fait lever Mountains.
Final: minor (deferred): mountains reste décrit en pixels de sortie alors que rails et train sont en pixels du cadre — sans effet aujourd'hui, mais c'est le piège qui avait produit le train à demi-taille.
Final: minor (deferred): cadrer() recrée la RenderTexture et redessine ~313 cercles à chaque événement de redimensionnement, sans anti-rebond.
Final: minor (deferred): la frise rend deux liens vers la même route (la boucle) — correct à l'œil, mais un lecteur d'écran annonce deux libellés identiques.
Final: minor (deferred): dustCount n'est appelé qu'avec les dimensions du cadre, donc son test « petit viewport » n'atteint pas le vrai site d'appel.
Final: minor (deferred): dispose() n'annule pas un chargement en cours, ne tue pas les tweens GSAP et ne détruit pas les filtres — en production App.vue n'est jamais démonté, c'est HMR et teardown de test seulement.
