import React from 'react'
import { getBrokerIcon } from '../utils/brokers'

export default function AssetList({ assets, onUpdate, onDelete }) {
  if (assets.length === 0) {
    return (
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 text-center space-y-2">
        <h3 className="text-lg font-semibold tracking-tight">Activos (0)</h3>
        <p className="text-sm text-muted-foreground">No hay activos todavía. Añade tu primera posición desde el formulario.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground overflow-hidden mt-4">
      <div className="p-6 pb-4 border-b border-border">
        <h3 className="text-lg font-semibold tracking-tight">Mis Activos ({assets.length})</h3>
      </div>
      
      <ul className="divide-y divide-border">
        {assets.map(a => {
          const totalValue = Number(a.quantity || 0) * Number(a.currentPrice || 0)
          const brokerLogo = getBrokerIcon(a.broker)

          // Usa la imagen de CoinGecko si existe, o el CDN público de FMP para acciones/ETFs
          const assetLogo = a.image || (a.symbol ? `https://financialmodelingprep.com/image-stock/${a.symbol}.png` : null)

          return (
            <li key={a.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                
                {/* Ícono del Activo (Sistema de capas con Fallback) */}
                <div className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase overflow-hidden border border-border shrink-0 shadow-sm">
                  {/* Capa inferior: Iniciales de respaldo */}
                  <span className="absolute z-0 text-muted-foreground">
                    {a.symbol ? a.symbol.slice(0, 2) : a.name.slice(0, 2)}
                  </span>
                  
                  {/* Capa superior: Logotipo */}
                  {assetLogo && (
                    <img 
                      src={assetLogo}
                      alt={a.name}
                      className="absolute z-10 object-sclale-down bg-white"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="font-medium flex items-center gap-2 text-sm">
                    {a.name}
                    {a.symbol && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                        {a.symbol.toUpperCase()}
                      </span>
                    )}

                    {/* Badge con ícono del Broker */}
                    {a.broker && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/80 text-muted-foreground border border-border/50">
                        {brokerLogo && (
                          <img 
                            src={brokerLogo} 
                            alt={a.broker} 
                            className="w-3 h-3 rounded-full object-contain"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        )}
                        {a.broker}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{a.quantity} × ${Number(a.currentPrice).toLocaleString()}</span>
                    {a.changePercent && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono ${
                        String(a.changePercent).includes('-')
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {String(a.changePercent).includes('-') ? '▼' : '▲'} {a.changePercent}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-semibold text-sm">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div className="text-xs text-muted-foreground capitalize">{a.type}</div>
                </div>

                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      const newPrice = prompt('Nuevo precio actual', a.currentPrice)
                      if (newPrice !== null) onUpdate(a.id, { currentPrice: Number(newPrice) })
                    }}
                    className="px-2 py-1 text-xs border rounded hover:bg-accent"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => onDelete(a.id)}
                    className="px-2 py-1 text-xs border border-destructive/20 text-destructive hover:bg-destructive/10 rounded"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}