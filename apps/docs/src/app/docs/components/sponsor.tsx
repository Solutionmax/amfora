import { Coffee } from "lucide-react";

export function Sponsor() {
  return (
    <footer>
      <a
        href="https://github.com/sponsors/kyantech"
        target="_blank"
        rel="noopener noreferrer"
        className="m-2 mt-5 flex items-center justify-center gap-2 p-3 rounded-lg border-2 bg-card text-card-foreground hover:bg-accent/50 transition-colors "
      >
        <Coffee size={18} />
        <span className="text-xs font-medium">Sponsor on GitHub</span>
      </a>
    </footer>
  );
}
