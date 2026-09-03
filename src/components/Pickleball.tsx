type Props = {
  className?: string
  size?: number
}

export function Pickleball({ className, size = 56 }: Props) {
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}pickleball.svg`}
      alt=""
      width={size}
      height={size}
      draggable={false}
    />
  )
}
