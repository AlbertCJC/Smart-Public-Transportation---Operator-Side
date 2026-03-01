import { VehicleState, BunchingAlert } from '../data/model/VehicleState';
import { DeadReckoningEngine } from './DeadReckoningEngine';

/**
 * Spatial Alert System — Bunching Detector
 *
 * O(n²) pair-wise distance checks, grouped by routeId.
 * Acceptable because a single route has 3–15 vehicles in practice.
 */
export class BunchingDetector {
  constructor(private readonly thresholdM: number = 200) {}

  evaluate(vehicles: VehicleState[]): BunchingAlert[] {
    const alerts: BunchingAlert[] = [];
    const byRoute = groupBy(vehicles, v => v.routeId);

    for (const routeVehicles of Object.values(byRoute)) {
      for (let i = 0; i < routeVehicles.length; i++) {
        for (let j = i + 1; j < routeVehicles.length; j++) {
          const a = routeVehicles[i];
          const b = routeVehicles[j];
          const distanceM = DeadReckoningEngine.haversineMetres(a.position, b.position);
          if (distanceM < this.thresholdM) {
            alerts.push({
              vehicleA: a,
              vehicleB: b,
              distanceM,
              alertKey: `${a.vehicleId}+${b.vehicleId}`,
            });
          }
        }
      }
    }

    return alerts.sort((x, y) => x.distanceM - y.distanceM);
  }
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] = acc[k] ?? []).push(item);
    return acc;
  }, {});
}
