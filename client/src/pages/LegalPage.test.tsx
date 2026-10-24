import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import LegalPage from './LegalPage';
import { LEGAL_DOCUMENTS, LEGAL_CONTACT_EMAIL } from '../brand/legalContent';

function renderPage(kind: 'privacidade' | 'termos') {
  return render(
    <MemoryRouter>
      <LegalPage kind={kind} />
    </MemoryRouter>,
  );
}

describe('LegalPage', () => {
  it('mostra a política de privacidade com o canal do titular e a retenção de 12 meses', () => {
    renderPage('privacidade');
    expect(screen.getByRole('heading', { level: 1, name: LEGAL_DOCUMENTS.privacidade.title })).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(LEGAL_CONTACT_EMAIL)).length).toBeGreaterThan(0);
    expect(screen.getByText(/até 12 meses depois da data de retorno/)).toBeInTheDocument();
    expect(screen.getByText(/places\.liketrek\.com/)).toBeInTheDocument();
  });

  it('mostra os termos de uso e o link para a outra página', () => {
    renderPage('termos');
    expect(screen.getByRole('heading', { level: 1, name: LEGAL_DOCUMENTS.termos.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: LEGAL_DOCUMENTS.privacidade.title })).toHaveAttribute('href', '/privacidade');
  });

  it('avisa que o texto está em revisão jurídica enquanto não for aprovado', () => {
    renderPage('termos');
    expect(screen.getByText(/texto em revisão jurídica/)).toBeInTheDocument();
  });

  it('usa o título do documento na aba do navegador', () => {
    renderPage('privacidade');
    expect(document.title).toBe(LEGAL_DOCUMENTS.privacidade.title);
  });
});
