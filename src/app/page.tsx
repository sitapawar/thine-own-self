'use client'

import { useRouter } from 'next/navigation'
import styles from './landing.module.css'

export default function LandingPage() {
  const router = useRouter()

  return (
    <main className={styles.main}>
      <div className={styles.inner}>

        <div className={styles.top}>
          <div className={styles.eyebrow}>sponsored by @accidental.evils</div>
          <h1 className={styles.title}>
            thine own self
          </h1>
          <p className={styles.subtitle}>
            what shakespeare character are you?
          </p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryBtn}
            onClick={() => router.push('/quiz')}
          >
            take the quiz
          </button>
          <div className={styles.meta}>
            version 2.0 &nbsp;·&nbsp; 80 characters &nbsp;·&nbsp; 40 questions &nbsp;·&nbsp; ~3-5 minutes
          </div>
        </div>

        {/* <div className={styles.bottom}>
          <span className={styles.quote}>
            &ldquo;All the world&rsquo;s a stage.&rdquo;
          </span>
        </div> */}

      </div>
    </main>
  )
}
