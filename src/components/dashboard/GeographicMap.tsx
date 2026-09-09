import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Globe } from 'lucide-react';

// Custom pulsating dot icon
const pulsingIcon = L.divIcon({
  className: 'pulsating-dot-container',
  html: `<div class="pulsating-dot"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const GeographicMap = () => {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    // Inject CSS for pulsating dot
    const style = document.createElement('style');
    style.innerHTML = `
      .pulsating-dot-container {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pulsating-dot {
        width: 12px;
        height: 12px;
        background-color: #3b82f6;
        border-radius: 50%;
        position: relative;
      }
      .pulsating-dot::after {
        content: '';
        position: absolute;
        top: -6px;
        left: -6px;
        right: -6px;
        bottom: -6px;
        border-radius: 50%;
        border: 2px solid #3b82f6;
        animation: pulse 1.5s infinite ease-out;
      }
      @keyframes pulse {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
      .leaflet-container {
        background-color: #1e1f23;
        font-family: inherit;
      }
    `;
    document.head.appendChild(style);

    // Fetch GeoJSON for Indian States
    fetch('https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States')
      .then(res => res.json())
      .then(data => {
        // Filter for specific states: Maharashtra, Delhi, Karnataka
        const allowedStates = ['Maharashtra', 'Delhi', 'Karnataka'];
        const filteredFeatures = data.features.filter((feature: any) => {
          const stateName = feature.properties.NAME_1 || feature.properties.st_nm;
          return allowedStates.some(allowed => stateName?.includes(allowed));
        });
        setGeoData({ type: 'FeatureCollection', features: filteredFeatures });
      })
      .catch(console.error);
      
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const cities = [
    { name: 'Mumbai (Maharashtra)', coords: [19.0760, 72.8777] },
    { name: 'Pune (Maharashtra)', coords: [18.5204, 73.8567] },
    { name: 'New Delhi (Delhi)', coords: [28.6139, 77.2090] },
    { name: 'Bengaluru (Karnataka)', coords: [12.9716, 77.5946] }
  ];

  return (
    <div style={{
      backgroundColor: '#1e1f23', border: '1px solid #ffffff10', borderRadius: '16px', padding: '0', 
      height: '340px', display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden', flexShrink: 0
    }}>
      <div style={{ position: 'absolute', top: '20px', left: '24px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1000, backgroundColor: 'rgba(30, 31, 35, 0.8)', padding: '8px 16px', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
        <Globe size={18} color="#8b5cf6" />
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>Live Geographic Sales Map</h3>
      </div>
      
      <MapContainer 
        center={[20.5937, 78.9629]} 
        zoom={5} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        
        {geoData && (
          <GeoJSON 
            data={geoData} 
            style={{
              fillColor: '#3b82f6',
              weight: 2,
              opacity: 1,
              color: '#8b5cf6',
              fillOpacity: 0.1
            }} 
          />
        )}

        {cities.map((city, index) => (
          <Marker 
            key={index} 
            position={city.coords as [number, number]} 
            icon={pulsingIcon}
          >
            <Popup>
              <div style={{ color: '#000', fontWeight: 'bold' }}>
                {city.name} Sales Hub
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default GeographicMap;
