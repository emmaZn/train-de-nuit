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

export const useLangue = defineStore('langue', {
  state: () => ({ langue: premiere() }),
  actions: {
    choisir(langue: Langue) {
      if (this.langue === langue) return
      this.langue = langue
      ecrire(langue)
    },
    basculer() {
      this.choisir(this.langue === 'fr' ? 'en' : 'fr')
    },
  },
})
