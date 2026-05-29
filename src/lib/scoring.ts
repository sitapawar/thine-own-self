import { Question, TRAITS } from './parseQuestions'

/**
 * Converts raw quiz answers into normalized 0–10 trait scores.
 *
 * For positive weights:  contribution = answer * weight
 * For negative weights:  contribution = (10 - answer) * abs(weight)
 *   (a 10/strongly agree on a negative-weight question = 0 contribution)
 *
 * normalized = (raw / maxPossible) * 10
 * where maxPossible = totals[trait] * 10
 */
export function calculateTraitScores(
  answers: number[],
  questions: Question[],
  totals: Record<string, number>
): Record<string, number> {
  const raw: Record<string, number> = {}
  TRAITS.forEach(t => { raw[t] = 0 })

  answers.forEach((answer, i) => {
    const q = questions[i]
    if (!q) return

    TRAITS.forEach(trait => {
      const w = q.weights[trait] ?? 0
      if (w === 0) return

      if (w > 0) {
        raw[trait] += answer * w
      } else {
        // negative weight: strongly agreeing (10) = 0 contribution
        raw[trait] += (10 - answer) * Math.abs(w)
      }
    })
  })

  const scores: Record<string, number> = {}
  TRAITS.forEach(trait => {
    const total = totals[trait] ?? 0
    if (total === 0) {
      scores[trait] = 5 // no questions for this trait, default midpoint
      return
    }
    const maxPossible = total * 10
    const normalized = (raw[trait] / maxPossible) * 10
    scores[trait] = Math.min(10, Math.max(0, Math.round(normalized * 100) / 100))
  })

  return scores
}