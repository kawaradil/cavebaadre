import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import {
  X,
  Satellite,
  Map as MapIcon,
  LocateFixed,
  MapPin,
  Check,
  Plus,
  Minus,
  Sparkles,
  Maximize2,
  Crosshair,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BAADRE_CENTER_COORDS } from '../types/baadre';
import { useLanguage } from '../context/LanguageContext';
import { playClickSound, playSuccessSound } from '../lib/sound';

// Tile Provider 1: Google Maps Hybrid Satellite Tiles (Default)
const GOOGLE_HYBRID_TILE_URL = 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
const GOOGLE_SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3'];

// Tile Provider 2: OpenStreetMap (OSM) Standard Street View
const OSM_STREET_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_SUBDOMAINS = ['a', 'b', 'c'];

function createCustomPinIcon(lat: number, lng: number, showCoordPill = true): L.DivIcon {
  const pillHtml = showCoordPill
    ? `<div style="margin-bottom:6px;padding:3px 10px;border-radius:9999px;background:rgba(30,55,37,0.94);backdrop-filter:blur(6px);color:#ffffff;font-family:monospace;font-size:10.5px;font-weight:800;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,0.28);border:1px solid rgba(136,183,147,0.65);display:flex;align-items:center;gap:6px;direction:ltr;">
        <span style="width:7px;height:7px;border-radius:50%;background:#34d399;display:inline-block;"></span>
        <span>${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
      </div>`
    : '';

  return L.divIcon({
    className: 'custom-baadre-leaflet-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);cursor:grab;">
        ${pillHtml}
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:relative;width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#46674D,#1E3725);border:2.5px solid #ffffff;box-shadow:0 10px 24px rgba(30,55,37,0.45);display:flex;align-items:center;justify-content:center;color:#ffffff;">
            <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div style="position:absolute;bottom:-5px;width:11px;height:11px;transform:rotate(45deg);background:#1E3725;border-right:2px solid #ffffff;border-bottom:2px solid #ffffff;"></div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

interface FullScreenGoogleMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  onSelectLocation: (lat: number, lng: number) => void;
}

export const FullScreenGoogleMapPickerModal: React.FC<FullScreenGoogleMapPickerModalProps> = ({
  isOpen,
  onClose,
  latitude,
  longitude,
  onSelectLocation,
}) => {
  const { language, dir, isRTL } = useLanguage();

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: latitude || BAADRE_CENTER_COORDS.lat,
    lng: longitude || BAADRE_CENTER_COORDS.lng,
  });
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: BAADRE_CENTER_COORDS.lat,
    lng: BAADRE_CENTER_COORDS.lng,
  });
  // Default mode: Satellite / Hybrid (mt0-mt3.google.com/vt/lyrs=y)
  const [isSatellite, setIsSatellite] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationMode, setLocationMode] = useState<'baadre' | 'current' | 'custom'>('baadre');
  const [showGreenPin, setShowGreenPin] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  // Initialize Leaflet Map when full-screen modal opens — opens directly on Baadre
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const initialLat = BAADRE_CENTER_COORDS.lat;
    const initialLng = BAADRE_CENTER_COORDS.lng;
    setSelectedCoords({ lat: initialLat, lng: initialLng });
    setMapCenter({ lat: initialLat, lng: initialLng });
    setLocationMode('baadre');
    setShowGreenPin(false);

    // Clean up any existing map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    const initialLayer = isSatellite
      ? L.tileLayer(GOOGLE_HYBRID_TILE_URL, {
          subdomains: GOOGLE_SUBDOMAINS,
          maxZoom: 20,
        })
      : L.tileLayer(OSM_STREET_TILE_URL, {
          subdomains: OSM_SUBDOMAINS,
          maxZoom: 19,
        });

    initialLayer.addTo(map);
    tileLayerRef.current = initialLayer;

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: createCustomPinIcon(initialLat, initialLng, true),
      opacity: 0,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const updated = {
        lat: Number(pos.lat.toFixed(5)),
        lng: Number(pos.lng.toFixed(5)),
      };
      marker.setIcon(createCustomPinIcon(updated.lat, updated.lng, true));
      marker.setOpacity(1);
      setShowGreenPin(true);
      setLocationMode('custom');
      setSelectedCoords(updated);
      onSelectLocation(updated.lat, updated.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      playClickSound();
      const clicked = {
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      };
      marker.setLatLng([clicked.lat, clicked.lng]);
      marker.setIcon(createCustomPinIcon(clicked.lat, clicked.lng, true));
      marker.setOpacity(1);
      setShowGreenPin(true);
      setLocationMode('custom');
      setSelectedCoords(clicked);
      onSelectLocation(clicked.lat, clicked.lng);
    });

    map.on('move', () => {
      const c = map.getCenter();
      setMapCenter({
        lat: Number(c.lat.toFixed(5)),
        lng: Number(c.lng.toFixed(5)),
      });
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen]);

  // Switch tile layers dynamically when Satellite toggle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const nextLayer = isSatellite
      ? L.tileLayer(GOOGLE_HYBRID_TILE_URL, {
          subdomains: GOOGLE_SUBDOMAINS,
          maxZoom: 20,
        })
      : L.tileLayer(OSM_STREET_TILE_URL, {
          subdomains: OSM_SUBDOMAINS,
          maxZoom: 19,
        });

    nextLayer.addTo(map);
    tileLayerRef.current = nextLayer;
  }, [isSatellite]);

  // Keep marker synced if coordinates or visibility change
  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([selectedCoords.lat, selectedCoords.lng]);
    markerRef.current.setIcon(
      createCustomPinIcon(selectedCoords.lat, selectedCoords.lng, true)
    );
    markerRef.current.setOpacity(showGreenPin ? 1 : 0);
  }, [selectedCoords, showGreenPin]);

  const handleToggleSatellite = () => {
    playClickSound();
    setIsSatellite((prev) => {
      const next = !prev;
      showToast(
        next
          ? tr(
              'وضع القمر الصناعي الهجين (Google Hybrid)',
              'دۆخی مانگی دەستکرد (Google Hybrid)',
              'Google Hybrid Satellite View enabled'
            )
          : tr(
              'وضع الخريطة العادية / الشوارع',
              'نەخشەی شەقامەکان',
              'Street View enabled'
            )
      );
      return next;
    });
  };

  const handleLocateMe = () => {
    playClickSound();
    setLocationMode('current');
    setShowGreenPin(true);
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords = {
            lat: Number(pos.coords.latitude.toFixed(5)),
            lng: Number(pos.coords.longitude.toFixed(5)),
          };
          setSelectedCoords(newCoords);
          setIsLocating(false);
          onSelectLocation(newCoords.lat, newCoords.lng);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([newCoords.lat, newCoords.lng], 17, {
              duration: 1.1,
            });
          }
          showToast(
            tr(
              'تم تحديد موقعك الحالي بنجاح',
              'شوێنی ئێستات بە سەرکەوتوویی دیاریکرا',
              'Current location selected'
            )
          );
        },
        () => {
          const fallbackCoords = {
            lat: Number(BAADRE_CENTER_COORDS.lat.toFixed(5)),
            lng: Number(BAADRE_CENTER_COORDS.lng.toFixed(5)),
          };
          setSelectedCoords(fallbackCoords);
          setIsLocating(false);
          onSelectLocation(fallbackCoords.lat, fallbackCoords.lng);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([fallbackCoords.lat, fallbackCoords.lng], 16, {
              duration: 1.0,
            });
          }
          showToast(
            tr(
              'تم التوجيه إلى مركز باعذرة',
              'ئاڕاستەکرا بۆ سەنتەری باعەدرێ',
              'Centered on Baadre'
            )
          );
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleActivateCustomPin = () => {
    playClickSound();
    setLocationMode('custom');
    setShowGreenPin(true);
    const center = mapInstanceRef.current
      ? mapInstanceRef.current.getCenter()
      : BAADRE_CENTER_COORDS;
    const nextCoords = {
      lat: Number(center.lat.toFixed(5)),
      lng: Number(center.lng.toFixed(5)),
    };
    setSelectedCoords(nextCoords);
    onSelectLocation(nextCoords.lat, nextCoords.lng);
    showToast(
      tr(
        'اسحب الرمز الأخضر أو انقر على الخريطة لنقله إلى مكان آخر',
        'نیشانە سەوزەکە ڕابکێشە یان کلیک لەسەر نەخشە بکە بۆ گۆڕینی شوێن',
        'Drag the green pin or tap on the map to move it'
      )
    );
  };

  const handleZoom = (delta: number) => {
    playClickSound();
    const map = mapInstanceRef.current;
    if (!map) return;
    if (delta > 0) map.zoomIn();
    else map.zoomOut();
  };

  const handleConfirmAndClose = () => {
    playSuccessSound();
    onSelectLocation(
      Number(selectedCoords.lat.toFixed(5)),
      Number(selectedCoords.lng.toFixed(5))
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        dir={dir}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[250] w-screen h-screen bg-[#1E3725] flex flex-col overflow-hidden select-none"
      >
        <div className="relative w-full h-full flex-1">
          {/* Leaflet Map Container */}
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Top Bar: Nice gentle buttons ("موقعي الحالي" & "موقع آخر") + Close Button */}
          <div className="absolute top-3 sm:top-5 inset-x-3 sm:inset-x-6 z-30 flex items-center justify-between gap-2 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-[#BBDDC6] shadow-[0_10px_28px_rgba(30,55,37,0.18)]">
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                  locationMode === 'current'
                    ? 'bg-[#46674D] text-white shadow-xs'
                    : 'bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#1E3725]'
                }`}
              >
                <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{tr('موقعي الحالي', 'شوێنی ئێستام', 'My Current Location')}</span>
              </button>

              <button
                type="button"
                onClick={handleActivateCustomPin}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                  locationMode === 'custom'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#1E3725]'
                }`}
              >
                <MapPin className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                <span>{tr('موقع آخر', 'شوێنێکی تر', 'Another Location')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              aria-label={tr('إغلاق الخريطة', 'داخستنی نەخشە', 'Close Map')}
              title={tr('إغلاق الخريطة', 'داخستنی نەخشە', 'Close Map')}
              className="pointer-events-auto w-11 h-11 rounded-2xl bg-white/95 hover:bg-rose-50 text-[#1E3725] hover:text-rose-600 border border-[#BBDDC6] hover:border-rose-200 shadow-[0_10px_30px_rgba(30,55,37,0.2)] flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Toast Notification Pill */}
          <AnimatePresence>
            {statusToast && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="absolute top-20 inset-x-0 z-30 flex justify-center pointer-events-none px-4"
              >
                <div className="px-4 py-2 rounded-2xl bg-[#1E3725]/90 backdrop-blur-md text-white text-xs font-bold shadow-xl border border-[#88B793]/50 flex items-center gap-2 whitespace-nowrap">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>{statusToast}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Side Harmonious Control Toolbar */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2.5 ${
              isRTL ? 'right-3 sm:right-5' : 'left-3 sm:left-5'
            }`}
          >
            {/* Satellite Toggle Button */}
            <button
              type="button"
              onClick={handleToggleSatellite}
              aria-label={tr('تبديل القمر الصناعي', 'گۆڕینی سەتەلایت', 'Toggle Satellite')}
              title={tr('تبديل القمر الصناعي', 'گۆڕینی سەتەلایت', 'Toggle Satellite')}
              className={`w-11 h-11 rounded-2xl backdrop-blur-md border shadow-[0_8px_24px_rgba(30,55,37,0.2)] flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                isSatellite
                  ? 'bg-[#46674D] text-white border-white/60'
                  : 'bg-white/95 hover:bg-[#E8F4EA] text-[#1E3725] border-[#BBDDC6]'
              }`}
            >
              {isSatellite ? (
                <Satellite className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <MapIcon className="w-5 h-5 stroke-[2.2]" />
              )}
            </button>
          </div>

          {/* Opposite Side Harmonious Zoom Controls */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2 ${
              isRTL ? 'left-3 sm:left-5' : 'right-3 sm:right-5'
            }`}
          >
            <button
              type="button"
              onClick={() => handleZoom(1)}
              title={tr('تكبير الخريطة', 'گەورەکردن', 'Zoom In')}
              className="w-11 h-11 rounded-2xl bg-white/95 hover:bg-[#E8F4EA] text-[#1E3725] border border-[#BBDDC6] shadow-[0_8px_24px_rgba(30,55,37,0.18)] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.4]" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-1)}
              title={tr('تصغير الخريطة', 'بچووککردنەوە', 'Zoom Out')}
              className="w-11 h-11 rounded-2xl bg-white/95 hover:bg-[#E8F4EA] text-[#1E3725] border border-[#BBDDC6] shadow-[0_8px_24px_rgba(30,55,37,0.18)] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            >
              <Minus className="w-5 h-5 stroke-[2.4]" />
            </button>
          </div>

          {/* Bottom Floating Action & Confirmation Bar */}
          <div className="absolute bottom-4 sm:bottom-6 inset-x-3 sm:inset-x-6 z-30 flex justify-center pointer-events-none">
            <div className="pointer-events-auto w-full max-w-xl p-3 sm:p-4 rounded-3xl bg-white/95 backdrop-blur-md border border-[#BBDDC6] shadow-[0_16px_40px_rgba(30,55,37,0.28)] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-2xl bg-[#E8F4EA] border border-[#BBDDC6] text-[#46674D] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 stroke-[2.3]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-[#46674D]">
                    {tr(
                      'الإحداثيات الجغرافية المحددة للبلاغ:',
                      'پۆتانە جوگرافییە دیاریکراوەکان:',
                      'Selected Geographic Coordinates:'
                    )}
                  </p>
                  <p className="text-xs sm:text-sm font-mono font-black text-[#1E3725]" dir="ltr">
                    {selectedCoords.lat.toFixed(5)}° N, {selectedCoords.lng.toFixed(5)}° E
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleConfirmAndClose}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#46674D] to-[#2D4833] hover:from-[#36593F] hover:to-[#1E3725] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.6]" />
                  <span>
                    {tr(
                      'اعتماد الموقع وإغلاق الخريطة',
                      'پەسەندکردنی شوێن و داخستن',
                      'Confirm Location & Close'
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

interface EmbeddedGoogleMapPreviewCardProps {
  latitude: number;
  longitude: number;
  onSelectLocation: (lat: number, lng: number) => void;
  onOpenFullScreen: () => void;
}

export const EmbeddedGoogleMapPreviewCard: React.FC<EmbeddedGoogleMapPreviewCardProps> = ({
  latitude,
  longitude,
  onSelectLocation,
  onOpenFullScreen,
}) => {
  const { language, isRTL } = useLanguage();
  // Default mode: Satellite / Hybrid (mt0-mt3.google.com/vt/lyrs=y)
  const [isSatellite, setIsSatellite] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showGreenPin, setShowGreenPin] = useState<boolean>(false);
  const [activeBtn, setActiveBtn] = useState<'baadre' | 'current' | 'custom'>('baadre');

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewMapRef = useRef<L.Map | null>(null);
  const previewTileLayerRef = useRef<L.TileLayer | null>(null);
  const previewMarkerRef = useRef<L.Marker | null>(null);

  const tr = (ar: string, ku: string, en: string) =>
    language === 'ku' ? ku : language === 'en' ? en : ar;

  // Initialize embedded Leaflet preview map directly on Baadre
  useEffect(() => {
    if (!previewContainerRef.current) return;

    if (previewMapRef.current) {
      previewMapRef.current.remove();
      previewMapRef.current = null;
    }

    const startLat = BAADRE_CENTER_COORDS.lat;
    const startLng = BAADRE_CENTER_COORDS.lng;

    const map = L.map(previewContainerRef.current, {
      center: [startLat, startLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    const layer = isSatellite
      ? L.tileLayer(GOOGLE_HYBRID_TILE_URL, {
          subdomains: GOOGLE_SUBDOMAINS,
          maxZoom: 20,
        })
      : L.tileLayer(OSM_STREET_TILE_URL, {
          subdomains: OSM_SUBDOMAINS,
          maxZoom: 19,
        });

    layer.addTo(map);
    previewTileLayerRef.current = layer;

    const marker = L.marker([startLat, startLng], {
      draggable: true,
      icon: createCustomPinIcon(startLat, startLng, false),
      opacity: 0,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const nextLat = Number(pos.lat.toFixed(5));
      const nextLng = Number(pos.lng.toFixed(5));
      marker.setIcon(createCustomPinIcon(nextLat, nextLng, false));
      marker.setOpacity(1);
      setShowGreenPin(true);
      setActiveBtn('custom');
      onSelectLocation(nextLat, nextLng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      playClickSound();
      const nextLat = Number(e.latlng.lat.toFixed(5));
      const nextLng = Number(e.latlng.lng.toFixed(5));
      marker.setLatLng([nextLat, nextLng]);
      marker.setIcon(createCustomPinIcon(nextLat, nextLng, false));
      marker.setOpacity(1);
      setShowGreenPin(true);
      setActiveBtn('custom');
      onSelectLocation(nextLat, nextLng);
    });

    previewMapRef.current = map;
    previewMarkerRef.current = marker;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      previewMapRef.current = null;
      previewTileLayerRef.current = null;
      previewMarkerRef.current = null;
    };
  }, []);

  // Update preview tile layer when Satellite toggle changes
  useEffect(() => {
    const map = previewMapRef.current;
    if (!map) return;

    if (previewTileLayerRef.current) {
      map.removeLayer(previewTileLayerRef.current);
    }

    const nextLayer = isSatellite
      ? L.tileLayer(GOOGLE_HYBRID_TILE_URL, {
          subdomains: GOOGLE_SUBDOMAINS,
          maxZoom: 20,
        })
      : L.tileLayer(OSM_STREET_TILE_URL, {
          subdomains: OSM_SUBDOMAINS,
          maxZoom: 19,
        });

    nextLayer.addTo(map);
    previewTileLayerRef.current = nextLayer;
  }, [isSatellite]);

  // Sync marker & center when latitude/longitude or pin visibility change
  useEffect(() => {
    if (previewMarkerRef.current) {
      previewMarkerRef.current.setLatLng([latitude, longitude]);
      previewMarkerRef.current.setIcon(createCustomPinIcon(latitude, longitude, false));
      previewMarkerRef.current.setOpacity(showGreenPin ? 1 : 0);
    }
  }, [latitude, longitude, showGreenPin]);

  const handleQuickLocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    setActiveBtn('current');
    setShowGreenPin(true);
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nextLat = Number(pos.coords.latitude.toFixed(5));
          const nextLng = Number(pos.coords.longitude.toFixed(5));
          onSelectLocation(nextLat, nextLng);
          if (previewMapRef.current) {
            previewMapRef.current.flyTo([nextLat, nextLng], 16, { duration: 1.0 });
          }
          setIsLocating(false);
        },
        () => {
          const nextLat = Number(BAADRE_CENTER_COORDS.lat.toFixed(5));
          const nextLng = Number(BAADRE_CENTER_COORDS.lng.toFixed(5));
          onSelectLocation(nextLat, nextLng);
          if (previewMapRef.current) {
            previewMapRef.current.flyTo([nextLat, nextLng], 15, { duration: 1.0 });
          }
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleOtherLocationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    setActiveBtn('custom');
    setShowGreenPin(true);
    const center = previewMapRef.current
      ? previewMapRef.current.getCenter()
      : BAADRE_CENTER_COORDS;
    const nextLat = Number(center.lat.toFixed(5));
    const nextLng = Number(center.lng.toFixed(5));
    onSelectLocation(nextLat, nextLng);
    if (previewMarkerRef.current) {
      previewMarkerRef.current.setLatLng([nextLat, nextLng]);
      previewMarkerRef.current.setOpacity(1);
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-3 shadow-2xs">
      {/* Header Row: Nice Gentle Buttons (موقعي الحالي + موقع آخر + فتح الخريطة) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleQuickLocate}
            disabled={isLocating}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs border ${
              activeBtn === 'current'
                ? 'bg-[#46674D] text-white border-[#46674D]'
                : 'bg-white hover:bg-[#E8F4EA] text-[#1E3725] border-[#BBDDC6]'
            }`}
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{tr('موقعي الحالي', 'شوێنی ئێستام', 'My Current Location')}</span>
          </button>

          <button
            type="button"
            onClick={handleOtherLocationClick}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs border ${
              activeBtn === 'custom'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white hover:bg-[#E8F4EA] text-[#1E3725] border-[#BBDDC6]'
            }`}
          >
            <MapPin
              className={`w-3.5 h-3.5 ${
                activeBtn === 'custom' ? 'text-white' : 'text-emerald-600'
              }`}
            />
            <span>{tr('موقع آخر', 'شوێنێکی تر', 'Another Location')}</span>
          </button>
        </div>

        {/* Open Full Screen Map Button */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onOpenFullScreen();
          }}
          className="px-3 py-2 rounded-xl bg-white hover:bg-[#E8F4EA] text-[#2D4833] border border-[#BBDDC6] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>{tr('تكبير الخريطة', 'گەورەکردنی نەخشە', 'Expand Map')}</span>
        </button>
      </div>

      {/* Live Leaflet Map Preview Box */}
      <div className="relative h-52 rounded-2xl overflow-hidden border border-[#BBDDC6] shadow-inner bg-[#E8F4EA]">
        <div ref={previewContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing z-10" />

        {/* Mini Floating Quick Controls on Preview */}
        <div
          className={`absolute top-2.5 z-20 flex items-center gap-1.5 ${
            isRTL ? 'right-2.5' : 'left-2.5'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playClickSound();
              setIsSatellite((prev) => !prev);
            }}
            aria-label={tr('ستلايت', 'سەتەلایت', 'Satellite')}
            title={tr('ستلايت', 'سەتەلایت', 'Satellite')}
            className={`w-9 h-9 rounded-xl backdrop-blur-md border flex items-center justify-center shadow-sm transition-all cursor-pointer ${
              isSatellite
                ? 'bg-[#46674D] text-white border-white/50'
                : 'bg-white/95 text-[#1E3725] border-[#BBDDC6]'
            }`}
          >
            {isSatellite ? <Satellite className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
          </button>
        </div>

        {/* Bottom Overlay Bar */}
        <div
          onClick={() => {
            playClickSound();
            onOpenFullScreen();
          }}
          className="absolute bottom-2.5 inset-x-2.5 z-20 px-3 py-2 rounded-xl bg-white/95 hover:bg-white backdrop-blur-md border border-[#BBDDC6] shadow-md flex items-center justify-between cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-black text-[#1E3725]" dir="ltr">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#46674D] flex items-center gap-1">
            <Crosshair className="w-3.5 h-3.5" />
            {showGreenPin
              ? tr(
                  'حرك الرمز الأخضر فوق الخريطة لتحديد الموقع',
                  'نیشانە سەوزەکە لەسەر نەخشە بجوڵێنە',
                  'Move the green marker over the map'
                )
              : tr(
                  'خريطة باعذرة المباشرة',
                  'نەخشەی ڕاستەوخۆی باعەدرێ',
                  'Direct Map of Baadre'
                )}
          </span>
        </div>
      </div>
    </div>
  );
};
