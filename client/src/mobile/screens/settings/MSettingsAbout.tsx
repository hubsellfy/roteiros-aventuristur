import { ExternalLink, Info } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import { aboutCopy, LICENSE_URL, SOURCE_URL } from '../../../brand/aboutContent';
import { MSetCard } from './MSettingsUi';

export default function MSettingsAbout({ appVersion }: { appVersion: string }) {
  const { language } = useTranslation();
  const copy = aboutCopy(language);

  return (
    <MSetCard title={copy.title} icon={Info}>
      <p className="text-[0.78125rem] leading-relaxed text-m-muted">{copy.description}</p>
      <p className="mt-2 text-[0.75rem] text-m-muted">{copy.origin}</p>
      <p className="mt-2 text-[0.75rem] text-m-muted">{copy.warranty}</p>
      <p className="mt-2 text-[0.6875rem] text-m-faint">v{appVersion}</p>
      <div className="mt-3 flex flex-col gap-2">
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-m-ink no-underline">
          {copy.source}<ExternalLink size={14} />
        </a>
        <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-m-ink no-underline">
          {copy.license}<ExternalLink size={14} />
        </a>
      </div>
    </MSetCard>
  );
}
