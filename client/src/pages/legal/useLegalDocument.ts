import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  LEGAL_REVIEW_APPROVED,
  LEGAL_VERSION,
  legalDocument,
  type LegalDocument,
  type LegalKind,
} from '../../brand/legalContent';

export interface LegalPageState {
  doc: LegalDocument;
  other: LegalDocument;
  version: string;
  reviewApproved: boolean;
  goBack: () => void;
}

/** State of the public privacy / terms pages: the text to show and the way back. */
export function useLegalDocument(kind: LegalKind): LegalPageState {
  const navigate = useNavigate();
  const doc = legalDocument(kind);
  const other = legalDocument(kind === 'privacidade' ? 'termos' : 'privacidade');

  useEffect(() => {
    const previous = document.title;
    document.title = `${doc.title}`;
    return () => {
      document.title = previous;
    };
  }, [doc.title]);

  return {
    doc,
    other,
    version: LEGAL_VERSION,
    reviewApproved: LEGAL_REVIEW_APPROVED,
    goBack: () => navigate('/login'),
  };
}
