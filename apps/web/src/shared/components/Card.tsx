import type { HTMLAttributes, PropsWithChildren } from 'react'

type CardProps = PropsWithChildren<{
  title?: string
  className?: string
}> &
  HTMLAttributes<HTMLElement>

export const Card = ({ title, className = '', children, ...props }: CardProps) => {
  return (
    <section className={`card ${className}`.trim()} {...props}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  )
}
