import * as React from "react"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className = "", children, ...props }, ref) => {
  const classes = `rounded-lg border bg-card text-card-foreground shadow-sm ${className}`

  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  )
})

Card.displayName = "Card"

export { Card }
