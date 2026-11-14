# SDD ledger — plan: docs/superpowers/plans/2026-11-11-etape-2-la-haut-et-le-ciel.md

Branche : `etape-2-la-haut-et-le-ciel`. Pas de worktree : on travaille dans
l'arbre principal, déjà sur la branche de l'étape. **`src/scene/palette.ts`
porte une modification non commitée d'Emmanuelle : aucun commit ne doit la
contenir.**

Spec : `docs/superpowers/specs/2026-11-11-etape-2-la-haut-et-le-ciel-design.md`
Base de départ : 225 tests verts, `npm run build` propre.

## Pre-flight scan

| Paires / tâche | Produit → consommé | Trouvé |
|---|---|---|
| T1 → T2 | projet `demo-train-de-nuit`, port 8080 → `firebase.ts` | d'accord |
| T1 → T4 | champs des règles → champs écrits par le store | d'accord (phrase, prenom, creeLe, approuvee, x, y) |
| T1 → T7 | comptage des 80 caractères côté règles → compteur du formulaire | d'accord, T1 étape 6 donne le repli |
| T2 → T4 | `db`, `nouvelId()` → `setDoc` à identifiant pré-tiré | d'accord |
| T3 → T4 | `limiteEtoiles`, `Trace` (x, y), `Place` | d'accord |
| T3 → T5 | `projeter`, `etoileSous`, `EtoilePosee` | d'accord |
| T3 → T6 | `Place` → `beginDissolve` | d'accord |
| T3 → T8 | `ageRelatif` → la bulle | d'accord |
| T5 → T6 | `Stars` → `land()` y pose l'étoile | d'accord |
| T5 → T9 | `setStars`, `setPointerPx` | d'accord |
| T6 → T7 | `Poignee` (`land` / `revert`) | d'accord |
| T7 → T9 | `SCENE_KEY` dans `useScene.ts`, `provide` dans `App.vue` | **conflit** — voir ruling 1 |
| T8 → T9 | `App.vue` touché par les deux | d'accord, tâches successives |
| T4 → T9 | `charger()`, surveillance de `etoiles` | d'accord |
| T1 | tests ↔ règles ↔ fichiers | cohérent |
| T2 | tests ↔ signatures | cohérent |
| T3 | tests ↔ signatures ↔ fichiers | cohérent |
| T4 | tests ↔ actions ↔ fichiers | cohérent |
| T5 | tests ↔ classe ↔ scène | cohérent |
| T6 | tests ↔ poignée ↔ partie pure | cohérent |
| T7 | tests ↔ déroulé ↔ **fichiers** | **incomplet** — voir ruling 1 |
| T8 | tests ↔ composants | cohérent |
| T9 | tests ↔ câblage ↔ documentation | cohérent |
| T10 | vérifications ↔ scripts des tâches 1 à 9 | cohérent |

Ruling 1 : la tâche 7 produit `SCENE_KEY` dans `src/composables/useScene.ts` et
le `provide` dans `src/App.vue`, mais sa liste de fichiers ne nommait que
`GareLaHaut.vue`. J'ajoute les deux fichiers à ses *Files* et à son commit.
Motif : sans le pont, la tâche 7 ne peut pas atteindre la scène, et la tâche 9
qui le câblerait vient après elle. Coût si c'est faux : la tâche 9 retouche
`useScene.ts` sur une clé déjà posée — une retouche, pas un conflit.

## Exécution

Task 1 : lancée (émulateur, règles, index, semis). BASE b5063c4. Modèle sonnet.
Task 1 : rendue DONE, commit 221e979. 14/14 règles, 225 inchangés, vue-tsc propre.
  Ruling 2 : l'implémenteur a borné la phrase par `matches('(?s).{1,80}')` au lieu
  de desserrer `size()` comme l'étape 6 du brief le prévoyait. Je retiens sa
  solution : `size()` compte les unités UTF-16 (un emoji vaut 2), donc desserrer à
  160 aurait laissé passer 81 caractères simples ; `.` en RE2 vaut un point de code,
  ce qui donne exactement la borne du compteur `[...s].length` côté formulaire. Les
  14 tests passent, dont celui à 80 points de code avec emoji — preuve contre le
  vrai moteur de règles, pas contre une maquette. Coût si c'est faux : les règles
  refuseraient une phrase que le formulaire accepte, ce que le test de la tâche 7
  rattraperait.
  Ruling 3 : le paquet de revue de la tâche 1 faisait 521 Ko, dont 12 389 lignes
  de `package-lock.json`. Je l'ai régénéré sans le verrou, qui est produit par
  `npm install` et que personne ne relit ligne à ligne ; le `--stat` complet y
  reste, donc le relecteur voit qu'il a changé. Coût si c'est faux : une
  modification malveillante ou accidentelle du verrou passerait la revue — mais
  elle passerait aussi 12 000 lignes de diff lues en diagonale.
Task 1 : complete (commits b5063c4..221e979, revue propre, 0 Critical, 0 Important).
  ⚠️ levé par le contrôleur : `npm run test:run` revérifié → 225 tests / 17 fichiers,
  inchangé. Les avertissements d'install re2/protobufjs sont hors suite de tests.
Task 1: minor (deferred): aucun test ne prouve que 81 points de code hors BMP
  (81 emoji) sont refusés — l'asymétrie UTF-16 n'est verrouillée que vers le haut.
Task 1: minor (deferred): `is string` sur phrase/prenom et le prenom vide ne sont
  pas exercés par un test.
Task 1: minor (deferred): le commentaire ajouté à mise.toml est en français là où
  la contrainte demande l'anglais (cohérent avec le reste du fichier).

Task 2 : lancée (src/firebase.ts). BASE 221e979. Modèle sonnet.
Task 2 : rendue DONE, commit 2484ba7. 7 tests (3 du brief + 4), suite 232/18, vue-tsc propre.
  Revue lancée (sonnet) sur review-221e979..2484ba7.diff.
Task 2 : complete (commits 221e979..2484ba7, revue propre, 0 Critical, 0 Important).
  ⚠️ levés par le contrôleur : `palette.ts` n'apparaît dans aucun commit de la
  branche (`git log --name-only b5063c4..HEAD`), et `src/scene/` n'importe
  toujours pas firebase (grep).
Task 2: minor (deferred): deux tests supposent `VITE_FIREBASE_PROJECT_ID` absent
  de l'environnement sans le neutraliser — un `.env.local` réel les ferait échouer.
Task 2: minor (deferred): cas « projet réel sans clé reCAPTCHA ⇒ pas d'App Check »
  non couvert, et le provider passé à initializeAppCheck n'est pas vérifié.
Task 2: minor (deferred): adresse de l'émulateur en dur (127.0.0.1:8080), conforme
  au brief ; une constante nommée serait plus lisible.

Task 3 : lancée (stars.ts, dates.ts, layout.ts, types.ts). BASE 2484ba7. Modèle sonnet.
Task 3 : rendue DONE, commit a368ea9. 254/20, vue-tsc propre. 22 tests ajoutés.
  Trois points signalés par l'implémenteur et transmis au relecteur : (1) un de ses
  propres tests de date corrigé de 38 h à 39 h — à vérifier qu'il n'a pas plié le
  test sur un bug ; (2) `tirerPlace` mesure dans le carré normalisé, donc
  l'espacement est anisotrope à l'écran ; (3) mois et années en mois calendaires,
  non spécifié par le brief.
Task 3 : revue — spec ✅, 0 Critical, 1 Important. Le test de date corrigé est
  juste (38 h avant 14:00 tombe pile à minuit la veille) : le code n'a pas été
  plié, c'est bien le test d'origine qui était faux.
  Ruling 4 : j'accepte le correctif proposé pour `tirerPlace` — un paramètre
  optionnel `rapport = largeur / hauteur de bande`, pondérant dx dans la distance.
  La signature du plan (`prises, alea, tirages?`) gagne donc un quatrième
  paramètre optionnel. Motif : la bande fait 1440x334 sur un portable et 844x79
  sur un téléphone en paysage, soit des rapports de 4,3 et 10,7 ; mesurer dans le
  carré normalisé déclare « libres » des étoiles séparées de 17 px en y comme
  d'autres séparées de 72 px en x, ce que le §5 cherche précisément à éviter. Les
  places stockées restent normalisées, donc l'invariant « même place relative »
  tient. Coût si c'est faux : la place n'est visuellement libre que sur l'écran de
  celui qui la tire — ce qui reste mieux que juste sur aucun écran.
  **À porter dans le dispatch de la tâche 7 : `tirerPlace` attend désormais le rapport.**
Task 3: minor (deferred): `eclat` d'un âge négatif dépasse 1 (horloge client en
  retard) ; alpha > 1 est écrêté au rendu, donc sans conséquence visible.
Task 3: minor (deferred): mois/années d'`ageRelatif` non épinglés par des tests
  (frontière 30 jours, 11→12 mois, « il y a 1 an »), ni le cas d'une date future.
Task 3: minor (deferred): layout.test.ts lit base.css par un chemin relatif au cwd.
Task 3: minor (deferred): ordre des imports rompu dans layout.test.ts (cosmétique).
Task 3: minor (deferred): le test « jamais sous la frise » est quasi tautologique
  pour y dans [0,1] ; il ne couvre pas un y hors bornes.
Task 3 : fix round 1/5 lancée (1 Important).
Task 3 : fix round 1/5 (1 addressed, 0 open ; commits a368ea9..a212d0d).
Task 3 : complete (commits 2484ba7..a212d0d, re-revue propre).
  Contrôleur : suite complète relancée (l'implémenteur n'avait fait que son
  fichier) → 255 tests / 20 fichiers, verts.
  **Dette portée à la tâche 7** : aucun appelant ne passe encore
  `rapport = largeur / bande.height` à `tirerPlace` ; au défaut 1, le
  comportement d'avant le correctif subsisterait en production.

Task 4 : lancée (stores/traces.ts + traces-locales.ts). BASE a212d0d. Modèle sonnet.
Task 4 : rendue DONE, commit a56ef9d. 272/22, vue-tsc propre, 17 tests ajoutés.
  Contrôleur : l'implémenteur signale n'avoir pas pu lancer ESLint — vérifié,
  le projet n'a ni config, ni script, ni dépendance ESLint. Non pertinent.
  Revue lancée (sonnet), avec consigne d'examiner d'abord si les tests du store
  prouvent autre chose que leurs propres mocks.
Task 4 : revue — spec ✅, 0 Critical, 2 Important, qualité « Needs fixes ».
  (1) la fusion tronquée peut couper l'étoile du visiteur quand le ciel est plein ;
  (2) un `catch` unique englobe la boucle de mapping : un document mal formé jette
  tout le ciel distant, sans log.
  Ruling 5 : je borne `loadMiennes`/`saveMienne` aux **20** étoiles les plus
  récentes du visiteur. Motif : `saveMienne` accumulait sans fin dans
  `localStorage`, et le ciel lui-même est borné — il serait incohérent que la
  réserve locale ne le soit pas. Coût si c'est faux : quelqu'un qui laisse plus de
  20 phrases perd la trace locale des plus anciennes, qui restent visibles dès
  qu'elles sont approuvées.
  Ruling 6 : le test mineur « repli sur les étoiles locales » (qui passerait même
  si le repli rendait toujours []) entre dans le correctif, contrairement à la
  règle des mineurs. Motif : il porte exactement sur le code que le défaut (1)
  modifie, et le corriger sans ce test laisserait la correction non prouvée.
  Coût si c'est faux : un test de plus, écrit une fois.
Task 4: minor (deferred): getDocs mocké quels que soient ses arguments — un
  `limit()` construit mais non passé à `query()` passerait le test.
Task 4: minor (deferred): « le distant gagne » ne compare que les ids, pas les
  phrases, donc la préséance n'est pas réellement vérifiée.
Task 4: minor (deferred): `prenom: ''` non testé (seulement `undefined`).
Task 4: minor (deferred): `ecrire` ne `trim` ni ne borne côté client — l'UI de la
  tâche 7 s'en charge.
Task 4 : fix round 1/5 lancée (2 Important).
Task 4 : correctif rendu, commit d13275b. Contrôleur : suite complète relancée
  → 276 tests / 22 fichiers, verts. Re-revue ciblée lancée.
Task 4 : fix round 1/5 (2 Important + 2 rulings addressed, 0 open ; a56ef9d..d13275b).
Task 4 : complete (commits a212d0d..d13275b, re-revue propre).
Task 4: minor (deferred): sur id dupliqué, c'est désormais la copie **locale** qui
  l'emporte, non la distante comme annoncé au départ ; les deux copies sont
  identiques en pratique.
Task 4: minor (deferred): avec plus de 20 étoiles locales le total pourrait
  dépasser `max` ; impossible tant que `limiteEtoiles` reste >= 20.

Task 5 : lancée (Stars.ts, Scene.ts, purity). BASE d13275b. Modèle sonnet.
  Contrôleur, vérifié avant dispatch : `Container` et `Graphics` de Pixi
  s'instancient sans WebGL dans jsdom (`Scene.test.ts` construit déjà une scène
  sans `init()`), donc la classe `Stars` est testable directement.
  Ruling 7 : la couche des étoiles s'ajoute à `app.stage` **derrière** `monde`,
  et non dedans. Motif : `monde` est cadré en « cover » par `fitStage`, ce que la
  décision du §5 exclut ; et le ciel est un fond — la poussière est déjà derrière
  le décor. Coût si c'est faux : une étoile passant derrière le massif reste
  survolable sans être visible ; la bande haute limite le recouvrement.
Task 5 : rendue DONE_WITH_CONCERNS, commit c4fd4c7. 287/23, vue-tsc propre.
  Ruling 8 : le plan nommait le fichier `src/scene/Stars.ts`, qui entre en
  collision avec le `src/scene/stars.ts` de la tâche 3 sur un système de fichiers
  insensible à la casse — c'est-à-dire sur le macOS d'Emmanuelle. L'implémenteur a
  renommé en `src/scene/StarLayer.ts` (classe toujours `Stars`). Je retiens ce
  renommage et je l'ai répercuté dans le plan. Motif : c'est un défaut que j'ai
  introduit en écrivant le plan ; la classe et l'interface sont inchangées, donc
  seules les lignes d'import bougent. Coût si c'est faux : les tâches 6, 9 et 10
  doivent importer `./StarLayer` — porté dans leurs dispatchs.
  Contrôleur, vérifié : `git diff a212d0d..c4fd4c7 -- src/scene/stars.ts
  src/scene/__tests__/stars.test.ts` est vide — l'écrasement signalé par
  l'implémenteur a bien été réparé, les fichiers de la tâche 3 sont intacts.
Task 5 : revue — spec ❌, 0 Critical, 1 Important. Les tests dépendent de
  l'horloge réelle : ils utilisent MAINTENANT = 1 800 000 000 000 (mi-janvier
  2027), aujourd'hui supérieur à `Date.now()`, donc l'âge est ramené à 0 par
  `Math.max` et tout passe. Passé cette date, ils échoueront sans qu'une ligne
  de code ait bougé.
  Ruling 9 : correction côté tests (horloge figée par `vi.setSystemTime`) plutôt
  qu'en ajoutant un `maintenant` au contrat `setStars(traces, w, h)`. Motif : ce
  contrat est fixé par le plan et consommé par `Scene` puis par la tâche 9 ; le
  défaut est dans les tests, pas dans l'interface. Coût si c'est faux : la pose
  d'une étoile lira toujours l'horloge système, ce qui est le comportement voulu
  en production.
Task 5: minor (deferred): une étoile en cours d'extinction qui revient dans la
  liste gardée n'est pas ressuscitée (redimensionnement mobile↔bureau en moins
  de 1,2 s).
Task 5: minor (deferred): le halo est figé à la pose ; une étoile qui vieillit
  sous 0,55 le garde.
Task 5: minor (deferred): le test de scintillement fait varier `maintenant` en
  même temps que l'horloge, donc il prouve peu.
Task 5: minor (deferred): parcours de fichiers dupliqué mot pour mot dans
  purity.test.ts ; le garde firebase ne couvre ni `import 'firebase/app'` sans
  `from`, ni un `import()` dynamique.
Task 5: minor (deferred): `setPointerPx` émet `starHover(null)` à chaque
  mouvement de pointeur — à absorber côté consommateur (tâche 8).
Task 5 : fix round 1/5 lancée (1 Important).
Task 5 : correctif écrit par l'implémenteur mais BLOCKED au commit — l'agent
  1Password refusait de signer (« failed to fill whole buffer », puis « agent
  returned an error »). Il a eu raison de ne pas contourner la signature.
  Contrôleur : commit relancé tel quel sur le travail déjà indexé et testé, passé
  au second essai → 5666dad. Aucun code modifié par le contrôleur.
Task 5 : fix round 1/5 (1 addressed, 0 open ; c4fd4c7..5666dad).
Task 5 : complete (commits d13275b..5666dad, re-revue propre). Suite 287/23.

Task 6 : lancée (Dissolve.ts). BASE 5666dad. Modèle **opus** — c'est la tâche qui
  demande le plus de jugement : timeline GSAP, rastérisation hors écran
  intestable en jsdom, séparation de la partie pure, et une poignée à trois états
  (dissolution, attente, pose ou retour).
Task 6 : rendue DONE, commit 2e00e77. 297/24, vue-tsc propre, 10 tests ajoutés.
  **Deux contrats à porter dans le dispatch de la tâche 7**, découverts par
  l'implémenteur et absents du plan :
  (a) `Scene.pousserEtoiles` retient les traces dont la place est « en vol ».
      Sans cela, le `confirmer` du store allumerait l'étoile 2,5 s trop tôt :
      l'idempotence de `setStars` empêche la double pose, pas la pose prématurée.
      La tâche 7 doit passer **la même `place`** à `beginDissolve` et au
      brouillon ; si les deux divergent, la retenue ne fait rien, en silence.
  (b) `POLICE = '300 17px Inter'` dans Dissolve.ts est un contrat avec le CSS du
      champ phrase de la tâche 7 (le §4.3 fixe la taille du titre, pas celle du
      champ), et le `from` passé doit être la boîte où le texte commence
      vraiment — le rembourrage d'un input décale les grains.
Task 6 : revue (opus) — spec ❌, 0 Critical, 3 Important, qualité « Needs fixes ».
  Ruling 10 : **on retire `pousserEtoiles`** et la tâche 7 séquencera `land()`
  **puis** `confirmer()`. Motif : la machinerie reposait sur l'hypothèse inverse
  (`confirmer` avant `land`), que le plan ne fixe nulle part — sa ligne 422 dit
  même le contraire. Avec `land` d'abord, l'étoile est posée par l'animation, et
  le `setStars` déclenché par `confirmer` est un no-op grâce à l'idempotence par
  id : plus de pose prématurée, sans aucune machinerie. Le relecteur a montré que
  `pousserEtoiles` est de plus inatteignable par les tests (il sort si
  `!this.vivante`, qui exige WebGL), que sa clé est une égalité de coordonnées
  flottantes, et que son échec est silencieux dans les deux sens. Coût si c'est
  faux : entre la confirmation de l'écriture et la fin de l'animation (~2,9 s), la
  trace n'est pas encore dans le store — un rechargement dans cette fenêtre perd
  la copie locale, qui revient dès l'approbation.
  **À porter dans le dispatch de la tâche 7 : `land()` d'abord, `confirmer()` ensuite.**
  Ruling 11 : je promeus deux mineurs dans ce tour, contre la règle habituelle.
  (#4) des grains arrivant après la défaite laissent le nœud invisible pendant
  toute l'attente — or c'est la **première visite**, police non encore en cache,
  qui est lente, et c'est précisément la visite pour laquelle cette animation
  existe. (#9) la cible est figée à la construction alors que sur mobile, Entrée
  referme le clavier et change le viewport **à cet instant précis** : le grain se
  poserait à l'ancienne projection et l'étoile à la nouvelle, à chaque envoi
  depuis un téléphone. Coût si c'est faux : deux correctifs courts de plus.
Task 6: minor (deferred): le test de la garde `document.fonts` ne l'exerce pas —
  l'optional chaining court-circuite en jsdom, le `catch` n'est jamais atteint.
Task 6: minor (deferred): `POLICE` n'exporte pas son contrat vers la tâche 7 ; un
  désaccord avec le CSS fait tomber les grains à côté des lettres, sans alerte.
Task 6: minor (deferred): `.catch(() => {})` masque toute panne de rastérisation.
Task 6: minor (deferred): la Scene et les couches Stars des tests ne sont jamais
  disposées.
Task 6 : fix round 1/5 lancée (3 Important + 2 mineurs promus).
Task 6 : fix round 1/5 (3 Important + 2 mineurs promus addressed, 0 open ;
  2e00e77..cfff583). Suite 301/24.
Task 6 : complete (commits 5666dad..cfff583, re-revue propre).
  **Précision décisive portée à la tâche 7** : la décision 10 doit se lire
  « **await** `land(trace)` **puis** `confirmer(trace)` », et non un simple ordre
  d'appel. `land()` ne pose l'étoile qu'à t ≈ 3,1 s ; un `confirmer` lancé sans
  attendre ferait poser l'étoile par le store tout de suite, et `allumer`
  deviendrait le no-op — l'étoile s'allumerait 2,5 s trop tôt, exactement ce que
  `pousserEtoiles` empêchait. Rien dans la scène ne compense plus cet ordre.
  Le relecteur a vérifié qu'aucun écouteur Firestore ne court-circuite ce chemin :
  `confirmer` est le seul point d'entrée.
Task 6: minor (deferred): la fixture de la mutation C n'épingle la garde de phase
  qu'à un demi-pixel d'arrondi.
Task 6: minor (deferred): JSDoc de `Poignee` — « déjà tenue » est inexact quand
  le second appel arrive en pleine animation.
Task 6: minor (deferred): `Scene.ts:198` (resize des dissolutions en vol) n'est
  couvert par aucun test — `cadrer()` complet exige WebGL.
Task 6: minor (deferred): `this.opts.viewportW/H` sont de l'état mort depuis
  l'arrivée de `resize`.

Task 7 : lancée (GareLaHaut.vue + SCENE_KEY + App.vue). BASE cfff583. Modèle
  **opus** — c'est la tâche qui porte le plus de contrats inter-tâches.
Task 7 : rendue BLOCKED au commit (coffre 1Password verrouillé, `ssh-add -l` :
  « The agent has no identities »). L'implémenteur a eu raison de ne pas
  contourner la signature. Contrôleur : commit relancé sur le travail déjà
  indexé et testé → 37c588e. Aucun code modifié par le contrôleur.
  Cinquième chemin au-delà du brief, accepté : `src/__tests__/smoke.test.ts`,
  dont le mock remplaçait tout le module `useScene` et n'exportait donc plus
  `SCENE_KEY` une fois `App.vue` modifié — réparé par `importOriginal`, pour
  qu'il n'existe qu'une seule clé et non deux symboles.
Task 7 : revue (opus) — spec ❌, 0 Critical, 2 Important, « Needs fixes ».
  Ruling 12 (arbitrage demandé par l'implémenteur) : **les deux champs passent en
  `readonly` tant que `envoi !== null`**, et le champ perd le focus à l'envoi,
  après `cadrePhrase()`. Motif : le relecteur a trouvé une **seconde** perte
  silencieuse, absente du rapport — au succès tardif, `reussir()` vide les deux
  champs sans condition, effaçant le texte que le visiteur était en train de
  récrire. C'est l'anti-objectif n°2 (« une phrase perdue sans le dire »), et le
  vidage est imposé par le brief : ce n'est donc pas lui qu'il faut corriger,
  c'est le fait que le champ soit resté éditable. `readonly` ferme les deux
  pertes d'un coup, n'écrit aucun second document, et respecte le §9 (« le texte
  reste dans le champ, intact »). Coût assumé et à dire : hors ligne, la promesse
  Firestore ne se rejette jamais, donc le champ peut rester verrouillé pour la
  durée de l'onglet — le visiteur voit sa phrase et le message « on n'a pas pu
  confirmer », mais ne peut plus la modifier. C'est le prix pour ne jamais
  montrer un texte et en enregistrer un autre. Les deux autres options ont été
  pesées : « refuser et le dire » réclame une copie que ni le §4.3 ni le §9 ne
  fournissent et laisse entier l'effacement ; « détacher si le texte a changé »
  fabrique un quasi-doublon sur le cas le plus fréquent, la correction d'une
  coquille.
  Ruling 13 : je promeus le mineur « `clearTimeout` au démontage n'est gardé par
  aucun test » (retirer `arreter()` ne fait tomber personne). Motif : la grille
  de sévérité range les minuteurs fuyants parmi les Important ; c'est un test
  d'une ligne.
Task 7: minor (deferred): le bloc 4 du test « aucun chemin n'écrit en local »
  refait le bloc 3 et n'ajoute rien ; les wrappers ne sont jamais démontés.
Task 7: minor (deferred): `window.innerWidth/Height` ne sont jamais restaurés.
Task 7: minor (deferred): `aria-live="polite"` sur un élément en `v-if` n'est
  souvent pas annoncé ; garder le `<p>` monté et n'y basculer que le contenu.
Task 7: minor (deferred): `saisir()` réécrit `el.value` quand la borne mord —
  taper au milieu d'un champ plein fait sauter le dernier point de code et file
  le curseur en fin de champ.
Task 7: minor (deferred): `TIRAGES = 40` recopie le défaut de `tirerPlace`.
Task 7: minor (deferred): le titre du test « une ligne mono s'affiche » promet
  plus que son assertion.
Task 7: minor (deferred): ~160 lignes de script dans le SFC ; un `useEnvoiTrace()`
  isolerait la machine d'envoi de jsdom. À peser si la gare grossit.
Task 7 : **à porter à la revue finale** — au remontage du composant, `envoi`
  repart à `null` : la garantie de rattachement ne survit pas à une navigation,
  et une phrase retapée après un aller-retour produirait un second document. Le
  correctif est au niveau du magasin, hors du brief de cette tâche.
Task 7 : fix round 1/5 lancée (2 Important + arbitrage + 1 mineur promu).
Task 7 : correctif rendu, de nouveau BLOCKED au commit (coffre reverrouillé).
  Contrôleur : commit relancé sur l'index inchangé → de2e9ac. Suite 326/25.
Task 7 : fix round 1/5 (arbitrage + 2 Important + 1 mineur promu addressed,
  0 open ; 37c588e..de2e9ac). Deux mineurs nés du correctif.
  Ruling 14 — **je révise la décision 12**, dont la re-revue a montré une
  conséquence que je n'avais pas pesée : après le délai, le champ est à la fois
  `readonly` et blurré, le gabarit n'a aucun bouton, et un `input[readonly]` ne
  lève pas le clavier virtuel. Sur téléphone, le visiteur voit sa phrase, « on
  n'a pas pu confirmer » et « laisser ↵ » — sans aucun geste possible. Le coût
  accepté n'était plus « champs verrouillés hors ligne » mais « aucune action
  possible après 10 s sur mobile, en ligne comme hors ligne ».
  Correctif : `laisser ↵` devient un vrai bouton de soumission. Le §4.3 le
  donne déjà comme l'affordance de l'action, donc rien ne change à l'écran ; ça
  rend l'envoi atteignable au doigt sur **tous** les chemins, pas seulement
  après le délai. Le `readonly` reste : il est ce qui garantit qu'on n'enregistre
  jamais un texte différent de celui affiché. Coût si c'est faux : un élément de
  plus dans l'ordre de tabulation.
  Ruling 15 : je prends aussi le second mineur du correctif — `envoi.value = null`
  passe **après** l'`await p.land(...)`. Motif : sinon le verrou se lève 2,5 s
  avant l'effacement, et les champs redeviennent éditables pendant la montée du
  grain. Le second appui reste bloqué par `enVol`. Coût si c'est faux : nul, le
  déverrouillage arrive juste plus tard.
Task 7 : fix round 2/5 lancée (2 conséquences de l'arbitrage).
Task 7 : fix round 2/5 (rulings 14 et 15 addressed ; de2e9ac..eb0d772). Suite 329/25.
  Reste ouvert : `letter-spacing` perdu sur le bouton (la feuille navigateur d'un
  `<button>` force `normal`, et `font: inherit` ne la couvre pas) — le ruling 14
  exigeait un rendu inchangé. Round 3 lancée pour cette ligne, plus le démontage
  des deux tests attachés, à sortir d'un chemin non garanti.
Task 7 : fix round 3/5 (2 restes addressed, 0 open ; eb0d772..4d0a91f).
Task 7 : complete (commits cfff583..4d0a91f, re-revue propre). Suite 329/25.
  Note retenue : pas de test pour l'interlettrage, à raison — Vitest ne charge
  pas le CSS des SFC et jsdom n'applique pas la feuille UA des boutons, donc
  toute vérification relirait la déclaration qu'on vient d'écrire. Va à l'œil
  en tâche 10.

Task 8 : lancée (StarTooltip.vue, EtoilesListe.vue, App.vue). BASE 4d0a91f.
  Modèle sonnet.
Task 8 : rendue DONE, commit 833770e. 344/27. Revue — spec ❌, 0 Critical,
  3 Important, « Needs fixes ». (1) le basculement est binaire et ne borne pas :
  à 375 px, une étoile du centre fait déborder une phrase longue des deux côtés,
  et le code retient arbitrairement un côté — c'est le Review Focus #5 qui tombe ;
  (2) le test de typographie impose l'ordre des propriétés CSS ; (3) le test du
  `:focus-within` ne vérifie que l'existence du sélecteur, pas qu'il révèle.
  Ruling 16 : je promeus le mineur `role="list"`. Motif : Safari et VoiceOver
  retirent la sémantique de liste quand `list-style: none` est posé, donc
  « liste de N éléments » n'est pas annoncé — or toute la raison d'être de cette
  liste est d'être annoncée. Un attribut. Coût si c'est faux : nul.
Task 8: minor (deferred): hauteur estimée à 110 px — généreuse, mais une phrase
  courte bascule au-dessous sans nécessité pour y < 124.
Task 8: minor (deferred): `bottom: innerHeight - …` bouge avec la barre d'URL
  mobile ; `top` + `translateY(-100%)` serait plus stable.
Task 8: minor (deferred): le test des rafales de `null` ne prouve pas l'absence
  de re-rendu, seulement l'absence de bulle.
Task 8: minor (deferred): les âges de la liste sont figés au changement de liste.
Task 8 : fix round 1/5 lancée (3 Important + 1 mineur promu).
Task 8 : fix round 1/5 (3 Important + 1 mineur promu addressed, 0 open ;
  833770e..966ea77). Suite 346/27.
Task 8 : complete (commits 4d0a91f..966ea77, re-revue propre).
Task 8: minor (deferred): `largeur` reste le maximum supposé (240) et non la
  largeur mesurée — une phrase courte près du bord droit peut démarrer à gauche
  de son étoile. Jamais hors écran. Va à l'œil en tâche 10.

Task 9 : lancée (useScene + documentation). BASE 966ea77. Modèle sonnet.
Task 9 : rendue DONE, commit 9fe85f3. 351/28. Revue — spec ❌, 0 Critical,
  1 Important : le §9 de CONCEPT.md documente `revert(): void` alors que le code
  rend `Promise<void>`. Le relecteur a recoupé une à une les vingt affirmations
  de la documentation contre le code : toutes les autres sont exactes (3,5 s,
  120/50, la bande pour `y`, `matches('(?s).{1,80}')`, les champs et l'ordre de
  l'index, les noms de scripts npm, temurin-21, l'id de projet, les noms de
  classe et de fichier, et les signatures de `land` et `beginDissolve`).
  Ruling 17 : je promeus le mineur « écouteurs posés après `await init()` ».
  Motif : si le composant est démonté pendant l'initialisation, `onBeforeUnmount`
  les retire avant qu'ils existent et ils fuient. Le défaut préexistait pour
  `pointermove` mais cette tâche l'étend à `pointerdown` — on ne laisse pas une
  fuite s'élargir sous prétexte qu'elle était déjà là. Coût si c'est faux : les
  écouteurs sont posés un peu plus tôt, et `scene.value?.` les rend inoffensifs.
Task 9: minor (deferred): le test de l'appui au doigt ne vérifie que l'appel à
  `setPointerPx`, pas la révélation ni la fermeture — son titre promet plus.
Task 9: minor (deferred): les tests sont dans `useScene.pont.test.ts` et non
  dans `useScene.test.ts` comme le brief le disait — `vi.mock` étant à portée de
  fichier et l'ancien fichier ayant besoin de la vraie scène, l'écart est sain.
Task 9: minor (deferred): le test d'échec de chargement passait déjà avant le
  câblage ; il garde contre une régression sans avoir démontré de RED.
Task 9 : fix round 1/5 lancée (1 Important + 1 mineur promu).
Task 9 : fix round 1/5 (1 Important + 1 mineur promu addressed, 0 open ;
  9fe85f3..17402b5). Suite 351/28.
Task 9 : complete (commits 966ea77..17402b5, re-revue propre).
Task 9: minor (deferred, hors périmètre, préexistant): un démontage pendant
  `await instance.init()` laisse continuer `setFond`/`setVoyage`/`setLegs`/
  `setStars` sur une scène déjà `dispose()`. `vivante = false` limite les dégâts
  mais ce n'est pas protégé explicitement.

Task 10 : vérifications mécaniques lancées par le contrôleur (suite, build,
  règles). L'épreuve à l'œil revient à Emmanuelle : c'est le §13 du concept qui
  le dit — « chaque étape se termine par une version qui tourne et qu'Emmanuelle
  valide avant de passer à la suivante ».

## Revue finale de branche (opus, b5063c4..17402b5)

Verdict « With fixes ». 0 Critical, 9 Important. Les 17 rulings ont été relus un
par un : 16 jugés justes, **le ruling 7 est à rouvrir** — pas parce qu'il est
faux, mais parce que son coût accepté (« la bande haute limite le recouvrement »)
ne résiste pas à l'arithmétique de `cadreMassif` (sommet à ~167 px sur 1440×900,
~157 px sur 390×844, dans une bande 116→450), et parce qu'il crée une
discontinuité de plan : le halo final s'éteint au premier plan pendant que
l'étoile s'allume à l'arrière-plan. Le relecteur refuse de trancher la
visibilité (le massif est un tramage partiellement transparent) : **c'est une
décision de mise en scène, elle revient à Emmanuelle.**
  Ruling 18 : je lance **une seule vague** de correctifs sur les huit points
  corrigeables, plus deux durcissements bon marché (borne `request.query.limit`
  dans les règles, et le trou du garde de pureté sur `@/firebase`). Motif : le
  skill impose une vague unique et une seule re-revue ; les huit sont petits et
  ne demandent aucune refonte. Le neuvième point attend Emmanuelle.

## Re-revue de la vague finale (opus, 17402b5..cb74a0d)

Les dix constats sont traités. **Une casse Important reste ouverte**, née du
correctif lui-même.

Ruling 19 (adjudication, pas de seconde vague — le skill n'en prévoit qu'une) :
je **parque** la casse n°1 et je la remonte à Emmanuelle.
  Le défaut : `onBeforeUnmount` tue le minuteur des 10 s (`GareLaHaut.vue:324`)
  et l'instance remontée ne le réarme jamais — `minuteur` n'est posé que dans
  `laisser()`. Séquence : Entrée, on quitte « là-haut » à t+3 s, on revient à
  t+20 s avec l'écriture toujours en vol (hors ligne, Firestore ne règle pas sa
  promesse). Le visiteur retrouve sa phrase dans un champ **verrouillé** et une
  région live **vide** : rien ne dit pourquoi, un lecteur d'écran n'entend rien,
  et l'état dure tant que l'écriture ne se règle pas. Il reste une sortie non
  dite : le bouton « laisser ↵ » relance `laisser()`, donc le minuteur, et le
  message tombe 10 s plus tard.
  Pourquoi je parque plutôt que de corriger : le skill n'autorise qu'une vague
  et une re-revue, et ce correctif-ci créerait du code non relu juste avant la
  remise. Le défaut exige d'être **hors ligne**, de quitter la gare dans les dix
  secondes et d'y revenir — étroit, mais réel, et c'est le correctif qui l'a
  créé : avant, l'envoi mourait avec le composant.
  Correctif proposé, si Emmanuelle le veut : au montage, si `envoi` est posé et
  `nonConfirmee` nul, réarmer le reste du délai depuis `envoi.trace.creeLe`.
  Coût si je me trompe en parquant : un visiteur hors ligne qui navigue peut
  rester devant un champ muet jusqu'à ce qu'il appuie sur « laisser ↵ ».

Ruling 20 : la borne `request.query.limit <= 120` plafonne **une requête**, pas
une session — un client qui pagine avec `startAfter` lit toute la collection. Je
la garde quand même (elle ferme le cas trivial et ne coûte rien), mais la vraie
protection reste l'**application** d'App Check côté console, que le README
documente. Firestore ne sait pas poser de plafond total en règles.
Résiduels mineurs parqués : `confirmees` non borné ; `saisir()` peut rogner un
caractère intact lors d'un remplacement par autocorrection mobile ; pas de
`try/finally` autour de `await this.poseur?.()` (inatteignable aujourd'hui) ;
`estFirebase` ne mord pas sur un spécificateur avec extension.

## Vérification de bout en bout — contrôleur, navigateur réel (12/11/2026)

Lancé par le contrôleur, pas par un sous-agent : `npm run emulators`,
`npm run seed` (200 traces), `npm run dev` (port 5175), puis Chrome sur
`/la-haut`. Constaté :
- la page se charge, aucune erreur console ; le massif, la voie, le train, le
  reflet et la frise sont là ;
- **120 étoiles** chargées — la limite bureau exacte, donc la requête bornée et
  l'index fonctionnent contre le vrai moteur ;
- la liste masquée porte `role="list"`, `tabindex="0"` et
  `aria-label="Étoiles laissées par les voyageurs"` ;
- compteur « 29 / 80 » juste sur la phrase saisie ;
- Entrée → le formulaire se vide, aucun message d'erreur ;
- le document écrit dans l'émulateur porte **exactement** `approuvee: false`,
  `creeLe` (serverTimestamp), `phrase`, `x`, `y` — et pas de `prenom`, omis
  parce que vide, comme les règles l'exigent ;
- l'étoile est dans `localStorage` et dans la liste (121) avant approbation ;
- basculée en `approuvee: true` par l'API de l'émulateur (ce que fait la
  console), elle apparaît au rechargement **en tête de liste**, « à l'instant »,
  et le total **reste à 120** : le plafond tient et il n'y a pas de doublon ;
- survol de l'étoile → la bulle montre la phrase en Inter Light et l'âge en
  mono, et **se recale vers la gauche** pour ne pas sortir de l'écran : le
  correctif de la tâche 8 fonctionne dans un vrai navigateur ;
- la nouvelle étoile est bien la plus brillante du ciel (§5).

Deux observations à porter à Emmanuelle :
1. **La place tirée tombe dans un coin.** `tirerPlace` a rendu x = 0,997 /
   y = 0,980, c'est-à-dire le bord droit, à mi-hauteur : l'étoile est à moitié
   coupée par le bord de la fenêtre. C'est inhérent au « plus éloignée des
   autres parmi 40 tirages » — les coins sont toujours les plus éloignés. À
   voir si ça se reproduit ; une marge dans le tirage le corrigerait.
2. **Le massif occupe une grande part de la bande de ciel** (mesuré : sommet à
   ~142 px, bande 116→386 sur 1512×771). Le ruling 7 supposait le recouvrement
   marginal : il ne l'est pas. La question reste visuelle.

## Décisions d'Emmanuelle après l'épreuve à l'œil (14/11/2026)

1. **Le défaut parqué (ruling 19) est abandonné.** Hors ligne, quitter « là-haut »
   dans les dix secondes et revenir laisse le champ verrouillé et muet. Expliqué
   en clair, elle a répondu « non on s'en fout ». Ce n'est donc plus une dette :
   c'est un choix. Ne pas le ressortir à l'étape 5.
2. **Le ruling 7 est renversé, mais pas comme je le croyais.** Ce qui la gênait
   n'était pas que les étoiles-voyageuses soient cachées : c'est que **la
   poussière d'étoiles** s'arrête net sur la silhouette du massif, laissant tout
   le flanc sombre d'un noir absolu au milieu d'un champ d'étoiles dense. Sa
   demande, mot pour mot : « tout l'écran, mais ça doit être de la poussière
   d'étoile, des étoiles inactives, juste pour la cohérence artistique, pas des
   étoiles hoverable qui nuirait à la lisibilité ».
   Portée choisie par elle : **devant le massif, derrière le train.**
   Les étoiles-voyageuses gardent leur nombre, leur zone et leur survol — elles
   cessent seulement d'être cachées. Aucune étoile survolable n'est ajoutée.
