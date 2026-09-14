import { EtapeExport } from "@/components/etapes/export";

export default async function Page({ params }: PageProps<"/dossiers/[id]/export">) {
  const { id } = await params;
  return <EtapeExport id={id} />;
}
