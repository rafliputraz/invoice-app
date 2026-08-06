/**
 * A monogram avatar.
 *
 * There are no photographs in this system, so identity is carried by initials
 * on a tint chosen deterministically from the name — the same person is always
 * the same colour, in every table, forever. The tints are low-chroma surfaces
 * rather than the status palette, so an avatar can never be mistaken for a
 * state.
 */
const TINTS = [
  "bg-[#FDECEA] text-[#B92117]",
  "bg-[#E8F0FE] text-[#1D4ED8]",
  "bg-[#E6F6EE] text-[#15803D]",
  "bg-[#F3EDFB] text-[#6D28D9]",
  "bg-[#FEF3C7] text-[#92400E]",
  "bg-[#E4F4F6] text-[#0E7490]",
];

export function initialsOf(name: string): string {
  return (
    (name || "")
      .replace(/^(PT|CV|UD|PD)\.?\s+/i, "")
      .split(/\s+/)
      .map((w) => w.match(/[A-Za-z0-9]/)?.[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export default function Avatar({
  name,
  size = 40,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const tint = TINTS[hash % TINTS.length];

  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${tint} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
