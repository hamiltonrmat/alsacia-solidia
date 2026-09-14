import { EtapeDecoupage } from "@/components/etapes/decoupage";

export default async function Page({ params }: PageProps<"/dossiers/[id]/decoupage">) {
  const { id } = await params;
  return <EtapeDecoupage id={id} />;
}
