import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import Button from './ui/Button'
import Input from './ui/Input'
import Badge from './ui/Badge'
import { getBrokerIcon } from '../utils/brokers'

const BROKERS = [
  'Trade Republic', 'Interactive Brokers', 'Binance', 'Coinbase', 
  'Revolut', 'eToro', 'Scalable Capital', 'DEGIRO', 'MyInvestor', 'XTB', 'TradingView', 'Otro'
]

const empty = { name: '', symbol: '', type: 'cash', quantity: '', purchasePrice: '', currentPrice: '', broker: 'Trade Republic' }

const FALLBACK_SUGGESTIONS = {
  crypto: [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', thumb: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', thumb: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
    { id: 'solana', name: 'Solana', symbol: 'SOL', thumb: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
    { id: 'binancecoin', name: 'BNB', symbol: 'BNB', thumb: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png' },
    { id: 'ripple', name: 'XRP', symbol: 'XRP', thumb: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
    { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', thumb: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' }
  ],
  stocks: [
    { symbol: 'AAPL', name: 'Apple Inc', region: 'US' },
    { symbol: 'MSFT', name: 'Microsoft', region: 'US' },
    { symbol: 'NVDA', name: 'NVIDIA', region: 'US' },
    { symbol: 'AMZN', name: 'Amazon', region: 'US' },
    { symbol: 'GOOGL', name: 'Alphabet', region: 'US' },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', region: 'US' },
    { symbol: 'QQQ', name: 'Invesco NASDAQ 100 ETF', region: 'US' },
    { symbol: 'META', name: 'Meta Platforms', region: 'US' }
  ]
}

function getFallbackSuggestions(term, type) {
  const query = term.trim().toLowerCase()
  if (!query) return []

  const pool = type === 'crypto' ? FALLBACK_SUGGESTIONS.crypto : FALLBACK_SUGGESTIONS.stocks

  return pool.filter(item => {
    const haystack = `${item.name} ${item.symbol}`.toLowerCase()
    return haystack.includes(query)
  }).slice(0, 6)
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export default function AssetForm({ onAdd }) {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggests, setSuggests] = useState([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('') 
  const mounted = useRef(true)

  useEffect(() => () => { mounted.current = false }, [])

  function onChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleTypeChange(e) {
    setForm({ ...empty, type: e.target.value })
    setSearchQuery('')
    setSuggests([])
    setLoading(false)
    setApiError('')
  }

  function closeModal() {
    setIsOpen(false)
    setForm(empty)
    setSearchQuery('')
    setSuggests([])
    setLoading(false)
    setApiError('')
  }

  // Búsqueda en APIs
  useEffect(() => {
    const term = searchQuery.trim().toLowerCase()
    if (!term || term.length < 2) {
      setSuggests([])
      setLoading(false)
      setApiError('')
      return
    }

    setLoading(true)
    setApiError('')

    const timer = setTimeout(async () => {
      if (!mounted.current) return

      if (form.type === 'crypto') {
        try {
          const res = await fetchWithTimeout(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(term)}`)
          const data = await res.json()
          const coins = Array.isArray(data.coins) ? data.coins : []

          if (mounted.current) {
            setSuggests(coins.length > 0 ? coins : getFallbackSuggestions(term, 'crypto'))
            if (coins.length === 0) setApiError('No se encontraron resultados. Mostrando opciones comunes.')
          }
        } catch (e) {
          if (mounted.current) {
            setSuggests(getFallbackSuggestions(term, 'crypto'))
            setApiError('Error conectando con CoinGecko. Mostrando opciones comunes.')
          }
        } finally {
          if (mounted.current) setLoading(false)
        }
      }
      else if (form.type === 'cash' || form.type === 'stocks') {
        try {
          const key = import.meta.env.VITE_FINNHUB_KEY
          if (!key) {
            if (mounted.current) {
              setSuggests(getFallbackSuggestions(term, form.type))
              setApiError('Falta VITE_FINNHUB_KEY en el .env; mostrando sugerencias locales.')
              setLoading(false)
            }
            return
          }

          const res = await fetchWithTimeout(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(term)}&token=${key}`)
          if (!res.ok) {
            throw new Error('Finnhub no respondió correctamente')
          }

          const data = await res.json()
          const matches = Array.isArray(data.result) ? data.result : []

          if (mounted.current) {
            const result = matches.length > 0
              ? matches.map(item => ({
                  symbol: item.symbol,
                  name: item.description || item.displaySymbol || item.symbol,
                  region: item.region || item.type || item.displaySymbol
                }))
              : getFallbackSuggestions(term, form.type)

            setSuggests(result)
            if (matches.length === 0) {
              setApiError('No se encontraron resultados. Mostrando sugerencias comunes.')
            }
          }
        } catch (e) {
          if (mounted.current) {
            setSuggests(getFallbackSuggestions(term, form.type))
            setApiError('Error de red al conectar con Finnhub. Mostrando sugerencias locales.')
          }
        } finally {
          if (mounted.current) setLoading(false)
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, form.type])

  async function pickCoin(coin) {
    setForm(f => ({ ...f, name: coin.name, symbol: coin.symbol, coinId: coin.id, image: coin.thumb }))
    setSearchQuery('')
    setSuggests([])
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin.id}&order=market_cap_desc&per_page=1&page=1&sparkline=false`)
      const arr = await res.json()
      if (arr && arr[0]) {
        setForm(f => ({ ...f, currentPrice: arr[0].current_price || 0, image: arr[0].image }))
      }
    } catch (e) { console.error(e) }
  }

  async function pickStockOrFund(match) {
    const symbol = match.symbol
    const name = match.name
    setForm(f => ({ ...f, name, symbol }))
    setSearchQuery('')
    setSuggests([])

    try {
      const key = import.meta.env.VITE_FINNHUB_KEY
      if (!key) {
        setApiError('Falta tu VITE_FINNHUB_KEY en el .env');
        return;
      }

      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`)
      if (!res.ok) {
        setApiError('Error al obtener precio desde Finnhub')
        return
      }
      const data = await res.json()

      if (data && (data.c || data.c === 0)) {
        setForm(f => ({
          ...f,
          currentPrice: Number(data.c || 0),
          changePercent: `${data.dp && data.dp > 0 ? '+' : ''}${Number(data.dp || 0).toFixed(2)}%`
        }))
      }
    } catch (e) { console.error("Error obteniendo precio:", e) }
  }

  function submit(e) {
    e.preventDefault()
    if (!form.name) return

    onAdd({
      ...form,
      quantity: Number(form.quantity || 0),
      purchasePrice: Number(form.purchasePrice || 0),
      currentPrice: Number(form.currentPrice || 0)
    })
    closeModal()
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="w-full gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        <span>Añadir nueva inversión</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="max-w-md w-full border-border/60 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Agregar activo</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={closeModal} aria-label="Cerrar">
                ✕
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={submit} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de activo</label>
                  <select name="type" value={form.type} onChange={handleTypeChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="cash">Efectivo / Fondos ETFs</option>
                    <option value="stocks">Acciones</option>
                    <option value="crypto">Criptomonedas</option>
                  </select>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Buscar Activo</label>
                  <Input type="text" placeholder={form.type === 'crypto' ? "Ej: Bitcoin..." : "Ej: VOO, Apple..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />

                  {loading && <div className="text-xs text-muted-foreground pt-1">Buscando...</div>}
                  {apiError && <div className="text-xs text-red-500 pt-1 font-medium">{apiError}</div>}

                  {suggests.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-52 overflow-auto py-1">
                      {form.type === 'crypto' ? (
                        suggests.slice(0, 6).map(c => (
                          <li key={c.id} onClick={() => pickCoin(c)} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent cursor-pointer">
                            {c.thumb && <img src={c.thumb} alt="" className="w-5 h-5 rounded-full" />}
                            <div>
                              <div className="font-medium">{c.name}</div>
                              <div className="text-xs text-muted-foreground">{c.symbol?.toUpperCase()}</div>
                            </div>
                          </li>
                        ))
                      ) : (
                        suggests.slice(0, 6).map(c => (
                          <li key={c.symbol} onClick={() => pickStockOrFund(c)} className="px-3 py-2 text-sm hover:bg-accent cursor-pointer">
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.symbol} {c.region ? `• ${c.region}` : ''}</div>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activo seleccionado</label>
                  <Input name="name" value={form.name} readOnly placeholder="Selecciona un activo arriba..." className="bg-muted/50 text-foreground opacity-80 cursor-not-allowed" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Broker / Plataforma</label>
                  <div className="relative flex items-center">
                    {getBrokerIcon(form.broker) && (
                      <img src={getBrokerIcon(form.broker)} alt="" className="absolute left-3 w-4 h-4 rounded-full pointer-events-none" onError={(e) => { e.target.style.display = 'none' }} />
                    )}
                    <select name="broker" value={form.broker} onChange={onChange} className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${getBrokerIcon(form.broker) ? 'pl-9' : ''}`}>
                      {BROKERS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Cantidad</label>
                    <Input name="quantity" type="number" step="any" value={form.quantity} onChange={onChange} required placeholder="0" className="font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">P. Compra</label>
                    <Input name="purchasePrice" type="number" step="any" value={form.purchasePrice} onChange={onChange} placeholder="0.00" className="font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">P. Actual</label>
                    <Input name="currentPrice" type="number" step="any" value={form.currentPrice} onChange={onChange} placeholder="0.00" className="font-mono" />
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <Button type="button" variant="outline" onClick={closeModal} className="w-1/2">Cancelar</Button>
                  <Button type="submit" disabled={!form.name} className="w-1/2">Guardar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}