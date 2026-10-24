import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../tests/helpers/render';
import { resetAllStores } from '../../../tests/helpers/store';
import AboutTab from './AboutTab';

beforeEach(() => resetAllStores());

describe('AboutTab — marca Aventuristur', () => {
  it('mostra a marca, a origem e a versão', () => {
    render(<AboutTab appVersion="4.3.4" />);
    expect(screen.getByText('About Roteiros Aventuristur')).toBeInTheDocument();
    expect(screen.getByText('based on TREK (AGPL-3.0)')).toBeInTheDocument();
    expect(screen.getByText('v4.3.4 · abc1234')).toBeInTheDocument();
  });

  it('oferece código e licença do fork em links seguros', () => {
    render(<AboutTab appVersion="4.3.4" />);
    const links = document.querySelectorAll('a');
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveAttribute(
      'href',
      'https://github.com/hubsellfy/roteiros-aventuristur/tree/abc1234def5678abc1234def5678abc1234def56',
    );
    expect(links[1]).toHaveAttribute('href', 'https://github.com/hubsellfy/roteiros-aventuristur/blob/main/LICENSE');
    expect(links[2]).toHaveAttribute('href', '/privacidade');
    expect(links[3]).toHaveAttribute('href', '/termos');
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('não exibe doações nem links da comunidade do projeto original', () => {
    render(<AboutTab appVersion="4.3.4" />);
    expect(screen.queryByText('Ko-fi')).toBeNull();
    expect(screen.queryByText('Buy Me a Coffee')).toBeNull();
    expect(screen.queryByText('Discord')).toBeNull();
    expect(screen.getByText(/without warranty/)).toBeInTheDocument();
  });
});

describe('aboutContent — link do código-fonte', () => {
  it('sem commit gravado no build, aponta para o repositório', async () => {
    vi.stubGlobal('__APP_COMMIT__', '');
    const { sourceUrl, buildCommit } = await import('../../brand/aboutContent');
    expect(buildCommit()).toBe('');
    expect(sourceUrl()).toBe('https://github.com/hubsellfy/roteiros-aventuristur');
    vi.unstubAllGlobals();
  });

  it('ignora um valor que não seja um hash de commit', async () => {
    vi.stubGlobal('__APP_COMMIT__', 'main; rm -rf');
    const { sourceUrl } = await import('../../brand/aboutContent');
    expect(sourceUrl()).toBe('https://github.com/hubsellfy/roteiros-aventuristur');
    vi.unstubAllGlobals();
  });
});
