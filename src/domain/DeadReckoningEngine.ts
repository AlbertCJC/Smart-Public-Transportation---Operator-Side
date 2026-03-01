import { LatLng, InterpolatedVehicleState, VehicleState } from '../data/model/VehicleState';

const EARTH_RADIUS_M = 6_371_000;

/**
 * Dead Reckoning / Linear Interpolation Engine
 *
 * At 0.5 Hz GPS updates a 30 kph jeepney travels ~17 m between pings.
 * Without interpolation, markers teleport every 2 seconds.
 *
 * This engine runs inside a requestAnimationFrame loop (~60fps) and projects
 * each vehicle's position forward using heading + speed, then snaps toward
 * truth when fresh GPS arrives.
 */
export const DeadReckoningEngine = {

  /**
   * Project a vehicle forward by `elapsedMs` milliseconds.
   */
  project(state: VehicleState, elapsedMs: number): InterpolatedVehicleState {
    const distanceM = (state.speedKph / 3.6) * (elapsedMs / 1000);
    const projected = destinationPoint(state.position, state.headingDeg, distanceM);
    return {
      source: state,
      renderPosition: projected,
      renderHeading: state.headingDeg,
    };
  },

  /**
   * Blend current render position toward new GPS truth.
   * `t` in [0, 1] — 0 = old position, 1 = full snap to truth.
   */
  lerp(
    from: InterpolatedVehicleState,
    to: VehicleState,
    t: number
  ): InterpolatedVehicleState {
    const tc = Math.max(0, Math.min(1, t));
    const lat = from.renderPosition.latitude +
      (to.position.latitude - from.renderPosition.latitude) * tc;
    const lng = from.renderPosition.longitude +
      (to.position.longitude - from.renderPosition.longitude) * tc;
    return {
      source: to,
      renderPosition: { latitude: lat, longitude: lng },
      renderHeading: lerpAngle(from.renderHeading, to.headingDeg, tc),
    };
  },

  /**
   * Project from an already-interpolated render position (not raw GPS origin).
   * This preserves snap corrections across ticks.
   */
  projectFromRender(
    interp: InterpolatedVehicleState,
    elapsedMs: number
  ): InterpolatedVehicleState {
    const distanceM = (interp.source.speedKph / 3.6) * (elapsedMs / 1000);
    const projected = destinationPoint(interp.renderPosition, interp.renderHeading, distanceM);
    return {
      source: interp.source,
      renderPosition: projected,
      renderHeading: interp.renderHeading,
    };
  },

  /**
   * Haversine great-circle distance in metres between two coordinates.
   * Used by BunchingDetector for spatial proximity checks.
   */
  haversineMetres(a: LatLng, b: LatLng): number {
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const c = 2 * Math.asin(Math.sqrt(
      sinDLat * sinDLat +
      Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      sinDLng * sinDLng
    ));
    return EARTH_RADIUS_M * c;
  },
};

// ─── Private helpers ─────────────────────────────────────────────────────────

function destinationPoint(start: LatLng, bearingDeg: number, distanceM: number): LatLng {
  const δ = distanceM / EARTH_RADIUS_M;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(start.latitude);
  const λ1 = toRad(start.longitude);
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );
  return { latitude: toDeg(φ2), longitude: toDeg(λ2) };
}

function lerpAngle(from: number, to: number, t: number): number {
  const delta = ((to - from) % 360 + 540) % 360 - 180;
  return (from + delta * t + 360) % 360;
}

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
