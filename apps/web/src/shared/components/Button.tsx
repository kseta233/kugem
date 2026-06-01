import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    fullWidth?: boolean
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
  ...props
}: ButtonProps) => {
  const widthClass = fullWidth ? 'btn--full' : ''
  return (
    <button className={`btn ${variantClassMap[variant]} ${widthClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
