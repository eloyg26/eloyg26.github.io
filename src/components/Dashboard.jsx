import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import Badge from './ui/Badge'
import Button from './ui/Button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { getBrokerIcon } from '../utils/brokers'

const RANGE_OPTIONS = [
  { key: 'day', label: 'Día' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Año' },
]

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

  const [range, setRange] = useState('month')

  const rangeLengths = {
    day: 7,
    week: 8,
    month: 12,
    year: 12,
  }

  const chartValues = (() => {
    const safeHistory = Array.isArray(history) && history.length > 0 ? history : [{ date: new Date().toISOString().slice(0, 10), netWorth: totalNetWorth }]
    const selectedCount = rangeLengths[range] || 12
    const sliced = safeHistory.slice(-selectedCount)

    if (sliced.length === 0) return [totalNetWorth]
    if (sliced.length === 1) return [Number(sliced[0].netWorth || totalNetWorth)]

    const values = sliced.map(item => Number(item.netWorth || 0))
    const fillCount = selectedCount - values.length
    if (fillCount > 0) {
      const lastValue = values[values.length - 1] || totalNetWorth
      return [...Array(fillCount).fill(lastValue), ...values]
    }

    return values
  })()

  const chartMin = Math.min(...chartValues)
  const chartMax = Math.max(...chartValues)
  const chartRange = chartMax - chartMin || 1
  const chartWidth = 850
  const chartHeight = 180

  const chartPoints = chartValues.map((value, index) => {
    const x = chartValues.length === 1 ? chartWidth / 2 : (index / (chartValues.length - 1)) * chartWidth
    const y = chartHeight - ((value - chartMin) / chartRange) * (chartHeight - 30) - 15
    return { x, y, value }
  })

  const [hoveredIndex, setHoveredIndex] = useState(chartPoints.length - 1)
  const [assetTrend, setAssetTrend] = useState({})
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)

  function buildFallbackTrend(asset, length = 12, volatilityBoost = 1) {
    const base = Number(asset.currentPrice || 0)
    const bias = asset.type === 'crypto' ? 0.08 : 0.04
    const seed = String(asset.symbol || asset.name || 'asset')
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)

    return Array.from({ length }, (_, index) => {
      const phase = index / Math.max(length - 1, 1)
      const wave = Math.sin((phase + seed / 100) * Math.PI * 2) * base * bias * volatilityBoost
      const drift = (phase - 0.5) * base * (asset.type === 'crypto' ? 0.06 : 0.03) * volatilityBoost
      return Number((base + wave + drift).toFixed(2))
    })
  }

  function fetchAssetTrend(asset, withDetail = false) {
    if (!asset?.symbol) return

    const rangeConfigs = {
      day: { length: 7, volatility: 0.6 },
      week: { length: 8, volatility: 0.8 },
      month: { length: 12, volatility: 1 },
      year: { length: 12, volatility: 1.2 },
    }

    const ranges = Object.entries(rangeConfigs).reduce((acc, [key, config]) => {
      const points = buildFallbackTrend(asset, config.length, config.volatility)
      const start = points[0]
      const end = points[points.length - 1]
      const percentChange = start ? ((end - start) / start) * 100 : 0

      acc[key] = {
        points,
        percentChange,
        currentPrice: Number(asset.currentPrice || end),
      }
      return acc
    }, {})

    const activeTrend = ranges[range] || ranges.month

    setAssetTrend(prev => ({ ...prev, [asset.id]: { ...activeTrend, ranges } }))

    if (withDetail && selectedAsset?.id === asset.id) {
      setSelectedDetail({
        ...asset,
        currentPrice: Number(asset.currentPrice || activeTrend.currentPrice),
        percentChange: activeTrend.percentChange,
        series: activeTrend.points,
      })
    }
  }

  const activePoint = chartPoints[hoveredIndex] ?? chartPoints[chartPoints.length - 1]
  const rangeDelta = chartValues.length > 1 ? chartValues[chartValues.length - 1] - chartValues[0] : 0
  const rangeDeltaPct = chartValues.length > 1 && chartValues[0] !== 0 ? (rangeDelta / chartValues[0]) * 100 : 0

  const linePoints = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPoints = `${linePoints} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`

  React.useEffect(() => {
    if (!Array.isArray(assets) || !assets.length) return

    assets.forEach(asset => {
      if (!assetTrend[asset.id]) {
        fetchAssetTrend(asset)
      }
    })
  }, [assets])

  React.useEffect(() => {
    if (!selectedAsset) return
    const detailTrend = assetTrend[selectedAsset.id]?.ranges?.[range] || assetTrend[selectedAsset.id]
    if (detailTrend) {
      setSelectedDetail({
        ...selectedAsset,
        currentPrice: detailTrend.currentPrice,
        percentChange: detailTrend.percentChange,
        series: detailTrend.points,
      })
      return
    }

    fetchAssetTrend(selectedAsset, true)
  }, [selectedAsset, range, assetTrend])

  function formatTrendNumber(value) {
    return Number(value || 0).toFixed(2)
  }

  function buildSparkline(values) {
    const safeValues = Array.isArray(values) && values.length > 0 ? values : [0, 0, 0, 0]
    const min = Math.min(...safeValues)
    const max = Math.max(...safeValues)
    const range = max - min || 1

    return safeValues
      .map((value, index) => {
        const x = (index / Math.max(safeValues.length - 1, 1)) * 80
        const y = 22 - ((value - min) / range) * 16
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  function buildSparklineArea(values) {
    const safeValues = Array.isArray(values) && values.length > 0 ? values : [0, 0, 0, 0]
    const min = Math.min(...safeValues)
    const max = Math.max(...safeValues)
    const range = max - min || 1

    const points = safeValues.map((value, index) => {
      const x = (index / Math.max(safeValues.length - 1, 1)) * 80
      const y = 22 - ((value - min) / range) * 16
      return { x, y }
    })

    if (!points.length) return ''
    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    return `${line} L ${points[points.length - 1].x} 22 L ${points[0].x} 22 Z`
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      
      {/* SECCIÓN PRINCIPAL: Hero */}
      <div className="space-y-3 border-b border-border pb-8">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Portafolio Total
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs">Resumen</Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-[340px] border border-border bg-popover/95 p-0 shadow-2xl backdrop-blur-xl">
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resumen</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {isPositive ? '▲' : '▼'} {Math.abs(rangeDeltaPct).toFixed(1)}%
                  </span>
                </div>

                <div className="text-2xl font-extrabold tracking-tight font-mono">
                  ${totalNetWorth.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-2">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-16 w-full overflow-visible">
                    <defs>
                      <linearGradient id="popoverLineFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="popoverLineStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#a78bfa" />
                      </linearGradient>
                    </defs>
                    <path d={`${areaPoints} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`} fill="url(#popoverLineFill)" />
                    <path d={linePoints} fill="none" stroke="url(#popoverLineStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={activePoint.x} cy={activePoint.y} r="4" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2.5" />
                  </svg>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between"><span>Capital invertido</span><span className="font-medium text-foreground">${totalInvested.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between"><span>Valor actual</span><span className="font-medium text-foreground">${totalNetWorth.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between"><span>Ganancia</span><span className={`font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>{isPositive ? '+' : '-'}${Math.abs(totalProfit).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="text-5xl font-extrabold tracking-tight font-mono">
          ${totalNetWorth.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}${Math.abs(totalProfit).toLocaleString('es-ES', { minimumFractionDigits: 2 })} ({profitPercentage.toFixed(2)}%)
            </span>
            <span className="text-muted-foreground text-xs">Rendimiento global</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 p-1">
            {RANGE_OPTIONS.map(({ key, label }) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={range === key ? 'default' : 'ghost'}
                className={`h-8 rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${range === key ? 'shadow-sm' : 'text-muted-foreground'}`}
                onClick={() => setRange(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* MÉTRICAS SECUNDARIAS */}
      <Card className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Rendimiento</p>
              <CardTitle className="mt-1 text-base">Evolución del patrimonio</CardTitle>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${rangeDelta >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {rangeDelta >= 0 ? '▲' : '▼'} {Math.abs(rangeDeltaPct).toFixed(1)}%
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="relative rounded-2xl bg-gradient-to-b from-muted/10 to-transparent p-1">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-52 w-full overflow-visible rounded-2xl">
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

              <TooltipProvider delayDuration={100}>
                {chartPoints.map((point, index) => (
                  <Tooltip key={`${point.x}-${point.y}-${index}`}>
                    <TooltipTrigger asChild>
                      <g
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
                    </TooltipTrigger>
                    <TooltipContent side="top" className="font-mono text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Valor</span>
                        <span>${Number(point.value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
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
              <div className="h-2 w-full rounded-full flex overflow-hidden bg-muted">
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

              const trendForRange = assetTrend[a.id]?.ranges?.[range] || assetTrend[a.id] || { points: [], percentChange: 0 }
              const rangeLabel = { day: '1D', week: '1S', month: '1M', year: '1A' }[range] || '1M'

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAsset(a)}
                  className="w-full p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
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

                  <div className="mt-3 flex items-center justify-between gap-3 pl-12 pr-1">
                    <div className="flex-1 h-8 rounded-md bg-muted/20 p-1">
                      <svg viewBox="0 0 80 22" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={`spark-${a.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={trendForRange.percentChange >= 0 ? '#22c55e' : '#f87171'} stopOpacity="0.24" />
                            <stop offset="100%" stopColor={trendForRange.percentChange >= 0 ? '#22c55e' : '#f87171'} stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <path d={buildSparklineArea(trendForRange.points || [])} fill={`url(#spark-${a.id})`} />
                        <path
                          d={buildSparkline(trendForRange.points || [])}
                          fill="none"
                          stroke={trendForRange.percentChange >= 0 ? '#22c55e' : '#f87171'}
                          strokeWidth="2.1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {trendForRange.points?.length > 0 && (
                          <circle
                            cx="80"
                            cy={
                              22 -
                              ((trendForRange.points[trendForRange.points.length - 1] - Math.min(...trendForRange.points)) /
                                (Math.max(...trendForRange.points) - Math.min(...trendForRange.points) || 1)) *
                                16
                            }
                            r="1.8"
                            fill={trendForRange.percentChange >= 0 ? '#22c55e' : '#f87171'}
                          />
                        )}
                      </svg>
                    </div>
                    <div className="min-w-[82px] text-right">
                      <div className={`text-xs font-semibold ${trendForRange.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trendForRange ? `${trendForRange.percentChange >= 0 ? '+' : ''}${formatTrendNumber(trendForRange.percentChange)}%` : '—'}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-0.5">
                        {rangeLabel}
                      </div>
                    </div>
                  </div>
                </button>
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

      <Dialog open={Boolean(selectedAsset)} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedDetail?.name || selectedAsset?.name}</span>
              {selectedDetail?.symbol && (
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{selectedDetail.symbol}</span>
              )}
            </DialogTitle>
            <DialogDescription>
              Evolución reciente del rendimiento del activo según fuente en vivo.
            </DialogDescription>
          </DialogHeader>

          {selectedDetail && (
            <div className="space-y-5 pt-2">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-3xl font-bold font-mono">
                    ${Number(selectedDetail.currentPrice || selectedDetail.currentPrice || selectedAsset.currentPrice || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Precio actual</div>
                </div>

                <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedDetail.percentChange >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {selectedDetail.percentChange >= 0 ? '▲' : '▼'} {selectedDetail.percentChange >= 0 ? '+' : ''}{formatTrendNumber(selectedDetail.percentChange)}% en 30 días
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <svg viewBox="0 0 80 22" className="h-28 w-full" preserveAspectRatio="none">
                  <path
                    d={buildSparkline(selectedDetail.series || [])}
                    fill="none"
                    stroke={selectedDetail.percentChange >= 0 ? '#22c55e' : '#f87171'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Cantidad</div>
                  <div className="mt-2 font-semibold font-mono">{Number(selectedDetail.quantity || 0).toLocaleString('es-ES', { maximumFractionDigits: 4 })}</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Valor total</div>
                  <div className="mt-2 font-semibold font-mono">
                    ${((Number(selectedDetail.currentPrice || 0) * Number(selectedDetail.quantity || 0))).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Broker</div>
                  <div className="mt-2 font-semibold">{selectedDetail.broker || 'Sin broker'}</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Tipo</div>
                  <div className="mt-2 font-semibold capitalize">{selectedDetail.type || 'Activo'}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}