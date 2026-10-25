/** Shared typography for the text-heavy public pages (about, privacy, terms). */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface mt-6 space-y-4 p-5 text-[15px] leading-relaxed text-ink/90 sm:p-8 [&_a]:text-pu-600 [&_a]:underline [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
      {children}
    </div>
  );
}

export function DraftNote() {
  return (
    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
      Draft: this text is waiting for review by Poornima University and may change.
    </p>
  );
}
