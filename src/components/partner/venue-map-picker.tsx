"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin, X, Check, Loader2, Navigation, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Venue } from "@/types/database";
import { createVenue } from "@/lib/actions/events";
import "leaflet/dist/leaflet.css";

interface VenueMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueCreated: (newVenue: Venue) => void;
  existingVenues?: Venue[];
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    name?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    road?: string;
  };
}

// Default center: Bangalore (12.9716, 77.5946)
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

export function VenueMapPicker({
  isOpen,
  onClose,
  onVenueCreated,
  existingVenues = [],
}: VenueMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [venueName, setVenueName] = useState("");
  const [venueLocation, setVenueLocation] = useState("");
  const [venueAddress, setVenueAddress] = useState("");

  // Initialize Leaflet map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let L: typeof import("leaflet");

    const initMap = async () => {
      L = await import("leaflet");

      // Fix default marker icon issues with Next.js asset paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapContainerRef.current).setView(
        [selectedCoords.lat, selectedCoords.lng],
        14
      );

      // Sleek Dark Tile Layer
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Render existing venue markers
      existingVenues.forEach((v) => {
        if (v.lat && v.lng) {
          const popupContent = `<div style="color: #000; font-weight: bold;">${v.name}</div><div style="color: #666; font-size: 11px;">${v.location}</div>`;
          L.marker([v.lat, v.lng])
            .addTo(map)
            .bindPopup(popupContent);
        }
      });

      // Draggable selected pin icon
      const customPinIcon = L.divIcon({
        className: "custom-map-pin",
        html: `<div style="background-color: #a855f7; border: 3px solid #ffffff; width: 24px; height: 24px; border-radius: 50%; box-shadow: 0 0 15px rgba(168,85,247,0.8); cursor: pointer;"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
        icon: customPinIcon,
        draggable: true,
      }).addTo(map);

      markerRef.current = marker;
      mapInstanceRef.current = map;

      // Handle marker drag end
      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        updateSelectedPoint(pos.lat, pos.lng, true);
      });

      // Handle map click
      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        updateSelectedPoint(lat, lng, true);
      });

      // Perform initial reverse geocode if empty
      if (!venueName) {
        reverseGeocode(selectedCoords.lat, selectedCoords.lng);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  const updateSelectedPoint = (lat: number, lng: number, shouldReverseGeocode = false) => {
    setSelectedCoords({ lat, lng });
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (shouldReverseGeocode) {
      reverseGeocode(lat, lng);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      if (data && data.display_name) {
        const namePart =
          data.name ||
          data.address?.amenity ||
          data.address?.building ||
          data.address?.leisure ||
          data.address?.shop ||
          data.address?.road ||
          "Custom Location";
        const locationPart =
          [data.address?.suburb || data.address?.neighbourhood, data.address?.city || data.address?.town]
            .filter(Boolean)
            .join(", ") || "Bengaluru";

        if (!venueName) setVenueName(namePart);
        setVenueLocation(locationPart);
        setVenueAddress(data.display_name);
      }
    } catch (err) {
      console.warn("Reverse geocode error:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&addressdetails=1&limit=5`
      );
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.warn("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    updateSelectedPoint(lat, lng, false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 16, { animate: true });
    }

    const title = result.display_name.split(",")[0] || "Custom Venue";
    const loc =
      result.address?.suburb ||
      result.address?.city ||
      result.address?.town ||
      "City Area";

    setVenueName(title);
    setVenueLocation(loc);
    setVenueAddress(result.display_name);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSaveVenue = async () => {
    if (!venueName.trim() || !venueLocation.trim()) return;
    setIsSaving(true);
    try {
      const newVenue = await createVenue({
        name: venueName,
        location: venueLocation,
        address: venueAddress || `${venueName}, ${venueLocation}`,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
      });
      onVenueCreated(newVenue);
      onClose();
    } catch (err) {
      console.error("Failed to save venue:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex flex-col h-[90vh] w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 p-4 shadow-2xl space-y-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-violet-500/20 p-2 text-violet-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Interactive Venue Map</h2>
              <p className="text-xs text-white/50">Search keywords or tap on map to pick location</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search venue e.g. Toit Indiranagar, Cubbon Park..."
                className="pl-9 bg-zinc-900 border-white/10 text-xs text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button
              size="sm"
              variant="violet"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-11 left-0 right-0 z-[1000] max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 p-1 shadow-xl backdrop-blur-md">
              {searchResults.map((item) => (
                <button
                  key={item.place_id}
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-2 hover:bg-violet-500/20 rounded-lg text-xs text-white/90 flex items-start gap-2 border-b border-white/5 last:border-0"
                >
                  <MapPin className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="relative flex-1 rounded-xl overflow-hidden border border-white/10 min-h-[260px]">
          <div ref={mapContainerRef} className="h-full w-full bg-zinc-900" />

          {/* Map floating helper pill */}
          <div className="absolute bottom-2 left-2 z-[400] flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-white/70">
            <Navigation className="h-3 w-3 text-violet-400" />
            <span>Click map or drag purple pin</span>
          </div>

          {isGeocoding && (
            <div className="absolute top-2 right-2 z-[400] flex items-center gap-1 bg-zinc-950/80 px-2 py-1 rounded-md text-[10px] text-violet-300">
              <Loader2 className="h-3 w-3 animate-spin" /> Fetching location details...
            </div>
          )}
        </div>

        {/* Venue Info Form */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <Label className="text-[11px] text-white/70">Venue Name *</Label>
            <Input
              placeholder="e.g. Toit Brewpub"
              className="bg-zinc-900 border-white/10 h-8 text-xs text-white"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-white/70">Area / City *</Label>
            <Input
              placeholder="e.g. Indiranagar, Bengaluru"
              className="bg-zinc-900 border-white/10 h-8 text-xs text-white"
              value={venueLocation}
              onChange={(e) => setVenueLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <Label className="text-[11px] text-white/70">Full Address</Label>
          <Input
            placeholder="Full street address..."
            className="bg-zinc-900 border-white/10 h-8 text-xs text-white"
            value={venueAddress}
            onChange={(e) => setVenueAddress(e.target.value)}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[10px] text-white/40">
            Lat: {selectedCoords.lat.toFixed(4)}, Lng: {selectedCoords.lng.toFixed(4)}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              variant="violet"
              onClick={handleSaveVenue}
              disabled={!venueName.trim() || !venueLocation.trim() || isSaving}
              className="text-xs gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Add & Select Venue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
