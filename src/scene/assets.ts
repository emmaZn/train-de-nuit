import { Assets, Texture } from 'pixi.js'
import type { Manifest, SequenceSpec } from './types'

/** `assets/mountains/{i}.webp` + 7 → `assets/mountains/0007.webp` */
export function framePath(pattern: string, index: number): string {
  return pattern.replace('{i}', String(index).padStart(4, '0'))
}

/**
 * Never throws: a missing or unreadable manifest yields null, and the scene
 * then shows background and star dust rather than a black canvas.
 */
export async function loadManifest(url = '/assets/manifest.json'): Promise<Manifest | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return (await response.json()) as Manifest
  } catch {
    return null
  }
}

export async function loadTexture(path: string): Promise<Texture | null> {
  try {
    return await Assets.load<Texture>(path)
  } catch {
    return null
  }
}

/**
 * Loads a sequence frame by frame, in order, calling `onFrame` as each one
 * arrives so the caller can show the sequence while it is still loading. A
 * missing frame is skipped, never fatal.
 */
export async function loadSequence(
  spec: SequenceSpec,
  opts: { onFrame?: (index: number, texture: Texture) => void } = {},
): Promise<Texture[]> {
  const textures: Texture[] = []
  for (let index = 1; index <= spec.count; index += 1) {
    const texture = await loadTexture(framePath(spec.path, index))
    if (!texture) continue
    textures.push(texture)
    opts.onFrame?.(index, texture)
  }
  return textures
}
