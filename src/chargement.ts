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
