import React, { memo } from 'react';
import { InterpolatedVehicleState } from '../data/model/VehicleState';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface CommandHudProps {
  vehicleCount: number;
  selectedVehicle: InterpolatedVehicleState | null;
  onDeselect: () => void;
}

export const CommandHud = memo(({ vehicleCount, selectedVehicle, onDeselect }: CommandHudProps) => (
  <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-[1000] pointer-events-none">
    {/* Fleet status badge */}
    <div className="flex items-center gap-2 bg-[#1C2128] rounded px-3 py-1.5 border border-[#21262D] pointer-events-auto shadow-lg">
      <div className="w-2 h-2 rounded-full bg-[#39D353] animate-pulse" />
      <span className="font-mono text-[#39D353] text-[11px] font-bold tracking-widest">
        {vehicleCount} ACTIVE
      </span>
    </div>

    {/* Selected vehicle detail panel */}
    {selectedVehicle && (
      <div className="bg-[#1C2128] rounded-lg p-3 w-56 border border-[#21262D] pointer-events-auto shadow-xl backdrop-blur-sm bg-opacity-95">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono text-[#39D353] text-base font-bold tracking-widest">
            {selectedVehicle.source.vehicleId}
          </span>
          <button 
            onClick={onDeselect}
            className="text-[#8B949E] hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        
        <div className="h-px bg-[#21262D] my-2" />
        
        <HudRow label="ROUTE" value={selectedVehicle.source.routeId} />
        <HudRow
          label="SPEED"
          value={`${selectedVehicle.source.speedKph.toFixed(1)} kph`}
          valueColor={
            selectedVehicle.source.speedKph < 5
              ? "text-[#FFB300]" // Warning/Slow
              : "text-[#E6EDF3]"
          }
        />
        <HudRow label="HDG" value={`${selectedVehicle.renderHeading.toFixed(0)}°`} />
        <HudRow
          label="LOAD"
          value={`${(selectedVehicle.source.passengerLoad * 100).toFixed(0)}%`}
        />
        <HudRow
          label="LAT"
          value={selectedVehicle.renderPosition.latitude.toFixed(5)}
        />
        <HudRow
          label="LNG"
          value={selectedVehicle.renderPosition.longitude.toFixed(5)}
        />
        
        <div className="h-px bg-[#21262D] my-2" />
        
        {/* Passenger load bar */}
        <div className="h-1 bg-[#161B22] rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-[#39D353] rounded-full transition-all duration-500"
            style={{ width: `${selectedVehicle.source.passengerLoad * 100}%` }}
          />
        </div>
        <div className="font-mono text-[#484F58] text-[10px] tracking-widest mt-1 text-right">
          PASSENGER LOAD
        </div>
      </div>
    )}
  </div>
));

const HudRow = ({
  label,
  value,
  valueColor = "text-[#E6EDF3]",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) => (
  <div className="flex justify-between items-center py-0.5">
    <span className="font-mono text-[#8B949E] text-[11px] tracking-wider">{label}</span>
    <span className={clsx("font-mono text-[11px] font-semibold", valueColor)}>
      {value}
    </span>
  </div>
);
