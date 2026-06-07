'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadQuestions, Question, QuestionData } from '@/lib/parseQuestions'
import { calculateTraitScores } from '@/lib/scoring'
import { loadCharacters } from '@/lib/parseCharacters'
import { matchCharacters, MatchMethod } from '@/lib/matching'
import { supabase } from '@/lib/supabase'
import styles from './quiz.module.css'

const ANSWER_LABELS: Record<number, string> = {
  0: 'strongly disagree',
  5: 'neutral',
  10: 'strongly agree',
}

export default function QuizPage() {
  const router = useRouter()

  const [data, setData] = useState<QuestionData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // screens: 'name' | 'quiz' | 'submitting'
  const [screen, setScreen] = useState<'name' | 'quiz' | 'submitting'>('name')
  const [name, setName] = useState('')
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  

  useEffect(() => {
  loadQuestions()
    .then(d => {
      // Fisher-Yates shuffle
      const shuffled = [...d.questions]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      setData({ ...d, questions: shuffled })
      setAnswers(new Array(shuffled.length).fill(null))
    })
    .catch(() => setLoadError('could not load questions. please try again.'))
}, [])
  

  const questions = data?.questions ?? []
  const totals = data?.totals ?? {}
  const total = questions.length
  const progress = total > 0 ? ((current) / total) * 100 : 0
  const currentAnswer = answers[current] ?? null

  const handleAnswer = (val: number) => {
    setAnswers(prev => {
      const next = [...prev]
      next[current] = val
      return next
    })
  }

  const handleNext = () => {
    if (current < total - 1) setCurrent(c => c + 1)
  }

  const handleBack = () => {
    if (current > 0) setCurrent(c => c - 1)
  }

  // ── Keyboard navigation ───────────────────────────────
  const isLast = current === total - 1
  const allAnswered = answers.every(a => a !== null)

useEffect(() => {
  if (screen !== 'quiz') return
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (currentAnswer !== null) {
        if (isLast) {
          if (allAnswered) handleSubmit()
        } else {
          handleNext()
        }
      }
    }
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [currentAnswer, isLast, allAnswered, current, screen])

  const handleSubmit = async () => {
    if (!data) return
    setScreen('submitting')
    setSubmitError(null)

    try {
      // Fill any unanswered questions with 5 (neutral)
      const filledAnswers = answers.map(a => a ?? 5)

      const scores = calculateTraitScores(filledAnswers, questions, totals)
      const characters = await loadCharacters()
      const method: MatchMethod = 'cosine'
      const results = matchCharacters(scores, characters, method)

      if (results.length === 0) throw new Error('no matches found')

      const best = results[0]

      const { data: row, error: dbError } = await supabase
        .from('submissions')
        .insert({
          name: name.trim() || null,
          input_method: 'quiz',
          ambition: scores['Ambition'],
          forgiving: scores['Forgiving'],
          repressed: scores['Repressed'],
          action_oriented: scores['Action Oriented'],
          morality: scores['Morality'],
          emotion: scores['Emotion'],
          idealism: scores['Idealism'],
          chaos: scores['Chaos'],
          humor: scores['Humor'],
          romance: scores['Romance'],
          // pining: scores['Pining'],
          duty: scores['Duty'],
          loyalty: scores['Loyalty'],
          power_hunger: scores['Power Hunger'],
          self_destruction: scores["self-destruction"],
          gender_spectrum: scores['Gender (binary but its a spectrum)'],
          self_awareness: scores['Self-Awareness'],
          charisma: scores['Charisma'],
          performance: scores['performance'],
          honor: scores['Honor'],
          intention: scores['Intention'],
          affability: scores['Affability'],
          matched_character: best.name,
          matched_play: best.play,
          match_score: parseFloat(best.score.toFixed(4)),
          match_method: method,
        })
        .select()
        .single()

      if (dbError) throw dbError

      router.push(`/quiz/results/${row.id}`)
    } catch (err: any) {
      console.error(err)
      setSubmitError(err?.message || 'something went wrong. please try again.')
      setScreen('quiz')
    }
  }

  

  // ── Loading ───────────────────────────────────────────
  if (loadError) {
    return (
      <main className={styles.main}>
        <div className={styles.error}>{loadError}</div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className={styles.main}>
        <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>
          loading questions...
        </div>
      </main>
    )
  }

  // ── Submitting ────────────────────────────────────────
  if (screen === 'submitting') {
    return (
      <main className={styles.main}>
        <div className={styles.nameScreen}>
          <div className={styles.nameTitle}>finding your character...</div>
          <div className={styles.nameSub}>calculating your trait scores and matching against all characters.</div>
        </div>
      </main>
    )
  }

  // ── Name screen ───────────────────────────────────────
  if (screen === 'name') {
    return (
      <main className={styles.main}>
        <div className={styles.nameScreen}>
          {/* <div>
            <div className={styles.nameTitle}>
              which shakespeare character are you?
            </div>
            <div className={styles.nameSub} style={{ marginTop: 12 }}>
              {total} questions · takes about 5 minutes
            </div>
          </div> */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 12, textAlign: 'center'}}>
              YOUR NAME (OPTIONAL)
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="enter your name..."
              className={styles.nameInput}
              onKeyDown={e => { if (e.key === 'Enter') setScreen('quiz') }}
              autoFocus
            />
          </div>
          <button
            className={styles.nextBtn}
            onClick={() => setScreen('quiz')}
          >
            begin →
          </button>
        </div>
      </main>
    )
  }

  // ── Quiz screen ───────────────────────────────────────

  return (
    <main className={styles.main}>

      {/* Progress */}
      <div className={styles.progressWrap}>
        <div className={styles.progressMeta}>
          <span>{current + 1} OF 40</span>
          {name && <span>{name}</span>}
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className={styles.questionWrap}>
        <div className={styles.questionText}>
          {questions[current].text}
        </div>

        {/* Answer buttons */}
        <div className={styles.answerWrap}>
          <div className={styles.answerLabels}>
            <span>completely disagree</span>
            <span>neutral&ensp;&ensp;&ensp;</span>
            <span>completely agree&ensp;&ensp;</span>
          </div>
          <div className={styles.answerButtons}>
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className={[
                  styles.answerBtn,
                  currentAnswer === i ? styles.answerBtnSelected : '',
                ].join(' ')}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className={styles.navRow}>
            <button
              className={`${styles.navBtn} ${current === 0 ? styles.navBtnDisabled : ''}`}
              onClick={handleBack}
            >
              ← back
            </button>
            {!isLast && (
              <button
                className={`${styles.nextBtn} ${currentAnswer === null ? styles.nextBtnDisabled : ''}`}
                onClick={handleNext}
              >
                next →
              </button>
            )}
          </div>

          {isLast && (
            <button
              className={`${styles.submitBtn} ${!allAnswered ? styles.submitBtnDisabled : ''}`}
              onClick={handleSubmit}
              disabled={!allAnswered}
            >
              {allAnswered ? 'see my results →' : `${answers.filter(a => a !== null).length} of ${total} answered`}
            </button>
          )}

          {submitError && (
            <div className={styles.error}>{submitError}</div>
          )}
        </div>
      </div>

    </main>
  )
}
