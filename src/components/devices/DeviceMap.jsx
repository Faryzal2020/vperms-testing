import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export default function DeviceMap({ track, currentPosition, height = '400px' }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const polylineRef = useRef(null);
    const markerRef = useRef(null);

    // Initialize Map
    useEffect(() => {
        if (!mapInstance.current && mapRef.current) {
            mapInstance.current = L.map(mapRef.current).setView([-6.2088, 106.8456], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstance.current);
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // Update Data
    useEffect(() => {
        if (!mapInstance.current) return;
        const map = mapInstance.current;

        // 1. Handle Polyline (History Track)
        if (track && track.length > 0) {
            // Leaflet expects [lat, lng], API gives [lng, lat]
            // Add validation to ensure p.coordinates exists and has numbers
            const latLngs = track
                .filter(p => p.coordinates && 
                            typeof p.coordinates[0] === 'number' && 
                            typeof p.coordinates[1] === 'number' &&
                            p.coordinates[0] !== 0 && p.coordinates[1] !== 0)
                .map(p => [p.coordinates[1], p.coordinates[0]]);

            if (latLngs.length > 0) {
                if (polylineRef.current) {
                    polylineRef.current.setLatLngs(latLngs);
                } else {
                    polylineRef.current = L.polyline(latLngs, { color: 'blue', weight: 4, opacity: 0.7 }).addTo(map);
                }

                // Fit bounds to track if no current position
                if (!currentPosition && latLngs.length > 0) {
                    map.fitBounds(polylineRef.current.getBounds());
                }
            } else if (polylineRef.current) {
                polylineRef.current.remove();
                polylineRef.current = null;
            }
        } else {
            if (polylineRef.current) {
                polylineRef.current.remove();
                polylineRef.current = null;
            }
        }

        // 2. Handle Marker (Current Position)
        const lat = currentPosition?.latitude;
        const lng = currentPosition?.longitude;
        const hasValidCoords = typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0;

        if (hasValidCoords) {
            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            } else {
                markerRef.current = L.marker([lat, lng]).addTo(map);
            }

            // Update Popup Content
            const popupContent = `
                <div>
                    <strong>Current Location</strong><br />
                    Speed: ${currentPosition.speed || 0} km/h<br />
                    Heading: ${currentPosition.heading || 0}°
                </div>
            `;
            markerRef.current.bindPopup(popupContent);

            // Center map on marker
            map.setView([lat, lng], map.getZoom());
        } else {
            if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
            }
        }

    }, [track, currentPosition]);

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: height }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
