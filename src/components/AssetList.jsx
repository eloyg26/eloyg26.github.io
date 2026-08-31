import React from 'react'

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

          return (
            <li key={a.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                {a.image ? (
                  <img src={a.image} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase">
                    {a.symbol ? a.symbol.slice(0, 2) : a.name.slice(0, 2)}
                  </div>
                )}
                
                <div>
                  <div className="font-medium flex items-center gap-2 text-sm">
                    {a.name}
                    {a.symbol && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                        {a.symbol.toUpperCase()}
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