"use client";
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface Pin { id: string; lat: number; lng: number; label: string; group: string; eligible: boolean; distanceKm: number }

export default function DonorMap({ center, pins, hospital }: { center: [number, number]; pins: Pin[]; hospital: string }) {
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: 380, width: "100%" }}>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
      <Circle center={center} radius={15000} pathOptions={{ color: "#c8102e", weight: 1, fillOpacity: 0.03, dashArray: "4 6" }} />
      <CircleMarker center={center} radius={14} pathOptions={{ color: "#fff", weight: 3, fillColor: "#c8102e", fillOpacity: 1 }}>
        <Popup><b>{hospital}</b><br />Patient is here</Popup>
      </CircleMarker>
      {pins.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={8} pathOptions={{ color: "#fff", weight: 2, fillColor: p.eligible ? "#19c39a" : "#b9aaa6", fillOpacity: 1 }}>
          <Popup><b>{p.label}</b> · {p.group}<br />{p.distanceKm.toFixed(1)} km away · {p.eligible ? "can donate today" : "recently donated"}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
