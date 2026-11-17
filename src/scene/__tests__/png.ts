/**
 * Le strict nécessaire pour relire un PNG **indexé** dans les tests.
 *
 * Les deux pièces grainées d'« ailleurs » (`batiment.png`, `reverbere.png`)
 * sont servies en PNG indexé à trois entrées — vide, masse, trait. C'est ce
 * format qui permet de garder ici les deux invariants que les anciens SVG
 * portaient dans leur texte : « blanc ou absent » (la palette ne contient que
 * ces deux-là) et « pas de seconde horloge » (le trou du pignon est vide).
 *
 * Node sait défaire un PNG avec son seul `zlib` ; un WebP demanderait une
 * dépendance, et c'est la raison pour laquelle ces deux images ne suivent pas
 * la convention WebP du train.
 */
import { inflateSync } from 'node:zlib'

export type Png = {
  largeur: number
  hauteur: number
  /** Les entrées du `PLTE`, dans l'ordre : `[r, g, b]`. */
  palette: [number, number, number][]
  /** Le `tRNS` : l'opacité de chaque entrée de palette qu'il nomme. */
  opacites: number[]
  /** L'index de palette de chaque pixel, ligne par ligne. */
  index: Uint8Array
}

function morceaux(octets: Buffer): { type: string; corps: Buffer }[] {
  const liste: { type: string; corps: Buffer }[] = []
  for (let i = 8; i < octets.length; ) {
    const taille = octets.readUInt32BE(i)
    liste.push({ type: octets.toString('ascii', i + 4, i + 8), corps: octets.subarray(i + 8, i + 8 + taille) })
    i += 12 + taille
  }
  return liste
}

/**
 * Défait le filtrage par ligne du PNG. Une image indexée à 8 bits a un octet
 * par pixel, ce qui rend les cinq filtres triviaux : le « précédent » est le
 * pixel d'à côté, et rien de plus.
 */
function defiltrer(brut: Buffer, largeur: number, hauteur: number): Uint8Array {
  const sortie = new Uint8Array(largeur * hauteur)
  for (let l = 0; l < hauteur; l += 1) {
    const filtre = brut[l * (largeur + 1)]
    const ligne = brut.subarray(l * (largeur + 1) + 1, (l + 1) * (largeur + 1))
    for (let x = 0; x < largeur; x += 1) {
      const a = x > 0 ? sortie[l * largeur + x - 1] : 0
      const b = l > 0 ? sortie[(l - 1) * largeur + x] : 0
      const c = x > 0 && l > 0 ? sortie[(l - 1) * largeur + x - 1] : 0
      let valeur = ligne[x]
      if (filtre === 1) valeur += a
      else if (filtre === 2) valeur += b
      else if (filtre === 3) valeur += (a + b) >> 1
      else if (filtre === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        valeur += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      sortie[l * largeur + x] = valeur & 0xff
    }
  }
  return sortie
}

/** Lève si le fichier n'est pas un PNG indexé à 8 bits, non entrelacé. */
export function lirePngIndexe(octets: Buffer): Png {
  const blocs = morceaux(octets)
  const entete = blocs.find((m) => m.type === 'IHDR')
  if (!entete) throw new Error('PNG sans IHDR')
  const largeur = entete.corps.readUInt32BE(0)
  const hauteur = entete.corps.readUInt32BE(4)
  const [profondeur, couleur, , , entrelace] = entete.corps.subarray(8)
  if (profondeur !== 8 || couleur !== 3 || entrelace !== 0) {
    throw new Error(`PNG attendu indexé 8 bits non entrelacé, reçu ${profondeur}/${couleur}/${entrelace}`)
  }

  const plte = blocs.find((m) => m.type === 'PLTE')
  if (!plte) throw new Error('PNG indexé sans PLTE')
  const palette: [number, number, number][] = []
  for (let i = 0; i < plte.corps.length; i += 3) {
    palette.push([plte.corps[i], plte.corps[i + 1], plte.corps[i + 2]])
  }

  const trns = blocs.find((m) => m.type === 'tRNS')
  const donnees = Buffer.concat(blocs.filter((m) => m.type === 'IDAT').map((m) => m.corps))
  return {
    largeur,
    hauteur,
    palette,
    opacites: trns ? [...trns.corps] : [],
    index: defiltrer(inflateSync(donnees), largeur, hauteur),
  }
}
