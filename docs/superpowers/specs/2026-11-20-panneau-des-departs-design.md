# Le panneau des départs : un fond, et qu'il fasse gare

2026-11-20 · petit changement · étape 4

## Intention

Le panneau des prochains départs vient d'être recentré sur le corps de la gare,
sous l'horloge. Deux choses s'y voient, qu'Emmanuelle a nommées : **« on le lit
mal »** et **« il ne fait pas assez gare »**.

On le lit mal parce qu'il n'a pas de fond. Son intérieur n'est pas rempli — la
nuit se voit au travers, c'était la décision d'origine (`tracerCadrePanneau`) —
et maintenant qu'il est au milieu du mur, ce sont les trois fenêtres cintrées du
corps de gare qui passent à travers le texte : les meneaux coupent `LINKEDIN`,
`CV` et `ÉCRIRE`, c'est-à-dire les trois seuls liens de la page.

Il ne fait pas assez gare parce qu'il ne fait rien d'autre que d'être un
rectangle : deux filets concentriques, une ligne sous l'en-tête, deux pieds. Il
ne reprend aucun des gestes du reste de la scène, et sa moitié basse est vide —
six lignes dans un cadre qui en tiendrait dix.

C'est le seul endroit de la scène où l'on demande quelque chose au visiteur :
les trois départs réels sont LinkedIn, le CV et l'adresse mail.

## Buts

- Le texte se lit sur le mur, quelle que soit la couleur du fond et quoi qu'il y
  ait dessiné derrière.
- Le panneau appartient à l'univers de la scène : on doit pouvoir dire de quel
  autre élément il tient son allure.
- Le cadre est rempli de haut en bas : plus de vide sous la dernière ligne.

## Non-buts

- **Sa place et sa taille.** Il vient d'être centré sur le corps de gare
  (340 × 250 px de cadre, en haut à `y = 640`). On n'y revient pas.
- **Son contenu.** Les trois départs réels, le vivier des destinations éteintes,
  les statuts : rien ne bouge, sauf le *nombre* de lignes éteintes.
- Le dessin de la gare, l'horloge, le réverbère.

## Anti-buts

- **Toute mi-teinte.** Un voile semi-transparent par-dessus le mur ferait des
  gris du trait de la gare : c'est exactement ce que la décision 12.2 du CONCEPT
  refuse, et ce que `assets.test.ts` garde partout ailleurs. Le fond est opaque
  ou il n'est pas.
- **Le tableau à volets** (le Solari des aéroports, chaque ligne dans sa
  cellule). Très « départs », mais c'est 1960 : contre une gare et une
  locomotive à vapeur de 1880, il jurerait avec le dessin.
- **Un panneau qui se dispute la lumière avec la lanterne.** Le réverbère est la
  source de la gare et doit rester la chose la plus claire de l'écran (§5.4).

## Contraintes

- « Blanc ou absent » (CONCEPT §12.2). Les seules entorses assumées sont des
  **sources** — lueur de la lanterne, faisceau, halo de l'horloge, halo des
  vitres —, et des dégradés. Le panneau n'est pas une source : il n'a droit
  qu'au blanc plein, au noir, et à rien entre les deux.
- Le cadre vit dans la racine **allumée** (`lumieres`), qu'aucune teinte de nuit
  n'atteint. Mais `lumieres` est un enfant de `decor`, qui porte le filtre de
  recoloration : **le noir du projet (`0x0b0b0c`) y devient la couleur du
  fond.** C'est ce qui rend un fond opaque possible sans figer une couleur —
  vérifié dans `Scene.ts` (`decor.addChild(massif, ciel, plateauFond, lumieres,
  plateau)` puis `decor.filters = [recolor]`). C'est aussi le tour que font déjà
  les aiguilles de l'horloge sur son cadran blanc.
- **Le texte est du DOM**, pas du canvas, et le restera : trois de ses lignes
  sont des liens, et le focus clavier, la sélection, le lecteur d'écran et le
  `mailto:` viennent gratuitement avec. Le cadre est du canvas. Tout ce qui doit
  suivre le texte au pixel près se dessine donc en CSS, pas en cellules.
- **`GRAIN_ECRAN = 1.5` px d'écran** est l'unité de grain du projet, réglée à
  l'œil par Emmanuelle sur le massif. Le trait du cadre ne peut pas descendre
  en dessous d'une cellule : *j'avais écrit qu'on le mettrait « au trait du
  dessin de la gare » — c'est inexact, et l'allègement vient d'ailleurs (voir
  ci-dessous).*
- Le halo de l'horloge descend à `y ≈ 666` et le haut du panneau est à 640 :
  ils se chevauchent sur 26 px. Le bandeau plein prendra cette lueur. Constaté,
  pas corrigé — à regarder dans la scène.

## Approches

**A — Le cartouche à bandeau inversé.** *Retenue par Emmanuelle.* Un fond
opaque, un seul cadre à coins biseautés, un bandeau d'en-tête en blanc plein où
le texte est creusé à la couleur du fond, et deux consoles contre le mur à la
place des pieds. Il fait gare par un geste que la scène possède déjà — le cadran
blanc de l'horloge aux aiguilles creusées — plutôt que par de la densité.
*Coût :* le bandeau devient la deuxième chose la plus claire de l'écran après la
lanterne ; sa hauteur est le réglage.

**B — L'indicateur réglé.** L'indicateur imprimé des chemins de fer : filets
verticaux entre heure, destination et statut, filet sous chaque ligne, rien de
blanc plein. *Coût :* beaucoup de traits sur 250 px de haut, qui risquent de
faire grille et de se battre avec le trait fin de la gare juste derrière.

**C — Le tableau à volets.** Écartée avant d'être proposée : anachronique (voir
anti-buts).

## Ce qui est décidé

1. **Fond opaque.** L'intérieur du cadre est rempli au noir du projet
   (`0x0b0b0c`), que le filtre rend à la couleur du fond. Le mur disparaît
   derrière. C'est le même procédé que le corps du train, qui éteint ce qu'il
   traverse. La décision d'origine — « son intérieur n'est pas rempli, la nuit
   se voit au travers » — est **remplacée**, et son commentaire avec.

2. **Un seul cadre, aux coins biseautés.** Le filet intérieur
   (`PANNEAU_FILET`) disparaît : c'est de là que vient l'allègement, pas d'un
   trait plus fin, qui est impossible. Les quatre coins sont coupés à 45° sur
   `PANNEAU_BISEAU = 12` px de cadre — quatre segments droits et quatre
   diagonales, que `ligneCellules` sait déjà tracer.

3. **Bandeau d'en-tête en blanc plein.** Il occupe toute la bande d'en-tête,
   d'un bord intérieur à l'autre ; `PROCHAINS DÉPARTS` et l'heure y sont creusés
   à la couleur du fond. `PANNEAU_ENTETE` passe de 56 à **46** px de cadre :
   moins de blanc, et les 11 px du texte y tiennent. **C'est le réglage de
   luminosité du panneau** — si le bandeau mange la scène, c'est ce nombre qu'on
   baisse, et en dernier recours on n'inverse que les mots au lieu de la bande.

4. **Un filet entre le réel et l'éteint**, sous la troisième ligne. En CSS et
   non en cellules, parce qu'il doit suivre le texte au pixel près ; en
   pointillé, pour rappeler le grain du reste.

5. **Huit lignes au lieu de six** : `departsEteints(…, 5)` au lieu de 3. Le
   vivier en compte douze, le tirage sans répétition tient. Le vide du bas
   disparaît.

6. **Deux consoles à la place des deux pieds.** Le panneau est sur un mur
   maintenant, il n'a plus besoin de jambes : les deux montants qui descendaient
   jusqu'au rail deviennent deux petites consoles en quart de cercle sous le
   cadre, qui reprennent les corbeaux des marquises du dessin. *C'est le seul
   point qui change la silhouette et non la surface — et donc le plus facile à
   retirer si tu le regrettes : les pieds reviennent en une ligne.*

## Ce qui reste au constructeur

- La forme exacte de la console (rayon, retrait, épaisseur) : à poser à vue dans
  la scène, comme le reste des réglages du §7.
- L'écriture de l'arc en cellules (il n'existe que `ligneCellules` et
  `rectCellules`).
- Les tests à reprendre : « les pieds du panneau descendent jusqu'au rail »
  (`QuaiLayer.test.ts`) ne vaut plus si les pieds partent, et il faut un garde
  qui dise que le fond est bien opaque et que le panneau n'allume rien à
  mi-teinte.
- L'accord entre `PANNEAU_ENTETE` (canvas) et la marge de `.entete` (CSS), qui
  se touchent déjà aujourd'hui.
