'use client'

import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()
  return (
    <div
      onClick={() => router.push('/')}
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '24px 0 0',
        cursor: 'pointer',
      }}
    >
      <img
        src="/crownclear.png"
        alt="home"
        style={{ height: 60, width: 'auto' }}
      />
    </div>
  )
}