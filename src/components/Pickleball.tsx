type Props = {
  className?: string
  size?: number
}

/** Pickleball artwork + CSS sphere lighting (envelope peek + CSS bounce fallback) */
export function Pickleball({ className, size = 56 }: Props) {
  return (
    <div
      className={`pickleball-3d${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    >
      <div className="pickleball-spin">
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
