import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { EnTete } from "@/components/en-tete";
import { BoutonDeconnexion } from "@/components/bouton-deconnexion";
import { MARQUE } from "@/lib/marque";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${MARQUE.nom} — ${MARQUE.accroche}`,
    template: `%s`,
  },
  description: `${MARQUE.accroche} de la ${MARQUE.collectivite} : lecture automatique des dossiers numérisés, typage des pièces, contrôle des données, recevabilité, pré-instruction et enregistrement dans le logiciel métier.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50">
        <EnTete />
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">{children}</div>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:px-6">
            <p>
              <span className="font-semibold text-slate-700">{MARQUE.nom}</span> · {MARQUE.accroche.toLowerCase()} de la {MARQUE.collectivite}
            </p>
            <p className="flex items-center gap-3">
              <span>{MARQUE.version} · données fictives, aucune donnée personnelle réelle</span>
              <BoutonDeconnexion />
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
