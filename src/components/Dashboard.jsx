import React from 'react'

export default function Dashboard({ assets, history, theme }) {
  // Cálculos de la cartera
  const totalNetWorth = assets.reduce((sum, a) => sum + (Number(a.currentPrice || 0) * Number(a.quantity || 0)), 0)
  const totalInvested = assets.reduce((sum, a) => sum + (Number(a.purchasePrice || 0) * Number(a.quantity || 0)), 0)
  
  const totalProfit = totalNetWorth - totalInvested
  const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
  const isPositive = totalProfit >= 0

  // Totales por tipo de instrumento
  const cryptoTotal = assets.filter(a => a.type === 'crypto').reduce((s, a) => s + (a.currentPrice * a.quantity), 0)
  const stocksTotal = assets.filter(a => a.type === 'stocks').reduce((s, a) => s + (a.currentPrice * a.quantity), 0)
  const cashTotal = assets.filter(a => a.type === 'cash').reduce((s, a) => s + (a.currentPrice * a.quantity), 0)

  // Ordenar activos por valor total de mayor a menor
  const sortedAssets = [...assets].sort((a, b) => (b.currentPrice * b.quantity) - (a.currentPrice * a.quantity))

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      
      {/* SECCIÓN PRINCIPAL: Estilo "Hero" Trade Republic (Monto Gigante + Rendimiento) */}
      <div className="space-y-2 border-b border-border pb-8">
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          Portafolio Total
        </span>
        <div className="text-5xl font-extrabold tracking-tight font-mono">
          ${totalNetWorth.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        
        <div className="flex items-center gap-2 pt-1 text-sm font-medium">
          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}${Math.abs(totalProfit).toLocaleString('es-ES', { minimumFractionDigits: 2 })} ({profitPercentage.toFixed(2)}%)
          </span>
          <span className="text-muted-foreground text-xs">Rendimiento global</span>
        </div>
      </div>

      {/* MÉTRICAS SECUNDARIAS (Tarjetas minimalistas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-2xl border bg-card/50 backdrop-blur space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Capital Invertido</p>
          <p className="text-xl font-bold font-mono">
            ${totalInvested.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-5 rounded-2xl border bg-card/50 backdrop-blur space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Acciones y ETFs</p>
          <p className="text-xl font-bold font-mono">
            ${(stocksTotal + cashTotal).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-5 rounded-2xl border bg-card/50 backdrop-blur space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Criptoactivos</p>
          <p className="text-xl font-bold font-mono">
            ${cryptoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
        </div>

      </div>

      {/* LISTA DE POSICIONES ESTILO TRADE REPUBLIC */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">Tus Inversiones</h3>
          <span className="text-xs text-muted-foreground">{assets.length} activos</span>
        </div>

        <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/60">
          {sortedAssets.length > 0 ? (
            sortedAssets.map(a => {
              const currentVal = a.currentPrice * a.quantity
              const assetProfit = (a.currentPrice - a.purchasePrice) * a.quantity
              const assetIsPositive = assetProfit >= 0

              return (
                <div key={a.id} className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
                  
                  {/* Icono + Nombre */}
                  <div className="flex items-center gap-3">
                    {a.image ? (
                      <img src={a.image} alt={a.name} className="w-10 h-10 rounded-full object-cover border" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {a.symbol ? a.symbol.slice(0, 3) : a.name.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm leading-none mb-1">{a.name}</div>
                      <div className="text-xs text-muted-foreground font-mono uppercase">
                        {a.quantity} {a.symbol || a.type}
                      </div>
                    </div>
                  </div>

                  {/* Valor de la posición + Variación */}
                  <div className="text-right">
                    <div className="font-bold text-sm font-mono">
                      ${currentVal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-xs font-medium font-mono ${assetIsPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {assetIsPositive ? '+' : ''}${assetProfit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                </div>
              )
            })
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No tienes posiciones abiertas en tu portafolio.
            </div>
          )}
        </div>
      </div>

    </div>
  )
}