import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les PDF de la GED simulée sont lus sur disque par les routes d'OCR et de
  // découpage physique, le logo par la mise en page du rapport de contrôle :
  // ils doivent être embarqués avec les fonctions lors du déploiement.
  outputFileTracingIncludes: {
    "/api/dossiers/[id]/ocr": ["./public/ged/**/*"],
    "/api/dossiers/[id]/pieces": ["./public/ged/**/*"],
    "/api/ged/lots": ["./public/ged/**/*"],
    "/api/rapport": ["./public/solidia-logo.png"],
    "/api/solis": ["./public/solidia-logo.png"],
  },
  // La GED n'est plus un module à part : elle est la première étape du
  // traitement des dossiers. Les anciens liens restent valides.
  async redirects() {
    return [{ source: "/ged", destination: "/dossiers", permanent: false }];
  },
};

export default nextConfig;
