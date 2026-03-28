import { CANON_SOURCE_META, type CanonSource } from "@/lib/wizardingCanon";

export default function CanonBadge({
  source,
  className = "",
}: {
  source: CanonSource;
  className?: string;
}) {
  const meta = CANON_SOURCE_META[source];

  return (
    <span
      title={meta.description}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-cinzel font-black tracking-[0.2em] ${meta.className} ${className}`.trim()}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {meta.label}
    </span>
  );
}
