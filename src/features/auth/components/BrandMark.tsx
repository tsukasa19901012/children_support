const SIZES = {
  sm: 36,
  md: 48,
  lg: 64,
  xl: 80,
  "2xl": 104,
  "3xl": 128,
  "4xl": 152,
} as const;

type Props = {
  size?: keyof typeof SIZES;
};

/** となりっこロゴ（母が子に寄り添うシルエット・正方形） */
export function BrandMark({ size = "lg" }: Props) {
  const px = SIZES[size];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt=""
      width={px}
      height={px}
      decoding="async"
      aria-hidden
      className="block shrink-0 grow-0 rounded-2xl shadow-lg shadow-blue-500/25"
      style={{
        width: `${px}px`,
        height: `${px}px`,
        minWidth: `${px}px`,
        minHeight: `${px}px`,
      }}
    />
  );
}
