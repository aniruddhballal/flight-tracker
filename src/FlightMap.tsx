import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface FlightMapProps {
  flights: Array<{
    id: string;
    callsign: string;
    country: string;
    longitude: number;
    latitude: number;
    altitude: string;
    velocity: string;
    heading: number;
  }>;
  cityName: string;
  cityCoords: { lat: number; lon: number };
}

interface FlightMarkerData {
  marker: L.Marker;
  polyline: L.Polyline | null;
  track: Array<[number, number]>;
}

interface UserLocationData {
  marker: L.Marker | null;
  circle: L.Circle | null;
}

const FlightMap: React.FC<FlightMapProps> = ({ flights, cityName, cityCoords }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const flightMarkersRef = useRef<Map<string, FlightMarkerData>>(new Map());
  const mapInitializedRef = useRef<boolean>(false);
  const userLocationRef = useRef<UserLocationData>({ marker: null, circle: null });
  const watchIdRef = useRef<number | null>(null);
  const currentHeadingRef = useRef<number>(0);
  const [locationEnabled, setLocationEnabled] = useState(false);

  // Create custom airplane icon
  const createPlaneIcon = (heading: number) => {
    const svgIcon = `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(16,16) rotate(${heading}) translate(-16,-16)">
          <path d="M16 4 L14 14 L10 14 L8 10 L6 10 L8 16 L6 22 L8 22 L10 18 L14 18 L16 28 L18 28 L18 18 L22 18 L24 22 L26 22 L24 16 L26 10 L24 10 L22 14 L18 14 L18 4 Z" 
                fill="#3B82F6" stroke="#1E40AF" stroke-width="1"/>
        </g>
      </svg>
    `;
    
    return L.divIcon({
      html: svgIcon,
      className: 'custom-plane-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Create user location icon with direction arrow
  const createUserIcon = (heading: number) => {
    const svgIcon = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(20,20) rotate(${heading}) translate(-20,-20)">
          <!-- Outer circle -->
          <circle cx="20" cy="20" r="10" fill="#3B82F6" stroke="white" stroke-width="3" opacity="0.9"/>
          <!-- Direction arrow -->
          <path d="M20 8 L25 20 L20 17 L15 20 Z" fill="white" stroke="white" stroke-width="1"/>
        </g>
      </svg>
    `;
    
    return L.divIcon({
      html: svgIcon,
      className: 'custom-user-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  // Update user location marker
  const updateUserLocation = (lat: number, lon: number, accuracy: number) => {
    if (!mapRef.current) return;

    const position: [number, number] = [lat, lon];

    if (userLocationRef.current.marker) {
      // Update existing marker
      userLocationRef.current.marker.setLatLng(position);
      userLocationRef.current.marker.setIcon(createUserIcon(currentHeadingRef.current));
      
      if (userLocationRef.current.circle) {
        userLocationRef.current.circle.setLatLng(position);
        userLocationRef.current.circle.setRadius(accuracy);
      }
    } else {
      // Create new marker
      const marker = L.marker(position, { 
        icon: createUserIcon(currentHeadingRef.current),
        zIndexOffset: 2000 
      })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="font-family: sans-serif;">
            <b style="font-size: 14px; color: #1f2937;">Your Location</b><br/>
            <span style="color: #6b7280; font-size: 12px;">Lat: ${lat.toFixed(5)}</span><br/>
            <span style="color: #6b7280; font-size: 12px;">Lon: ${lon.toFixed(5)}</span><br/>
            <span style="color: #6b7280; font-size: 12px;">Accuracy: ±${accuracy.toFixed(0)}m</span>
          </div>
        `);

      const circle = L.circle(position, {
        radius: accuracy,
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.1,
        weight: 2,
        interactive: false,
      }).addTo(mapRef.current);

      userLocationRef.current = { marker, circle };
    }
  };

  // Handle device orientation
  const handleOrientation = (event: DeviceOrientationEvent) => {
    let heading = 0;

    // Type assertion for webkit property (iOS)
    const webkitEvent = event as any;
    if (webkitEvent.webkitCompassHeading !== undefined) {
      // iOS
      heading = webkitEvent.webkitCompassHeading;
    } else if (event.alpha !== null) {
      // Android
      heading = 360 - event.alpha;
    }

    currentHeadingRef.current = heading;

    // Update user marker icon with new heading
    if (userLocationRef.current.marker) {
      userLocationRef.current.marker.setIcon(createUserIcon(heading));
    }
  };

  // Start tracking user location
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        updateUserLocation(latitude, longitude, accuracy);
        setLocationEnabled(true);
      },
      (error) => {
        console.error('Location error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );

    // Request device orientation
    if (typeof DeviceOrientationEvent !== 'undefined') {
      // Check if permission is needed (iOS 13+)
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((response: string) => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(console.error);
      } else {
        // For Android and older iOS
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }
  };

  // Stop tracking user location
  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    window.removeEventListener('deviceorientation', handleOrientation);

    if (userLocationRef.current.marker) {
      userLocationRef.current.marker.remove();
      userLocationRef.current.marker = null;
    }

    if (userLocationRef.current.circle) {
      userLocationRef.current.circle.remove();
      userLocationRef.current.circle = null;
    }

    setLocationEnabled(false);
  };

  // Update map with flights
  const updateMapFlights = () => {
    if (!mapRef.current) return;

    const currentFlightIds = new Set(flights.map(f => f.id));
    const existingFlightIds = Array.from(flightMarkersRef.current.keys());

    // Remove flights that are no longer in the data
    for (const flightId of existingFlightIds) {
      if (!currentFlightIds.has(flightId)) {
        const flightData = flightMarkersRef.current.get(flightId);
        if (flightData) {
          flightData.marker.remove();
          if (flightData.polyline) {
            flightData.polyline.remove();
          }
        }
        flightMarkersRef.current.delete(flightId);
      }
    }

    // Update or create markers
    flights.forEach((flight) => {
      const currentPos: [number, number] = [flight.latitude, flight.longitude];
      const existingData = flightMarkersRef.current.get(flight.id);

      if (existingData) {
        // Update existing marker
        existingData.marker.setLatLng(currentPos);
        existingData.marker.setIcon(createPlaneIcon(flight.heading));

        // Add to track if position changed
        const track = existingData.track;
        if (track.length === 0 || 
            (track[track.length - 1][0] !== currentPos[0] || 
             track[track.length - 1][1] !== currentPos[1])) {
          track.push(currentPos);
        }

        // Update polyline
        if (existingData.polyline) {
          existingData.polyline.setLatLngs(track);
        } else if (track.length > 1 && mapRef.current) {
          const newPolyline = L.polyline(track, {
            color: '#10B981',
            weight: 2,
            opacity: 0.7,
            interactive: false,
          }).addTo(mapRef.current);
          existingData.polyline = newPolyline;
        }
      } else {
        // Create new marker
        if (!mapRef.current) return;
        
        const planeIcon = createPlaneIcon(flight.heading);
        const marker = L.marker(currentPos, { icon: planeIcon, zIndexOffset: 1000 })
          .addTo(mapRef.current)
          .bindPopup(`
            <div style="font-family: sans-serif;">
              <b style="font-size: 14px; color: #1f2937;">${flight.callsign}</b><br/>
              <span style="color: #6b7280; font-size: 12px;">Country: ${flight.country}</span><br/>
              <span style="color: #6b7280; font-size: 12px;">Altitude: ${flight.altitude}</span><br/>
              <span style="color: #6b7280; font-size: 12px;">Speed: ${flight.velocity}</span><br/>
              <span style="color: #6b7280; font-size: 12px;">Heading: ${flight.heading}°</span>
            </div>
          `);

        flightMarkersRef.current.set(flight.id, {
          marker,
          polyline: null,
          track: [currentPos],
        });
      }
    });
  };

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInitializedRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([cityCoords.lat, cityCoords.lon], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    const cityIcon = L.divIcon({
      html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-city-icon',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker([cityCoords.lat, cityCoords.lon], { icon: cityIcon })
      .addTo(mapRef.current)
      .bindPopup(`<b>${cityName}</b>`);

    mapInitializedRef.current = true;

    // Auto-start location tracking if available
    startLocationTracking();

    // Cleanup on unmount
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Load flights once when city changes
  useEffect(() => {
    updateMapFlights();
  }, [flights]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4">
      <div className="mb-3 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Flight Map</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={locationEnabled ? stopLocationTracking : startLocationTracking}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              locationEnabled 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {locationEnabled ? '📍 Location On' : '📍 Show My Location'}
          </button>
          <div className="text-xs sm:text-sm text-gray-600">
            {flights.length} aircraft
          </div>
        </div>
      </div>
      
      <div 
        ref={mapContainerRef} 
        className="w-full rounded-lg border-2 border-gray-200"
        style={{ height: 'clamp(400px, 70vh, 600px)' }}
      />
      
      <p className="mt-3 text-xs sm:text-sm text-gray-600 text-center px-2">
        🗺️ Click on any airplane to see details • Green lines show flight paths • Blue marker shows your location {locationEnabled && '& direction'}
      </p>
    </div>
  );
};

export default FlightMap;