import React, { memo } from 'react';
import { BunchingAlert } from '../data/model/VehicleState';
import { clsx } from 'clsx';
import { AlertTriangle, X } from 'lucide-react';

interface AlertTrayProps {
  alerts: BunchingAlert[];
  onDismiss: (alert: BunchingAlert) => void;
}

export const AlertTray = memo(({ alerts, onDismiss }: AlertTrayProps) => {
  if (alerts.length === 0) return null;

  return (
    <div className="absolute bottom-8 left-4 right-4 max-h-64 overflow-y-auto z-[1000] pointer-events-none flex flex-col gap-1 items-start sm:items-stretch sm:w-96">
      <div className="font-mono text-[#FFB300] text-[10px] font-bold tracking-[0.15em] mb-1 pl-0.5 bg-black/50 w-fit px-2 rounded">
        ALERT TRAY ({alerts.length})
      </div>
      <div className="flex flex-col gap-2 pointer-events-auto">
        {alerts.map((alert) => (
          <AlertCard key={alert.alertKey} alert={alert} onDismiss={() => onDismiss(alert)} />
        ))}
      </div>
    </div>
  );
});

const AlertCard = memo(
  ({ alert, onDismiss }: { alert: BunchingAlert; onDismiss: () => void }) => {
    const isCritical = alert.distanceM < 100;
    const accentColor = isCritical ? "border-[#FF3B30]" : "border-[#FFB300]";
    const iconColor = isCritical ? "text-[#FF3B30]" : "text-[#FFB300]";
    const bgColor = isCritical ? "bg-[#FF3B30]/10" : "bg-[#FFB300]/10";

    return (
      <div className={clsx(
        "relative rounded-md border-l-[3px] border border-r-0 border-y-0 border-[#21262D] bg-[#1C2128] overflow-hidden shadow-lg transition-all",
        accentColor
      )}>
        <div className={clsx("absolute inset-0 opacity-20 pointer-events-none", bgColor)} />
        
        <div className="relative flex items-center p-3 gap-3">
          {/* Icon */}
          <div className={clsx("flex-shrink-0", iconColor)}>
            <AlertTriangle size={18} />
          </div>

          {/* Alert info */}
          <div className="flex-1 min-w-0">
            <div className={clsx("font-mono text-[10px] font-bold tracking-widest mb-0.5", iconColor)}>
              {isCritical ? 'CRITICAL BUNCHING' : 'BUNCHING DETECTED'}
            </div>
            <div className="font-mono text-[#E6EDF3] text-[11px] font-semibold truncate">
              {alert.vehicleA.vehicleId} & {alert.vehicleB.vehicleId}
            </div>
            <div className="flex justify-between items-center mt-0.5">
              <span className="font-mono text-[#8B949E] text-[11px]">
                {alert.vehicleA.routeId}
              </span>
              <span className={clsx("font-mono text-[11px] font-bold", iconColor)}>
                {Math.round(alert.distanceM)} m apart
              </span>
            </div>
          </div>

          {/* Dismiss */}
          <button 
            onClick={onDismiss}
            className="p-1 text-[#8B949E] hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }
);
