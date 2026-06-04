import type { CSSProperties } from 'react'

type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'gamepad'
  | 'pencil'
  | 'trash'
  | 'help'
  | 'support'
  | 'user'
  | 'x'
  | 'coin'
  | 'puzzle'
  | 'tap'
  | 'lock'
  | 'hourglass'
  | 'play'
  | 'refresh'
  | 'eye'
  | 'eye-off'

interface IconProps {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
}

export function Icon({ name, size = 20, className, style }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    className,
    style,
    'aria-hidden': true,
  }

  if (name === 'arrow-left') {
    return (
      <svg {...props}>
        <path d="M14.5 5 7.5 12l7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'arrow-right') {
    return (
      <svg {...props}>
        <path d="m9.5 5 7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'gamepad') {
    return (
      <svg {...props}>
        <rect x="3" y="8" width="18" height="10" rx="5" fill="currentColor" opacity="0.2" />
        <rect x="4" y="9" width="16" height="8" rx="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 11v4M7 13h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="15.8" cy="12.2" r="1.1" fill="currentColor" />
        <circle cx="17.9" cy="14.3" r="1.1" fill="currentColor" />
      </svg>
    )
  }

  if (name === 'pencil') {
    return (
      <svg {...props}>
        <path d="m6 17 1.4-4.4L14.9 5a1.4 1.4 0 0 1 2 0l2.1 2.1a1.4 1.4 0 0 1 0 2l-7.6 7.5L7 18z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 6.1 18 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'trash') {
    return (
      <svg {...props}>
        <path d="M5.5 7.2h13" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M9.2 7.2V5.8c0-.9.7-1.6 1.6-1.6h2.4c.9 0 1.6.7 1.6 1.6v1.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="m7.1 7.2.7 10a2 2 0 0 0 2 1.8h4.4a2 2 0 0 0 2-1.8l.7-10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.3 10.5v5.3M13.7 10.5v5.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'help') {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9.8 9.2a2.4 2.4 0 0 1 4.8.1c0 1.6-1.8 2-2.4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="16.8" r="1" fill="currentColor" />
      </svg>
    )
  }

  if (name === 'support') {
    return (
      <svg {...props}>
        <path d="M7.3 12v-.8a4.7 4.7 0 1 1 9.4 0v.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="5" y="11.6" width="2.8" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="16.2" y="11.6" width="2.8" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M17.6 16.1a4.7 4.7 0 0 1-4.2 2.7h-1.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="10.8" y="18" width="2.6" height="2" rx="1" fill="currentColor" opacity="0.8" />
      </svg>
    )
  }

  if (name === 'user') {
    return (
      <svg {...props}>
        <circle cx="12" cy="8.6" r="3.1" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5.4 18.8a6.6 6.6 0 0 1 13.2 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'x') {
    return (
      <svg {...props}>
        <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'coin') {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="8.2" fill="currentColor" opacity="0.18" />
        <circle cx="12" cy="12" r="6.7" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9.7 9.3h3.4a1.6 1.6 0 0 1 0 3.2h-2.2a1.6 1.6 0 0 0 0 3.2h3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'puzzle') {
    return (
      <svg {...props}>
        <path d="M9.5 4.5h5v3a1.7 1.7 0 1 0 3.4 0v5h-3a1.7 1.7 0 1 1 0 3.4h-5v-3a1.7 1.7 0 1 0-3.4 0v-5h3a1.7 1.7 0 1 1 0-3.4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'tap') {
    return (
      <svg {...props}>
        <path d="M8.5 11.5V8.8a1.3 1.3 0 1 1 2.6 0v2.1-1.8a1.2 1.2 0 1 1 2.4 0v2.2-1.5a1.1 1.1 0 1 1 2.2 0v4.6c0 2-1.7 3.6-3.7 3.6h-1.7a4 4 0 0 1-3.4-1.9l-1.2-2.1a1.2 1.2 0 1 1 2.1-1.2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'lock') {
    return (
      <svg {...props}>
        <rect x="6.2" y="10.5" width="11.6" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.8 10.5V8.6a3.2 3.2 0 0 1 6.4 0v1.9" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (name === 'hourglass') {
    return (
      <svg {...props}>
        <path d="M8 4h8M8 20h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 4c0 3 2 4 4 6-2 2-4 3-4 6m8-12c0 3-2 4-4 6 2 2 4 3 4 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'play') {
    return (
      <svg {...props}>
        <path d="M8.5 6.7a1 1 0 0 1 1.5-.9l7.2 5a1.3 1.3 0 0 1 0 2.4l-7.2 5a1 1 0 0 1-1.5-.9z" fill="currentColor" />
      </svg>
    )
  }

  if (name === 'refresh') {
    return (
      <svg {...props}>
        <path d="M20 6.5v4.2h-4.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19.2 10.6A7.2 7.2 0 1 1 13 4.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'eye') {
    return (
      <svg {...props}>
        <path d="M2.8 12s3.2-5 9.2-5 9.2 5 9.2 5-3.2 5-9.2 5-9.2-5-9.2-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg {...props}>
      <path d="M3 3 21 21M21 3 3 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M2.8 12s3.2-5 9.2-5 9.2 5 9.2 5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}
