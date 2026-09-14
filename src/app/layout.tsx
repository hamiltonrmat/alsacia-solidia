import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { EnTete } from "@/components/en-tete";
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
  title: "InstructOCR — Prototype APA",
  description:
    "Prototype d'instruction assistée des dossiers APA : OCR, découpage des pièces, extraction, contrôle de conformité et aide à la décision.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-black">
        <EnTete />
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">{children}</div>
      </body>
    </html>
  );
}
