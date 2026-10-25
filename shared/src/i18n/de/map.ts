import type { TranslationStrings } from '../types';

const map: TranslationStrings = {
  'map.connections': 'Verbindungen',
  'map.showConnections': 'Buchungsrouten anzeigen',
  'map.hideConnections': 'Buchungsrouten ausblenden',
  'poi.searchThisArea': 'Diesen Bereich durchsuchen',
  'poi.cat.restaurants': 'Restaurants', // same-as-en
  'poi.cat.cafes': 'Cafés', // same-as-en
  'poi.cat.bars': 'Bars & Nachtleben',
  'poi.cat.hotels': 'Unterkünfte',
  'poi.cat.sights': 'Sehenswürdigkeiten',
  'poi.cat.museums': 'Museen & Kultur',
  'poi.cat.nature': 'Natur & Parks',
  'poi.cat.activities': 'Aktivitäten',
  'poi.pluginCategories': 'Kategorien aus Plugins',
  'map.showAllConnections': 'Alle Buchungsrouten anzeigen',
  'map.hideAllConnections': 'Alle Buchungsrouten ausblenden',
  'map.baseLayer.default': 'Karte',
  'map.baseLayer.satellite': 'Satellit',
  'map.baseLayer.hiking': 'Wandern',
  'map.baseLayer.hikingDown':
    'OpenHikingMap antwortet gerade nicht. Wechsle auf eine andere Karte, deine Tour bleibt unverändert.',
  'map.baseLayer.cycle': 'Rad',
  'map.baseLayer.cycleDown':
    'CyclOSM antwortet gerade nicht. Wechsle auf eine andere Karte, deine Tour bleibt unverändert.',
  'map.baseLayer.switchToSatellite': 'Zur Satellitenansicht wechseln',
  'map.baseLayer.switchToDefault': 'Zur Kartenansicht wechseln',
  'map.location.denied':
    'Der Standortzugriff ist blockiert. Prüfe die Geräteeinstellungen; eine installierte App hat eine eigene Standortberechtigung, unabhängig vom Browser.',
  'map.location.unavailable': 'Dein Standort konnte nicht ermittelt werden.',
  'map.location.timeout':
    'Die Standortbestimmung hat zu lange gedauert. Versuche es mit freier Sicht zum Himmel erneut.',
  'map.overview.show': 'Ganze Reise anzeigen',
  'map.lock.lock': 'Kartenansicht fixieren',
  'map.lock.unlock': 'Karte der Auswahl folgen lassen',
  'map.overview.hide': 'Ganze Reise ausblenden',
  'map.overview.total': 'Gesamtstrecke',
  'map.attribution': 'Kartenquellen',
  'map.overview.unrouted': '{count} Etappen konnten nicht berechnet werden, die Entfernungen sind unvollständig.',
  'map.overview.unrouted.one': '{count} Etappe konnte nicht berechnet werden, die Entfernungen sind unvollständig.',
  'map.overview.dayUnrouted': '{count} Etappen dieses Tages konnten nicht berechnet werden',
  'map.overview.dayUnrouted.one': '{count} Etappe dieses Tages konnte nicht berechnet werden',
  'map.baseLayer.topo': 'Topografisch',
  'map.webgl2.fallback':
    'Dieser Browser bietet kein WebGL2, das GL-Karten brauchen. Karten werden deshalb mit Leaflet angezeigt.',
  'map.webgl2.terrain': '3D braucht WebGL2, das dieser Browser nicht bietet. Die Karte bleibt in 2D.',
  'poi.ask': 'Fragen',
  'assistant.placeholder': 'Frag zu deiner Reise…',
  'assistant.welcome':
    'Hallo! Ich kann Restaurants und Aktivitäten vorschlagen, Google-Bewertungen und Rezensionen prüfen und Orte zu deiner Reiseroute hinzufügen. Was möchtest du planen?',
  'assistant.suggest1': 'Wo kann ich hier in der Nähe zu Mittag essen?',
  'assistant.suggest2': 'Plane mir einen freien Nachmittag',
  'assistant.suggest3': 'Am besten bewertete Attraktionen',
  'assistant.error': 'Ich konnte gerade nicht antworten. Bitte versuche es erneut.',
  'assistant.addToDay': 'Zu Tag {day} hinzufügen',
  'assistant.addToTrip': 'Zur Reiseroute hinzufügen',
  'assistant.added': 'Hinzugefügt',
  'assistant.source': 'Daten von Google Maps',
};
export default map;
