import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api/client', () => ({
  mapsApi: { search: vi.fn(), placeEnrichment: vi.fn(), details: vi.fn() },
}));
vi.mock('../../../components/MSheet', () => ({
  default: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
}));

import { mapsApi } from '../../../../api/client';
import MPoiSheet from './MPoiSheet';

const poi = {
  osm_id: 'osm:1',
  name: 'Divino Café',
  lat: -26.8,
  lng: -48.6,
  category: 'cafe',
  poi_type: 'cafe',
  address: 'Rua das Flores, 10',
  website: null,
  phone: '+55 47 3333-0000',
  opening_hours: null,
  cuisine: null,
};

let seq = 0;

// The sheet remembers its Google lookup per pin, so every test gets its own pin.
function setup(sheetId = 'poi') {
  const planner = {
    language: 'br',
    trip: {},
    selectedDayId: 7,
    can: () => true,
    openAddPlaceFromPoi: vi.fn(),
  };
  const shell = { sheet: { id: sheetId, payload: { ...poi, osm_id: `osm:${++seq}` } }, closeSheet: vi.fn() };
  render(<MPoiSheet planner={planner as never} shell={shell as never} />);
  return { planner, shell };
}

describe('MPoiSheet', () => {
  beforeEach(() => {
    vi.mocked(mapsApi.search).mockReset();
    vi.mocked(mapsApi.placeEnrichment).mockReset();
    vi.mocked(mapsApi.details).mockReset();
  });

  it('FE-MOB-POISHEET-001: renders nothing while another sheet is open', () => {
    setup('day');
    expect(screen.queryByText('Divino Café')).toBeNull();
  });

  it('FE-MOB-POISHEET-002: shows what the pin knew when Google has no match', async () => {
    vi.mocked(mapsApi.search).mockResolvedValue({ places: [], source: 'trek' } as never);
    setup();
    expect(screen.getByText('Divino Café')).toBeTruthy();
    expect(screen.getByText('Rua das Flores, 10')).toBeTruthy();
    expect(screen.getByText('+55 47 3333-0000')).toBeTruthy();
    await waitFor(() => expect(mapsApi.search).toHaveBeenCalled());
  });

  it('FE-MOB-POISHEET-003: adds the rating and the hours Google returns for the matched place', async () => {
    vi.mocked(mapsApi.search).mockResolvedValue({ places: [{ google_place_id: 'g-9' }], source: 'google' } as never);
    vi.mocked(mapsApi.placeEnrichment).mockResolvedValue({
      photos: [
        { key: 'g~p0', url: '/api/maps/place-photo/g~p0/bytes', source: 'google' },
        { key: 'g~p1', url: '/api/maps/place-photo/g~p1/bytes', source: 'google' },
        { key: 'w1', url: '/api/maps/place-photo/w1/bytes', source: 'wikimedia' },
      ],
    } as never);
    vi.mocked(mapsApi.details).mockResolvedValue({
      place: {
        rating: 4.7,
        rating_count: 321,
        opening_hours: ['segunda-feira: 08:00 – 18:00'],
        reviews: [{ author: 'Ana', rating: 5, text: 'Café excelente e atendimento atencioso.', time: 'há 2 semanas' }],
      },
    } as never);
    setup();
    await waitFor(() => expect(screen.getByText('4.7')).toBeTruthy());
    expect(screen.getByText('Segunda')).toBeTruthy();
    expect(screen.getByText('08:00 – 18:00')).toBeTruthy();
    expect(screen.getByText('Café excelente e atendimento atencioso.')).toBeTruthy();
    // Only Google's own pictures are kept: the Wikimedia one would need a credit line.
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(2));
  });
});
