import { Character, TRAITS } from './parseCharacters'

export type MatchMethod = 'cosine' | 'chebyshev' | 'euclidean' | 'manhattan'

export interface MatchResult {
  name: string
  play: string
  score: number
  method: MatchMethod
  worstTrait?: string
  traitsCompared: number
  quote?: string | null  
}

const PRIMARY_MULTIPLIER = 3.0

function getSharedTraits(
  userScores: Record<string, number>,
  character: Character
): {
  userVals: number[]
  charVals: number[]
  traitNames: string[]
  weights: number[]
} {
  const userVals: number[] = []
  const charVals: number[] = []
  const traitNames: string[] = []
  const weights: number[] = []

  for (const trait of TRAITS) {
    const u = userScores[trait]
    const c = character.scores[trait]
    if (u != null && c != null) {
      userVals.push(u)
      charVals.push(c)
      traitNames.push(trait)
      weights.push(character.primary[trait] ? PRIMARY_MULTIPLIER : 1.0)
    }
  }

  return { userVals, charVals, traitNames, weights }
}

// Cosine similarity with weighted traits
// Primary traits contribute more to the dot product and magnitudes
function cosine(u: number[], c: number[], w: number[]): number {
  const dot = u.reduce((sum, val, i) => sum + val * c[i] * w[i], 0)
  const magU = Math.sqrt(u.reduce((sum, val, i) => sum + (val * Math.sqrt(w[i])) ** 2, 0))
  const magC = Math.sqrt(c.reduce((sum, val, i) => sum + (val * Math.sqrt(w[i])) ** 2, 0))
  if (magU === 0 || magC === 0) return 0
  return dot / (magU * magC)
}

// Euclidean distance with weighted traits
// Primary trait differences are multiplied before squaring
function euclidean(u: number[], c: number[], w: number[]): number {
  return Math.sqrt(u.reduce((sum, val, i) => sum + w[i] * Math.pow(val - c[i], 2), 0))
}

// Manhattan distance with weighted traits
// Primary trait differences contribute more to total
function manhattan(u: number[], c: number[], w: number[]): number {
  return u.reduce((sum, val, i) => sum + w[i] * Math.abs(val - c[i]), 0)
}

// Chebyshev: max weighted difference across all traits
// Primary trait differences are multiplied by 2 before taking the max
function chebyshev(
  u: number[],
  c: number[],
  w: number[],
  traitNames: string[]
): { distance: number; worstTrait: string } {
  let maxDiff = 0
  let worstTrait = ''
  u.forEach((val, i) => {
    const weightedDiff = Math.abs(val - c[i]) * w[i]
    if (weightedDiff > maxDiff) {
      maxDiff = weightedDiff
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
    const { userVals, charVals, traitNames, weights } = getSharedTraits(userScores, char)
    if (userVals.length < 3) continue

    let score: number
    let worstTrait: string | undefined

    if (method === 'cosine') {
      score = cosine(userVals, charVals, weights)
    } else if (method === 'euclidean') {
      score = euclidean(userVals, charVals, weights)
    } else if (method === 'manhattan') {
      score = manhattan(userVals, charVals, weights)
    } else {
      const result = chebyshev(userVals, charVals, weights, traitNames)
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
      quote: char.quote,
    })
  }

  const higherIsBetter = method === 'cosine'
  results.sort((a, b) => higherIsBetter ? b.score - a.score : a.score - b.score)

  return results.slice(0, topN)
}