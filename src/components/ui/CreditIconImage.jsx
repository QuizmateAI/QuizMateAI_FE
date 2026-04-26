import creditAvif64 from "@/assets/Quizmate-Credit-64.avif";
import creditAvif128 from "@/assets/Quizmate-Credit-128.avif";
import creditWebp64 from "@/assets/Quizmate-Credit-64.webp";
import creditWebp128 from "@/assets/Quizmate-Credit-128.webp";
import { useTranslation } from "react-i18next";

export default function CreditIconImage({
  alt,
  className = "",
  loading = "lazy",
}) {
  const { t } = useTranslation();
  const resolvedAlt = alt || t("common.creditIconAlt", { brandName: "QuizMate AI" });

  return (
    <picture>
      <source type="image/avif" srcSet={`${creditAvif64} 1x, ${creditAvif128} 2x`} />
      <source type="image/webp" srcSet={`${creditWebp64} 1x, ${creditWebp128} 2x`} />
      <img
        src={creditWebp64}
        srcSet={`${creditWebp64} 1x, ${creditWebp128} 2x`}
        alt={resolvedAlt}
        className={className}
        width={128}
        height={128}
        loading={loading}
        decoding="async"
      />
    </picture>
  );
}
