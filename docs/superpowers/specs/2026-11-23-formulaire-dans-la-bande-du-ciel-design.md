# Le formulaire de « là-haut » dans la bande du ciel

2026-11-23 · petit changement · étape 2

## Intention

Emmanuelle, le 22 novembre : « ce qui me gêne c'est **la position et la
lisibilité** du formulaire, je sais pas trop quoi en penser. **quitte à
repenser le design** ».

Cela **rouvre un non-but** de la spec du 14 novembre
(`2026-11-14-formulaire-lisible-design.md`), qui posait la place hors du débat
sur ses mots d'alors — « ça me dérange pas que le bloc traverse la montagne,
même sur téléphone ». Elle l'a rouvert elle-même ; on ne resservira pas ce
non-but.

Quatre emplacements lui ont été montrés sur de vraies captures de `/la-haut`, à
trois moments de la rotation du massif, avec le grain mesuré sous les lignes de
texte : https://claude.ai/artifact/2UnBMumtQEJT8PWxC4fPfh

## Ce que la mesure a établi

Part de la surface des lignes de texte posée sur de la **masse** (blocs de
20 × 20 px dont plus de 8 % des pixels sont allumés — ce qui compte la
montagne et non les étoiles isolées) :

| | lien direct (legs 0) | ~11 tours (43) | pire cas (88) |
|---|---|---|---|
| **Téléphone, aujourd'hui** (top 176) | 14 % | — | 12 % |
| **Téléphone, la bande** (top 118) | **2 %** | — | **2 %** |
| **Bureau, aujourd'hui** (droite, 280 px) | 0 % | 0 % | 0 % |
| **Bureau, la bande** (centrée, top 124) | 3 % | 3 % | 4 % |

Deux choses à ne pas confondre :

- **Au téléphone, le gain est le vrai sujet.** À `legs 0` — l'état de tout lien
  partagé vers `/la-haut` — les crêtes arrivent à 215 px et le bloc actuel
  occupe 176 à 323 : le formulaire est sur la montagne **par défaut**, pas dans
  un cas rare. La bande divise cette surface par sept.
- **Au bureau, la bande est un peu moins bonne que l'actuel**, qui est à 0 % aux
  trois moments : le coin haut-droit est toujours noir, parce que le massif
  culmine au centre. Les 3 à 4 % de la bande sont le haut des crêtes et des
  étoiles. **Emmanuelle a vu 0,0 % affiché pour l'actuel au bureau quand elle a
  choisi** : le choix de la bande est donc un choix de composition et de
  téléphone, payé par ces 3 à 4 % au bureau, que la tache couvre.

Un troisième fait, acquis gratuitement : `Dissolve.ts` rastérise la phrase dans
un canevas large comme le champ. En passant de 280 à 730 px, **la phrase
entière devient grain** — les 38 / 80 caractères relisibles d'aujourd'hui
disparaissent sans qu'on ait à écrire la dissolution multi-ligne.

## Ce que la bande du ciel coûte, mesuré après coup

Trouvé en implémentant, le 23 novembre, et porté à Emmanuelle avant d'aller plus
loin : **`cibleDuGrain` projette les places par `cadrageCiel`, et le ciel où les
étoiles se posent ne couvre pas l'écran.** Il va de `y = 96` à `y = 161` en
1512 × 682, et de 96 à 197 en 390 × 772 — une bande de 65 px de haut au bureau,
collée sous la frise.

C'est exactement la bande que le formulaire vient occuper. Tache comprise, le
bloc tient de 84 à 314 sur 730 px de large : il recouvre donc **toute la bande
d'étoiles sur environ la moitié de la largeur de l'écran**, et non « quelques
étoiles » comme la décision du 22 novembre le laissait entendre. La montée du
grain, du même coup, passe d'environ 182 px à environ 50 px.

**Emmanuelle a tranché une seconde fois, avec ces chiffres sous les yeux : « on
garde la bande du ciel en sachant qu'elle couvre les étoiles ».** La décision 4
(ne rien changer au placement des étoiles) tient donc, en connaissance de cause.
Ne pas la rouvrir.

Conséquence sur la décision 5 : l'arc ne se déclenche jamais au bureau, où
toutes les places sont au-dessus de la phrase. Il sert au téléphone, où le ciel
descend plus bas que le champ.

## Buts

- Le formulaire ne se lit plus par-dessus la montagne au premier écran d'un
  téléphone.
- Les quatre textes gagnent un cran de hiérarchie, pour que la lisibilité ne
  dépende plus seulement du fond.
- Le champ phrase est assez large pour qu'on relise ce qu'on écrit.

## Non-buts

- Le champ multi-lignes, les états du bouton, le mot sur la modération : ce sont
  les directions A, B et C de https://claude.ai/artifact/XJAHjNSUsT4gQym6257o5D,
  qui n'ont pas été retenues ici et restent ouvertes.
- Le massif, la frise, la limite de 80 caractères.

## Anti-buts

- Un cadre, une boîte, un panneau (CONCEPT §2 et §4.3). Inchangé.
- Annoncer ce qui va se passer (§4.3). Inchangé.
- **L'anti-but « ne pas éclaircir le texte » du 14 novembre tombe**, par décision
  d'Emmanuelle du 22 novembre : c'est exactement ce que « hiérarchie remontée
  d'un cran » veut dire. Il ne tombe que **dans ce bloc**, jamais dans
  `base.css`.

## Contraintes

- La tache reste prise sur `--fond` et jamais sur une couleur figée (§6). À
  « là-haut », `--fond` vaut `#000000`, mais l'œil le change.
- `.phrase` doit garder `300 17px Inter` : un test confronte cette déclaration à
  `POLICE` dans `Dissolve.ts`. **Rien ici n'y touche.**
- La frise porte `z-index: 2` et le formulaire n'en porte aucun : la frise passe
  donc au-dessus de la tache, quelle que soit la remontée du bloc.
- `--moyen`, `--faible` et `--murmure` servent aussi à la frise, à la bulle et au
  panneau : la hiérarchie remontée se règle **sur `.trace` seulement**.

## Approches

Quatre emplacements montrés dans la scène, chacun à trois moments du massif :

| | Ce que ça donne | Verdict |
|---|---|---|
| **(a) la bande du ciel** — haut, centré, large | la seule zone que le massif n'atteint jamais au téléphone ; le champ s'élargit, donc la phrase entière devient grain ; c'est l'endroit le plus évident de l'écran | **retenue** |
| (b) aujourd'hui — à droite, 280 px | 0 % de masse au bureau, mais 12 à 14 % au téléphone, et 38 / 80 caractères relisibles | écartée |
| (c) la ligne du bas — pleine largeur | 80 / 80 relisibles et le ciel laissé libre, mais 12,7 % de masse au pire cas, le texte sur le reflet, contre le train, et le clavier la recouvre au téléphone | écartée |
| (d) la colonne de gauche | même grille que « ici », mais le flanc gauche démarre vers x = 135 : aucun gain de lisibilité, aucun gain de largeur | écartée |

Deux questions que (a) ouvrait, tranchées par Emmanuelle le 22 novembre :

- **Les étoiles sous le bloc : on ne change rien.** `tirerPlace` tire dans tout
  le ciel et ne réserve aucune zone ; des étoiles continueront donc de s'allumer
  sous le formulaire, et la tache les éteindra — y compris, parfois, celle que
  le visiteur vient d'écrire. C'est la même entorse qu'elle avait acceptée pour
  le massif le 14 novembre. **`tirerPlace` et `stars.ts` ne sont pas touchés.**
- **La montée du grain devient un arc.** Depuis la bande haute, presque toutes
  les places libres sont en dessous ; `controleVers` place son point de contrôle
  entre le départ et l'arrivée, et le grain descendrait tout du long. Le « seul
  grain qui monte » du §4.3 deviendrait une chute. Il montera donc d'abord, puis
  redescendra vers sa place.

## Ce qui est décidé

Décisions d'Emmanuelle :

1. **Le bloc passe dans la bande du ciel** : haut, centré, large.
2. **La hiérarchie du texte remonte d'un cran**, dans ce bloc seulement.
3. **La tache de nuit est gardée**, telle qu'elle a été décidée le 14 novembre
   (une seule tache, dégradé radial mélangé depuis `--fond`, `z-index: -1`).
4. **Rien ne change au placement des étoiles.**
5. **Le grain fait un arc** quand sa place est plus basse que le formulaire.

## Mes choix, qu'elle n'a pas vus

À lui montrer en mouvement avant de les figer ; ce sont des réglages d'œil, pas
des conséquences.

- **Largeur de 730 px au bureau** (elle a vu 640). À 640, une phrase courante de
  80 signes tient — entre 554 et 600 px — mais pas une phrase de caractères
  larges : 80 « x » font 722 px. **La mention « 80 / 80 » affichée dans la page
  valait pour une phrase courante, pas pour toutes.** 730 les couvre toutes. En
  dessous de 854 px de fenêtre, la largeur suit le viewport moins la marge.
- **`top: 124px` au bureau, `top: 118px` au téléphone.** Posé à 112 px, le bloc
  ne gagne rien de mesurable (3 à 4 % dans les deux cas) et sa tache s'étend sur
  toute la hauteur des libellés de la frise.
- **Centré plutôt qu'aligné à droite.** Les deux se valent à la mesure (3/3/4 %
  contre 2/4/0 %) ; le centrage est ce qu'elle a vu et choisi.
- **L'`inset` de la tache est à reprendre.** Les valeurs actuelles
  (`-40px -56px`) ont été calculées pour un bloc de 280 px ; sur un bloc de
  730 px, la géométrie du dégradé radial change — le commentaire de
  `.trace::before` explique pourquoi les arrêts fixent le bord et pas l'inverse.
- **Les quatre valeurs de la hiérarchie remontée** sont celles qu'elle a vues
  dans la page : titre `--fort` (0,95), placeholder `--moyen` (0,6), ligne méta
  12 px à `--moyen`, trait des champs `--faible` (0,42). Elle a validé l'effet,
  pas les nombres.

## Laissé au constructeur

- La tenue du bloc entre 720 et 1512 px de fenêtre.
- La forme exacte de l'arc dans `controleVers` : de combien le grain monte avant
  de redescendre, et à partir de quel écart vertical l'arc se déclenche.
- Les tests : `GareLaHaut.test.ts` vérifie la tache par son CSS et les deux
  bornes de saisie, rien sur la place ; `Dissolve.ts` n'a pas de test sur la
  courbe (jsdom n'a pas de canvas), donc l'arc se juge à l'œil.

## Critère d'acceptation

Validé **en mouvement** sur `/la-haut`, au bureau et au téléphone — jamais sur
une capture, comme les réglages du massif, de la terre et du poteau.
