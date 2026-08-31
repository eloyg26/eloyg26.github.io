import React, { useState, useEffect, useRef } from 'react'
import { getBrokerIcon } from '../utils/brokers'

const BROKERS = [
  'Trade Republic', 'Interactive Brokers', 'Binance', 'Coinbase', 
  'Revolut', 'eToro', 'Scalable Capital', 'DEGIRO', 'MyInvestor', 'Otro'
]

const empty = { name: '', symbol: '', type: 'cash', quantity: '', purchasePrice: '', currentPrice: '', broker: 'Trade Republic' }

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
          const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(term)}`)
          const data = await res.json()
          if (mounted.current) setSuggests(data.coins || [])
        } catch (e) {
          if (mounted.current) setApiError('Error conectando con CoinGecko.')
        } finally {
          if (mounted.current) setLoading(false)
        }
      } 
      else if (form.type === 'cash' || form.type === 'stocks') {
        try {
          // Buscador público de Twelve Data (No gasta créditos)
          const res = await fetch(`https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(term)}`)
          const data = await res.json()

          if (data.data && data.data.length > 0) {
            if (mounted.current) {
              setSuggests(data.data.map(item => ({
                symbol: item.symbol,
                name: item.instrument_name,
                region: item.exchange
              })));
            }
          } else {
            if (mounted.current) setApiError('No se encontraron resultados.');
            setSuggests([]);
          }
        } catch (e) {
          if (mounted.current) setApiError('Error de red al conectar con Twelve Data.')
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
      const key = import.meta.env.VITE_TWELVEDATA_KEY
      if (!key) {
        setApiError('Falta tu VITE_TWELVEDATA_KEY en el .env');
        return;
      }
      
      const res = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${key}`)
      const data = await res.json()

      if (data && data.close) {
        setForm(f => ({
          ...f,
          currentPrice: Number(data.close || 0)
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
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-3 px-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        <span>Añadir nueva inversión</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold tracking-tight">Agregar activo</h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">✕</button>
            </div>
            
            <form onSubmit={submit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de activo</label>
                <select name="type" value={form.type} onChange={handleTypeChange} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="cash">Efectivo / Fondos ETFs</option>
                  <option value="stocks">Acciones</option>
                  <option value="crypto">Criptomonedas</option>
                </select>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Buscar Activo</label>
                <input type="text" placeholder={form.type === 'crypto' ? "Ej: Bitcoin..." : "Ej: VOO, Apple..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />

                {loading && <div className="text-xs text-muted-foreground pt-1">Buscando...</div>}
                {apiError && <div className="text-xs text-red-500 pt-1 font-medium">{apiError}</div>}

                {suggests.length > 0 && (
                  <ul className="absolute z-20 w-full mt-1 bg-background border border-border rounded-xl shadow-xl max-h-52 overflow-auto py-1">
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
                <input name="name" value={form.name} readOnly className="w-full rounded-xl border border-input bg-muted px-3 py-2 text-sm font-medium opacity-80 cursor-not-allowed" placeholder="Selecciona un activo arriba..." />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Broker / Plataforma</label>
                <div className="relative flex items-center">
                  {getBrokerIcon(form.broker) && (
                    <img src={getBrokerIcon(form.broker)} alt="" className="absolute left-3 w-4 h-4 rounded-full pointer-events-none" onError={(e) => { e.target.style.display = 'none' }} />
                  )}
                  <select name="broker" value={form.broker} onChange={onChange} className={`w-full rounded-xl border border-input bg-background py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none ${getBrokerIcon(form.broker) ? 'pl-9 pr-3' : 'px-3'}`}>
                    {BROKERS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Cantidad</label>
                  <input name="quantity" type="number" step="any" value={form.quantity} onChange={onChange} required placeholder="0" className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-sm font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">P. Compra</label>
                  <input name="purchasePrice" type="number" step="any" value={form.purchasePrice} onChange={onChange} placeholder="0.00" className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-sm font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">P. Actual</label>
                  <input name="currentPrice" type="number" step="any" value={form.currentPrice} onChange={onChange} placeholder="0.00" className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-sm font-mono" />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button type="button" onClick={closeModal} className="w-1/2 border border-input hover:bg-accent rounded-xl py-2.5 text-sm font-medium transition-colors">Cancelar</button>
                <button type="submit" disabled={!form.name} className="w-1/2 bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 rounded-xl py-2.5 text-sm font-medium transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}