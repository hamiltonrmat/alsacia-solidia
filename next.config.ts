import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les PDF de la GED simulée sont lus sur disque par les routes d'OCR et de
  // découpage physique : ils doivent être embarqués avec les fonctions lors du
  // déploiement.
  outputFileTracingIncludes: {
    "/api/dossiers/[id]/ocr": ["./public/ged/**/*"],
    "/api/dossiers/[id]/pieces": ["./public/ged/**/*"],
    "/api/ged/lots": ["./public/ged/**/*"],
  },
};

export default nextConfig;
