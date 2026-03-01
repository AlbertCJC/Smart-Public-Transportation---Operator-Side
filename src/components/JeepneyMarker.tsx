import React, { memo, useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { InterpolatedVehicleState } from '../data/model/VehicleState';

interface JeepneyMarkerProps {
  interp: InterpolatedVehicleState;
  isSelected: boolean;
  isBunching: boolean;
  onPress: (vehicleId: string) => void;
}

const Colors = {
  markerNormal: '#39D353',
  markerBunching: '#FF3B30',
  markerSelected: '#0A84FF',
  markerSlow: '#FFB300',
  markerSelectedBg: 'rgba(10, 132, 255, 0.2)',
  criticalBg: 'rgba(255, 59, 48, 0.12)',
  primary: '#39D353',
};

export const JeepneyMarker = memo(({
  interp,
  isSelected,
  isBunching,
  onPress,
}: JeepneyMarkerProps) => {
  const { source, renderPosition, renderHeading } = interp;

  const bodyColor = isBunching
    ? Colors.markerBunching
    : isSelected
    ? Colors.markerSelected
    : source.speedKph < 5
    ? Colors.markerSlow
    : Colors.markerNormal;

  // Create SVG string for the icon
  const iconHtml = useMemo(() => `
    <div style="transform: rotate(${renderHeading}deg); transition: transform 0.1s linear;">
      <svg width="40" height="52" viewBox="0 0 40 52" style="display: block;">
        ${(isSelected || isBunching) ? `
          <circle cx="20" cy="30" r="18" 
            fill="${isBunching ? Colors.criticalBg : Colors.markerSelectedBg}" 
            stroke="${bodyColor}" 
            stroke-width="1" 
            opacity="0.6" 
          />
        ` : ''}
        <rect x="6" y="12" width="28" height="34" rx="5" fill="${bodyColor}" />
        <rect x="10" y="16" width="20" height="10" rx="2" fill="rgba(255,255,255,0.25)" />
        <polygon points="20,0 12,14 28,14" fill="${bodyColor}" stroke="rgba(255,255,255,0.4)" stroke-width="1" />
        <circle cx="20" cy="37" r="4" fill="${source.speedKph > 30 ? Colors.primary : Colors.markerSlow}" opacity="0.9" />
      </svg>
    </div>
  `, [bodyColor, isSelected, isBunching, renderHeading, source.speedKph]);

  const icon = divIcon({
    className: 'bg-transparent border-none',
    html: iconHtml,
    iconSize: [40, 52],
    iconAnchor: [20, 26], // Center of the SVG
  });

  return (
    <Marker
      position={[renderPosition.latitude, renderPosition.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onPress(source.vehicleId),
      }}
      zIndexOffset={isSelected ? 1000 : 0}
    >
      {/* We use our custom HUD instead of Popup, but keeping this for fallback/debug if needed */}
    </Marker>
  );
}, (prev, next) => {
  return (
    prev.interp.renderPosition.latitude === next.interp.renderPosition.latitude &&
    prev.interp.renderPosition.longitude === next.interp.renderPosition.longitude &&
    prev.interp.renderHeading === next.interp.renderHeading &&
    prev.isSelected === next.isSelected &&
    prev.isBunching === next.isBunching &&
    prev.interp.source.speedKph === next.interp.source.speedKph
  );
});
