# Le panneau des départs descend du haut, tenu par deux bras

2026-11-20 · projet · étape 4

## Intention

Le panneau des prochains départs porte **les trois seuls liens du site** :
LinkedIn, le CV, l'adresse mail. On a passé la journée à le faire tenir sur le
mur de la gare — opaque, recentré, élargi, raccourci — et Emmanuelle a tranché
la vraie question en une phrase : « on aurait dû le faire sortir du plafond avec
une animation, et arrêter d'essayer de le faire rentrer dans la scène en tout
petit ».

Il cesse donc d'être un détail du décor accroché à un mur. Il devient **un
panneau suspendu qu'on descend sur la scène** : grand, au-dessus du massif,
**tenu par deux bras** qui montent jusqu'au bord de l'écran — et qui, étant minces, passent entre les libellés de
la frise au lieu de les couvrir. C'est elle qui a trouvé ça, et c'est une
meilleure réponse que l'ordre d'empilement que je proposais.

Puis il met deux ou trois secondes à *dire* ce qu'il affiche, volet par volet,
comme un tableau de grande gare.

Rien de ce qu'on a fait sur sa **surface** n'est perdu — fond opaque, bandeau
d'en-tête creusé, points de conduite, coins biseautés : tout déménage avec lui,
en plus grand. Ce qui est jeté, c'est sa place et sa taille.

## Buts

- **C'est la chose qu'on regarde quand on l'appelle.** Il occupe la moitié de
  la largeur et descend du haut.
- **On le range quand on veut regarder la scène**, et on le rappelle. C'est la
  même commande dans les deux sens.
- **La descente et l'affichage sont l'événement.** On mise dessus.
- **Les trois liens marchent de bout en bout** — focus clavier, sélection,
  lecteur d'écran, `mailto:` — y compris pendant que les volets tournent.
- **La frise reste entière**, lisible et cliquable, tout le temps.

## Non-buts

- **Le dessin de la gare, l'horloge, le réverbère, la place de la rame.** Tout
  cela vient d'être réglé. Le mur de la gare redevient nu, c'est tout.
- **La surface du panneau** : reprise telle quelle, à la nouvelle échelle.
- **Le contenu** : trois départs réels, deux éteints, inchangés. À cette taille
  ce n'est pas le nombre de lignes qui grandit, c'est le corps du texte.
- **Le son.** « Le bruit compris » décrivait le Solari, pas une demande.

## Anti-buts

- **Perdre la navigation.** Les bras existent pour ça : s'ils coûtaient la
  frise, ils ne serviraient à rien.
- **Faire lire des lettres qui ne veulent rien dire.** Pendant les volets, trois
  des cinq lignes sont des liens.
- **Une mi-teinte de plus.** Le panneau n'est pas une source. Son trait garde
  ses cellules de grain.
- **Une animation qu'on ne peut pas couper** (`prefers-reduced-motion`).
- **Retenir le train pour laisser finir une animation.** Voir la décision 6.

## Contraintes

- **La scène ne connaît pas Vue.** Elle est informée de ce que tient le magasin,
  et elle rend compte par des événements (`useScene`). Le précédent est `frame`.
  Toute solution qui demanderait à la scène de *retenir* le magasin inverse ce
  sens unique et est écartée d'office.
- **Le panneau est en deux couches et le reste** : le trait est un `Graphics`,
  le texte est du DOM — parce que trois de ses lignes sont des liens.
- **GSAP est déjà dans la scène** (`Dissolve`, `Scene.setFond`) et nulle part
  ailleurs : `purity.test.ts` surveille les imports.
- « Blanc ou absent » (CONCEPT §12.2).
- **Le haut de la scène n'est pas rogné : il est descendu.** `cadrageScene`
  ajoute un décalage qui annule le rognage du *cover* puis descend encore — +20 px
  à 1440 × 900 et à 1512 × 771, +9 px à 2560 × 1080, +60 px sur un téléphone.
  Il y a donc toujours une bande de fond **au-dessus** du cadre de scène. Un
  panneau dont le bord haut serait à `y = 0` flotterait sous le bord de l'écran
  au lieu d'y pendre, et un panneau « rangé » à `y = −hauteur` laisserait son
  filet du bas en travers du haut de l'écran. *Cette contrainte corrige une
  prémisse fausse de la première version de ce document.*
- **La rame freine en ≈ 3,6 s et démarre en ≈ 1,8 s** (`PHASE_FREINAGE`,
  `PHASE_ROULE`). Toute animation d'arrivée ou de départ se joue contre ces
  durées-là.

## Place et taille

Relevées sur le cadre rouge d'Emmanuelle, relu à la lumière des bras : le trait
horizontal qu'elle avait tracé dedans est **le haut du panneau**, et la zone
au-dessus est celle des bras, que la frise traverse.

| | de | à | taille |
|---|---|---|---|
| en x | 551 | 1678 | **1127** |
| en y (plaque, posée) | 340 | 669 | **329** |
| bras | du bord de la fenêtre | 340 | deux, **2 px** |

Rangé, le panneau sort **complètement** du champ : rien de lui ne reste à
l'écran, puisque ce n'est plus lui qui porte sa commande.

Les bras sont à **9 % de chaque bord** de la plaque, ce qui les place entre
« ailleurs » et « ici » d'un côté, entre « ici » et « plus loin » de l'autre :
ils ne croisent que le filet de la frise, jamais un libellé.

**Ces quatre nombres attendent encore son œil.** Le prototype jetable
(`scratchpad/proto`) porte trois curseurs — hauteur du bandeau, épaisseur des
bras, hauteur du haut de la plaque — et c'est là qu'elle les pose.

## Approches

**A — Deux couches, et c'est la scène qui descend.** Le trait reste un
`Graphics`, le texte reste du DOM. La scène possède la descente (une timeline
GSAP, comme `Dissolve`) et **émet la position du panneau à chaque image** ; Vue
y accroche le texte, comme il accroche déjà sa place au `frame`.
*Coût :* un événement de plus et la discipline d'une seule source.
*Gain :* le trait en cellules de grain, signature de tout le décor.

**B — Le panneau devient entièrement du DOM.** Descente et volets triviaux.
*Coût :* le trait de grain — une bordure CSS à côté d'un dessin gravé, c'est un
widget collé sur une image.

**C — Entièrement du canvas.** *Écartée :* on perd les trois liens.

**Retenue : A.**

## Ce qui est décidé

1. **Place, taille, bras** : le tableau ci-dessus. `PIECES.panneau` passe de
   440 × 166 à **1127 × 329**, et son `y` devient une position **au repos**.

2. **Le panneau ne fait plus partie du quai.** *C'est le changement de structure
   de ce document, et il ne figurait pas dans la première version.* Aujourd'hui
   le cadre vit dans la racine allumée du quai, dont l'abscisse est reposée à
   chaque image sur la distance de l'île : il **voyage avec la gare**. Un rideau
   pendu au bord de l'écran ne voyage pas — s'il restait là, il glisserait
   latéralement de quelques centaines de pixels pendant qu'il monte ou descend,
   avec ses trois liens cliquables en travers de l'écran. Il reçoit donc sa
   propre couche, fixe en `x`, montée là où la frise ne l'atteint pas.
   Conséquence : il sort de `bords` / `fins` dans `quai.ts`, donc de l'emprise
   de la gare et de la bordure du quai, qui reprennent la largeur du bâtiment.

3. **Les bras montent jusqu'au-delà du bord de la fenêtre**, pas jusqu'au haut
   du cadre de scène — il y a entre 9 et 60 px de fond au-dessus de lui. Ils
   sont assez longs pour sortir de l'écran à toutes les tailles, et c'est le
   rognage qui les coupe, pas un calcul.

4. **Le panneau ne descend pas de lui-même. C'est l'horloge de la gare qui le
   baisse et le relève**, d'un clic, autant de fois qu'on veut. *Décision
   d'Emmanuelle, contre ma proposition* — je voulais qu'il descende seul à
   l'arrivée pour que personne ne manque les trois liens. Elle a tranché
   l'inverse, et le coût est celui-là : **les trois liens sont derrière une
   découverte.**

   L'horloge est le bon objet : elle existe déjà, elle est déjà allumée et
   vivante, elle reste dégagée quand le panneau est baissé, et « cliquer
   l'horloge de la gare pour voir les départs » se raconte en six mots.

   Trois choses en découlent, et ce sont mes choix :
   - **L'horloge s'éclaire au survol**, un peu, comme les étoiles.
   - **Elle bat une fois quand le train s'arrête** — deux pulsations de son halo,
     et plus rien. C'est le seul rattrapage de la découverte, et c'est une ligne
     à retirer si ça agace.
   - **Elle est doublée d'une commande au clavier.** L'horloge est dessinée dans
     le canvas, donc ni focalisable ni annoncée ; or elle commande le seul
     endroit du site qui porte LinkedIn, le CV et l'adresse mail. Un bouton de
     DOM, invisible mais focalisable, posé sur elle, la rend atteignable à la
     tabulation et au lecteur d'écran. **Sans lui, ces trois liens n'existent
     pas pour qui n'a pas de souris**, et ça, ce n'est pas un réglage.

5. **Les volets.** Les lignes se figent **de haut en bas**, les caractères de
   gauche à droite. L'en-tête se pose en premier. Le **vrai texte est dans le
   DOM du début à la fin**, avec ses `href` ; ce qui tourne est une couche
   décorative `aria-hidden` posée dessus. Même décision que les points de
   conduite, même raison.

6. **Au départ, s'il est baissé, il remonte pendant que la rame s'ébranle.** Le
   train ne l'attend pas : le faire attendre demanderait à la scène de retenir
   le magasin, c'est-à-dire d'inverser le sens unique qui est la règle
   d'architecture du projet. *Mon choix.*

7. **Le rideau ne réagit pas au CV.** Il reste où il est. *Décision
   d'Emmanuelle, contre ma proposition de le faire remonter :* le CV va être
   repris pour passer **par-dessus tout**, panneau et scène compris.

   **Ce qu'il faut savoir en attendant :** le CV est aujourd'hui un voile à
   78 %, et le panneau se verra au travers — un bandeau de blanc plein large
   d'un demi-écran derrière une colonne de lecture. Ce n'est acceptable que
   parce que la reprise du CV est décidée. Si elle ne se faisait pas, il
   faudrait revenir ici.

8. **Le rideau cache une partie du ciel des visiteurs, et c'est accepté** — il
   en couvre environ 40 %, mais seulement tant que le visiteur l'a lui-même
   baissé, ce qui désamorce largement l'objection. Mais
   **le survol ne doit pas traverser** : aujourd'hui le pointeur passe au
   travers du panneau et peut ouvrir la bulle d'une étoile qu'on ne voit pas. La
   scène doit donc connaître la boîte courante du rideau et y couper le test de
   survol. *Mon choix pour le premier point, défaut à corriger pour le second.*

9. **`prefers-reduced-motion` : le panneau est simplement là**, texte posé, avec
   le fondu court que le composant fait déjà.

10. **Le mur de la gare redevient nu.**

11. **Le petit écran reçoit son propre rendu, et il s'écrit maintenant.**
    *Décision d'Emmanuelle* — le report à l'étape 5 que portait le composant
    avait été écrit pour un panneau de 440 px qui n'avait qu'à rapetisser.

    Le problème : en portrait, la bande de scène visible fait environ 562 px
    quand le rideau en fait 1127. Posé dans la scène, on en verrait la moitié,
    coupée des deux côtés — l'heure sort à gauche, le statut à droite.

    Sous `SEUIL_MOBILE` (720 px, celui que la frise et le ciel emploient déjà) :

    - **le panneau se détache de la scène.** Il n'est plus posé en coordonnées
      de scène mais sur la **fenêtre**, pleine largeur moins une gouttière, et
      il descend du haut de la fenêtre. C'est ce que le commentaire du composant
      anticipait déjà (« panneau détaché de son cadre sous `SEUIL_MOBILE` »).
    - **Les bras restent.** Ils sont l'identité de l'objet, et à 2 px ils ne
      coûtent rien. Ils montent jusqu'au bord de la fenêtre.
    - **La commande change de forme, pas de nature.** L'horloge de la gare est
      **hors du champ visible en portrait** (elle est à 1726, la bande va de 879
      à 1441) : elle ne peut pas commander ce qu'on ne voit pas. Le bouton de
      DOM qui la double pour le clavier (décision 4) devient donc **visible**
      sous le seuil : un petit cadran épinglé dans un coin de la fenêtre,
      au-dessus de la frise. Une seule commande, deux rendus.
    - **Les trois liens tiennent chacun sur une ligne**, lisibles. C'est la
      seule contrainte dure de la mise en page mobile ; le reste — points de
      conduite raccourcis, colonne de statut resserrée ou repliée — est au
      constructeur.

## Ce qui reste ouvert

Rien.

## Ce qui reste au constructeur

- **Les durées et les courbes** : descente, retard entre deux lignes, vitesse
  d'un volet, nombre de glyphes parcourus. Réglages d'œil (§7), à poser dans la
  scène en mouvement.
- **L'alphabet des volets**, et son ordre — y compris pour les chiffres et les
  accentuées (`É` d'« ÉCRIRE », `À` d'« À L'HEURE »).
- **Ce qu'on fait du panneau pendant le trajet** : il est retiré du DOM dès
  qu'on n'est plus à quai ; avec une remontée, il doit survivre assez longtemps
  pour remonter.
