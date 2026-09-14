import { notFound } from "next/navigation";
import { EnTeteDossier } from "@/components/en-tete-dossier";
import { trouverDossierFictif } from "@/data/dossiers-fictifs";

export default async function LayoutDossier({ children, params }: LayoutProps<"/dossiers/[id]">) {
  const { id } = await params;
  if (!trouverDossierFictif(id)) notFound();
  return (
    <div className="flex flex-col gap-6">
      <EnTeteDossier id={id} />
      {children}
    </div>
  );
}
