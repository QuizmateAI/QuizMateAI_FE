import illustrationAvif640 from "@/assets/QuizmateAI_PIC-640.avif";
import illustrationAvif960 from "@/assets/QuizmateAI_PIC-960.avif";
import illustrationWebp640 from "@/assets/QuizmateAI_PIC-640.webp";
import illustrationWebp960 from "@/assets/QuizmateAI_PIC-960.webp";

const AUTH_ILLUSTRATION_SIZES = "(min-width: 1280px) 750px, (min-width: 768px) 50vw, 100vw";

export default function AuthIllustration({
  alt = "",
  className = "",
  imgClassName = "",
  loading = "eager",
}) {
  return (
    <picture className={className}>
      <source
        type="image/avif"
        srcSet={`${illustrationAvif640} 640w, ${illustrationAvif960} 960w`}
        sizes={AUTH_ILLUSTRATION_SIZES}
      />
      <source
        type="image/webp"
        srcSet={`${illustrationWebp640} 640w, ${illustrationWebp960} 960w`}
        sizes={AUTH_ILLUSTRATION_SIZES}
      />
      <img
        src={illustrationWebp960}
        srcSet={`${illustrationWebp640} 640w, ${illustrationWebp960} 960w`}
        sizes={AUTH_ILLUSTRATION_SIZES}
        alt={alt}
        className={imgClassName}
        width={960}
        height={960}
        loading={loading}
        decoding="async"
      />
    </picture>
  );
}
