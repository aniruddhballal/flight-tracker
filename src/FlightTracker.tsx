import React, { useState } from 'react';
import { Plane, MapPin, Search, Globe, Map } from 'lucide-react';
import FlightMap from './FlightMap';

interface Flight {
  id: string;
  callsign: string;
  country: string;
  longitude: string;
  latitude: string;
  altitude: string;
  velocity: string;
  heading: string;
  onGround: boolean;
}

const GlobalFlightTracker: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchedLocation, setSearchedLocation] = useState<string>('');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number }>({ lat: 0, lon: 0 });
  const [searchRadius, setSearchRadius] = useState<number>(0.5);
  const [showMap, setShowMap] = useState<boolean>(false);

  const searchAirport = async (query: string): Promise<{ lat: number; lon: number; name: string; code: string } | null> => {
    try {
      // Try OpenStreetMap Nominatim API for airport search
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' airport')}&format=json&limit=1`,
        { headers: { 'User-Agent': 'FlightTrackerApp/1.0' } }
      );
      
      if (nominatimResponse.ok) {
        const nominatimData = await nominatimResponse.json();
        if (nominatimData.length > 0) {
          return {
            lat: parseFloat(nominatimData[0].lat),
            lon: parseFloat(nominatimData[0].lon),
            name: nominatimData[0].display_name.split(',')[0],
            code: query.toUpperCase()
          };
        }
      }

      // If no airport found, try searching for the city itself
      const cityResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'FlightTrackerApp/1.0' } }
      );
      
      if (cityResponse.ok) {
        const cityData = await cityResponse.json();
        if (cityData.length > 0) {
          return {
            lat: parseFloat(cityData[0].lat),
            lon: parseFloat(cityData[0].lon),
            name: cityData[0].display_name.split(',')[0],
            code: query.toUpperCase()
          };
        }
      }

      return null;
    } catch (err) {
      console.error('Location search error:', err);
      return null;
    }
  };

  const fetchFlights = async (searchTerm: string): Promise<void> => {
    setLoading(true);
    setError('');
    setFlights([]);

    try {
      const locationInfo = await searchAirport(searchTerm);

      if (!locationInfo) {
        setError(`Could not find location "${searchTerm}". Try using an airport code (e.g., JFK, LHR, BOM, CDG) or city name (e.g., New York, London, Mumbai).`);
        setLoading(false);
        return;
      }

      setSearchedLocation(`${locationInfo.name}`);
      setCurrentCoords({ lat: locationInfo.lat, lon: locationInfo.lon });

      // Calculate bounding box (approximately 0.5 degrees = ~55km radius)
      const radius = searchRadius;
      const latMin = locationInfo.lat - radius;
      const latMax = locationInfo.lat + radius;
      const lonMin = locationInfo.lon - radius;
      const lonMax = locationInfo.lon + radius;

      const url = `https://opensky-network.org/api/states/all?lamin=${latMin}&lomin=${lonMin}&lamax=${latMax}&lomax=${lonMax}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch flight data. The API might be rate-limited. Try again in a few moments.');
      }

      const data = await response.json();

      if (!data.states || data.states.length === 0) {
        setError(`No flights currently detected near ${locationInfo.name}. This could mean there are no aircraft in the area right now, or try increasing the search radius.`);
        setLoading(false);
        return;
      }

      // Parse and format flight data
      const formattedFlights: Flight[] = data.states.map((state: any[], index: number) => ({
        id: state[0] || `flight-${index}`,
        callsign: state[1]?.trim() || 'N/A',
        country: state[2] || 'Unknown',
        longitude: state[5]?.toFixed(4) || 'N/A',
        latitude: state[6]?.toFixed(4) || 'N/A',
        altitude: state[7] ? `${Math.round(state[7])} m` : 'N/A',
        velocity: state[9] ? `${Math.round(state[9] * 3.6)} km/h` : 'N/A',
        heading: state[10] ? `${Math.round(state[10])}°` : 'N/A',
        onGround: state[8],
      })).filter((flight: Flight) => !flight.onGround);

      setFlights(formattedFlights);
      setError('');
    } catch (err) {
      setError((err as Error).message || 'An error occurred while fetching flight data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.MouseEvent | React.KeyboardEvent): void => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      fetchFlights(searchQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const quickSearches = ['JFK', 'LHR', 'CDG', 'DXB', 'BOM', 'DEL', 'HND', 'SIN', 'LAX', 'FRA'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Global Flight Tracker</h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter airport code (JFK, LHR, BOM) or city name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
            >
              {loading ? 'Searching...' : 'Track Flights'}
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Radius: {searchRadius === 0.5 ? '~55km' : searchRadius === 1.0 ? '~110km' : '~165km'}
            </label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.5"
              value={searchRadius}
              onChange={(e) => setSearchRadius(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Quick search:</p>
            <div className="flex flex-wrap gap-2">
              {quickSearches.map((code) => (
                <button
                  key={code}
                  onClick={() => {
                    setSearchQuery(code);
                    fetchFlights(code);
                  }}
                  className="px-3 py-1 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {searchedLocation && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-indigo-50 p-3 rounded-lg gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <span className="text-sm font-medium text-indigo-900">
                  Tracking flights near {searchedLocation}
                </span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex-1 sm:flex-initial"
                >
                  <Map className="w-4 h-4" />
                  <span className="hidden xs:inline">{showMap ? 'Show List' : 'Show Map'}</span>
                  <span className="xs:hidden">{showMap ? 'List' : 'Map'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 sm:mb-6 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Fetching live flight data...</p>
          </div>
        )}

        {!loading && flights.length > 0 && !showMap && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
              {flights.length} Aircraft Detected
            </h2>
            <div className="space-y-4">
              {flights.map((flight) => (
                <div
                  key={flight.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      <span className="font-bold text-base sm:text-lg text-gray-800">
                        {flight.callsign}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {flight.country}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Altitude:</span>
                      <p className="font-semibold text-gray-800">{flight.altitude}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Speed:</span>
                      <p className="font-semibold text-gray-800">{flight.velocity}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Heading:</span>
                      <p className="font-semibold text-gray-800">{flight.heading}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Position:</span>
                      <p className="font-semibold text-gray-800 text-xs break-all">
                        {flight.latitude}, {flight.longitude}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && flights.length > 0 && showMap && (
          <FlightMap 
            flights={flights.map(f => ({
              ...f,
              longitude: parseFloat(f.longitude),
              latitude: parseFloat(f.latitude),
              heading: parseFloat(f.heading) || 0
            }))}
            cityName={searchedLocation}
            cityCoords={currentCoords}
          />
        )}

        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600 px-2">
          <p>Data provided by OpenSky Network API</p>
          <p className="mt-1">Search for any airport worldwide using airport codes (IATA/ICAO) or city names</p>
          <p className="mt-1 text-xs">Examples: JFK (New York), LHR (London), BOM (Mumbai), CDG (Paris), DXB (Dubai)</p>
        </div>
      </div>
    </div>
  );
};

export default GlobalFlightTracker;