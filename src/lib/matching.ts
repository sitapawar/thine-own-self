import { Character, TRAITS } from './parseCharacters'

export type MatchMethod = 'cosine' | 'chebyshev' | 'euclidean' | 'manhattan'

export interface MatchResult {
  name: string
  play: string
  score: number
  method: MatchMethod
  worstTrait?: string  // only for chebyshev
  traitsCompared: number
}

function getSharedTraits(
  userScores: Record<string, number>,
  character: Character
): { userVals: number[]; charVals: number[]; traitNames: string[] } {
  const userVals: number[] = []
  const charVals: number[] = []
  const traitNames: string[] = []

  for (const trait of TRAITS) {
    const u = userScores[trait]
    const c = character.scores[trait]
    if (u != null && c != null) {
      userVals.push(u)
      charVals.push(c)
      traitNames.push(trait)
    }
  }
  return { userVals, charVals, traitNames }
}

function cosine(u: number[], c: number[]): number {
  const dot = u.reduce((sum, val, i) => sum + val * c[i], 0)
  const magU = Math.sqrt(u.reduce((sum, val) => sum + val * val, 0))
  const magC = Math.sqrt(c.reduce((sum, val) => sum + val * val, 0))
  if (magU === 0 || magC === 0) return 0
  return dot / (magU * magC)
}

function euclidean(u: number[], c: number[]): number {
  return Math.sqrt(u.reduce((sum, val, i) => sum + Math.pow(val - c[i], 2), 0))
}

function manhattan(u: number[], c: number[]): number {
  return u.reduce((sum, val, i) => sum + Math.abs(val - c[i]), 0)
}

function chebyshev(
  u: number[],
  c: number[],
  traitNames: string[]
): { distance: number; worstTrait: string } {
  let maxDiff = 0
  let worstTrait = ''
  u.forEach((val, i) => {
    const diff = Math.abs(val - c[i])
    if (diff > maxDiff) {
      maxDiff = diff
      worstTrait = traitNames[i]
    }
  })
  return { distance: maxDiff, worstTrait }
}

export function matchCharacters(
  userScores: Record<string, number>,
  characters: Character[],
  method: MatchMethod = 'cosine',
  topN: number = 10
): MatchResult[] {
  const results: MatchResult[] = []

  for (const char of characters) {
    const { userVals, charVals, traitNames } = getSharedTraits(userScores, char)
    if (userVals.length < 3) continue

    let score: number
    let worstTrait: string | undefined

    if (method === 'cosine') {
      score = cosine(userVals, charVals)
    } else if (method === 'euclidean') {
      score = euclidean(userVals, charVals)
    } else if (method === 'manhattan') {
      score = manhattan(userVals, charVals)
    } else {
      const result = chebyshev(userVals, charVals, traitNames)
      score = result.distance
      worstTrait = result.worstTrait
    }

    results.push({
      name: char.name,
      play: char.play,
      score,
      method,
      worstTrait,
      traitsCompared: userVals.length,
    })
  }

  // cosine = higher is better, rest = lower is better
  const higherIsBetter = method === 'cosine'
  results.sort((a, b) => higherIsBetter ? b.score - a.score : a.score - b.score)

  return results.slice(0, topN)
}