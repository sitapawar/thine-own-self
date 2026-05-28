'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadCharacters } from '@/lib/parseCharacters'
import { matchCharacters, MatchMethod } from '@/lib/matching'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

const TRAITS = [
  "Ambition", "Forgiving", "Repressed", "Action Oriented", "Morality",
  "Emotion", "Idealism", "Chaos", "Humor", "Romance", "Pining",
  "Duty", "Loyalty", "Power Hunger", "Gender (having it)",
  "Gender (binary but its a spectrum)", "Self-Awareness", "Charisma",
  "performance", "Honor", "Intention"
]

const TRAIT_LABELS: Record<string, string> = {
  "performance": "Performance",
  "Gender (binary but its a spectrum)": "Gender (spectrum)",
}

const METHODS: { key: MatchMethod; label: string }[] = [
  { key: 'cosine', label: 'cosine' },
  { key: 'chebyshev', label: 'chebyshev' },
  { key: 'euclidean', label: 'euclidean' },
  { key: 'manhattan', label: 'manhattan' },
]

const initialScores = () =>
  Object.fromEntries(TRAITS.map(t => [t, 5])) as Record<string, number>

export default function Home() {
  const router = useRouter()
  const [scores, setScores] = useState<Record<string, number>>(initialScores())
  const [method, setMethod] = useState<MatchMethod>('cosine')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScoreChange = (trait: string, val: string) => {
    const num = parseInt(val)
    if (val === '') {
      setScores(prev => ({ ...prev, [trait]: 0 }))
      return
    }
    if (!isNaN(num) && num >= 0 && num <= 10) {
      setScores(prev => ({ ...prev, [trait]: num }))
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const characters = await loadCharacters()
      const results = matchCharacters(scores, characters, method)

      if (results.length === 0) {
        setError('no matches found. check character data.')
        setLoading(false)
        return
      }

      const best = results[0]

      const { data, error: dbError } = await supabase
        .from('submissions')
        .insert({
          name: name.trim() || null,
          ambition: scores["Ambition"],
          forgiving: scores["Forgiving"],
          repressed: scores["Repressed"],
          action_oriented: scores["Action Oriented"],
          morality: scores["Morality"],
          emotion: scores["Emotion"],
          idealism: scores["Idealism"],
          chaos: scores["Chaos"],
          humor: scores["Humor"],
          romance: scores["Romance"],
          pining: scores["Pining"],
          duty: scores["Duty"],
          loyalty: scores["Loyalty"],
          power_hunger: scores["Power Hunger"],
          gender_having: scores["Gender (having it)"],
          gender_spectrum: scores["Gender (binary but its a spectrum)"],
          self_awareness: scores["Self-Awareness"],
          charisma: scores["Charisma"],
          performance: scores["performance"],
          honor: scores["Honor"],
          intention: scores["Intention"],
          matched_character: best.name,
          matched_play: best.play,
          match_score: parseFloat(best.score.toFixed(4)),
          match_method: method,
        })
        .select()
        .single()

      if (dbError) throw dbError

      router.push(`/results/${data.id}?method=${method}`)
    } catch (err: any) {
      console.error('Full error:', JSON.stringify(err, null, 2), err?.message)
      setError(err?.message || 'something went wrong. please try again.')
      setLoading(false)
    }
  }

  return (
    <main className={styles.main}>

      {/* Header */}
      <div className={styles.header}>
        {/* <div className={styles.version}>SHAKESPEARE PERSONALITY MATCHER v1.0</div> */}
        <div className={styles.title}>
          to thine own self be true.<span className="cursor" />
        </div>
        <div className={styles.subtitle}>rate yourself 0–10 across 21 traits
          <br></br>if this doesn't make sense then you shouldn't be here. be patience and wait for the quiz to come. 
        </div>
      </div>

      {/* Name */}
      <div className={styles.section}>
        <div className={styles.label}>// name (optional)</div>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="enter your name..."
          className={styles.textInput}
        />
      </div>

      {/* Traits */}
      <div className={styles.section}>
        <div className={styles.label}>// traits</div>
        {TRAITS.map((trait, i) => (
          <div key={trait} className={styles.traitRow}>
            <span className={styles.traitName}>
              <input
              type="number"
              min={0}
              max={10}
              value={scores[trait]}
              onChange={e => handleScoreChange(trait, e.target.value)}
              className={styles.traitInput}
            />
              <span className={styles.traitIndex}>
                {/* {String(i + 1).padStart(2, '0')} */}
              </span>
              {TRAIT_LABELS[trait] ?? trait}
            </span>
          
          </div>
        ))}
      </div>

      {/* Method */}
      <div className={styles.section}>
        <div className={styles.label}>// matching method</div>
        <div className={styles.methodGroup}>
          {METHODS.map(m => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              className={`${styles.methodBtn} ${method === m.key ? styles.methodBtnActive : ''}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.error}>error: {error}</div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`${styles.submitBtn} ${loading ? styles.submitBtnLoading : ''}`}
      >
        {loading ? 'running analysis...' : 'find my character'}
      </button>

    </main>
  )
}