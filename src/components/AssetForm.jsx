import React, { useState, useEffect, useRef } from 'react'

const empty = { name: '', symbol: '', type: 'cash', quantity: '', purchasePrice: '', currentPrice: '' }

export default function AssetForm({ onAdd }) {
  const [form, setForm] = useState(empty)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggests, setSuggests] = useState([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('') 
  const mounted = useRef(true)

  useEffect(() => () => { mounted.current = false }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  function handleTypeChange(e) {
    setForm({ ...empty, type: e.target.value })
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

      // Búsqueda Cripto (CoinGecko)
      if (form.type === 'crypto') {
        try {
          const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(term)}`)
          const data = await res.json()
          if (mounted.current) setSuggests(data.coins || [])
        } catch (e) {
          if (mounted.current) setApiError('Error conectando con CoinGecko.')
        } finally {
          if (mounted.current) setLoading(false)
        }
      } 
      // Búsqueda Acciones/Fondos (FINNHUB)
      else if (form.type === 'cash' || form.type === 'stocks') {
        try {
          const key = import.meta.env.VITE_FINNHUB_KEY;
          if (!key) {
            if (mounted.current) setApiError('Falta VITE_FINNHUB_KEY en tu .env');
            setLoading(false);
            return;
          }

          const res = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(term)}&token=${key}`)
          const data = await res.json()

          // Finnhub devuelve los resultados en un array llamado 'result'
          if (data.result && data.result.length > 0) {
            if (mounted.current) {
              setSuggests(data.result.map(item => ({
                symbol: item.symbol,
                name: item.description,
                region: item.type
              })));
            }
          } else {
            if (mounted.current) setApiError('No se encontraron resultados.');
            setSuggests([]);
          }
        } catch (e) {
          if (mounted.current) setApiError('Error de red al conectar con Finnhub.')
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

  // Búsqueda del precio individual con FINNHUB
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
      const data = await res.json()

      // Finnhub devuelve el precio actual en la propiedad 'c'
      if (data && data.c) {
        setForm(f => ({
          ...f,
          currentPrice: Number(data.c || 0)
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
    setForm(empty)
    setSearchQuery('')
    setSuggests([])
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground p-6 space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">Agregar activo</h3>
      
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Tipo de activo</label>
          <select 
            name="type" 
            value={form.type} 
            onChange={handleTypeChange} 
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="cash">Efectivo / Fondos ETFs</option>
            <option value="stocks">Acciones</option>
            <option value="crypto">Criptomonedas</option>
          </select>
        </div>

        <div className="space-y-2 relative">
          <label className="text-sm font-medium text-muted-foreground">Buscar Activo</label>
          <input 
            type="text"
            placeholder={form.type === 'crypto' ? "Ej: Bitcoin, ETH..." : "Ej: VOO, Apple..."}
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />

          {loading && <div className="text-xs text-muted-foreground pt-1">Buscando...</div>}
          
          {apiError && <div className="text-xs text-red-500 pt-1 font-medium">{apiError}</div>}

          {suggests.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-56 overflow-auto py-1">
              {form.type === 'crypto' ? (
                suggests.slice(0, 6).map(c => (
                  <li 
                    key={c.id} 
                    onClick={() => pickCoin(c)} 
                    className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                  >
                    {c.thumb && <img src={c.thumb} alt="" className="w-5 h-5 rounded-full" />}
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.symbol?.toUpperCase()}</div>
                    </div>
                  </li>
                ))
              ) : (
                suggests.slice(0, 6).map(c => (
                  <li 
                    key={c.symbol} 
                    onClick={() => pickStockOrFund(c)} 
                    className="px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.symbol} {c.region ? `• ${c.region}` : ''}</div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Nombre</label>
          <input 
            name="name" 
            value={form.name} 
            readOnly
            className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-70 cursor-not-allowed"
            placeholder="Se autocompleta al buscar..."
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
            <input 
              name="quantity" 
              type="number" 
              step="any"
              value={form.quantity} 
              onChange={onChange} 
              required
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">P. Compra</label>
            <input 
              name="purchasePrice" 
              type="number" 
              step="any"
              value={form.purchasePrice} 
              onChange={onChange} 
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">P. Actual</label>
            <input 
              name="currentPrice" 
              type="number" 
              step="any"
              value={form.currentPrice} 
              onChange={onChange} 
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={!form.name}
          className="w-full bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 rounded-md py-2 text-sm font-medium transition-colors"
        >
          Añadir Activo
        </button>
      </form>
    </div>
  )
}