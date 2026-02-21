import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function LocationPicker({ onLocationSelect, initialLat, initialLng }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const defaultLat = initialLat || 11.5594;
    const defaultLng = initialLng || 124.3967;

    const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 15);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([defaultLat, defaultLng], {
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    marker.on('dragend', () => {
      const position = marker.getLatLng();
      onLocationSelect(position.lat, position.lng);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    });

    if (initialLat && initialLng) {
      onLocationSelect(initialLat, initialLng);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select Your Location in Naval, Biliran
      </label>
      <p className="text-xs text-gray-500">
        Click on the map or drag the marker to pin your exact house location. The map is centered on Naval, Biliran Province.
      </p>
      <div ref={mapRef} className="w-full h-96 rounded-lg border-2 border-gray-300" />
    </div>
  );
}
