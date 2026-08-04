import { NextResponse } from "next/server";

interface SearchVenueResult {
  place_id: string;
  name: string;
  location: string;
  address: string;
  lat: number;
  lng: number;
}

// Popular Lucknow sports, cafes & lifestyle venues index for instant zero-latency match
const LUCKNOW_POPULAR_VENUES: SearchVenueResult[] = [
  {
    place_id: "lucknow-paddles-lattes",
    name: "Paddles & Lattes",
    location: "Gomti Nagar",
    address: "3/123, Vidhayak Puram, Patrakar Puram, Vinay Khand 3, Gomti Nagar, Lucknow, Uttar Pradesh 226010",
    lat: 26.8502,
    lng: 80.9985,
  },
  {
    place_id: "lucknow-summit-building",
    name: "Summit Building",
    location: "Vibhuti Khand",
    address: "Vibhuti Khand, Gomti Nagar, Lucknow, Uttar Pradesh 226010",
    lat: 26.8682,
    lng: 81.0068,
  },
  {
    place_id: "lucknow-janeshwar-park",
    name: "Janeshwar Mishra Park",
    location: "Gomti Nagar",
    address: "Gomti Nagar Extension, Lucknow, Uttar Pradesh 226010",
    lat: 26.8378,
    lng: 80.9912,
  },
  {
    place_id: "lucknow-phoenix-palassio",
    name: "Phoenix Palassio",
    location: "Gomti Nagar Extension",
    address: "Sector-7, Gomti Nagar Extension, Amar Shaheed Path, Lucknow, Uttar Pradesh 226010",
    lat: 26.8088,
    lng: 81.0182,
  },
  {
    place_id: "lucknow-patrakar-puram",
    name: "Patrakar Puram Market",
    location: "Gomti Nagar",
    address: "Patrakar Puram, Vikas Khand, Gomti Nagar, Lucknow, Uttar Pradesh 226010",
    lat: 26.8488,
    lng: 80.9972,
  },
  {
    place_id: "lucknow-cherry-tree-hazratganj",
    name: "Cherry Tree Cafe & Bakery",
    location: "Hazratganj",
    address: "Mahatma Gandhi Marg, Hazratganj, Lucknow, Uttar Pradesh 226001",
    lat: 26.8515,
    lng: 80.9415,
  },
  {
    place_id: "lucknow-1090-chauraha",
    name: "1090 Chauraha Street Food Hub",
    location: "Gomti Nagar",
    address: "Gomti Nagar Main Rd, Lucknow, Uttar Pradesh 226010",
    lat: 26.8524,
    lng: 80.9654,
  },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const queryLower = q.toLowerCase().trim();
  const results: SearchVenueResult[] = [];

  // 1. Check Google Places API if GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is provided
  const googleApiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (googleApiKey) {
    try {
      const gRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          q
        )}&key=${googleApiKey}`
      );
      const gData = await gRes.json();

      if (gData?.results?.length > 0) {
        gData.results.slice(0, 5).forEach((place: any, idx: number) => {
          results.push({
            place_id: place.place_id || `g-place-${idx}`,
            name: place.name || q,
            location: place.formatted_address?.split(",")?.[1]?.trim() || "Lucknow",
            address: place.formatted_address || q,
            lat: place.geometry?.location?.lat || 26.8467,
            lng: place.geometry?.location?.lng || 80.9462,
          });
        });
        return NextResponse.json(results);
      }
    } catch (gErr) {
      console.warn("Google Places API error:", gErr);
    }
  }

  // 2. Check Curated Local Lucknow Index (Instant match for places like Paddles & Lattes)
  const localMatches = LUCKNOW_POPULAR_VENUES.filter((item) => {
    const titleMatch = item.name.toLowerCase().includes(queryLower);
    const locMatch = item.location.toLowerCase().includes(queryLower);
    const addrMatch = item.address.toLowerCase().includes(queryLower);
    const tokens = queryLower.split(/\s+/);
    const multiTokenMatch = tokens.every(
      (t) =>
        t === "and" ||
        t === "lattes" ||
        t === "latte" ||
        item.name.toLowerCase().includes(t) ||
        item.address.toLowerCase().includes(t)
    );

    return titleMatch || locMatch || addrMatch || multiTokenMatch;
  });

  if (localMatches.length > 0) {
    results.push(...localMatches);
  }

  // 3. Fallback to Photon Elasticsearch API
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      q
    )}&limit=5&lat=26.8467&lon=80.9462`;
    const pRes = await fetch(photonUrl);
    const pData = await pRes.json();

    if (pData?.features?.length > 0) {
      pData.features.forEach((feat: any, idx: number) => {
        const props = feat.properties || {};
        const coords = feat.geometry?.coordinates || [80.9462, 26.8467];
        const name = props.name || props.street || q;
        const cityPart = [props.district || props.suburb, props.city || props.town || props.state]
          .filter(Boolean)
          .join(", ");
        const fullLabel = [name, cityPart, props.country].filter(Boolean).join(", ");

        if (!results.some((r) => Math.abs(r.lat - coords[1]) < 0.001)) {
          results.push({
            place_id: `photon-${idx}-${props.osm_id || Math.random()}`,
            name,
            location: cityPart || "Lucknow",
            address: fullLabel,
            lat: coords[1],
            lng: coords[0],
          });
        }
      });
    }
  } catch (pErr) {
    console.warn("Photon API fallback error:", pErr);
  }

  // 4. Fallback to Nominatim Search
  if (results.length < 3) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q + " Lucknow India"
      )}&addressdetails=1&limit=5`;
      const nRes = await fetch(nomUrl);
      const nData = await nRes.json();

      if (Array.isArray(nData)) {
        nData.forEach((item: any, idx: number) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (!results.some((r) => Math.abs(r.lat - lat) < 0.001)) {
            results.push({
              place_id: `nom-${idx}-${item.place_id}`,
              name: item.name || item.display_name.split(",")[0],
              location: item.address?.suburb || item.address?.city || "Lucknow",
              address: item.display_name,
              lat,
              lng,
            });
          }
        });
      }
    } catch (nErr) {
      console.warn("Nominatim error:", nErr);
    }
  }

  return NextResponse.json(results);
}
