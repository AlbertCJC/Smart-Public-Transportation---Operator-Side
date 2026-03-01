// ─────────────────────────────────────────────────────────────────────────────
// Domain Types
// Mirrors the Kotlin data classes 1:1 so backend contracts stay identical.
// ─────────────────────────────────────────────────────────────────────────────

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Raw telemetry snapshot from the WebSocket/MQTT stream.
 */
export interface VehicleState {
  vehicleId: string;
  routeId: string;
  position: LatLng;
  headingDeg: number;       // True bearing [0, 360)
  speedKph: number;
  timestamp: number;        // Unix epoch ms
  isBunching: boolean;
  passengerLoad: number;    // Normalised [0.0 – 1.0]
}

/**
 * Smoothed render-frame position produced by the Dead Reckoning engine.
 * Separates GPS truth from animation state.
 */
export interface InterpolatedVehicleState {
  source: VehicleState;
  renderPosition: LatLng;
  renderHeading: number;
}

/**
 * Spatial proximity event emitted by the BunchingDetector.
 */
export interface BunchingAlert {
  vehicleA: VehicleState;
  vehicleB: VehicleState;
  distanceM: number;
  alertKey: string;         // `${vehicleA.vehicleId}+${vehicleB.vehicleId}`
}

// ─── UI State ────────────────────────────────────────────────────────────────

export type FleetUiState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'active';
      vehicles: Record<string, InterpolatedVehicleState>;
      activeAlerts: BunchingAlert[];
      trafficTileUrl: string | null;
      selectedVehicleId: string | null;
    };

// ─── Telemetry frame (wire format) ───────────────────────────────────────────

export interface TelemetryFrame {
  vehicles: Array<{
    id: string;
    route: string;
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    ts: number;
    load?: number;
  }>;
}
