import React, { useEffect, useState, useRef } from 'react'
import Dashboard from './components/Dashboard'
import AssetForm from './components/AssetForm'
import AssetList from './components/AssetList'

const defaultAssets = [
  { id: 1, type: 'cash', name: 'Fondo indexado', symbol: 'VOO', quantity: 8, purchasePrice: 420, currentPrice: 458, changePercent: '+1.75%' },
  { id: 2, type: 'crypto', name: 'Bitcoin', symbol: 'BTC', quantity: 0.45, purchasePrice: 24000, currentPrice: 62800, coinId: 'bitcoin', change24h: '+2.41%' },
  { id: 3, type: 'stocks', name: 'Apple', symbol: 'AAPL', quantity: 14, purchasePrice: 180, currentPrice: 212, changePercent: '+0.92%' }
]

export default function App() {
  const [assets, setAssets] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('equality_assets') || 'null')
      if (Array.isArray(stored) && stored.length > 0) return stored
      return defaultAssets
    } catch { return defaultAssets }
  })
  const [history, setHistory] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('equality_history') || 'null')
      if (Array.isArray(stored) && stored.length > 0) return stored
      const now = new Date().toISOString().slice(0,10)
      return [{ date: now, netWorth: computeNetWorth(defaultAssets) }]
    } catch {
      const now = new Date().toISOString().slice(0,10)
      return [{ date: now, netWorth: computeNetWorth(defaultAssets) }]
    }
  })
  const [theme, setTheme] = useState(() => localStorage.getItem('equality_theme') || 'light')

  // poll interval (ms) for live prices
  const POLL_INTERVAL = 10000

  useEffect(() => { localStorage.setItem('equality_assets', JSON.stringify(assets)) }, [assets])
  useEffect(() => { localStorage.setItem('equality_history', JSON.stringify(history)) }, [history])
  useEffect(() => { localStorage.setItem('equality_theme', theme); document.documentElement.dataset.theme = theme }, [theme])

  // live price polling for crypto assets (uses ref to avoid restarting interval on every assets change)
  const assetsRef = useRef(assets)
  useEffect(() => { assetsRef.current = assets }, [assets])

  // Obtener precios de acciones (Alpha Vantage) una sola vez al cargar la app

  useEffect(() => {
    async function fetchStocks() {
      const currentAssets = assetsRef.current;
      const stockAssets = currentAssets.filter(a => (a.type === 'stocks' || a.type === 'cash') && a.symbol);
      if (stockAssets.length === 0) return;

      const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY;
      if (!FINNHUB_KEY) return;

      let nextAssets = [...currentAssets];
      let hasChanges = false;

      for (const asset of stockAssets) {
        try {
          const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${asset.symbol}&token=${FINNHUB_KEY}`);
          const data = await res.json();

          if (data && data.c > 0) {
            nextAssets = nextAssets.map(a => 
              a.id === asset.id 
                ? { 
                    ...a, 
                    currentPrice: data.c, 
                    changePercent: data.dp ? `${data.dp > 0 ? '+' : ''}${data.dp.toFixed(2)}%` : a.changePercent 
                  } 
                : a
            );
            hasChanges = true;
          }
          // Pequeña pausa de medio segundo para no saturar
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          console.error(`Error conectando con Finnhub:`, e);
        }
      }
      if (hasChanges) setAssets(nextAssets);
    }
    fetchStocks();
  }, []);

  function computeNetWorth(list) {
    return list.reduce((s,a) => s + (Number(a.currentPrice || 0) * Number(a.quantity || 0)), 0)
  }

  function addAsset(asset) {
    const id = Date.now()
    const next = [...assets, { ...asset, id }]
    setAssets(next)
    pushSnapshot(next)
  }

  function updateAsset(id, patch) {
    const next = assets.map(a => a.id === id ? { ...a, ...patch } : a)
    setAssets(next)
    pushSnapshot(next)
  }

  function removeAsset(id) {
    const next = assets.filter(a => a.id !== id)
    setAssets(next)
    pushSnapshot(next)
  }

  function pushSnapshot(list) {
    const now = new Date().toISOString().slice(0,10)
    const net = computeNetWorth(list)
    setHistory(h => [...h, { date: now, netWorth: net }].slice(-60))
  }

  return (
    <div className="app-shell">
      {/*
      <header className="topbar">
        <h1>Equality</h1>
        <div className="actions">
          <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="rounded-md border px-3 py-2 text-sm" style={{backgroundColor:'var(--card)'}}>
            Modo {theme === 'light' ? 'Oscuro' : 'Claro'}
          </button>
        </div>
      </header>
      */}
      <main className="container">
        <section className="panel">
          <Dashboard assets={assets} history={history} theme={theme} />        
        </section>

        <section className="panel side">
          <AssetForm onAdd={addAsset} />
          <AssetList assets={assets} onUpdate={updateAsset} onDelete={removeAsset} />
        </section>
      </main>
    </div>
  )
}
