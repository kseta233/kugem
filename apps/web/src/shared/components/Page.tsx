import type { PropsWithChildren, ReactNode } from 'react'

type PageProps = PropsWithChildren<{
  title: string
  eyebrow?: string
  leading?: ReactNode
  trailing?: ReactNode
  className?: string
}>

export const Page = ({ title, eyebrow, leading, trailing, className = '', children }: PageProps) => {
  return (
    <main className={`page ${className}`.trim()}>
      <header className="top-appbar">
        <div className="top-appbar__slot">{leading}</div>
        <div className="top-appbar__center">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
        </div>
        <div className="top-appbar__slot top-appbar__slot--end">{trailing}</div>
      </header>
      {children}
    </main>
  )
}
