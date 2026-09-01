type LatLng = { lat: number; lng: number };

export type RouteResult = {
  etaMinutes: number;
  distanceMeters: number;
  routeType: "FASTEST" | "FUEL_EFFICIENT";
};

function apiKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY || null;
}

/** Geocodes a street address to coordinates using the Google Geocoding API. */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const key = apiKey();
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", key);

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) return null;

  const data = await res.json();
  const location = data?.results?.[0]?.geometry?.location;
  if (typeof location?.lat !== "number" || typeof location?.lng !== "number") return null;

  return { lat: location.lat, lng: location.lng };
}

/**
 * Computes a traffic-aware driving route, also requesting Google's fuel-efficient
 * reference route so we can pick whichever is the better tradeoff of time vs. fuel.
 */
export async function computeBestRoute(origin: LatLng, destination: LatLng): Promise<RouteResult | null> {
  const key = apiKey();
  if (!key) return null;

  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.routeLabels",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      requestedReferenceRoutes: ["FUEL_EFFICIENT"],
      units: "IMPERIAL",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const routes: Array<{ duration?: string; distanceMeters?: number; routeLabels?: string[] }> = data?.routes ?? [];
  if (routes.length === 0) return null;

  const parseDurationSeconds = (duration?: string) => (duration ? parseInt(duration.replace("s", ""), 10) : NaN);

  const fastest =
    routes.find((r) => r.routeLabels?.includes("DEFAULT_ROUTE")) ?? routes[0];
  const fuelEfficient = routes.find((r) => r.routeLabels?.includes("FUEL_EFFICIENT"));

  const fastestSeconds = parseDurationSeconds(fastest.duration);
  if (!Number.isFinite(fastestSeconds) || typeof fastest.distanceMeters !== "number") return null;

  // Prefer the fuel-efficient route when it doesn't cost more than 5 extra minutes;
  // otherwise the time savings of the fastest route wins.
  const fuelSeconds = fuelEfficient ? parseDurationSeconds(fuelEfficient.duration) : NaN;
  const useFuelEfficient =
    fuelEfficient &&
    typeof fuelEfficient.distanceMeters === "number" &&
    Number.isFinite(fuelSeconds) &&
    fuelSeconds - fastestSeconds <= 5 * 60;

  const chosen = useFuelEfficient ? fuelEfficient! : fastest;
  const chosenSeconds = useFuelEfficient ? fuelSeconds : fastestSeconds;

  return {
    etaMinutes: Math.max(1, Math.round(chosenSeconds / 60)),
    distanceMeters: chosen.distanceMeters!,
    routeType: useFuelEfficient ? "FUEL_EFFICIENT" : "FASTEST",
  };
}

export function googleMapsDirectionsUrl(destination: LatLng | { address: string }): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set(
    "destination",
    "address" in destination ? destination.address : `${destination.lat},${destination.lng}`
  );
  url.searchParams.set("travelmode", "driving");
  return url.toString();
}
