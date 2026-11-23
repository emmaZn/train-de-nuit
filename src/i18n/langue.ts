import { defineStore } from 'pinia'

/**
 * La langue du site. Deux, et le français d'abord.
 *
 * **Pas de détection du navigateur**, et c'est un choix : le site est écrit en
 * français, son concept l'est, et un visiteur francophone dont le navigateur
 * est en anglais verrait le site basculer sans l'avoir demandé. L'anglais est à
 * un clic, à côté de l'œil. Si Emmanuelle préfère l'inverse, il suffit de lire
 * `navigator.language` dans `premiere()`.
 */
export type Langue = 'fr' | 'en'

export const LANGUES = ['fr', 'en'] as const

/** La clé de stockage, sur le modèle de `traces-locales` et de `palette`. */
const CLE = 'train-de-nuit:langue'

export function estLangue(v: unknown): v is Langue {
  return v === 'fr' || v === 'en'
}

/**
 * Ce qu'on a retenu du dernier passage. Comme partout ailleurs dans le projet,
 * la lecture échoue en silence : fenêtre privée, cookies bloqués, quota plein.
 */
function lire(): Langue | null {
  try {
    const brut = localStorage.getItem(CLE)
    return estLangue(brut) ? brut : null
  } catch {
    return null
  }
}

function ecrire(langue: Langue): void {
  try {
    localStorage.setItem(CLE, langue)
  } catch {
    // Le site marche sans mémoire : on repartira du français.
  }
}

export function premiere(): Langue {
  return lire() ?? 'fr'
}

/**
 * Dit au document la langue qu'il parle.
 *
 * `<html lang>` n'est pas décoratif : il décide de la voix d'un lecteur
 * d'écran, des césures, et de ce qu'un traducteur automatique croit avoir sous
 * les yeux. Un site qui bascule en anglais en restant annoncé `fr` ment à tout
 * ce qui le lit autrement qu'avec des yeux.
 *
 * Le script de tête d'`index.html` fait la même chose avant le bundle, pour
 * que le HTML servi ne mente pas non plus ; un test tient les deux ensemble.
 */
export function poserLangue(langue: Langue): void {
  document.documentElement.lang = langue
}

export const useLangue = defineStore('langue', {
  state: () => ({ langue: premiere() }),
  actions: {
    choisir(langue: Langue) {
      if (this.langue === langue) return
      this.langue = langue
      ecrire(langue)
      poserLangue(langue)
    },
    basculer() {
      this.choisir(this.langue === 'fr' ? 'en' : 'fr')
    },
  },
})
