import { EtapeDecision } from "@/components/etapes/decision";

export default async function Page({ params }: PageProps<"/dossiers/[id]/decision">) {
  const { id } = await params;
  return <EtapeDecision id={id} />;
}
