# Étape 5 — relevé d'avant-chantier

2026-11-23 · relevé, pas une spec

Le §13 du CONCEPT donne six chantiers à l'étape 5 : « mouvement réduit,
mobile, clavier, poids des assets, métadonnées et image de partage ». Une
partie a été faite en chemin pendant les étapes 2 à 4, sans être cochée nulle
part. Ce document dit **ce qui est déjà là et ce qui ne l'est pas**, mesuré le
23 novembre 2026 au soir, juste après la clôture de l'étape 4.

Il ne décide de rien. Les chiffres sont à revérifier avant d'y toucher : ils
vieillissent.

## 1. Mouvement réduit — largement fait, trois trous à vérifier

`prefers-reduced-motion` est lu une fois dans `useScene`, passé à `Scene`, et
redescendu : **27 fichiers** le consultent, dont `Birds`, `Faisceau`, `Fumee`,
`NeigeLayer`, `QuaiLayer`, `StarLayer`, `Vitres`, `nuit` et `rideau`. Les
composants Vue ont leurs propres gardes CSS.

Trois couches animent **sans consulter le réglage**. À regarder une par une,
ce ne sont pas forcément trois défauts :

- **`Dissolve.ts`** — la phrase qui se défait en étoile. C'est la plus longue
  animation du site et la plus chargée en mouvement ; c'est le trou le plus
  probable.
- **`Sky.ts`** — le parallaxe de la poussière, 14 px de course, un lissage à
  0,02 par image. Lent, mais continu et lié au pointeur.
- **`Relief.ts`** — son `update()` est à lire avant de conclure.

## 2. Mobile — fait par morceaux, rien de systématique

Ce qui existe : `SEUIL_MOBILE = 720` sert de bascule dans la scène (nombre de
grains, d'étoiles, ancrage de la frise, échelle du quai), et **neuf composants
portent des media queries** — `GareIci`, `GareLaHaut`, `GareAilleurs`,
`PanneauDeparts`, `CvLigne`, `NavFrise`, `StarTooltip`, `VoletTexte`,
`Signature`.

Ce qui n'existe nulle part :

- **Aucun `env(safe-area-inset-*)`** dans tout le projet. Sur un iPhone à
  encoche, la frise et les commandes touchent les barres système.
- **Aucun `100dvh`** ni gestion de la barre d'URL mobile, qui se rétracte au
  défilement et change la hauteur de la fenêtre — donc le cadrage de la scène,
  donc la bande des étoiles.
- Rien sur le **toucher long**, le **pincement**, ni le rebond de défilement.

## 3. Clavier — bon état, deux questions ouvertes

Chaque commande est un vrai `<button>` ou un `<a>`, et **tous portent un
`:focus-visible` visible** : l'œil, le FR/EN, les gares de la frise, les
commandes du panneau, la croix du panneau, les liens du CV, sa croix, les
oiseaux. Le CV prend le focus à l'ouverture (`tabindex="-1"` sur le conteneur)
et le rend en partant ; Échap le ferme. La liste des étoiles est atteignable
(`tabindex="0"`), le champ de « là-haut » répond à Entrée.

Reste à trancher :

- **L'ordre de tabulation n'a jamais été parcouru en entier**, d'une gare à
  l'autre. Personne n'a vérifié ce que ça donne quand le panneau des départs
  est baissé, ou quand une bulle d'étoile est ouverte.
- **Rien ne piège le focus** dans le CV ni dans le panneau : on peut tabuler
  derrière, dans une page qu'on ne voit pas.

## 4. Poids des assets — le vrai chantier

```
public/assets          17 Mo   248 fichiers
  └ train              14 Mo   la séquence du train
  └ massif-carte.png  2,6 Mo
  └ ailleurs            40 ko
  └ oiseaux             20 ko
dist (après build)     26 Mo
```

Le train pèse **à lui seul 82 % des assets**. Le bundle JavaScript dépasse
500 ko et Vite le dit à chaque build. Rien n'a encore été tenté : ni format
moderne, ni atlas, ni chargement différé par gare.

À noter, parce que ça change la cible : l'écran d'attente posé ce soir tient
**4,2 ko gzippés** et s'affiche avant tout le reste. Le poids des assets ne
décide donc plus de la première image, seulement du moment où le train arrive
— mesuré à **1,4 s** en local, cache chaud.

## 5. Métadonnées — rien du tout

`index.html` ne porte que `charset` et `viewport`. Il manque :

- `<meta name="description">`
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`)
- Twitter Card
- `<link rel="canonical">`
- `robots`, et la question de savoir si le site doit être indexé

Le `<title>` existe (« Train de nuit ») et **ne suit pas la langue** : il reste
français quand le site passe en anglais. L'attribut `lang`, lui, a été corrigé
le 23 novembre (commit `44690e7`).

**`hreflang` a été écarté ce soir**, et pour une raison qui vaut encore : la
langue vit dans le `localStorage`, il n'y a qu'une seule URL par page. Rendre
les deux langues adressables (`/en/...` ou `?lang=en`) est un chantier à part,
qu'Emmanuelle n'a pas voulu ouvrir.

## 6. Image de partage — rien

Pas de fichier, pas de balise. Le favicon existe (`favicon.svg` 825 o,
`apple-touch-icon.png` 578 o, une étoile et son halo), mais une image de
partage, c'est 1200 × 630 et un tout autre cadrage.

La question à trancher avant de la fabriquer : **une image fixe, ou une
capture de la scène ?** Le site a tout ce qu'il faut pour se dessiner
lui-même — le grain, le massif, le train — et une image cuite à la recette de
`grain.ts` serait plus juste qu'une capture d'écran. C'est le même geste que
le favicon.

## Hors liste, mais à savoir avant de commencer

- **`base.css` déclare `--fond: #2e2313`** quand `palette.ts` prend `#151517`.
  Le script de tête d'`index.html` pose désormais la bonne nuit avant le
  premier pixel, donc `#2e2313` ne s'affiche plus jamais. Le doublon reste
  dans le code. Vu et non contesté le 23 novembre.
- **La séquence du massif n'existe plus** (dit dans `layout.ts`), mais son
  cadre `MOUNTAIN_SOURCE` reste parce qu'il place le massif sur la scène.
  Ne pas le prendre pour un reste à nettoyer.
