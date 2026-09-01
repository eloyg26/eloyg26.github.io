import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import Badge from './ui/Badge'
import { getBrokerIcon } from '../utils/brokers'

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

  // Porcentajes para la barra de distribución
  const cryptoPercent = totalNetWorth > 0 ? (cryptoTotal / totalNetWorth) * 100 : 0
  const stocksPercent = totalNetWorth > 0 ? (stocksTotal / totalNetWorth) * 100 : 0
  const cashPercent = totalNetWorth > 0 ? (cashTotal / totalNetWorth) * 100 : 0

  // Ordenar activos por valor total de mayor a menor
  const sortedAssets = [...assets].sort((a, b) => (b.currentPrice * b.quantity) - (a.currentPrice * a.quantity))

  // Identificar el mejor activo por porcentaje de ganancia
  const bestAsset = [...assets].sort((a, b) => {
    const profitA = a.purchasePrice > 0 ? (a.currentPrice - a.purchasePrice) / a.purchasePrice : 0
    const profitB = b.purchasePrice > 0 ? (b.currentPrice - b.purchasePrice) / b.purchasePrice : 0
    return profitB - profitA
  })[0]

  // Helper for the best asset logo
  const bestAssetLogo = bestAsset ? (bestAsset.image || (bestAsset.symbol ? `https://financialmodelingprep.com/image-stock/${bestAsset.symbol}.png` : null)) : null

  const chartValues = Array.isArray(history) && history.length > 0 ? history.map(item => Number(item.netWorth || 0)) : [0, 0, 0]
  const chartMin = Math.min(...chartValues)
  const chartMax = Math.max(...chartValues)
  const chartRange = chartMax - chartMin || 1
  const chartWidth = 640
  const chartHeight = 180

  const chartPoints = chartValues.map((value, index) => {
    const x = chartValues.length === 1 ? chartWidth / 2 : (index / (chartValues.length - 1)) * chartWidth
    const y = chartHeight - ((value - chartMin) / chartRange) * (chartHeight - 30) - 15
    return { x, y, value }
  })

  const [hoveredIndex, setHoveredIndex] = useState(chartPoints.length - 1)
  const activePoint = chartPoints[hoveredIndex] ?? chartPoints[chartPoints.length - 1]

  const linePoints = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPoints = `${linePoints} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      
      {/* SECCIÓN PRINCIPAL: Hero */}
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

      {/* MÉTRICAS SECUNDARIAS */}
      <Card className="border-border/60 bg-card/70 shadow-sm backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Rendimiento</p>
              <CardTitle className="mt-1 text-base">Evolución del patrimonio</CardTitle>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {isPositive ? '▲' : '▼'} {profitPercentage.toFixed(1)}%
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="relative">
            <div className="absolute right-4 top-3 z-10 rounded-xl border border-border bg-background/90 px-2.5 py-1.5 shadow-lg backdrop-blur-sm">
              <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Valor</div>
              <div className="mt-0.5 text-sm font-semibold font-mono text-foreground">
                ${Number(activePoint.value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-52 w-full overflow-visible">
              <defs>
                <linearGradient id="portfolioLineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.26" />
                  <stop offset="55%" stopColor="#8b5cf6" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="portfolioLineStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3].map((grid) => (
                <line
                  key={grid}
                  x1="0"
                  x2={chartWidth}
                  y1={20 + grid * 40}
                  y2={20 + grid * 40}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeWidth="1"
                />
              ))}

              {activePoint && (
                <line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1="0"
                  y2={chartHeight}
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeWidth="1.5"
                  strokeDasharray="6 6"
                />
              )}

              <path d={areaPoints} fill="url(#portfolioLineFill)" />
              <path d={linePoints} fill="none" stroke="url(#portfolioLineStroke)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

              {chartPoints.map((point, index) => (
                <g
                  key={`${point.x}-${point.y}-${index}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(chartPoints.length - 1)}
                  className="cursor-pointer"
                >
                  <circle cx={point.x} cy={point.y} r={hoveredIndex === index ? 7 : 5} fill="#ffffff" stroke="#8b5cf6" strokeWidth="2.5" />
                  <text
                    x={point.x}
                    y={point.y - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="currentColor"
                    className="fill-muted-foreground"
                  >
                    ${Number(point.value).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Capital Invertido</p>
            <p className="mt-3 text-2xl font-bold tracking-tight font-mono">
              ${totalInvested.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Acciones y ETFs</p>
            <p className="mt-3 text-2xl font-bold tracking-tight font-mono">
              ${(stocksTotal + cashTotal).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Criptoactivos</p>
            <p className="mt-3 text-2xl font-bold tracking-tight font-mono">
              ${cryptoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* COMPONENTES ANALÍTICOS NUEVOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Distribución de Cartera */}
        <div className="md:col-span-2 p-6 rounded-2xl border bg-card/50 backdrop-blur space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold tracking-tight text-sm">Distribución de Cartera</h3>
          </div>
          
          {assets.length > 0 ? (
            <div className="space-y-4">
              <div className="h-3 w-full rounded-full flex overflow-hidden bg-muted">
                <div style={{ width: `${stocksPercent}%` }} className="bg-indigo-500 transition-all duration-500" title="Acciones" />
                <div style={{ width: `${cryptoPercent}%` }} className="bg-amber-500 transition-all duration-500" title="Cripto" />
                <div style={{ width: `${cashPercent}%` }} className="bg-emerald-500 transition-all duration-500" title="Efectivo" />
              </div>
              
              <div className="flex flex-wrap gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-muted-foreground">Acciones ({stocksPercent.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Cripto ({cryptoPercent.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Fondos/Cash ({cashPercent.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-2">Sin datos de distribución.</div>
          )}
        </div>

        {/* Top Performer */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Mejor Rendimiento</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {bestAsset && bestAsset.purchasePrice > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase overflow-hidden border border-border shrink-0 shadow-sm">
                    <span className="absolute z-0 text-muted-foreground">
                      {bestAsset.symbol ? bestAsset.symbol.slice(0, 2) : bestAsset.name.slice(0, 2)}
                    </span>
                    {bestAssetLogo && (
                      <img 
                        src={bestAssetLogo}
                        alt={bestAsset.name}
                        className="absolute z-10 object-scale-down bg-white"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm leading-none">{bestAsset.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">{bestAsset.symbol}</div>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/10">
                  ▲ {(((bestAsset.currentPrice - bestAsset.purchasePrice) / bestAsset.purchasePrice) * 100).toFixed(2)}%
                </Badge>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-2">Faltan datos de compra.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* LISTA DE POSICIONES */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">Tus Inversiones</h3>
          <Badge variant="secondary">{assets.length} activos</Badge>
        </div>

        <Card className="overflow-hidden border-border/60">
          <div className="divide-y divide-border/60">
          {sortedAssets.length > 0 ? (
            sortedAssets.map(a => {
              const currentVal = a.currentPrice * a.quantity
              const assetProfit = (a.currentPrice - a.purchasePrice) * a.quantity
              const assetIsPositive = assetProfit >= 0
              
              const brokerName = a.broker || 'Trade Republic'
              const brokerLogo = getBrokerIcon(brokerName)
              const assetLogo = a.image || (a.symbol ? `https://financialmodelingprep.com/image-stock/${a.symbol}.png` : null)

              return (
                <div key={a.id} className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    
                    <div className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase overflow-hidden border border-border shrink-0 shadow-sm">
                      <span className="absolute z-0 text-muted-foreground">
                        {a.symbol ? a.symbol.slice(0, 2) : a.name.slice(0, 2)}
                      </span>
                      {assetLogo && (
                        <img 
                          src={assetLogo}
                          alt={a.name}
                          className="absolute z-10 scale-down bg-white"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      )}
                    </div>

                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2 mb-1">
                        {a.name}
                        {a.broker && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/80 text-muted-foreground border border-border/50">
                            {brokerLogo && (
                              <img 
                                src={brokerLogo} 
                                alt={brokerName} 
                                className="w-3.5 h-3.5 rounded-full object-contain shrink-0"
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                            )}
                            {brokerName}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono uppercase">
                        {a.quantity} {a.symbol || a.type}
                      </div>
                    </div>
                  </div>

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
        </Card>
      </div>

    </div>
  )
}