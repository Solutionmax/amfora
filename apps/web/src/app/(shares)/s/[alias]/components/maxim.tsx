/** Delphic maxims, carved on the temple at Delphi. One per share, stable for the link. */
const MAXIMS = [
  { greek: "Μηδὲν ἄγαν", english: "Nothing in excess" },
  { greek: "Γνῶθι σεαυτόν", english: "Know thyself" },
  { greek: "Καιρὸν γνῶθι", english: "Know your moment" },
  { greek: "Χρόνου φείδου", english: "Spare your time" },
  { greek: "Σοφίαν ζήλου", english: "Long for wisdom" },
  { greek: "Ἀκούσας νόει", english: "Having heard, understand" },
];

export function Maxim({ seed }: { seed: string }) {
  let sum = 0;
  for (const char of seed) sum += char.charCodeAt(0);
  const maxim = MAXIMS[sum % MAXIMS.length];

  return (
    <figure className="max-w-xs">
      <blockquote className="font-display text-lg font-bold tracking-tight text-foreground/80">
        {maxim.greek}
      </blockquote>
      <figcaption className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {maxim.english}
      </figcaption>
    </figure>
  );
}
