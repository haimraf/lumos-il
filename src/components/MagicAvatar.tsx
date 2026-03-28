import { useEffect, useState, type CSSProperties } from "react";
import { getHouseDisplayIcon, getHousePalette, withAlpha } from "@/lib/houses";

type MagicAvatarProps = {
  avatarUrl?: string | null;
  name?: string | null;
  house?: string | null;
  alt?: string;
  className?: string;
  roundedClassName?: string;
  fallbackClassName?: string;
  style?: CSSProperties;
  imgClassName?: string;
  imageStyle?: CSSProperties;
  fallbackAvatarUrl?: string | null;
};

function getAvatarMonogram(name?: string | null) {
  if (!name) return null;

  const parts = name
    .trim()
    .split(/\s+/)
    .map((part) => Array.from(part)[0])
    .filter(Boolean);

  if (parts.length >= 2) return `${parts[0]}${parts[1]}`;

  const chars = Array.from(name.trim()).filter((char) => /\S/.test(char));
  if (chars.length >= 2) return `${chars[0]}${chars[1]}`;
  return chars[0] || null;
}

export default function MagicAvatar({
  avatarUrl,
  name,
  house,
  alt,
  className = "",
  roundedClassName = "rounded-full",
  fallbackClassName = "text-lg",
  style,
  imgClassName = "block object-cover",
  imageStyle,
  fallbackAvatarUrl,
}: MagicAvatarProps) {
  const palette = getHousePalette(house);
  const monogram = getAvatarMonogram(name);
  const fallbackIcon = getHouseDisplayIcon(house, "🎩");
  const [currentSrc, setCurrentSrc] = useState<string | null>(avatarUrl ?? null);

  useEffect(() => {
    setCurrentSrc(avatarUrl ?? null);
  }, [avatarUrl]);

  const fallbackStyle: CSSProperties = palette
    ? {
        background: `linear-gradient(145deg, ${withAlpha(palette.primary, 0.96)}, ${withAlpha(palette.secondary, 0.82)})`,
        border: `1px solid ${withAlpha(palette.readable, 0.28)}`,
        boxShadow: `inset 0 1px 0 ${withAlpha("#ffffff", 0.12)}`,
      }
    : {
        background: "linear-gradient(145deg, rgba(30,41,59,0.96), rgba(71,85,105,0.82))",
        border: "1px solid rgba(203,213,225,0.22)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      };

  return (
    <div className={`relative isolate h-full w-full overflow-hidden ${roundedClassName} ${className}`} style={style}>
      {currentSrc ? (
        <img
          src={currentSrc}
      alt={alt || (name ? `דיוקן הקוסם של ${name}` : "דיוקן קוסם")}
          className={`h-full w-full ${imgClassName}`}
          style={imageStyle}
          onError={() => {
            if (fallbackAvatarUrl && currentSrc !== fallbackAvatarUrl) {
              setCurrentSrc(fallbackAvatarUrl);
            } else {
              setCurrentSrc(null);
            }
          }}
        />
      ) : (
        <div
          className={`relative flex h-full w-full items-center justify-center text-white ${roundedClassName}`}
          style={fallbackStyle}
          aria-label={alt || (name ? `אווטאר ברירת מחדל של ${name}` : "אווטאר ברירת מחדל")}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{ background: "radial-gradient(circle at top, rgba(255,255,255,0.22), transparent 58%)" }}
          />
          <span className={`relative z-10 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] ${fallbackClassName}`}>
            {fallbackIcon}
          </span>
          {monogram ? (
            <span className="absolute bottom-1 left-1 z-10 rounded-full bg-black/35 px-1.5 py-0.5 text-[9px] font-black tracking-[0.12em] text-white/88">
              {monogram}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
