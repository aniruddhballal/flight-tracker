import React, { useState } from 'react';
import { Plane, MapPin, Map } from 'lucide-react';
import FlightMap from './FlightMap';

interface CityCoordinates {
  lat: number;
  lon: number;
  radius: number;
}

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

interface CityCoordinatesMap {
  [key: string]: CityCoordinates;
}

const FlightTracker: React.FC = () => {
  const [city, setCity] = useState<string>('');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchedCity, setSearchedCity] = useState<string>('');
  const [showMap, setShowMap] = useState<boolean>(false);
  const [currentCityCoords, setCurrentCityCoords] = useState<{ lat: number; lon: number }>({ lat: 12.9716, lon: 77.5946 });

  // Predefined coordinates for major Indian cities
  const cityCoordinates: CityCoordinatesMap = {
    'bangalore': { lat: 12.9716, lon: 77.5946, radius: 0.5 },
    'bengaluru': { lat: 12.9716, lon: 77.5946, radius: 0.5 },
    'mumbai': { lat: 19.0760, lon: 72.8777, radius: 0.5 },
    'delhi': { lat: 28.7041, lon: 77.1025, radius: 0.5 },
    'chennai': { lat: 13.0827, lon: 80.2707, radius: 0.5 },
    'kolkata': { lat: 22.5726, lon: 88.3639, radius: 0.5 },
    'hyderabad': { lat: 17.3850, lon: 78.4867, radius: 0.5 },
    'pune': { lat: 18.5204, lon: 73.8567, radius: 0.5 },
    'ahmedabad': { lat: 23.0225, lon: 72.5714, radius: 0.5 },
    'kochi': { lat: 9.9312, lon: 76.2673, radius: 0.5 },
    'goa': { lat: 15.2993, lon: 74.1240, radius: 0.5 },
  };

  const fetchFlights = async (cityName: string): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const normalizedCity = cityName.toLowerCase().trim();
      const coords = cityCoordinates[normalizedCity];

      if (!coords) {
        setError(`City "${cityName}" not found. Try: Bangalore, Mumbai, Delhi, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad, Kochi, or Goa.`);
        setLoading(false);
        return;
      }

      setSearchedCity(cityName);
      setCurrentCityCoords({ lat: coords.lat, lon: coords.lon });

      // Calculate bounding box (approximately 0.5 degrees = ~55km radius)
      const latMin = coords.lat - coords.radius;
      const latMax = coords.lat + coords.radius;
      const lonMin = coords.lon - coords.radius;
      const lonMax = coords.lon + coords.radius;

      const url = `https://opensky-network.org/api/states/all?lamin=${latMin}&lomin=${lonMin}&lamax=${latMax}&lomax=${lonMax}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch flight data. The API might be rate-limited. Try again in a few moments.');
      }

      const data = await response.json();

      if (!data.states || data.states.length === 0) {
        setError(`No flights currently detected over ${cityName}. This could mean there are no aircraft in the area right now.`);
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
      })).filter((flight: Flight) => !flight.onGround); // Filter out grounded aircraft

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
    if (city.trim()) {
      fetchFlights(city);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <Plane className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Live Flight Tracker</h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter city name (e.g., Bangalore, Mumbai, Delhi)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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

          {searchedCity && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-indigo-50 p-3 rounded-lg gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <span className="text-sm font-medium text-indigo-900">
                  Tracking flights over {searchedCity}
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
            cityName={searchedCity}
            cityCoords={currentCityCoords}
          />
        )}

        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600 px-2">
          <p>Data provided by OpenSky Network API</p>
          <p className="mt-1">Supported cities: Bangalore, Mumbai, Delhi, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad, Kochi, Goa</p>
        </div>
      </div>
    </div>
  );
};

export default FlightTracker;