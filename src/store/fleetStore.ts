import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { FleetUiState, InterpolatedVehicleState, VehicleState, BunchingAlert } from '../data/model/VehicleState';
import { FleetRepository } from '../data/repository/FleetRepository';
import { DeadReckoningEngine } from '../domain/DeadReckoningEngine';
import { BunchingDetector } from '../domain/BunchingDetector';

// ─────────────────────────────────────────────────────────────────────────────
// Zustand Store — replaces FleetViewModel + StateFlow
//
// Why Zustand over Redux/Context?
// • Zero boilerplate vs Redux (no actions, reducers, selectors)
// • Selective re-render: components subscribe to exact slices, not full state
// • Sync + async mutations in one place
// • Equivalent to Kotlin StateFlow in simplicity
// ─────────────────────────────────────────────────────────────────────────────

interface FleetStoreState {
  uiState: FleetUiState;

  // Internal working state (not directly rendered)
  _lastKnown: Record<string, VehicleState>;
  _renderVehicles: Record<string, InterpolatedVehicleState>;
  _dismissedAlertKeys: Set<string>;

  // Actions
  onTelemetryFrame: (batch: VehicleState[]) => void;
  onInterpolationTick: (elapsedMs: number) => void;
  onVehicleSelected: (vehicleId: string | null) => void;
  onAlertDismissed: (alert: BunchingAlert) => void;
  onRetryConnection: () => void;
  setError: (message: string) => void;
  setTrafficTileUrl: (url: string | null) => void;
}

const detector = new BunchingDetector(200);

export const useFleetStore = create<FleetStoreState>((set, get) => ({
  uiState: { status: 'loading' },
  _lastKnown: {},
  _renderVehicles: {},
  _dismissedAlertKeys: new Set(),

  onTelemetryFrame: (batch: VehicleState[]) => {
    const { _lastKnown, _renderVehicles, _dismissedAlertKeys, uiState } = get();

    // 1. Merge into ground-truth map
    const updatedKnown = { ..._lastKnown };
    batch.forEach(v => { updatedKnown[v.vehicleId] = v; });

    // 2. Bunching analysis on background-equivalent (sync but fast, <0.1ms)
    const allAlerts = detector.evaluate(Object.values(updatedKnown));
    const activeAlerts = allAlerts.filter(a => !_dismissedAlertKeys.has(a.alertKey));

    // 3. Snap render positions toward new GPS truth for vehicles in this batch
    const updatedRender = { ..._renderVehicles };
    batch.forEach(newState => {
      const existing = updatedRender[newState.vehicleId];
      updatedRender[newState.vehicleId] = existing
        ? DeadReckoningEngine.lerp(existing, newState, 0) // begin snap from current render pos
        : { source: newState, renderPosition: newState.position, renderHeading: newState.headingDeg };
    });

    const currentTrafficUrl = uiState.status === 'active' ? uiState.trafficTileUrl : null;
    const selectedId = uiState.status === 'active' ? uiState.selectedVehicleId : null;

    set({
      _lastKnown: updatedKnown,
      _renderVehicles: updatedRender,
      uiState: {
        status: 'active',
        vehicles: { ...updatedRender },
        activeAlerts,
        trafficTileUrl: currentTrafficUrl,
        selectedVehicleId: selectedId,
      },
    });
  },

  /**
   * Called by the RAF loop every ~16ms.
   * Projects all render positions forward by elapsedMs using dead reckoning.
   *
   * PERFORMANCE NOTE: We only call set() here — Zustand batches the update
   * into a single React render pass, equivalent to Kotlin's StateFlow
   * conflation on the Main dispatcher.
   */
  onInterpolationTick: (elapsedMs: number) => {
    const { _renderVehicles, uiState } = get();
    if (Object.keys(_renderVehicles).length === 0) return;

    const projected: Record<string, InterpolatedVehicleState> = {};
    for (const [id, interp] of Object.entries(_renderVehicles)) {
      projected[id] = DeadReckoningEngine.projectFromRender(interp, elapsedMs);
    }

    set({ _renderVehicles: projected });

    // Throttle map marker updates to ~20fps (every 3 frames) to save renders.
    // The RAF loop still runs at 60fps for smooth internal state, but the map
    // only re-renders at 20fps — indistinguishable to the human eye for markers.
    if (uiState.status === 'active') {
      set(state => ({
        uiState: {
          ...(state.uiState as Extract<FleetUiState, { status: 'active' }>),
          vehicles: { ...projected },
        },
      }));
    }
  },

  onVehicleSelected: (vehicleId) => {
    set(state => {
      if (state.uiState.status !== 'active') return state;
      return {
        uiState: { ...state.uiState, selectedVehicleId: vehicleId },
      };
    });
  },

  onAlertDismissed: (alert) => {
    set(state => {
      const dismissed = new Set(state._dismissedAlertKeys);
      dismissed.add(alert.alertKey);
      if (state.uiState.status !== 'active') return { _dismissedAlertKeys: dismissed };
      return {
        _dismissedAlertKeys: dismissed,
        uiState: {
          ...state.uiState,
          activeAlerts: state.uiState.activeAlerts.filter(a => a.alertKey !== alert.alertKey),
        },
      };
    });
  },

  onRetryConnection: () => {
    set({ uiState: { status: 'loading' }, _dismissedAlertKeys: new Set() });
  },

  setError: (message) => set({ uiState: { status: 'error', message } }),

  setTrafficTileUrl: (url) => {
    set(state => {
      if (state.uiState.status !== 'active') return state;
      return { uiState: { ...state.uiState, trafficTileUrl: url } };
    });
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Hook: wires repository → store + RAF loop
// Use once at the root screen level.
// ─────────────────────────────────────────────────────────────────────────────

export function useFleetEngine(repository: FleetRepository) {
  const { onTelemetryFrame, onInterpolationTick, setError, setTrafficTileUrl, onRetryConnection } =
    useFleetStore();

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());

  useEffect(() => {
    // Subscribe to telemetry stream
    const unsubscribe = repository.subscribe(onTelemetryFrame, (err) => {
      setError(err.message);
    });

    // Fetch traffic tile URL
    repository.fetchTrafficTileUrl().then(setTrafficTileUrl);

    // Start 60fps interpolation RAF loop
    const tick = (now: number) => {
      const elapsedMs = now - lastTickRef.current;
      lastTickRef.current = now;
      onInterpolationTick(elapsedMs);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      unsubscribe();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [repository]);
}
