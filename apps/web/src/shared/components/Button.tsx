import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    fullWidth?: boolean
    title?: string
    leftIcon?: ReactNode
    rightIcon?: ReactNode
  }
>

const variantClassMap: Record<ButtonVariant, string> = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  ghost: 'btn--ghost',
}

export const Button = ({
  children,
  className = '',
  variant = 'primary',
  fullWidth = false,
  title,
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) => {
  const widthClass = fullWidth ? 'btn--full' : ''
  const hasTemplateSlot = Boolean(leftIcon || rightIcon || typeof title === 'string')

  const content = hasTemplateSlot ? (
    <span className="btn__content">
      {leftIcon ? <span className="btn__icon btn__icon--left">{leftIcon}</span> : null}
      <span className="btn__title">{title ?? children}</span>
      {rightIcon ? <span className="btn__icon btn__icon--right">{rightIcon}</span> : null}
    </span>
  ) : (
    children
  )

  return (
    <button className={`btn ${variantClassMap[variant]} ${widthClass} ${className}`.trim()} {...props}>
      {content}
    </button>
  )
}
