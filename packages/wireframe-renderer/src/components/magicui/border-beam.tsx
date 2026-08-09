import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

interface BorderBeamProps {
  /** The size of the border beam. */
  size?: number
  /** The duration of the border beam, in seconds. */
  duration?: number
  /** The delay of the border beam, in seconds. */
  delay?: number
  /** The color of the border beam from. */
  colorFrom?: string
  /** The color of the border beam to. */
  colorTo?: string
  /** The class name of the border beam. */
  className?: string
  /** The style of the border beam. */
  style?: CSSProperties
  /** Whether to reverse the animation direction. */
  reverse?: boolean
  /** The initial offset position (0-100). */
  initialOffset?: number
  /** The border width of the beam. */
  borderWidth?: number
}

// Upstream animates through motion/react; the renderer has no motion runtime, so
// the beam rides the same offset-path via CSS (`animate-border-beam`, keyframes in
// globals.css). The rendered frame is identical.
export function BorderBeam({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}: BorderBeamProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect [mask-clip:padding-box,border-box]"
      style={{ "--border-beam-width": `${borderWidth}px` } as CSSProperties}
    >
      <div
        className={cn(
          "animate-border-beam absolute aspect-square",
          "bg-linear-to-l from-(--color-from) via-(--color-to) to-transparent",
          className
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            offsetDistance: `${initialOffset}%`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            animationDirection: reverse ? "reverse" : undefined,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            ...style,
          } as CSSProperties
        }
      />
    </div>
  )
}
