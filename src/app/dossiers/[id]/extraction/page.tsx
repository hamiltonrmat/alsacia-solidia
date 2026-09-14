import { EtapeExtraction } from "@/components/etapes/extraction";

export default async function Page({ params }: PageProps<"/dossiers/[id]/extraction">) {
  const { id } = await params;
  return <EtapeExtraction id={id} />;
}
