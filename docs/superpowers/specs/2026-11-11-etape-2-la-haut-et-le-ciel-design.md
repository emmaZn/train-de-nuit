# Étape 2 — « là-haut » et le ciel des voyageurs

> Cadrage. Branche `etape-2-la-haut-et-le-ciel`. Prolonge `docs/CONCEPT.md`
> §4.3, §5, §10 : en cas de contradiction, **ce document gagne**, et le §12
> liste ce qu'il faut corriger dans `CONCEPT.md`.

## 1. Pourquoi

Le site sait déjà rouler. Un train traverse un massif, s'arrête dans quatre
gares, la frise glisse, l'URL change. C'est beau et c'est muet : rien de ce qui
est à l'écran ne vient de quelqu'un.

Cette étape est celle où le site se met à écouter. Un visiteur laisse une
phrase, elle se défait sous ses yeux et monte s'allumer dans le ciel. C'est le
seul endroit du site où la métaphore est **vue** au lieu d'être racontée, et
c'est la séquence dont on se souviendra.

## 2. Ce qui doit exister à la fin

La gare « là-haut » porte un formulaire. On écrit une phrase, on appuie sur
Entrée, l'animation se joue, une étoile de plus brille dans le ciel. Elle est
enregistrée chez Firebase et les autres visiteurs la verront une fois
qu'Emmanuelle l'aura approuvée.

Le ciel porte les étoiles des voyageurs **partout**, dans les quatre gares. Les
récentes brillent fort, les anciennes rapetissent et pâlissent. Au survol, la
phrase apparaît à côté de l'étoile.

Le ciel ne dépasse **jamais** un nombre fixe d'étoiles. Au-delà, les plus
anciennes en sortent : ni affichées, ni consultables. C'est une question de
place, pas de vieillesse — sans limite le ciel blanchit.

## 3. Non-objectifs

- Les oiseaux de « plus loin », les textes d'« ici », le poteau d'« ailleurs »
  et le message privé : étapes 3 et 4.
- L'hébergement et le déploiement : étape 5.
- Une interface de modération. Emmanuelle approuve à la main dans la console
  Firebase, comme le §10 l'a décidé.
- La suppression des vieilles traces. Rien n'est jamais effacé de la base : on
  cesse seulement de les lire.

## 4. Anti-objectifs

Ce qui ferait rater l'étape même si tout fonctionne :

- **Une étoile qui s'allume sans que rien n'ait été enregistré.** On aurait
  menti au visiteur. L'étoile ne s'allume qu'une fois l'écriture acceptée.
- **Une phrase perdue sans le dire.** Si l'écriture échoue, la phrase revient
  dans le champ, intacte.
- **Un ciel qui se réarrange.** Une étoile garde sa place : au rechargement,
  entre téléphone et grand écran, quand une autre naît ou sort de la limite.
- **Un ciel blanc.** Voir la limite.
- **Firebase qui remonte dans la scène.** `src/scene/` reste du TypeScript pur,
  sans Vue et sans Firebase ; un test le vérifie déjà pour Vue.

## 5. Ce qu'Emmanuelle a décidé

- Un formulaire de saisie ; à la validation, une étoile, stockée chez Firebase.
- **Une limite du nombre d'étoiles.** Les anciennes restent visibles tant
  qu'elles sont dedans, même petites ; au-delà elles sortent et ne sont plus
  consultables. C'est le nombre qui commande, pas l'âge.
- **L'animation de dissolution du §4.3 est dans cette étape**, en version
  complète d'un coup — j'avais proposé de la faire en deux passes, en
  commençant par une version simple ; elle a tranché pour la version complète
  et c'est sa décision.
- **L'émulateur d'abord** : on construit tout sur la base locale, le vrai
  projet Firebase se crée ensuite.
- **Les étoiles se posent par rapport à l'écran, pas par rapport au décor.**
  La scène est cadrée en « cover » : un téléphone n'en montre qu'environ un
  quart en largeur, un portable 84 %. Collées au décor, les trois quarts des
  étoiles tomberaient hors champ sur téléphone — on chargerait 50 phrases pour
  n'en montrer qu'une douzaine. Posées sur l'écran, tout le monde voit tout le
  ciel ; le prix, accepté, est qu'une étoile glisse par rapport aux montagnes
  quand on redimensionne la fenêtre.

## 6. Ce que j'ai décidé à sa place

Tout ce qui suit est mon choix, pas le sien. À relire et à corriger.

1. **La limite : 120 étoiles sur grand écran, 50 sur téléphone.** À régler à
   l'œil quand on le verra tourner.
2. **Les étoiles portent leur position.** Le §5 choisit « une place libre, la
   plus éloignée des autres parmi ~40 tirages ». Si ce calcul se refait à
   chaque chargement, le ciel se réarrange sans arrêt — c'est l'anti-objectif.
   Le tirage se fait donc **une seule fois**, chez le visiteur qui crée
   l'étoile, et `x` et `y` (normalisés 0 à 1) partent dans la trace. Le ciel
   n'a plus qu'à les lire. Cela modifie le schéma du §10.
3. **Durée de l'animation : 3,5 à 4 s**, et non 5 — cinq secondes sans pouvoir
   rien faire, c'est long. Les cinq temps du §4.3 sont tous là, resserrés.
4. **La sortie de la limite se voit.** Quand une étoile naît et pousse la plus
   ancienne dehors, celle-ci s'éteint en fondu au lieu de disparaître d'un
   coup.
5. **Au doigt, un appui révèle la phrase**, un appui ailleurs la referme : le
   survol n'existe pas sur un téléphone. Le §11 ne le disait pas.
6. **Trois points du §11 sont faits ici, pas à l'étape 5**, parce qu'ils
   concernent les étoiles et qu'ils coûtent peu : le mouvement réduit (l'étoile
   apparaît sans dissolution ni scintillement), la liste des étoiles récentes
   masquée visuellement pour le clavier et les lecteurs d'écran, et l'appui au
   doigt ci-dessus. Le reste du §11 — scène recadrée, frise réduite, poids —
   reste à l'étape 5.
7. **App Check est écrit mais dormant.** Le code l'initialise si la clé
   reCAPTCHA est présente dans l'environnement, et s'en passe sinon. Sur
   l'émulateur il n'y a pas de clé ; il s'allumera le jour où le vrai projet
   existe, sans retoucher au code.
8. **Le ciel se lit une fois, au chargement.** Pas d'abonnement en direct :
   une phrase approuvée dans la console pendant qu'un visiteur est là
   n'allumera son étoile qu'au prochain chargement. C'est le choix le plus
   simple, le moins coûteux en lectures sur le plan Spark, et celui qui
   s'ouvre le plus facilement plus tard.
9. **Au délai, on ne ment pas.** Une écriture Firestore ne s'annule pas :
   passé le délai, le SDK continue d'essayer tant que l'onglet est ouvert, et
   la phrase finit souvent par arriver. Dire « ça n'est pas parti » serait donc
   un mensonge à retardement — le visiteur réécrit, Emmanuelle modère un
   doublon. La ligne dit « on n'a pas pu confirmer », la phrase **reste dans le
   champ**, et si l'écriture aboutit plus tard l'étoile s'allume à ce moment-là.
   Le stockage local, lui, ne reçoit l'étoile **qu'une fois l'écriture
   confirmée** : sinon un onglet fermé trop tôt laisserait une étoile sans
   trace chez Firebase, ce qui est exactement l'anti-objectif n°1. On ne coupe pas la connexion pour forcer un échec net : ça
   couperait aussi la lecture du ciel.

## 7. Contraintes

- Stack imposée par le §8, déjà en place : Vue 3, Vite, TypeScript, Pinia,
  Vue Router, GSAP, PixiJS, Three. L'étape ajoute **`firebase`** et, sur
  l'émulateur, **`@firebase/rules-unit-testing`** pour les tests de règles.
- Firebase en **plan gratuit Spark**.
- Textes d'interface en français ; code, noms de fichiers et commentaires
  techniques en anglais.
- `src/scene/` n'importe ni Vue ni Firebase.
- Tout se teste avec Vitest, dans la culture du dépôt : on fige ce qui peut se
  vérifier sans GPU et sans réseau.

## 8. Les données

Collection `traces` :

```ts
{
  phrase: string      // 1 à 80 caractères
  prenom?: string     // 0 à 24 caractères
  creeLe: Timestamp   // serverTimestamp()
  approuvee: boolean  // false à la création ; Emmanuelle valide depuis la console
  x: number           // 0 à 1 — place dans le ciel, choisie à la création
  y: number           // 0 à 1 — idem, moitié haute, hors de la frise
}
```

`x` et `y` sont les deux champs nouveaux. Le type `Trace` de
`src/scene/types.ts` les gagne aussi. Les règles du §10 les acceptent et
les bornent, et refusent tout champ inconnu (`keys().hasOnly`). `firestore.rules`
et `firestore.indexes.json` vivent dans le dépôt.

`x` et `y` sont normalisés de 0 à 1, par la décision du §5 : `x` sur la
**largeur visible**, `y` sur la **bande de ciel** — 0 juste sous la frise, 1 à
mi-hauteur de la fenêtre. La bande, et non la fenêtre entière : la frise est
une bande **fixe de 116 px** (`NavFrise.vue`, `calc(var(--haut-voie) + 52px)`),
qui mange donc 13 % d'un écran de 900 px mais 30 % d'un téléphone en paysage.
Un `y` compté sur la fenêtre cacherait sous la frise, précisément sur les
petits écrans, la moitié des étoiles — l'inverse de la décision du §5. La bande
est reprojetée à chaque rendu : le point reste à la même place relative quelle
que soit la fenêtre. Les règles n'ont qu'à borner 0 à 1, et la bande pourra
bouger plus tard sans migration ni changement de règles. Conséquence dans la scène : les étoiles
des voyageurs ne vivent pas dans le conteneur `monde`, que `fitStage` cadre en
« cover », mais dans une couche en coordonnées d'écran. La poussière d'étoiles,
elle, ne bouge pas de place.

**La lecture est une seule requête** : `approuvee == true`, triée par `creeLe`
décroissant, `limit(N)`. La limite du ciel devient la limite de la requête : le
site ne télécharge jamais plus de N phrases, ce qui règle le poids et la
facture d'un coup. Cette requête demande un **index composite** — l'émulateur
ne l'applique pas, donc il doit être déclaré dans `firestore.indexes.json`
sous peine de marcher en local et de casser en vrai.

**Sa propre étoile.** La règle de lecture interdit de relire une trace non
approuvée, même la sienne. Pour qu'elle survive à un rechargement, le visiteur
garde sa trace entière chez lui — phrase, prénom, `x`, `y`, date — sur le même
motif que `src/scene/palette.ts` : écriture et lecture qui se taisent quand le
stockage est indisponible. Quand la trace est approuvée, elle revient par la
requête : on dédoublonne par `id`.

## 9. L'ordre des opérations à l'envoi

L'anti-objectif commande tout cet enchaînement.

1. Entrée. **L'écriture part tout de suite.**
2. Sans attendre : le formulaire s'efface, la phrase se défait en grains.
3. L'écriture est acceptée → le grain monte, l'étoile s'allume, le formulaire
   revient vide.
4. L'écriture échoue, ou passe un délai maximal → les grains se reforment en
   phrase, le formulaire revient **avec le texte intact**, et une ligne en
   mono dit qu'on **n'a pas pu confirmer** (voir §6.9 : elle n'est peut-être
   pas perdue). Sans réseau, l'écriture ne se résout jamais toute seule : le
   délai n'est pas un luxe.

L'écran n'est donc jamais figé à attendre le réseau, et aucune étoile ne
s'allume pour une phrase qui n'est pas enregistrée.

## 10. Où ça vit dans le code

Le §9 de `CONCEPT.md` a déjà nommé ces fichiers ; la plupart n'existent pas
encore.

| Fichier | Rôle |
|---|---|
| `src/firebase.ts` | initialisation, App Check dormant, bascule émulateur |
| `src/stores/traces.ts` | la requête, la limite, l'ajout, sa propre étoile |
| `src/scene/Sky.ts` | les étoiles des voyageurs s'ajoutent à la poussière |
| `src/scene/Dissolve.ts` | phrase → grains → le grain qui monte → l'étoile |
| `src/scene/stars.ts` | éclat selon l'âge, tirage d'une place libre |
| `src/components/StarTooltip.vue` | la phrase au survol |
| `src/components/gares/GareLaHaut.vue` | le formulaire (coquille aujourd'hui) |
| `firestore.rules`, `firestore.indexes.json`, `firebase.json` | la base |

Le contrat de la scène du §9 garde `setStars(traces)` et l'événement
`starHover` — déjà déclaré dans `src/scene/events.ts`, avec le type `Trace`
déjà dans `src/scene/types.ts`. En revanche **`addStar(trace, from)` ne peut
pas rester une simple promesse** : le déroulé du §9 démarre la dissolution
avant de savoir si l'écriture aboutira, et doit pouvoir la défaire. La scène
expose donc une poignée — la dissolution commence, puis on lui dit `land(trace)`
quand l'écriture est acceptée, ou `revert()` quand elle échoue. Les grains
convergés patientent si l'écriture est plus lente que la dissolution. Firebase ne franchit pas la frontière :
la scène reçoit des `Trace`, elle ne sait pas d'où elles viennent.

## 11. Prérequis et ce qui revient à Emmanuelle

- **Java manque sur la machine** (`java -version` ne trouve rien) et
  l'émulateur Firestore en a besoin. À épingler dans `mise.toml`, à côté de
  Node, pour que ça s'installe en entrant dans le dossier.
- **La création du projet Firebase lui revient** : elle passe par son compte
  Google, je ne peux pas la faire à sa place. Dix minutes, guidées, le jour où
  l'émulateur ne suffit plus. Il faudra le projet, la clé reCAPTCHA d'App Check,
  et le dépôt des règles et de l'index.
- Aucune commande qui touche un vrai projet Firebase sans son accord.

## 12. Changements à apporter à `CONCEPT.md`

- **§5** : « Les étoiles très anciennes ne s'éteignent jamais : elles se
  fondent dans la poussière d'étoiles du fond » devient faux. Le ciel porte au
  plus N étoiles et les plus anciennes en sortent.
- **§5** : la place libre se tire une fois, à la création, et voyage dans la
  trace.
- **§10** : le schéma gagne `x` et `y` ; les règles les bornent et refusent les
  champs inconnus.
- **§4.3** : l'animation dure 3,5 à 4 s.
- **§11** : l'appui au doigt sur une étoile, que le concept ne prévoyait pas.

## 13. Laissé au constructeur

Tout ce qui ne change rien à ce qui précède : le découpage des fichiers au-delà
du tableau, la forme des tests, la manière de tirer les grains d'une phrase,
les courbes GSAP, le détail du scintillement, et la façon d'alimenter la
tooltip. Le §4.3 et le §5 donnent les mots exacts de l'interface, les tailles
et la formule de l'éclat : ils font loi.
