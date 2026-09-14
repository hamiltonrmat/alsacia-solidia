import Link from "next/link";

/** Barre de navigation principale. */
export function EnTete() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">IO</span>
          <span className="text-lg font-semibold tracking-tight">
            Instruct<span className="text-blue-600">OCR</span>
          </span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
            Prototype APA
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Accueil
          </Link>
          <Link href="/ged" className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Import GED
          </Link>
          <Link href="/outils/ocr" className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Banc d&apos;essai OCR
          </Link>
        </nav>
      </div>
    </header>
  );
}
