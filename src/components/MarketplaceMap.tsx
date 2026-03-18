import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { Listing } from '../types';
import { MapPin, ShoppingBag, ExternalLink } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface MarketplaceMapProps {
  listings: Listing[];
  onListingClick: (listing: Listing) => void;
}

const MarkerWithInfoWindow = ({ listing, onClick }: { listing: Listing; onClick: () => void }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoWindowShown, setInfoWindowShown] = useState(false);

  if (!listing.coordinates) return null;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={listing.coordinates}
        onClick={() => setInfoWindowShown(true)}
        title={listing.title}
      >
        <Pin background="#059669" glyphColor="#fff" borderColor="#065f46" />
      </AdvancedMarker>

      {infoWindowShown && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => setInfoWindowShown(false)}
          className="rounded-lg overflow-hidden"
        >
          <div className="p-2 max-w-[200px]">
            {listing.photos?.[0] && (
              <img 
                src={listing.photos[0]} 
                alt={listing.title} 
                className="w-full h-24 object-cover rounded-md mb-2"
                referrerPolicy="no-referrer"
              />
            )}
            <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{listing.title}</h4>
            <p className="text-emerald-600 font-bold text-sm mt-1">
              ${listing.price.toFixed(2)}
            </p>
            <button
              onClick={() => {
                onClick();
                setInfoWindowShown(false);
              }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-1.5 rounded-md text-xs font-medium hover:bg-emerald-700 transition-colors"
            >
              <ShoppingBag className="w-3 h-3" />
              View Details
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const MarketplaceMap = ({ listings, onListingClick }: MarketplaceMapProps) => {
  if (!hasValidKey) {
    return (
      <div className="h-[600px] bg-gray-100 rounded-2xl flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Google Maps API Key Required</h3>
        <p className="text-gray-500 max-w-md mb-6">
          To view listings on a map, please add your Google Maps Platform API key in the app settings.
        </p>
        <div className="bg-white p-4 rounded-xl shadow-sm text-left text-sm space-y-3 max-w-sm">
          <p><strong>Step 1:</strong> <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener" className="text-emerald-600 hover:underline inline-flex items-center gap-1">Get an API Key <ExternalLink className="w-3 h-3" /></a></p>
          <p><strong>Step 2:</strong> Add it as a secret in AI Studio:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Open <strong>Settings</strong> (⚙️ gear icon)</li>
            <li>Select <strong>Secrets</strong></li>
            <li>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
          </ul>
        </div>
      </div>
    );
  }

  const defaultCenter = { lat: 37.42, lng: -122.08 }; // Default to a campus-like location

  return (
    <div className="h-[600px] rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={13}
          mapId="DEMO_MAP_ID"
          className="w-full h-full"
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {listings.map((listing) => (
            <MarkerWithInfoWindow 
              key={listing.id} 
              listing={listing} 
              onClick={() => onListingClick(listing)} 
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
};
