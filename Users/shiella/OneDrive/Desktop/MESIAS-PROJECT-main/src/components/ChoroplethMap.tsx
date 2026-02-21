import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import { LatLngBounds, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Classification } from '../types/database';

interface BarangayData {
  name: string;
  senior_citizen: number;
  pwd: number;
  solo_parent: number;
  total: number;
  verified: number;
  pending: number;
}

interface BeneficiaryMarker {
  id: string;
  latitude: number;
  longitude: number;
  classification: Classification;
  name: string;
  address: string;
  status: string;
  disability_type?: string;
}

interface ChoroplethMapProps {
  barangayData: Record<string, BarangayData>;
  beneficiaries: BeneficiaryMarker[];
  filter: 'all' | Classification;
  onBarangayClick: (data: BarangayData) => void;
}

function MapBounds() {
  const map = useMap();

  useEffect(() => {
    const bounds = new LatLngBounds(
      [11.56, 124.38],
      [11.62, 124.44]
    );
    map.fitBounds(bounds);
  }, [map]);

  return null;
}

export default function ChoroplethMap({ barangayData, beneficiaries, filter, onBarangayClick }: ChoroplethMapProps) {
  const getMarkerIcon = (classification: Classification, status: string) => {
    let color = '#3b82f6';

    if (classification === 'senior_citizen') {
      color = status === 'approved' ? '#10b981' : '#84cc16';
    } else if (classification === 'pwd') {
      color = status === 'approved' ? '#3b82f6' : '#60a5fa';
    } else if (classification === 'solo_parent') {
      color = status === 'approved' ? '#a855f7' : '#c084fc';
    }

    return new DivIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  const getBarangayBoxIcon = (count: number) => {
    let color = '#3b82f6';
    let size = 30;

    if (count > 20) {
      color = '#dc2626';
      size = 50;
    } else if (count > 10) {
      color = '#f97316';
      size = 45;
    } else if (count > 5) {
      color = '#eab308';
      size = 40;
    } else {
      color = '#3b82f6';
      size = 35;
    }

    return new DivIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 4px;
          border: 3px solid white;
          box-shadow: 0 3px 6px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">${count}</div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const getFilteredBeneficiaries = () => {
    if (filter === 'all') return beneficiaries;
    return beneficiaries.filter(b => b.classification === filter);
  };

  const getBarangayMarkers = () => {
    const barangayGroups: Record<string, typeof beneficiaries> = {};

    getFilteredBeneficiaries().forEach(beneficiary => {
      if (!barangayGroups[beneficiary.address]) {
        barangayGroups[beneficiary.address] = [];
      }
      barangayGroups[beneficiary.address].push(beneficiary);
    });

    return Object.entries(barangayGroups).map(([barangay, beneficiariesInBarangay]) => {
      const avgLat = beneficiariesInBarangay.reduce((sum, b) => sum + b.latitude, 0) / beneficiariesInBarangay.length;
      const avgLng = beneficiariesInBarangay.reduce((sum, b) => sum + b.longitude, 0) / beneficiariesInBarangay.length;

      const data = barangayData[barangay] || {
        name: barangay,
        senior_citizen: 0,
        pwd: 0,
        solo_parent: 0,
        total: 0,
        verified: 0,
        pending: 0,
      };

      let count = data.total;
      if (filter !== 'all') {
        count = data[filter] || 0;
      }

      return {
        barangay,
        position: [avgLat, avgLng] as [number, number],
        count,
        data,
      };
    });
  };


  return (
    <div className="relative">
      <MapContainer
        center={[11.59, 124.41]}
        zoom={12}
        style={{ height: '600px', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {getBarangayMarkers().map((marker) => (
          <Marker
            key={`barangay-${marker.barangay}`}
            position={marker.position}
            icon={getBarangayBoxIcon(marker.count)}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="p-2 min-w-[220px]">
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">{marker.barangay}</h3>
                <div className="space-y-2">
                  <div className="border-b pb-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Beneficiaries:</span>
                      <span className="text-lg font-bold text-blue-600">{marker.data.total}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Senior Citizens:</span>
                      <span className="font-medium">{marker.data.senior_citizen}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">PWD:</span>
                      <span className="font-medium">{marker.data.pwd}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Solo Parents:</span>
                      <span className="font-medium">{marker.data.solo_parent}</span>
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Verified:</span>
                      <span className="font-medium text-green-700">{marker.data.verified}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-600">Pending:</span>
                      <span className="font-medium text-yellow-700">{marker.data.pending}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onBarangayClick(marker.data)}
                    className="w-full mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {getFilteredBeneficiaries().map((beneficiary) => (
          <Marker
            key={beneficiary.id}
            position={[beneficiary.latitude, beneficiary.longitude]}
            icon={getMarkerIcon(beneficiary.classification, beneficiary.status)}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-gray-900 mb-2">{beneficiary.name}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Classification:</span>
                    <span className="font-medium capitalize">
                      {beneficiary.classification === 'senior_citizen' && 'Senior Citizen'}
                      {beneficiary.classification === 'pwd' && 'PWD'}
                      {beneficiary.classification === 'solo_parent' && 'Solo Parent'}
                    </span>
                  </div>
                  {beneficiary.disability_type && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Disability:</span>
                      <span className="font-medium capitalize">{beneficiary.disability_type.replace('_', ' ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Barangay:</span>
                    <span className="font-medium">{beneficiary.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium capitalize ${
                      beneficiary.status === 'approved' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {beneficiary.status}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapBounds />
      </MapContainer>

      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-[200px]">
        <h4 className="font-semibold text-gray-900 mb-2 text-sm">Barangay Boxes</h4>
        <div className="space-y-1 text-xs mb-3">
          <div className="flex items-center">
            <div className="w-6 h-6 mr-2 rounded flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#dc2626' }}>20+</div>
            <span>Very High</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 mr-2 rounded flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#f97316' }}>11+</div>
            <span>High</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 mr-2 rounded flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#eab308' }}>6+</div>
            <span>Medium</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 mr-2 rounded flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#3b82f6' }}>1+</div>
            <span>Low</span>
          </div>
        </div>

        <h4 className="font-semibold text-gray-900 mb-2 text-sm border-t pt-2">Individual Markers</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: '#10b981', border: '2px solid white' }}></div>
            <span>Senior (Verified)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: '#3b82f6', border: '2px solid white' }}></div>
            <span>PWD (Verified)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: '#a855f7', border: '2px solid white' }}></div>
            <span>Solo Parent (Verified)</span>
          </div>
          <div className="text-xs text-gray-500 mt-1 italic">
            Lighter = Pending
          </div>
        </div>
      </div>
    </div>
  );
}
