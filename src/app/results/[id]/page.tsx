'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { loadCharacters } from '@/lib/parseCharacters'
import { matchCharacters, MatchMethod, MatchResult } from '@/lib/matching'
import { supabase } from '@/lib/supabase'
import styles from './results.module.css'

const METHOD_LABELS: Record<MatchMethod, string> = {
  cosine: 'Cosine',
  chebyshev: 'Chebyshev',
  euclidean: 'Euclidean',
  manhattan: 'Manhattan',
}

function normalizeScore(score: number, method: MatchMethod, allScores: number[]): number {
  if (method === 'cosine') return Math.max(0, Math.min(1, score))
  const max = Math.max(...allScores)
  if (max === 0) return 1
  return 1 - score / max
}

function pad(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length)
}

const W = 35
const DIV = '='.repeat(W)
const THIN = '-'.repeat(W)

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const method = (searchParams.get('method') ?? 'cosine') as MatchMethod

  const [results, setResults] = useState<MatchResult[]>([])
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pendingMethod, setPendingMethod] = useState<MatchMethod>(method)

  useEffect(() => {
    setPendingMethod(method)
  }, [method])

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

        const userScores: Record<string, number> = {
          "Ambition": data.ambition,
          "Forgiving": data.forgiving,
          "Repressed": data.repressed,
          "Action Oriented": data.action_oriented,
          "Morality": data.morality,
          "Emotion": data.emotion,
          "Idealism": data.idealism,
          "Chaos": data.chaos,
          "Humor": data.humor,
          "Romance": data.romance,
          "Pining": data.pining,
          "Duty": data.duty,
          "Loyalty": data.loyalty,
          "Power Hunger": data.power_hunger,
          "Gender (having it)": data.gender_having,
          "Gender (binary but its a spectrum)": data.gender_spectrum,
          "Self-Awareness": data.self_awareness,
          "Charisma": data.charisma,
          "performance": data.performance,
          "Honor": data.honor,
          "Intention": data.intention,
        }

        const characters = await loadCharacters()
        const matched = matchCharacters(userScores, characters, method, 10)
        setResults(matched)
      } catch (err) {
        console.error(err)
        setError('could not load your results.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, method])

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRerun = () => {
    if (pendingMethod !== method) {
      router.push(`/results/${params.id}?method=${pendingMethod}`)
    }
  }

  const allScores = results.map(r => r.score)
  const best = results[0]

  return (
    <main className={styles.main}>

      {loading && (
        <div className={styles.loading}>
          &gt; running analysis...<span className="cursor" />
        </div>
      )}

      {error && (
        <div className={styles.error}>error: {error}</div>
      )}

      {!loading && !error && best && (() => {
        const bestGoodness = normalizeScore(best.score, method, allScores)
        return (
          <>
            {/* System header */}
            <div className={styles.title}>
          thine own self:<span className="cursor" />
        </div>

            {/* Closest match */}
            <div className={styles.pre}>{DIV}</div>
            <div className={styles.preDim}>{'  ** CLOSEST MATCH **'}</div>
            <div className={styles.pre}>{THIN}</div>
            <div className={styles.preBold}>{`  ${best.name}`}</div>
            <div className={styles.preDim}>{`  ${best.play}`}</div>
            {/* <div className={styles.preDim}>{`  match score  :  ${Math.round(bestGoodness * 10000)/100}%`}</div> */}
            {/* <div className={styles.preDim}>{`  traits used  :  ${best.traitsCompared}`}</div> */}
            {name && (
              <div className={styles.preDim}>{`  user         :  ${name}`}</div>
            )}
            {/* {best.worstTrait && (
              <div className={styles.preFaint}>{`  mismatch     :  ${best.worstTrait}`}</div>
            )} */}

            {/* Full rankings — stacked layout */}
            <div className={styles.pre} style={{ marginTop: 24 }}>{DIV}</div>
            <div className={styles.preDim}>{'  FULL RANKINGS'}</div>
            <div className={styles.pre}>{THIN}</div>

            {results.map((r, i) => {
  const goodness = normalizeScore(r.score, method, allScores)
  const isFirst = i === 0
  return (
    <div key={r.name} style={{ marginBottom: 2 }}>
      <div className={styles.preDim}>
        {`  ${i + 1}    ${r.name} | ${r.play}`}
      </div>
      {/* {i < results.length - 1 && (
        <div className={styles.preFaint}>{`  ${'-'.repeat(W - 2)}`}</div>
      )} */}
    </div>
  )
})}
            <div className={styles.pre}>{DIV}</div>

            <div className={styles.preFaint}>{`  algorithm  :  ${METHOD_LABELS[method]}`}</div>
            <div className={styles.pre}>{DIV}</div>

            {/* Rerun with different algorithm */}
            <div className={styles.methodGroup}>
              <div className={styles.label}>rerun with different algorithm</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', width: '100%', marginBottom: 12 }}>
                {(['cosine', 'chebyshev', 'euclidean', 'manhattan'] as MatchMethod[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setPendingMethod(m)}
                    className={`${styles.methodBtn} ${pendingMethod === m ? styles.methodBtnActive : ''}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRerun}
                disabled={pendingMethod === method}
                className={styles.submitBtn}
                style={{ opacity: pendingMethod === method ? 0.35 : 1 }}
              >
                rerun with {pendingMethod}
              </button>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button onClick={() => router.push('/')} className={styles.tryAgainBtn}>
                &lt; try again
              </button>
              <button onClick={handleShare} className={styles.shareBtn}>
                {copied ? '> link copied!' : '> share result'}
              </button>
            </div>
          </>
        )
      })()}
    </main>
  )
}