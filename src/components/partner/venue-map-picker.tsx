"use client";

import { useEffect, useRef, useState } from "react";
import type L from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createVenue } from "@/lib/actions/events";
import type { Venue } from "@/types/database";
import {
  Compass,
  MapPin,
  Search,
  X,
  Check,
  Navigation,
  Loader2,
} from "lucide-react";

interface VenueMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueCreated: (venue: Venue) => void;
  existingVenues?: Venue[];
}

interface SearchResult {
  place_id: string;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
  };
}

const DEFAULT_CENTER = { lat: 26.8467, lng: 80.9462 }; // Lucknow City Center

export function VenueMapPicker({
  isOpen,
  onClose,
  onVenueCreated,
  existingVenues = [],
}: VenueMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

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

    let LeafletModule: typeof import("leaflet");

    const initMap = async () => {
      LeafletModule = await import("leaflet");

      // Fix default marker icon issues with Next.js asset paths
      delete (LeafletModule.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      LeafletModule.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      if (!mapContainerRef.current) return;
      const map = LeafletModule.map(mapContainerRef.current).setView(
        [selectedCoords.lat, selectedCoords.lng],
        14
      );

      // Rich Detailed Street Tile Layer with Places & POI labels
      LeafletModule.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, USGS, NGA, EPA, USDA, NPS',
          maxZoom: 19,
        }
      ).addTo(map);

      // Render existing venue markers
      existingVenues.forEach((v) => {
        if (v.lat && v.lng) {
          const popupContent = `<div style="color: #000; font-weight: bold;">${v.name}</div><div style="color: #666; font-size: 11px;">${v.location}</div>`;
          LeafletModule.marker([v.lat, v.lng])
            .addTo(map)
            .bindPopup(popupContent);
        }
      });

      // Draggable selected pin icon
      const customPinIcon = LeafletModule.divIcon({
        className: "custom-map-pin",
        html: `<div style="background-color: #a855f7; border: 3px solid #ffffff; width: 24px; height: 24px; border-radius: 50%; box-shadow: 0 0 15px rgba(168,85,247,0.8); cursor: pointer;"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = LeafletModule.marker([selectedCoords.lat, selectedCoords.lng], {
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
      map.on("click", async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        updateSelectedPoint(lat, lng, true);
      });

      // Try browser geolocation to center on user's current city
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            setSelectedCoords({ lat: userLat, lng: userLng });
            map.setView([userLat, userLng], 15);
            marker.setLatLng([userLat, userLng]);
            reverseGeocode(userLat, userLng);
          },
          () => {
            console.log("Geolocation permission not granted or unavailable, using Lucknow default");
          },
          { timeout: 5000 }
        );
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const updateSelectedPoint = (lat: number, lng: number, fetchAddress = true) => {
    setSelectedCoords({ lat, lng });
    if (fetchAddress) {
      reverseGeocode(lat, lng);
    }
  };

  // Reverse geocode lat/lng to human address using Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data: SearchResult = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(",");
        const namePart = data.name || parts[0]?.trim() || "Selected Venue Location";
        const locPart =
          [
            data.address?.suburb,
            data.address?.city || data.address?.town || data.address?.state,
          ]
            .filter(Boolean)
            .join(", ") || "Lucknow, Uttar Pradesh";

        if (!venueName) setVenueName(namePart);
        setVenueLocation(locPart);
        setVenueAddress(data.display_name);
      }
    } catch (err) {
      console.warn("Reverse geocode failed:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Live Auto-Search Autocomplete Logic
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSearch = async (queryToSearch = searchQuery) => {
    if (!queryToSearch.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/venues/search?q=${encodeURIComponent(queryToSearch)}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const formatted: SearchResult[] = data.map(
          (item: { place_id: string; address: string; name: string; lat: number; lng: number; location: string }) => ({
            place_id: item.place_id,
            display_name: item.address,
            name: item.name,
            lat: String(item.lat),
            lon: String(item.lng),
            address: {
              city: item.location,
            },
          })
        );

        setSearchResults(formatted);

        // Auto-fly to top match immediately on search
        const topResult = formatted[0];
        handleSelectSearchResult(topResult);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.warn("Venue search API error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const openDirections = (lat: number, lng: number, title: string) => {
    const isApple =
      typeof navigator !== "undefined" &&
      /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
    const encodedTitle = encodeURIComponent(title || "Venue Location");
    const url = isApple
      ? `https://maps.apple.com/?q=${encodedTitle}&ll=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodedTitle}+${lat},${lng}`;
    window.open(url, "_blank");
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setSelectedCoords({ lat, lng });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }

    const title = result.name || result.display_name.split(",")[0] || searchQuery || "Custom Venue";
    const loc =
      [
        result.address?.suburb,
        result.address?.city || result.address?.town,
      ]
        .filter(Boolean)
        .join(", ") || "Lucknow, Uttar Pradesh";

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
                placeholder="Search venue e.g. Paddles & Latte, Gomti Nagar Lucknow..."
                className="pl-9 bg-zinc-900 border-white/10 text-xs text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button
              size="sm"
              variant="violet"
              onClick={() => handleSearch()}
              disabled={isSearching}
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-md">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handleSelectSearchResult(result)}
                  className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left text-xs hover:bg-white/10 transition-all"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">
                      {result.name || result.display_name.split(",")[0]}
                    </p>
                    <p className="text-[11px] text-white/50 truncate">
                      {result.display_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leaflet Map Box */}
        <div className="relative flex-1 rounded-xl border border-white/10 overflow-hidden min-h-[260px]">
          <div ref={mapContainerRef} className="h-full w-full bg-zinc-900 z-10" />
          {isGeocoding && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-full bg-black/80 px-3 py-1 text-xs text-white backdrop-blur-md border border-white/10">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
              <span>Fetching location details...</span>
            </div>
          )}
        </div>

        {/* Selected Location Form Details */}
        <div className="space-y-3 pt-1 border-t border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-white/60">Venue Title</label>
              <Input
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Neon Pulse Club"
                className="mt-1 bg-zinc-900 border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/60">Neighborhood / City</label>
              <Input
                value={venueLocation}
                onChange={(e) => setVenueLocation(e.target.value)}
                placeholder="e.g. Indiranagar, Bangalore"
                className="mt-1 bg-zinc-900 border-white/10 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-white/60">Full Street Address</label>
            <Input
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="e.g. 100 Feet Rd, Indiranagar"
              className="mt-1 bg-zinc-900 border-white/10 text-xs text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() =>
                openDirections(selectedCoords.lat, selectedCoords.lng, venueName)
              }
            >
              <Navigation className="h-3.5 w-3.5 text-lime-400" />
              <span>Get Directions</span>
            </Button>

            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                variant="violet"
                onClick={handleSaveVenue}
                disabled={isSaving || !venueName.trim() || !venueLocation.trim()}
                className="gap-1.5 text-xs font-bold"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Confirm & Select Venue</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
