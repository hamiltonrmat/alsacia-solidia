import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FormulaireConnexion } from "@/components/formulaire-connexion";
import { MARQUE } from "@/lib/marque";
import { COOKIE_ACCES, jetonValide, protectionActive } from "@/lib/session";

export const metadata = {
  title: "Connexion — Solid'IA",
  description: "Accès à la démonstration.",
};

/*
 * La présence d'un mot de passe est lue dans l'environnement à l'exécution :
 * la page ne doit donc pas être prérendue au moment du build, sinon la
 * redirection vers l'accueil y serait figée.
 */
export const dynamic = "force-dynamic";

/** Ne garde que les chemins internes, pour ne pas rediriger vers un autre site. */
function destination(valeur: string | string[] | undefined): string {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  if (!brut || !brut.startsWith("/") || brut.startsWith("//")) return "/";
  return brut;
}

export default async function PageConnexion({ searchParams }: PageProps<"/connexion">) {
  if (!protectionActive()) redirect("/");
  const { suite } = await searchParams;
  const cible = destination(suite);

  // Session déjà ouverte : inutile de redemander le mot de passe. Permet aussi
  // d'entrer en rechargeant simplement la page si la navigation avait échoué.
  const jeton = (await cookies()).get(COOKIE_ACCES)?.value;
  if (jetonValide(jeton)) redirect(cible);

  return (
    <main className="flex flex-1 items-center justify-center py-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-2">
            <Image src={MARQUE.logo} alt={MARQUE.nom} width={900} height={305} priority className="h-20 w-auto self-start" />
            <p className="text-xs text-slate-500">{MARQUE.collectivite}</p>
          </div>

          <p className="mt-5 text-sm text-slate-600">
            {MARQUE.accroche}. Cette démonstration est réservée : saisissez le mot de passe qui vous a été communiqué.
          </p>

          <div className="mt-6">
            <FormulaireConnexion suite={cible} />
          </div>

          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
            Démonstration sur données entièrement fictives, sans aucune donnée personnelle réelle. Pour comprendre l&apos;outil avant d&apos;entrer,
            consultez le{" "}
            <Link href="/mode-d-emploi" className="font-medium text-blue-700 hover:underline">
              mode d&apos;emploi
            </Link>
            .
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          {MARQUE.nom} · {MARQUE.version}
        </p>
      </div>
    </main>
  );
}
