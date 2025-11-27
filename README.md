# Global Flight Tracker

A real-time flight tracking application built with React, TypeScript, and Vite that tracks flights anywhere in the world.

## Features

- **Global Coverage** - Track live flights near any airport or city worldwide
- **Smart Search** - Search using airport codes (IATA/ICAO) or city names
- **Interactive Map View** - Visual flight tracking with Leaflet maps
- **Real-time Data** - Live aircraft positions, altitude, speed, and heading
- **Adjustable Radius** - Customize search area from approximately 55km to 165km
- **Mobile-Friendly** - Fully responsive design for all devices
- **Quick Access** - One-click search for popular airports (JFK, LHR, DXB, BOM, etc.)

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Leaflet (for interactive maps)
- OpenSky Network API (flight data)
- OpenStreetMap Nominatim API (location search)

## Installation

```bash
npm install
npm run dev
```

## Usage

### Search by Airport Code
Enter any IATA or ICAO airport code:
- `JFK` - John F. Kennedy International Airport (New York)
- `LHR` - London Heathrow Airport
- `BOM` - Chhatrapati Shivaji International Airport (Mumbai)
- `CDG` - Charles de Gaulle Airport (Paris)
- `DXB` - Dubai International Airport

### Search by City Name
Simply type any city name:
- `New York`, `London`, `Mumbai`, `Paris`, `Dubai`, `Tokyo`, `Singapore`

### Features
- Toggle between List View and Map View
- Adjust search radius using the slider
- Click on aircraft markers for detailed information
- View flight paths on the map

## API Rate Limits

The OpenSky Network API has rate limits for anonymous users:
- 4000 credits per day
- Consider registering for an account for higher limits

## Supported Locations

**Worldwide Coverage** - Search for flights near any airport or city globally, including but not limited to:
- North America: JFK, LAX, ORD, ATL, DFW
- Europe: LHR, CDG, FRA, AMS, MAD
- Asia: HND, NRT, SIN, ICN, PEK, BOM, DEL
- Middle East: DXB, DOH, AUH
- Australia: SYD, MEL

## License

MIT