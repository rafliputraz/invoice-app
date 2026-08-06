import Link from "next/link";

/**
 * The marking block — the app's signature.
 *
 * An SFL invoice number already arrives as four stamped groups:
 * `028/VII/SFL/26` — sequence, Roman month, company, two-digit year. Freight
 * marks its equipment the same way, in ruled boxes, so a code survives being
 * read across a yard. So this app never prints the number as a slashed
 * string; it sets it in its boxes, with the sequence lit because that is the
 * group people actually say out loud.
 *
 * Numbers that do not split — hand-keyed backlog entries — render as one box
 * rather than being forced into a shape they do not have.
 */
export default function Marking({
  no,
  href,
  size = "md",
  className = "",
}: {
  no: string;
  /** Renders as a link when given. */
  href?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const parts = (no || "").split("/").filter(Boolean);
  const groups = parts.length > 1 ? parts : [no || "—"];
  const cls = `marking ${size === "lg" ? "marking-lg" : ""} ${className}`;

  /* The boxes are a visual splitting of one identifier, so they are announced
     as one — otherwise a screen reader reads four unrelated fragments. */
  const body = (
    <>
      <span className="sr-only">{no}</span>
      {groups.map((g, i) => (
        <span
          key={i}
          aria-hidden
          className={`marking-part ${i === 0 && groups.length > 1 ? "marking-seq" : ""}`}
        >
          {g}
        </span>
      ))}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls} title={no}>
        {body}
      </Link>
    );
  }
  return (
    <span className={cls} title={no}>
      {body}
    </span>
  );
}
