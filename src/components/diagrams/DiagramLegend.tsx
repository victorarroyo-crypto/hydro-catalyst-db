import { CHANGE_TYPE_CONFIG, ChangeType } from './types';

export function DiagramLegend() {
  return (
    <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg z-10">
      <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
        Leyenda de Cambios
      </h4>
      <div className="space-y-1.5">
        {(Object.entries(CHANGE_TYPE_CONFIG) as [ChangeType, typeof CHANGE_TYPE_CONFIG[ChangeType]][]).map(
          ([type, config]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border-2"
                style={{
                  borderColor: config.borderColor,
                  backgroundColor: config.bgColor,
                }}
              />
              <span className="text-xs" style={{ color: config.textColor }}>
                {config.label}
              </span>
            </div>
          )
        )}
        <div className="flex items-center gap-2 pt-1 border-t mt-2">
          <div className="w-4 h-4 rounded border-2 border-muted-foreground/30 bg-background" />
          <span className="text-xs text-muted-foreground">Sin cambios</span>
        </div>
      </div>
    </div>
  );
}
