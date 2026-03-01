import React, { useMemo, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useFleetStore, useFleetEngine } from '../store/fleetStore';
import { FakeFleetRepository } from '../data/repository/FleetRepository';
import { JeepneyMarker } from './JeepneyMarker';
import { CommandHud } from './CommandHud';
import { AlertTray } from './AlertTray';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { InterpolatedVehicleState, BunchingAlert } from '../data/model/VehicleState';

// Singleton repository
const repository = new FakeFleetRepository();

const CEBU_CENTER: [number, number] = [10.3157, 123.8854];

export default function MapScreen() {
  useFleetEngine(repository);

  const uiState = useFleetStore(s => s.uiState);
  const onVehicleSelected = useFleetStore(s => s.onVehicleSelected);
  const onAlertDismissed = useFleetStore(s => s.onAlertDismissed);
  const onRetry = useFleetStore(s => s.onRetryConnection);

  if (uiState.status === 'loading') {
    return <LoadingScreen />;
  }

  if (uiState.status === 'error') {
    return <ErrorScreen message={uiState.message} onRetry={onRetry} />;
  }

  return (
    <div className="relative w-full h-screen bg-[#0D1117] overflow-hidden">
      <MapContainer
        center={CEBU_CENTER}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <ActiveFleetLayer 
          vehicles={uiState.vehicles}
          activeAlerts={uiState.activeAlerts}
          selectedVehicleId={uiState.selectedVehicleId}
          onVehicleSelected={onVehicleSelected}
        />
      </MapContainer>

      {/* Overlays */}
      <CommandHud
        vehicleCount={Object.keys(uiState.vehicles).length}
        selectedVehicle={uiState.selectedVehicleId ? uiState.vehicles[uiState.selectedVehicleId] : null}
        onDeselect={() => onVehicleSelected(null)}
      />

      <AlertTray 
        alerts={uiState.activeAlerts} 
        onDismiss={onAlertDismissed} 
      />
    </div>
  );
}

// Separate component to use `useMap` if needed, and to memoize markers
function ActiveFleetLayer({ 
  vehicles, 
  activeAlerts, 
  selectedVehicleId, 
  onVehicleSelected 
}: {
  vehicles: Record<string, InterpolatedVehicleState>,
  activeAlerts: BunchingAlert[],
  selectedVehicleId: string | null,
  onVehicleSelected: (id: string | null) => void
}) {
  const bunchingVehicleIds = useMemo(
    () => new Set(activeAlerts.flatMap(a => [a.vehicleA.vehicleId, a.vehicleB.vehicleId])),
    [activeAlerts]
  );

  const handleMarkerPress = useCallback(
    (vehicleId: string) => {
      onVehicleSelected(vehicleId === selectedVehicleId ? null : vehicleId);
    },
    [selectedVehicleId, onVehicleSelected]
  );

  return (
    <>
      {Object.entries(vehicles).map(([vehicleId, interp]) => (
        <JeepneyMarker
          key={vehicleId}
          interp={interp}
          isSelected={vehicleId === selectedVehicleId}
          isBunching={bunchingVehicleIds.has(vehicleId)}
          onPress={handleMarkerPress}
        />
      ))}
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0D1117] text-[#8B949E]">
      <Loader2 className="w-12 h-12 text-[#39D353] animate-spin mb-4" />
      <div className="font-mono text-sm tracking-widest">ACQUIRING TELEMETRY STREAM...</div>
      <div className="w-32 h-px bg-[#39D353]/50 mt-4" />
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0D1117] text-[#8B949E]">
      <AlertTriangle className="w-12 h-12 text-[#FF3B30] mb-4" />
      <div className="font-mono text-xl font-bold text-[#FF3B30] tracking-widest mb-2">LINK FAILURE</div>
      <div className="font-mono text-sm text-center max-w-md mb-8">{message}</div>
      <button 
        onClick={onRetry}
        className="flex items-center gap-2 px-6 py-3 bg-[#39D353] hover:bg-[#2ea043] text-black font-mono font-bold tracking-wider rounded transition-colors"
      >
        <RefreshCw size={18} />
        RECONNECT
      </button>
    </div>
  );
}
