# Le site en anglais

2026-11-23 · projet · étape 5

## Intention

Emmanuelle, le 23 novembre au soir : « ajouter un module de traduction en
anglais, maybe à droite de l'icône œil ». Puis : « je vais me coucher je te
laisse travailler en autonomie ».

Le site est un portfolio. Il est entièrement en français, et les gens qui
recrutent ne le sont pas tous. L'anglais est à un clic, jamais imposé.

**Ce document est écrit après coup**, pendant l'exécution, parce qu'elle
dormait : tout ce qui suit est donc soit une conséquence de sa demande, soit un
choix que j'ai fait et que je signale comme tel.

## Buts

- Tout ce qu'un visiteur lit existe dans les deux langues : les gares, les deux
  formulaires, le panneau des départs, le CV, les répliques des bouvreuils, les
  âges sous les phrases, et les libellés que seuls les lecteurs d'écran
  entendent.
- Un seul endroit par texte. Rien de traduit à deux endroits.
- Le choix se retient d'une visite à l'autre.

## Non-buts

- **Les URL ne changent pas de langue.** `/ici`, `/plus-loin`, `/la-haut`,
  `/ailleurs` restent en français : ce sont des liens partageables, et une route
  qui change de forme avec la langue casse les liens déjà envoyés.
- Les noms propres : « Emmanuelle Zenou », « manager.one », « SISTEMIC.IO ».
- Une troisième langue. Rien ne l'empêche, rien ne la prépare non plus.

## Anti-buts

- Une dépendance de plus. Le projet en a huit ; `vue-i18n` en ferait neuf pour
  deux langues et un dictionnaire plat.
- Une traduction qui compile mais parle français. Un test compare les deux
  arbres et vérifie que les textes qui comptent diffèrent vraiment.

## Approches

| | Ce que ça donne | Verdict |
|---|---|---|
| **(a) un magasin, un dictionnaire typé, un composable** | ~120 lignes, aucune dépendance, et `en: typeof fr` fait refuser par TypeScript toute clé manquante | **retenue** |
| (b) `vue-i18n` | la norme de l'écosystème, le pluriel et les dates en prime — dont ce site n'a pas besoin : son seul pluriel est « il y a N jours », et ses dates sont déjà écrites à la main | écartée |
| (c) deux builds, un par langue | pas de bascule à chaud, deux URL à faire connaître, et le visiteur ne peut pas changer d'avis | écartée |

## Ce qui est décidé

- `src/i18n/langue.ts` : le magasin. `fr | en`, retenu dans `localStorage` sous
  `train-de-nuit:langue`, lecture et écriture silencieuses en cas d'échec,
  comme `traces-locales` et `palette`.
- `src/i18n/textes.ts` : le dictionnaire. `const en: typeof fr` — **la symétrie
  est une erreur de compilation**, et un test la redit à l'exécution.
- `src/i18n/index.ts` : `useTextes()`, un `computed` sur la langue courante, pour
  que la bascule se voie sans remonter les composants.
- `src/components/LangueButton.vue` : deux segments `FR` `EN`, mono 10,5 px,
  l'actif à `--fort` et l'autre à `--murmure`, sur la ligne de la voie. L'œil se
  décale de 50 px pour lui laisser le coin.
- Les contenus structurés deviennent des `Record<Langue, …>` : `PARCOURS` et
  `HORS_DE_LA_VOIE` (CV), `REPLIQUES` et `ENSUITE` (bouvreuils), `REELS` et
  `VIVIER` (panneau). **Même ordre et même longueur dans les deux langues** —
  les tests le gardent, parce que le rang porte du sens.
- `ageRelatif` prend ses mots en argument : le module reste pur, aucun magasin
  n'est atteint depuis `scene/`.

## Mes choix, qu'elle n'a pas vus

- **Le français par défaut, sans regarder `navigator.language`.** Un visiteur
  francophone dont le navigateur est en anglais ne doit pas voir le site
  basculer sans l'avoir demandé. L'inverse tient en une ligne dans `premiere()`.
- **Les traductions elles-mêmes.** Les quatorze répliques des bouvreuils et les
  douze destinations du panneau sont de l'écriture, pas de la traduction
  mécanique : à relire. « up there », « further », « AT PLATFORM », « NEXT
  STOP », « Every star is someone who passed through here. »
- **`variante()` se lit sur le rang et non sur le texte.** Elle comparait
  `texte === 'Et je danse.'` : la pirouette et le regard se seraient perdus à la
  traduction. C'est une correction, pas un choix de goût.
- **`NON-STOP` est devenu `NON STOP`** : les volets ne savent écrire que
  l'`ALPHABET` de `volets.ts`, qui ne porte pas le tiret. Le test qui le garde
  couvre désormais les deux langues.
- **Les apostrophes** du message « on n’a pas pu confirmer » et de la phrase de
  « ici » passent en typographique, comme tout le reste du site.

## Ce que ça laisse ouvert

- Le CONCEPT ne parle pas de langue. Le §4.1 (« le nom et le titre en haut à
  gauche ») et le §4.2 (le poteau isolé) ne décrivent plus la scène non plus,
  pour d'autres raisons, du même jour.
- Rien ne dit à un moteur de recherche que la page existe en deux langues : pas
  de `lang` sur `<html>` qui suive le magasin, pas de `hreflang`. À faire si le
  référencement compte.
- Le `aria-label` du bouton de langue est dans la langue courante ; les deux
  `title` sont chacun dans la langue qu'ils proposent, pour qu'un anglophone
  comprenne « EN » avant de cliquer.

## Critère d'acceptation

Vu en mouvement dans les deux langues, sur `/ici`, `/la-haut`, `/ailleurs` et
`/ailleurs/cv`. Les répliques des bouvreuils n'ont été vérifiées que par leurs
tests : viser un oiseau au clic depuis un script n'a pas abouti.
