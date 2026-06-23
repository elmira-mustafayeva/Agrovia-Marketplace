import { useCallback, useEffect, useRef, useState } from 'react';
import { Autocomplete, GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';

// Browser key — must be HTTP-referrer restricted and is SEPARATE from the backend key.
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const LIBRARIES = ['places'];
const DEFAULT_CENTER = { lat: 40.4093, lng: 49.8671 }; // Bakı
const MAP_STYLE = { width: '100%', height: '220px', borderRadius: '16px' };

// Google appends the suggestions dropdown (`.pac-container`) to <body>, so React can't
// hide it declaratively — toggle its display imperatively.
const setPacDisplay = (display) => {
  document.querySelectorAll('.pac-container').forEach((el) => { el.style.display = display; });
};

/**
 * Reusable Google Places + draggable map-pin picker.
 * `value`: { lat, lng } | null. Calls `onChange({ lat, lng, addressText })` ONLY when a
 * place is selected or the pin is placed/dragged — typed text alone is never a selection.
 * `onAvailabilityChange(boolean)` reports whether the real map picker is usable (key + loaded).
 * Degrades gracefully (notice, never crashes) when the key is missing or the script fails.
 */
export default function LocationPicker({ value, onChange, placeholder = 'Ünvanı axtar...', onAvailabilityChange }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: MAPS_KEY || '',
    libraries: LIBRARIES,
  });
  const autoRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [marker, setMarker] = useState(value && Number.isFinite(value.lat) ? value : null);
  const [confirmedAddress, setConfirmedAddress] = useState('');

  const available = Boolean(MAPS_KEY) && isLoaded && !loadError;

  // Report usability to the parent (so checkout can require a confirmed pin when available).
  useEffect(() => {
    onAvailabilityChange?.(available);
  }, [available, onAvailabilityChange]);

  const closeSuggestions = useCallback(() => {
    inputRef.current?.blur();
    setPacDisplay('none');
  }, []);

  const confirm = useCallback(
    (lat, lng, addressText) => {
      setMarker({ lat, lng });
      setConfirmedAddress(addressText || '');
      onChange?.({ lat, lng, addressText: addressText || '' });
    },
    [onChange]
  );

  // Close the dropdown when clicking anywhere outside the picker (but not on a suggestion).
  useEffect(() => {
    if (!available) return undefined;
    const onPointerDown = (e) => {
      const inPicker = containerRef.current?.contains(e.target);
      const inPac = e.target?.closest?.('.pac-container');
      if (!inPicker && !inPac) closeSuggestions();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [available, closeSuggestions]);

  if (!MAPS_KEY) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Xəritə seçimi üçün <code>VITE_GOOGLE_MAPS_API_KEY</code> əlavə edilməlidir. Hələlik ünvanı mətnlə daxil edin.
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
        Xəritə yüklənmədi. Ünvanı mətnlə daxil edin.
      </div>
    );
  }
  if (!isLoaded) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">Xəritə yüklənir…</div>;
  }

  const onPlaceChanged = () => {
    const place = autoRef.current?.getPlace();
    const loc = place?.geometry?.location;
    if (loc) {
      confirm(loc.lat(), loc.lng(), place.formatted_address || place.name || '');
      closeSuggestions();
    }
  };

  const onKeyDown = (e) => {
    // Enter must never submit the parent (Cart / Seller) form, and Escape closes suggestions.
    if (e.key === 'Enter') {
      e.preventDefault();
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <Autocomplete
        onLoad={(a) => { autoRef.current = a; }}
        onPlaceChanged={onPlaceChanged}
        options={{ componentRestrictions: { country: 'az' } }}
      >
        <input
          ref={inputRef}
          className="input-shell"
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          onFocus={() => setPacDisplay('')}
        />
      </Autocomplete>
      <GoogleMap
        mapContainerStyle={MAP_STYLE}
        center={marker || DEFAULT_CENTER}
        zoom={marker ? 14 : 11}
        onClick={(e) => confirm(e.latLng.lat(), e.latLng.lng(), '')}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {marker ? (
          <Marker
            position={marker}
            draggable
            onDragEnd={(e) => confirm(e.latLng.lat(), e.latLng.lng(), '')}
          />
        ) : null}
      </GoogleMap>
      {marker ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {confirmedAddress
            ? <>Seçilmiş ünvan: <span className="font-medium">{confirmedAddress}</span></>
            : <>Seçilmiş nöqtə: <span className="font-medium">{marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}</span></>}
        </div>
      ) : (
        <div className="text-xs text-slate-400">Axtarış edin və ya xəritəyə klikləyin (ünvanı təsdiqləmək üçün nöqtə seçin).</div>
      )}
    </div>
  );
}
