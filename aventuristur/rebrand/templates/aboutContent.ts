const SOURCE_URL = 'https://github.com/hubsellfy/roteiros-aventuristur';
export const LICENSE_URL = `${SOURCE_URL}/blob/main/LICENSE`;

const COMMIT_SHA = /^[0-9a-f]{7,40}$/;

/** The commit this bundle was built from, or '' when the build did not record one. */
export function buildCommit(): string {
  const sha = typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__.trim().toLowerCase() : '';
  return COMMIT_SHA.test(sha) ? sha : '';
}

/** Source link for AGPL-3.0 §13: the exact commit that is running, else the repository. */
export function sourceUrl(): string {
  const sha = buildCommit();
  return sha ? `${SOURCE_URL}/tree/${sha}` : SOURCE_URL;
}

const ABOUT_COPY = {
  br: {
    title: 'Sobre o Roteiros Aventuristur',
    description: 'Planeje e acompanhe sua viagem em um roteiro compartilhado, no computador ou no celular.',
    origin: 'baseado no TREK (AGPL-3.0)',
    warranty: 'Este software é fornecido sem garantias. Para assuntos da sua viagem, fale com a equipe da Aventuristur.',
    source: 'Código-fonte',
    license: 'Licença AGPL-3.0',
  },
  en: {
    title: 'About Roteiros Aventuristur',
    description: 'Plan and follow your trip in a shared itinerary, on your computer or phone.',
    origin: 'based on TREK (AGPL-3.0)',
    warranty: 'This software is provided without warranty. For questions about your trip, contact Aventuristur.',
    source: 'Source code',
    license: 'AGPL-3.0 license',
  },
  es: {
    title: 'Acerca de Roteiros Aventuristur',
    description: 'Planifica y sigue tu viaje en un itinerario compartido, desde el ordenador o el móvil.',
    origin: 'basado en TREK (AGPL-3.0)',
    warranty: 'Este software se ofrece sin garantías. Para consultas sobre tu viaje, contacta con Aventuristur.',
    source: 'Código fuente',
    license: 'Licencia AGPL-3.0',
  },
} as const;

export function aboutCopy(language: string) {
  return ABOUT_COPY[language as keyof typeof ABOUT_COPY] ?? ABOUT_COPY.br;
}
