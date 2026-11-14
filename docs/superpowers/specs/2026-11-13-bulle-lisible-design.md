# Rendre lisible la bulle de survol d'une étoile

2026-11-13 · petit changement · étape 2

## Intention

La phrase d'une étoile survolée est écrite à même la scène, sans rien derrière.
Deux situations la rendent illisible :

1. **Elle traverse la frise.** `StarTooltip.vue` décide de passer au-dessus de
   l'étoile avec `y - ECART - HAUTEUR_MAX >= 0` : elle mesure la place contre le
   haut de la fenêtre, alors que les 116 premiers pixels appartiennent à la
   navigation. Toute étoile posée entre ~124 px et ~240 px du haut écrit donc sa
   phrase en travers de « ici » et « PROCHAIN ARRÊT ».
2. **Elle tombe sur le grain blanc du massif.** Rien derrière le texte : la ligne
   méta (mono 10 px, opacité 0,6) y disparaît — prénom et âge perdus.

Le ciel est le cœur du site : « chaque étoile est quelqu'un qui est passé par
ici ». Une phrase qu'on ne peut pas lire vide le geste de son sens.

## Buts

- La phrase **et** sa ligne méta se lisent partout : sur la nuit, au bord de la
  frise, sur le grain du massif, quelle que soit la couleur de la nuit.

## Non-buts

- Le placement des étoiles, la bande du ciel, les données. Les places sont
  tirées une fois et voyagent avec la trace (CONCEPT §5) : on n'y touche pas.
- La frise elle-même.

## Anti-buts

- Un cadre, une boîte, un panneau. Le site n'a qu'une matière (CONCEPT §2) et
  ses formulaires sont « sans cadre ». *Dérogation actée — voir « Ce qui est
  décidé » §2 : la tache retenue a une arête, au bénéfice de la lisibilité.*
- Atténuer la frise pendant le survol : c'est la navigation, elle clignoterait à
  chaque étoile.

## Contraintes

- « Dans tous les assets, le noir devient la couleur du fond » (CONCEPT §6) : le
  fond de la bulle se prend sur `--fond`, jamais sur une couleur figée, pour
  suivre l'œil.
- La frise est une bande fixe de 116 px — `HAUTEUR_FRISE`, dans `scene/layout.ts`.
- `color-mix()` : Chrome 111+, Safari 16.2+.

## Approches

Les trois fonds ont été comparés **en jetable dans l'appli**, sur la même étoile,
bulle posée en plein sur le grain du massif.

| | Ce que ça donne | Verdict |
|---|---|---|
| **(a) rien**, placement seul | la phrase passe encore, la ligne mono se noie | écartée |
| **(b) halo de nuit** autour des lettres (`text-shadow` empilés) | lisible, et le halo ne dessine presque aucune forme | écartée |
| **(c) tache de nuit** derrière la bulle | la plus lisible des trois, nettement | **retenue** |

(b) a été durcie deux fois (4 → 7 → 9 ombres empilées) et le gain plafonne.
*Ma lecture, non vérifiée* : là où une lettre tombe sur le grain le plus clair,
ce qui manque serait le contraste de la lettre elle-même, pas l'obscurité
derrière. Le test qui l'aurait montrée (ligne méta remontée à 82 %) n'a pas été
capturé.

(c) coûte le grain : elle efface visiblement le massif derrière la bulle. Prix
regardé et accepté par Emmanuelle.

Le seuil de bascule haut/bas se corrige indépendamment du fond choisi : c'est un
défaut, pas une option.

## Ce qui est décidé

1. **Le seuil.** `dessus` se mesure contre le bas de la frise :
   `y - ECART - HAUTEUR_MAX >= HAUTEUR_FRISE + DEGAGEMENT_FRISE`, avec
   `DEGAGEMENT_FRISE = 8`. `HAUTEUR_FRISE` s'importe de `scene/layout.ts` — on ne
   recopie pas 116.
2. **La tache.** Un `::before` sur `.bulle`, `inset: -16px -28px`,
   `z-index: -1`, dégradé radial `ellipse at center`, arrêts sur `--fond` via
   `color-mix` : 94 % à 0 %, 88 % à 35 %, 78 % à 62 %, 0 % à 100 %.

   **Son bord est connu et assumé.** Avec `ellipse at center`, le
   `farthest-corner` implicite place le milieu des côtés à 1/√2 ≈ 71 % du rayon,
   où le dégradé est encore opaque à ~60 % : la boîte l'y coupe net, et sur le
   grain clair cela dessine une marche droite, visible en bas à gauche de la
   bulle. Une variante sans arête a été construite et comparée — un fond
   `color-mix(--fond 96%)` flouté à 11 px, qui déborde de sa boîte au lieu
   d'être coupé par elle. Emmanuelle a regardé les deux côte à côte sur le même
   grain et a tranché pour le dégradé, qu'elle trouve plus lisible. La
   lisibilité prime ici sur l'anti-but « pas de boîte ».

3. La hiérarchie du texte ne change pas : `.phrase` à `--fort`, `.mention` à
   `--moyen`.

## Ce qui reste au réalisateur

- **Un test** qui échoue contre l'ancien code : prendre un `y` **entre 124 et
  247** (par exemple 200) et attendre `data-sens="dessous"`. Plus haut que 124,
  l'ancien `>= 0` donnait déjà « dessous » et le test ne prouverait rien. Les
  deux tests de bascule existants de `StarTooltip.test.ts` doivent rester verts
  (ils testent y = 300 et y = 20, de part et d'autre de l'ancien comme du
  nouveau seuil).
- **À vérifier à l'œil** : la tache sur `noir`. Elle a été regardée sur `encre`
  et sur `vieille photo`, pas sur `noir`.
- **Si l'arête finit par gêner** : la variante floutée est décrite ci-dessus et
  se substitue au seul bloc `::before`, sans rien changer d'autre.
- **Repartir de `git checkout -- src/components/StarTooltip.vue`**, et surtout
  **ne pas raboter le jetable** : les lettres n'y veulent plus dire la même
  chose que dans cette spec (`data-tache='b'` y désigne la v1, celle qu'on
  garde) et le jetable laisserait des traces — attribut, écouteur de touches,
  repère.
- Le test de bascule vérifie aussi **la position**, pas seulement le sens : à
  y = 200, attendre `data-sens="dessous"` *et* `top: 214px`. C'est la position
  qui était fausse, et le test existant à y = 20 est écrit ainsi.
