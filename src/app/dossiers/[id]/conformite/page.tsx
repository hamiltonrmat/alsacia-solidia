import { EtapeConformite } from "@/components/etapes/conformite";

export default async function Page({ params }: PageProps<"/dossiers/[id]/conformite">) {
  const { id } = await params;
  return <EtapeConformite id={id} />;
}
