"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Truck } from "lucide-react";
import { useEffect, useRef } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import { cn } from "@/lib/cn";
import type { Driver } from "@/lib/types";

type Props = {
  drivers: Driver[];
  selected: Driver | null;
  onSelect: (d: Driver) => void;
};

function hasRealLocation(d: Driver | null | undefined) {
  return Boolean(d && (d.location.lat !== 0 || d.location.lng !== 0));
}

// Free OpenStreetMap-based vector tile style — no API key required.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function MapboxMap({ drivers, selected, onSelect }: Props) {
  const mapRef = useRef<MapRef | null>(null);

  // Fly to the selected driver whenever they (or their coordinates) change.
  useEffect(() => {
    if (!selected || !hasRealLocation(selected)) return;
    mapRef.current?.flyTo({
      center: [selected.location.lng, selected.location.lat],
      zoom: 14,
      duration: 800,
    });
  }, [selected?.id, selected?.location.lat, selected?.location.lng]);

  const firstReal = drivers.find(hasRealLocation);
  const initialCenter = firstReal
    ? { longitude: firstReal.location.lng, latitude: firstReal.location.lat }
    : { longitude: 51.531, latitude: 25.286 }; // Doha fallback

  return (
    <Map
      ref={mapRef}
      mapStyle={MAP_STYLE}
      initialViewState={{ ...initialCenter, zoom: 12 }}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" />
      {drivers.filter(hasRealLocation).map((d) => {
        const isSelected = selected?.id === d.id;
        return (
          <Marker
            key={d.id}
            longitude={d.location.lng}
            latitude={d.location.lat}
            anchor="bottom"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                onSelect(d);
              }}
              className="cursor-pointer"
            >
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full shadow-lg ring-4 transition-transform",
                  isSelected ? "scale-110 ring-brand" : "ring-white/90",
                  d.status === "on-duty"
                    ? "bg-emerald-500"
                    : d.status === "available"
                      ? "bg-blue-500"
                      : d.status === "off-duty"
                        ? "bg-slate-400"
                        : "bg-amber-500",
                )}
              >
                <Truck className="size-4 text-white" />
              </div>
            </button>
          </Marker>
        );
      })}
    </Map>
  );
}
