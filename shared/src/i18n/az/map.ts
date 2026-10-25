import type { TranslationStrings } from '../types';

const map: TranslationStrings = {
  'map.connections': 'Bağlantılar',
  'map.showConnections': 'Rezervasiya marşrutlarını göstər',
  'map.hideConnections': 'Rezervasiya marşrutlarını gizlət',

  'poi.searchThisArea': 'Bu ərazidə axtar',
  'poi.cat.restaurants': 'Restoranlar',
  'poi.cat.cafes': 'Kafelər',
  'poi.cat.bars': 'Barlar və gecə həyatı',
  'poi.cat.hotels': 'Yaşayış yerləri',
  'poi.cat.sights': 'Görməli yerlər',
  'poi.cat.museums': 'Muzeylər və mədəniyyət',
  'poi.cat.nature': 'Təbiət və parklar',
  'poi.cat.activities': 'Fəaliyyətlər',
  'poi.pluginCategories': 'Plaginlərdən gələn kateqoriyalar',

  'map.showAllConnections': 'Bütün rezervasiya marşrutlarını göstər',
  'map.hideAllConnections': 'Bütün rezervasiya marşrutlarını gizlət',

  'map.baseLayer.default': 'Xəritə',
  'map.baseLayer.satellite': 'Peyk',
  'map.baseLayer.hiking': 'Gəzinti',
  'map.baseLayer.hikingDown': 'OpenHikingMap hazırda cavab vermir. Başqa xəritəyə keçin; turunuz olduğu kimi qalır.',
  'map.baseLayer.cycle': 'Velosiped',
  'map.baseLayer.cycleDown': 'CyclOSM hazırda cavab vermir. Başqa xəritəyə keç; turun olduğu kimi qalır.',
  'map.baseLayer.switchToSatellite': 'Peyk görünüşünə keç',
  'map.baseLayer.switchToDefault': 'Xəritə görünüşünə keç',

  'map.location.denied':
    'Məkan məlumatlarına giriş bloklanıb. Cihazınızın tənzimləmələrini yoxlayın; quraşdırılmış tətbiqin brauzerdən ayrı məkan icazəsi var.',
  'map.location.unavailable': 'Mövcud yerinizi müəyyən etmək mümkün olmadı.',
  'map.location.timeout':
    'Məkanınızı müəyyən etmək çox vaxt apardı. Səmanın daha açıq göründüyü yerdə yenidən cəhd edin.',

  'map.overview.show': 'Bütün səyahəti göstər',
  'map.lock.lock': 'Xəritə görünüşünü kilidlə',
  'map.lock.unlock': 'Xəritə seçimi izləsin',
  'map.overview.hide': 'Bütün səyahəti gizlət',
  'map.overview.total': 'Ümumi məsafə',
  'map.attribution': 'Xəritə mənbələri',
  'map.overview.unrouted': '{count} marşrut hissəsini hesablamaq mümkün olmadığından məsafələr tam deyil.',
  'map.overview.unrouted.one': '{count} marşrut hissəsini hesablamaq mümkün olmadığından məsafələr tam deyil.',
  'map.overview.dayUnrouted': 'Bu günün {count} marşrut hissəsini hesablamaq mümkün olmadı',
  'map.overview.dayUnrouted.one': 'Bu günün {count} marşrut hissəsini hesablamaq mümkün olmadı',
  'map.baseLayer.topo': 'Topoqrafik',
  'map.webgl2.fallback':
    'Bu brauzer GL xəritələrinin ehtiyac duyduğu WebGL2-ni təqdim etmir, ona görə xəritələr Leaflet ilə göstərilir.',
  'map.webgl2.terrain': '3D üçün WebGL2 lazımdır, bu brauzer isə onu təqdim etmir. Xəritə 2D olaraq qalır.',
  'poi.ask': 'Soruş',
  'assistant.placeholder': 'Səyahətiniz haqqında soruşun…',
  'assistant.welcome':
    'Salam! Restoran və fəaliyyətlər təklif edə, Google reytinqlərinə və rəylərinə baxa və məkanları marşrutunuza əlavə edə bilərəm. Nə planlaşdırmaq istəyirsiniz?',
  'assistant.suggest1': 'Yaxınlıqda hara nahara getməli?',
  'assistant.suggest2': 'Mənim üçün boş günorta planlaşdır',
  'assistant.suggest3': 'Ən yüksək reytinqli görməli yerlər',
  'assistant.error': 'İndi cavab verə bilmədim. Zəhmət olmasa yenidən cəhd edin.',
  'assistant.addToDay': '{day}-ci günə əlavə et',
  'assistant.addToTrip': 'Marşruta əlavə et',
  'assistant.added': 'Əlavə edildi',
  'assistant.source': 'Məlumat Google Maps-dən',
};

export default map;
