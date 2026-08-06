/**
 * Icon set for the Manifest world.
 *
 * One rule, deliberately: every glyph is the conventional one. This is an
 * operate surface used all day by people who need to find a control, not
 * decode it — a clever icon on the search field would cost recognition and
 * buy nothing. The world is carried by type, rule, and colour instead.
 *
 * Everything is one geometry: 24px box, 1.5 stroke, square caps, mitred
 * joins, no fills — drawn to sit beside ruled document fields without
 * softening them.
 */

type IconProps = {
  className?: string;
  /** Overrides the default 1.5 hairline where an icon sits very small. */
  strokeWidth?: number;
};

function Glyph({
  className = "h-5 w-5",
  strokeWidth = 1.5,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* --- Navigation -------------------------------------------------------- */

/** A ruled document: the register itself. */
export function IconRegister(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M4.5 3.5h15v17h-15z" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </Glyph>
  );
}

/** Customers are companies, not people — so a premises, not a portrait. */
export function IconCompany(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M3.5 20.5h17" />
      <path d="M5.5 20.5V6.5l8-3v17" />
      <path d="M13.5 10.5h5v10" />
      <path d="M8 8.5h3M8 12h3M8 15.5h3" />
    </Glyph>
  );
}

/** Trash. */
export function IconTrash(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M4 6.5h16" />
      <path d="M9.5 6.5V4h5v2.5" />
      <path d="M6.5 6.5L7.5 20.5h9l1-14" />
      <path d="M10 10v7M14 10v7" />
    </Glyph>
  );
}

/** Something needs attention. */
export function IconAlert(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M12 3.5L21.5 20.5h-19z" />
      <path d="M12 10v5" />
      <path d="M12 18h.01" strokeWidth={2} />
    </Glyph>
  );
}

/** Help. */
export function IconHelp(p: IconProps) {
  return (
    <Glyph {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.5.2-.7.6-.7 1.1v.6" />
      <path d="M12 16.5h.01" strokeWidth={2} />
    </Glyph>
  );
}

/* --- Conventional affordances ------------------------------------------- */

export function IconSearch(p: IconProps) {
  return (
    <Glyph {...p}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l4.5 4.5" />
    </Glyph>
  );
}

export function IconPrint(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M7 8V3.5h10V8" />
      <path d="M4.5 8h15v8h-3M7.5 16h-3V8" />
      <path d="M7 13.5h10v7H7z" />
    </Glyph>
  );
}

export function IconDownload(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5" />
      <path d="M4 18.5h16" />
    </Glyph>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M12 5v14M5 12h14" />
    </Glyph>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Glyph>
  );
}

export function IconMenu(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Glyph>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M9.5 5l7 7-7 7" />
    </Glyph>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M5 9.5l7 7 7-7" />
    </Glyph>
  );
}

export function IconArrowUp(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Glyph>
  );
}

export function IconSortable(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M8 9.5l4-4 4 4M8 14.5l4 4 4-4" />
    </Glyph>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Glyph>
  );
}

export function IconEdit(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M4 20h4l11-11-4-4L4 16z" />
      <path d="M14 6l4 4" />
    </Glyph>
  );
}

export function IconRestore(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M4 12a8 8 0 1 0 2.6-5.9" />
      <path d="M4 4v5h5" />
    </Glyph>
  );
}

export function IconLogout(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M14 4.5H5.5v15H14" />
      <path d="M11 12h9M16.5 8l4 4-4 4" />
    </Glyph>
  );
}

export function IconKey(p: IconProps) {
  return (
    <Glyph {...p}>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h8M17 12v3.5M20 12v2.5" />
    </Glyph>
  );
}

export function IconUser(p: IconProps) {
  return (
    <Glyph {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20.5c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </Glyph>
  );
}

export function IconLock(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M5.5 10.5h13v10h-13z" />
      <path d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5" />
    </Glyph>
  );
}

/** Anchored: this row is fixed to the bottom of the list. */
export function IconAnchor(p: IconProps) {
  return (
    <Glyph {...p}>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v13M7.5 11h9" />
      <path d="M4.5 15a7.5 7.5 0 0 0 15 0" />
    </Glyph>
  );
}

/** Drag handle. */
export function IconGrip(p: IconProps) {
  return (
    <Glyph {...p} strokeWidth={2}>
      <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
    </Glyph>
  );
}

export function IconEye(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </Glyph>
  );
}

export function IconEyeOff(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.1A9.6 9.6 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a17 17 0 0 1-3.4 3.9" />
      <path d="M6.4 8.2A16.6 16.6 0 0 0 2.5 12S6 17.5 12 17.5a9.7 9.7 0 0 0 2.9-.44" />
      <path d="M10.1 10.2a2.75 2.75 0 0 0 3.8 3.8" />
    </Glyph>
  );
}
