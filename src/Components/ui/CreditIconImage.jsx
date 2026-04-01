import creditAvif64 from "@/assets/Quizmate-Credit-64.avif";
import creditAvif128 from "@/assets/Quizmate-Credit-128.avif";
import creditWebp64 from "@/assets/Quizmate-Credit-64.webp";
import creditWebp128 from "@/assets/Quizmate-Credit-128.webp";

export default function CreditIconImage({
  alt = "Quizmate Credit",
  className = "",
  loading = "lazy",
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={`${creditAvif64} 1x, ${creditAvif128} 2x`} />
      <source type="image/webp" srcSet={`${creditWebp64} 1x, ${creditWebp128} 2x`} />
      <img
        src={creditWebp64}
        srcSet={`${creditWebp64} 1x, ${creditWebp128} 2x`}
        alt={alt}
        className={className}
        width={128}
        height={128}
        loading={loading}
        decoding="async"
      />
    </picture>
  );
}
