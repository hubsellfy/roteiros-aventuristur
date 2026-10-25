import { Link } from 'react-router';
import type { LegalKind } from '../brand/legalContent';
import { ArrowLeft } from '../icons';
import { useLegalDocument } from './legal/useLegalDocument';

export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { doc, other, version, reviewApproved, goBack } = useLegalDocument(kind);

  return (
    <main className="min-h-screen bg-surface text-content">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <button
          type="button"
          onClick={goBack}
          className="mb-6 inline-flex items-center gap-2 border-0 bg-transparent p-0 text-sm text-content-muted"
        >
          <ArrowLeft size={14} />
          Voltar
        </button>

        <h1 className="mb-2 text-2xl font-bold">{doc.title}</h1>
        <p className="mb-6 text-xs text-content-faint">
          Versão de {version}
          {!reviewApproved && ' · texto em revisão jurídica'}
        </p>
        <p className="mb-8 text-content-secondary">{doc.intro}</p>

        {doc.sections.map((section) => (
          <section key={section.title} className="mb-7">
            <h2 className="mb-2 text-lg font-semibold">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mb-2 text-content-secondary">
                {paragraph}
              </p>
            ))}
            {section.items && (
              <ul className="ms-5 list-disc space-y-1 text-content-secondary">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p className="mt-10 border-t border-edge pt-4 text-sm text-content-muted">
          <Link to={`/${other.kind}`} className="text-accent-on">
            {other.title}
          </Link>
        </p>
      </div>
    </main>
  );
}
