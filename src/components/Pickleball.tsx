type Props = {
  className?: string
  size?: number
  /** Extra CSS transform for spin (applied on inner) */
  spinDeg?: number
  squashed?: boolean
}

/** Realistic-looking ball: artwork + CSS sphere lighting / depth */
export function Pickleball({ className, size = 56, spinDeg = 0, squashed = false }: Props) {
  return (
    <div
      className={`pickleball-3d${squashed ? ' is-squash' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    >
      <div
        className="pickleball-spin"
        style={{ transform: `rotateZ(${spinDeg}deg) rotateY(${spinDeg * 0.35}deg)` }}
      >
        <img
          className="pickleball-art"
          src={`${import.meta.env.BASE_URL}pickleball.png`}
          alt=""
          width={size}
          height={size}
          draggable={false}
        />
        <span className="pickleball-shade" aria-hidden="true" />
        <span className="pickleball-spec" aria-hidden="true" />
      </div>
      <span className="pickleball-shadow" aria-hidden="true" />
    </div>
  )
}
