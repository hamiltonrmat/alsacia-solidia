/**
 * Lecture des réponses des routes d'API côté navigateur.
 *
 * Une route qui dépasse sa durée maximale sur Vercel est interrompue par la
 * plateforme, qui renvoie une page texte (« An error occurred with your
 * deployment… FUNCTION_INVOCATION_TIMEOUT ») au lieu du JSON attendu. Sans
 * précaution, l'agent verrait « Unexpected token 'A'… is not valid JSON ».
 * Ces fonctions traduisent ces cas en messages compréhensibles.
 */

/** Message lisible pour une réponse qui n'est pas du JSON. */
export function messageReponseInattendue(statut: number, texte = ""): string {
  if (statut === 504 || /FUNCTION_INVOCATION_TIMEOUT|timed? ?out|délai/i.test(texte)) {
    return "Le serveur n'a pas répondu à temps : le traitement a dépassé la durée maximale autorisée. Réessayez dans quelques instants ; si le problème persiste, le service de lecture est probablement ralenti.";
  }
  if (statut === 413) return "Le document envoyé est trop volumineux pour le serveur.";
  if (statut === 401) return "Session expirée : reconnectez-vous à la démonstration.";
  return `Réponse inattendue du serveur (HTTP ${statut}). Réessayez dans quelques instants.`;
}

/**
 * Lit une réponse JSON d'une route de l'outil. Lève une Error au message
 * lisible si la réponse n'est pas du JSON, si son statut est en erreur, ou si
 * elle porte un champ « error ».
 */
export async function lireReponseApi<T>(reponse: Response): Promise<T> {
  const texte = await reponse.text();
  let donnees: unknown;
  try {
    donnees = JSON.parse(texte);
  } catch {
    throw new Error(messageReponseInattendue(reponse.status, texte));
  }
  const erreur = typeof donnees === "object" && donnees !== null && "error" in donnees ? (donnees as { error?: unknown }).error : undefined;
  if (!reponse.ok || erreur !== undefined) {
    throw new Error(typeof erreur === "string" && erreur ? erreur : messageReponseInattendue(reponse.status, texte));
  }
  return donnees as T;
}
