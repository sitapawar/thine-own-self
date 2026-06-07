'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { loadCharacters } from '@/lib/parseCharacters'
import { matchCharacters, MatchMethod, MatchResult } from '@/lib/matching'
import { supabase } from '@/lib/supabase'
import styles from './quiz-results.module.css'

const SCORES_PASSWORD = process.env.NEXT_PUBLIC_SCORES_PASSWORD
const TRAIT_LABELS: Record<string, string> = {
  'performance': 'Performance',
  'Gender (binary but its a spectrum)': 'Gender (spectrum)',
}

const METHODS: { key: MatchMethod; label: string }[] = [
  { key: 'cosine', label: 'Cosine' },
  { key: 'chebyshev', label: 'Chebyshev' },
  { key: 'euclidean', label: 'Euclidean' },
  { key: 'manhattan', label: 'Manhattan' },
]

function normalizeScore(score: number, method: MatchMethod, allScores: number[]): number {
  if (method === 'cosine') return Math.max(0, Math.min(1, score))
  const max = Math.max(...allScores)
  if (max === 0) return 1
  return 1 - score / max
}

export default function QuizResultsPage() {
  const params = useParams()
  const router = useRouter()

  const [method, setMethod] = useState<MatchMethod>('cosine')
  const [results, setResults] = useState<MatchResult[]>([])
  const [userScores, setUserScores] = useState<Record<string, number>>({})
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [pwInput, setPwInput] = useState('sita')
  const [pwError, setPwError] = useState(false)
  const [scoresUnlocked, setScoresUnlocked] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data, error: dbError } = await supabase
          .from('submissions')
          .select('*')
          .eq('id', params.id)
          .single()

        if (dbError || !data) throw new Error('submission not found')

        setName(data.name ?? null)

        const scores: Record<string, number> = {
          'Ambition': data.ambition,
          'Forgiving': data.forgiving,
          'Repressed': data.repressed,
          'Action Oriented': data.action_oriented,
          'Morality': data.morality,
          'Emotion': data.emotion,
          'Idealism': data.idealism,
          'Chaos': data.chaos,
          'Humor': data.humor,
          'Romance': data.romance,
          'Pining': data.pining,
          'Duty': data.duty,
          'Loyalty': data.loyalty,
          'Power Hunger': data.power_hunger,
          'Self-Destruction': data.self_destruction,
          'Gender (binary but its a spectrum)': data.gender_spectrum,
          'Self-Awareness': data.self_awareness,
          'Charisma': data.charisma,
          'performance': data.performance,
          'Honor': data.honor,
          'Intention': data.intention,
          'Affability': data.affability,
        }
        setUserScores(scores)

        const characters = await loadCharacters()
        const matched = matchCharacters(scores, characters, 'cosine', 10)
        setResults(matched)
      } catch (err) {
        console.error(err)
        setError('could not load your results.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  // Re-run matching when method changes (client-side, no DB call)
  useEffect(() => {
    if (Object.keys(userScores).length === 0) return
    loadCharacters().then(characters => {
      const matched = matchCharacters(userScores, characters, method, 10)
      setResults(matched)
    })
  }, [method])

  

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePasswordSubmit = () => {
    if (pwInput === SCORES_PASSWORD) {
      setScoresUnlocked(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  const allScores = results.map(r => r.score)
  const best = results[0]

  if (loading) {
    return (
      <main className={styles.main}>
        <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>loading results...</div>
      </main>
    )
  }

  if (error || !best) {
    return (
      <main className={styles.main}>
        <div style={{ color: '#c0614a', fontSize: 14 }}>{error ?? 'no results found.'}</div>
      </main>
    )
  }

  return (
    <main className={styles.main}>

      {/* Header */}
      <div className={styles.header}>
        {best.quote && (
  <div style={{
    fontSize: 13,
    color: 'var(--text-faint)',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 1.6,
    textAlign: 'center',
  }}>
    &ldquo;{best.quote}&rdquo;
  </div>
)}
        <div className={styles.eyebrow}>thy truest counterpart</div>
        <div className={styles.matchName}>
          {`${best.name}`}
        </div>
        <div className={styles.matchPlay}>{best.play}</div>
        <div className={styles.matchMeta}>
          {/* {Math.round(normalizeScore(best.score, method, allScores) * 100)}% match */}
          &nbsp;·&nbsp;
          {best.traitsCompared} traits compared
        </div>
      </div>

      {/* Results table */}
      <div className={styles.tableSection}>
        <div className={styles.tableLabel}>yet more mirrors</div>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHead}>
              <th style={{ width: 32 }}>#</th>
              <th>character</th>
              <th>play</th>
              <th style={{ textAlign: 'right' }}> </th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const goodness = normalizeScore(r.score, method, allScores)
              const isFirst = i === 0
              return (
                <tr key={r.name} className={styles.tableRow}>
                  <td className={styles.rank}>{i + 1}</td>
                  <td className={styles.charName}>{r.name}</td>
                  <td className={styles.charPlay}>{r.play}</td>
                  {/* <td className={styles.score}>{Math.round(goodness * 100)}%</td> */}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Algorithm toggle */}
      <div className={styles.toggleSection}>
        <div className={styles.toggleLabel}>Try another path to thine own likeness</div>
        <div className={styles.toggleGroup}>
          {METHODS.map(m => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              className={`${styles.toggleBtn} ${method === m.key ? styles.toggleBtnActive : ''}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button onClick={() => router.push('/quiz')} className={styles.actionBtn}>
          retake quiz
        </button>
        <button onClick={handleShare} className={styles.shareBtn}>
          {copied ? 'link copied!' : 'share result'}
        </button>
      </div>

      {/* Secret quote link */}
      <div className={styles.quoteWrap}>
        <button
          className={styles.quoteLink}
          onClick={() => { setModalOpen(true); setPwInput(''); setPwError(false) }}
        >
          &ldquo;The fool doth think he is wise, but the wise man knows himself to be a fool.&rdquo;
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            {!scoresUnlocked ? (
              <>
                <div className={styles.modalTitle}>your trait scores</div>
                <div className={styles.modalSub}>
                  now I will unclasp a secret book
                </div>
                <input
                  type="password"
                  value={pwInput}
                  onChange={e => { setPwInput(e.target.value); setPwError(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') handlePasswordSubmit() }}
                  placeholder="passcode..."
                  className={styles.modalInput}
                  autoFocus
                />
                {pwError && (
                  <div className={styles.modalError}>incorrect passcode.</div>
                )}
                <button className={styles.modalBtn} onClick={handlePasswordSubmit}>
                  unlock
                </button>
                <button className={styles.modalClose} onClick={() => setModalOpen(false)}>
                  cancel
                </button>
              </>
            ) : (
              <>
                <div className={styles.modalTitle}>your secret scores</div>
                <div className={styles.scoresGrid}>
                  {Object.entries(userScores).map(([trait, val]) => (
                    <div key={trait} className={styles.scoreRow}>
                      <span className={styles.scoreTrait}>
                        {TRAIT_LABELS[trait] ?? trait}
                      </span>
                      <span className={styles.scoreVal}>
                        {typeof val === 'number' ? val.toFixed(1) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className={styles.modalClose}
                  style={{ marginTop: 20 }}
                  onClick={() => setModalOpen(false)}
                >
                  close
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </main>
  )
}