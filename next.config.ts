import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les PDF de la GED simulée sont lus sur disque par la route d'OCR :
  // ils doivent être embarqués avec la fonction lors du déploiement.
  outputFileTracingIncludes: {
    "/api/dossiers/[id]/ocr": ["./public/ged/**/*"],
    "/api/ged/lots": ["./public/ged/**/*"],
  },
};

export default nextConfig;
