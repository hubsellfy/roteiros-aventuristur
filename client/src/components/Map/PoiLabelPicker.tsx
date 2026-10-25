import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { formatPoiName } from '../../utils/formatPoiName';
import type { Poi } from './poiCategories';
import { pickVisibleLabels } from './poiLabelLayout';

type LabelIds = Set<string | number>;

interface Props {
  pois: Poi[];
  enabled: boolean;
  /** Receives the updater of a `useState` of the ids that may carry a name. */
  onChange: (update: (prev: LabelIds) => LabelIds) => void;
}

// Decides which pins may carry a permanent name: only those whose tag would not
// cover another tag or pin, recomputed whenever the camera settles. The picker
// reports on every pass, so an answer equal to the last one keeps the previous
// set; a fresh object each time would re-run this effect and never settle.
export function PoiLabelPicker({ pois, enabled, onChange }: Readonly<Props>) {
  const map = useMap();
  useEffect(() => {
    const keep = (next: LabelIds) =>
      onChange((prev) => (prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next));
    if (!enabled) {
      keep(new Set());
      return;
    }
    const update = () => {
      const bounds = map.getBounds().pad(0.1);
      const candidates = pois
        .filter((p) => bounds.contains([p.lat, p.lng]))
        .map((p) => {
          const pt = map.latLngToContainerPoint([p.lat, p.lng]);
          return { id: p.osm_id, name: formatPoiName(p.name), x: pt.x, y: pt.y };
        });
      keep(pickVisibleLabels(candidates));
    };
    update();
    map.on('moveend zoomend', update);
    return () => {
      map.off('moveend zoomend', update);
    };
  }, [map, pois, enabled, onChange]);
  return null;
}
