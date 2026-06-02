import { useEffect, useRef, useState } from 'react'

interface Props {
  isExiting: boolean
}

export function SplashScreen({ isExiting }: Props) {
  const [logoVisible, setLogoVisible] = useState(false)
  const [textVisible, setTextVisible] = useState(false)
  const [progressVisible, setProgressVisible] = useState(false)
  const [progressFull, setProgressFull] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t1 = setTimeout(() => setLogoVisible(true), 100)
    const t2 = setTimeout(() => setTextVisible(true), 400)
    const t3 = setTimeout(() => {
      setProgressVisible(true)
      // Two rAF frames to ensure the transition triggers after the element is visible
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setProgressFull(true))
      })
    }, 700)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        overflow: 'hidden',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateY(-16px)' : 'translateY(0)',
        zIndex: 50,
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: 'fixed',
          top: '-20%',
          left: '-10%',
          width: '60%',
          height: '60%',
          background: 'rgba(124, 58, 237, 0.08)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-20%',
          right: '-10%',
          width: '70%',
          height: '70%',
          background: 'rgba(191, 32, 118, 0.07)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 480,
          padding: '0 20px',
          textAlign: 'center',
          gap: 'var(--space-7)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            transition: 'opacity 0.6s ease, transform 0.6s ease',
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'scale(1)' : 'scale(0.88)',
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-surface)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-border)',
              borderBottom: '4px solid var(--color-border)',
              margin: '0 auto',
            }}
          >
            <span style={{ fontSize: 48, lineHeight: 1 }}>🎮</span>
          </div>
        </div>

        {/* Title + tagline */}
        <div
          style={{
            transition: 'opacity 0.5s ease',
            opacity: textVisible ? 1 : 0,
          }}
        >
          <h1
            style={{
              font: 'var(--font-display-lg)',
              color: 'var(--color-brand)',
              margin: '0 0 var(--space-2)',
              letterSpacing: '-0.02em',
            }}
          >
            MiniPlay
          </h1>
          <p
            style={{
              font: 'var(--font-body-lg)',
              color: 'var(--color-text-muted)',
              margin: 0,
            }}
          >
            Play fast. Score high.
          </p>
        </div>

        {/* Animated progress bar */}
        <div
          style={{
            width: 200,
            height: 10,
            background: 'var(--color-surface-variant)',
            borderRadius: 9999,
            overflow: 'hidden',
            transition: 'opacity 0.4s ease',
            opacity: progressVisible ? 1 : 0,
          }}
        >
          <div
            ref={progressRef}
            style={{
              height: '100%',
              width: progressFull ? '100%' : '0%',
              background:
                'linear-gradient(90deg, var(--color-brand-container), var(--color-brand))',
              borderRadius: 9999,
              transition: 'width 2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
