import { VehicleState, TelemetryFrame } from '../model/VehicleState';

// ─────────────────────────────────────────────────────────────────────────────
// Repository interface
// ─────────────────────────────────────────────────────────────────────────────

export interface FleetRepository {
  /**
   * Subscribe to the real-time vehicle telemetry stream.
   * Returns an unsubscribe function — call it to close the connection.
   */
  subscribe(onFrame: (vehicles: VehicleState[]) => void, onError: (err: Error) => void): () => void;

  fetchTrafficTileUrl(): Promise<string | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class WebSocketFleetRepository implements FleetRepository {
  private readonly wsUrl = 'wss://api.fleet.jeepney.ph/v1/telemetry';

  subscribe(
    onFrame: (vehicles: VehicleState[]) => void,
    onError: (err: Error) => void
  ): () => void {
    const ws = new WebSocket(this.wsUrl);

    ws.onmessage = (event) => {
      try {
        const frame: TelemetryFrame = JSON.parse(event.data);
        onFrame(frame.vehicles.map(v => ({
          vehicleId: v.id,
          routeId: v.route,
          position: { latitude: v.lat, longitude: v.lng },
          headingDeg: v.heading,
          speedKph: v.speed,
          timestamp: v.ts,
          isBunching: false,
          passengerLoad: v.load ?? 0,
        })));
      } catch (e) {
        onError(new Error('Failed to parse telemetry frame'));
      }
    };

    ws.onerror = () => onError(new Error('WebSocket connection error'));
    ws.onclose = (e) => {
      if (!e.wasClean) onError(new Error('WebSocket closed unexpectedly'));
    };

    // Return unsubscribe function — mirrors Kotlin's awaitClose pattern.
    return () => ws.close();
  }

  async fetchTrafficTileUrl(): Promise<string | null> {
    try {
      const res = await fetch('https://api.fleet.jeepney.ph/v1/traffic-tiles');
      const data = await res.json();
      return data.tileUrl ?? null;
    } catch {
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fake Repository — for development and previews
// Simulates 8 jeepneys moving around Cebu City at 0.5 Hz
// ─────────────────────────────────────────────────────────────────────────────

const BASE_LAT = 10.3157;
const BASE_LNG = 123.8854;

export class FakeFleetRepository implements FleetRepository {
  private vehicles: VehicleState[] = Array.from({ length: 8 }, (_, i) => ({
    vehicleId: `CEB-${1000 + i}`,
    routeId: i < 4 ? '04A-BANAWA' : '10C-AYALA',
    position: {
      latitude: BASE_LAT + i * 0.003,
      longitude: BASE_LNG + i * 0.003,
    },
    headingDeg: (i * 45) % 360,
    speedKph: 20 + i * 3,
    timestamp: Date.now(),
    isBunching: false,
    passengerLoad: Math.random() * 0.8,
  }));

  private intervalId: ReturnType<typeof setInterval> | null = null;

  subscribe(
    onFrame: (vehicles: VehicleState[]) => void,
    _onError: (err: Error) => void
  ): () => void {
    // Emit immediately, then every 2 seconds (0.5 Hz).
    onFrame([...this.vehicles]);
    this.intervalId = setInterval(() => {
      this.vehicles = this.vehicles.map(v => {
        const rad = (v.headingDeg * Math.PI) / 180;
        const dlat = Math.sin(rad) * 0.00005;
        const dlng = Math.cos(rad) * 0.00005;
        return {
          ...v,
          position: {
            latitude: v.position.latitude + dlat,
            longitude: v.position.longitude + dlng,
          },
          headingDeg: (v.headingDeg + (Math.random() * 5 - 2.5) + 360) % 360,
          speedKph: Math.max(0, Math.min(60, v.speedKph + (Math.random() * 4 - 2))),
          timestamp: Date.now(),
        };
      });
      onFrame([...this.vehicles]);
    }, 2000);

    return () => {
      if (this.intervalId) clearInterval(this.intervalId);
    };
  }

  async fetchTrafficTileUrl(): Promise<string | null> {
    return null;
  }
}
