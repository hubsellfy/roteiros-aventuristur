// FE-MOB-SET-ABOUT-001
import { describe, expect, it } from 'vitest';
import MSettingsAbout from '../../../../src/mobile/screens/settings/MSettingsAbout';
import { render, screen } from '../../../helpers/render';

describe('MSettingsAbout', () => {
  it('FE-MOB-SET-ABOUT-001: credits TREK under the AGPL, links the source and the license, and shows the version', () => {
    render(<MSettingsAbout appVersion="1.0.0" />);

    expect(screen.getByText(/based on TREK \(AGPL-3\.0\)/)).toBeInTheDocument();
    expect(screen.getByText('Source code').closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('github.com/hubsellfy/roteiros-aventuristur')
    );
    expect(screen.getByText('AGPL-3.0 license').closest('a')).toHaveAttribute(
      'href',
      'https://github.com/hubsellfy/roteiros-aventuristur/blob/main/LICENSE'
    );
    expect(screen.getByText(/^v/)).toHaveTextContent('1.0.0');
  });
});
