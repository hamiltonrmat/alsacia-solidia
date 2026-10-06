import { BandeauModule } from "@/components/bandeau-module";
import { VueSolis } from "@/components/vue-solis";

export const metadata = {
  title: "Logiciel métier Solis — Solid'IA",
  description: "Référentiel des usagers et demandes enregistrées, simulation du logiciel métier de l'action sociale.",
};

export default function PageSolis() {
  return (
    <main className="flex flex-col gap-8">
      <BandeauModule id="solis" />
      <VueSolis />
    </main>
  );
}
