/**
 * L'écran d'attente — celui d'`index.html`, pas un composant.
 *
 * Il est posé en HTML parce qu'il doit se voir avant que le bundle charge ; il
 * ne peut donc pas se retirer tout seul, et c'est ce que fait ce module, quand
 * la scène a posé le train et le massif (`Scene.pret`).
 */

/**
 * Le garde-fou. Si la scène ne dit jamais rien — un chargement qui n'aboutit
 * pas, un réseau mort en plein manifeste — l'écran s'efface quand même : mieux
 * vaut un site sans train qu'un ciel qui tourne devant un site qu'on ne voit
 * jamais. `Scene` tient sa promesse dans tous les cas qu'on connaît ; ceci est
 * pour ceux qu'on ne connaît pas.
 */
export const ATTENTE_MAX = 12_000

/**
 * La durée du fondu, en miroir de la `transition` d'`index.html`. Les deux
 * doivent changer ensemble : plus court ici, l'écran saute en plein fondu ;
 * plus long, le site reste couvert par un voile déjà transparent.
 */
export const FONDU = 600

const patienter = (ms: number) => new Promise<void>((fin) => setTimeout(fin, ms))

/**
 * Efface l'écran d'attente dès que `pret` est tenue — ou au plus tard au bout
 * de `ATTENTE_MAX`, et quoi qu'il arrive à la promesse.
 *
 * Pas de durée minimale : si la scène est prête en 200 ms, le fondu part tout
 * de suite. On ne le voit pas sauter pour autant — dessous il y a le même ciel
 * noir, et le fondu dure encore 600 ms. Faire patienter quelqu'un pour lui
 * montrer qu'on a travaillé, c'est du décor, pas de l'attente.
 */
export async function retirerEcran(
  pret: Promise<unknown>,
  racine: ParentNode = document,
): Promise<void> {
  const ecran = racine.querySelector<HTMLElement>('#chargement')
  if (!ecran) return

  await Promise.race([pret.catch(() => {}), patienter(ATTENTE_MAX)])

  ecran.classList.add('parti')
  await patienter(FONDU)
  ecran.remove()
}

/**
 * L'écran d'attente, à l'envers : il remonte, et la main revient quand le fondu
 * est fini. C'est ce qui couvre le rechargement de la bascule de mode.
 *
 * On en repose un neuf plutôt que de ranimer l'ancien : `retirerEcran` le
 * retire du document, et c'est bien ce qu'il faut — il porte un canevas de
 * trois mille cinq cents grains qui n'a plus rien à faire là. Celui-ci est un
 * aplat de `--nuit-attente`, que l'appelant pose sur la couleur **où l'on va**,
 * pour que le rechargement ne coupe pas d'une couleur à l'autre.
 *
 * En mouvement réduit, il arrive d'un coup et rend la main tout de suite.
 */
export async function remettreEcran(
  reducedMotion = false,
  racine: Document = document,
): Promise<void> {
  const ecran = racine.createElement('div')
  ecran.id = 'chargement'
  ecran.setAttribute('aria-hidden', 'true')
  if (!reducedMotion) ecran.classList.add('parti')
  racine.body.appendChild(ecran)
  if (reducedMotion) return

  // Forcer le calcul de la mise en page : sans cet état de départ lu par le
  // navigateur, la transition n'a rien d'où partir et l'écran saute.
  void ecran.offsetHeight
  ecran.classList.remove('parti')
  await patienter(FONDU)
}
