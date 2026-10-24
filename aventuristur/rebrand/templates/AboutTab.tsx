import { ExternalLink, Info } from '../../icons';
import React from 'react';
import { useTranslation } from '../../i18n';
import { aboutCopy, buildCommit, LICENSE_URL, sourceUrl } from '../../brand/aboutContent';
import Section from './Section';

export default function AboutTab({ appVersion }: { appVersion: string }): React.ReactElement {
  const { language } = useTranslation();
  const copy = aboutCopy(language);
  const commit = buildCommit();

  return (
    <Section title={copy.title} icon={Info}>
      <p className="text-content-secondary">{copy.description}</p>
      <p className="mt-3 text-sm text-content-muted">{copy.origin}</p>
      <p className="mt-3 text-sm text-content-muted">{copy.warranty}</p>
      <p className="mt-3 text-xs text-content-faint">v{appVersion}{commit && ` · ${commit.slice(0, 7)}`}</p>
      <div className="mt-5 flex flex-wrap gap-4">
        <a href={sourceUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-accent-on no-underline">
          {copy.source}<ExternalLink size={14} />
        </a>
        <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-accent-on no-underline">
          {copy.license}<ExternalLink size={14} />
        </a>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-accent-on no-underline">Política de Privacidade</a>
        <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-accent-on no-underline">Termos de Uso</a>
      </div>
    </Section>
  );
}
