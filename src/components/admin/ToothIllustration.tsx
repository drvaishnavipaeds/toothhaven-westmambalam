const toothKind = (tooth: number) => {
  const position = Number(String(tooth)[1]);
  if (position <= 2) return "incisor";
  if (position === 3) return "canine";
  if (position <= 5) return "premolar";
  return "molar";
};

const PATHS = {
  incisor: {
    crown: "M11 9C12 4 17 2 24 2s12 2 13 7c1 7-1 15-5 20-3 4-13 4-16 0-4-5-6-13-5-20Z",
    roots: ["M16 28c-1 10-1 20 3 31 1 4 3 7 5 7s4-3 5-7c4-11 4-21 3-31Z"],
    detail: "M16 17c5 2 11 2 16 0M24 29v25",
  },
  canine: {
    crown: "M10 15C12 7 18 1 24 1s12 6 14 14c1 6-2 12-6 16-4 3-12 3-16 0-4-4-7-10-6-16Z",
    roots: ["M17 30c-2 12-2 26 3 37 1 3 2 5 4 5s3-2 4-5c5-11 5-25 3-37Z"],
    detail: "M15 20c6 2 12 2 18 0M24 31v29",
  },
  premolar: {
    crown: "M7 12C8 5 14 2 24 2s16 3 17 10c1 8-2 16-7 20-4 4-16 4-20 0-5-4-8-12-7-20Z",
    roots: ["M14 31c-1 10-2 20 1 30 1 4 3 6 5 5 3-2 3-17 4-29", "M34 31c1 10 2 20-1 30-1 4-3 6-5 5-3-2-3-17-4-29"],
    detail: "M13 16c4 4 7 5 11 1 4 4 7 3 11-1M13 26c7 3 15 3 22 0",
  },
  molar: {
    crown: "M4 13C5 5 11 2 17 3c5-3 9-3 14 0 7-2 13 3 14 10 1 9-2 17-8 21-6 4-20 4-26 0-6-4-9-12-7-21Z",
    roots: ["M11 33c-3 10-4 20-1 29 1 4 4 6 6 2 4-8 4-18 5-28", "M37 33c3 10 4 20 1 29-1 4-4 6-6 2-4-8-4-18-5-28"],
    detail: "M11 15c4 5 8 5 13 1 5 4 9 4 13-1M9 25c10 4 20 4 30 0M24 34v20",
  },
};

export default function ToothIllustration({
  tooth,
  fill,
  stroke,
  lower = false,
  missing = false,
}: {
  tooth: number;
  fill: string;
  stroke: string;
  lower?: boolean;
  missing?: boolean;
}) {
  const shape = PATHS[toothKind(tooth)];
  return (
    <svg viewBox="0 0 48 74" className="h-16 w-11 drop-shadow-sm" aria-hidden="true">
      <g transform={lower ? "translate(0 74) scale(1 -1)" : undefined}>
        <g fill={fill} stroke={stroke} strokeWidth="1.35" strokeLinejoin="round">
          {shape.roots.map((path) => <path key={path} d={path} />)}
          <path d={shape.crown} />
        </g>
        <path d={shape.detail} fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.45" strokeLinecap="round" />
        <path d="M12 11c7-5 17-5 24 0" fill="none" stroke="hsl(var(--background))" strokeWidth="1.6" opacity="0.75" strokeLinecap="round" />
        {missing && <path d="M7 9 41 40M41 9 7 40" stroke="hsl(var(--muted-foreground))" strokeWidth="2.5" strokeLinecap="round" />}
      </g>
    </svg>
  );
}