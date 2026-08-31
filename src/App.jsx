import React, { useEffect, useState, useRef } from 'react'
import Dashboard from './components/Dashboard'
import AssetForm from './components/AssetForm'
import AssetList from './components/AssetList'

const defaultAssets = [
  { id: 1, type: 'cash', name: 'Fondo indexado', symbol: 'VOO', quantity: 8, purchasePrice: 420, currentPrice: 458, changePercent: '+1.75%', broker: 'Trade Republic' },
  { id: 2, type: 'crypto', name: 'Bitcoin', symbol: 'BTC', quantity: 0.45, purchasePrice: 24000, currentPrice: 62800, coinId: 'bitcoin', change24h: '+2.41%', broker: 'Binance' },
  { id: 3, type: 'stocks', name: 'Apple', symbol: 'AAPL', quantity: 14, purchasePrice: 180, currentPrice: 212, changePercent: '+0.92%', broker: 'Trade Republic' }
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

  useEffect(() => { localStorage.setItem('equality_assets', JSON.stringify(assets)) }, [assets])
  useEffect(() => { localStorage.setItem('equality_history', JSON.stringify(history)) }, [history])
  useEffect(() => { localStorage.setItem('equality_theme', theme); document.documentElement.dataset.theme = theme }, [theme])

  const assetsRef = useRef(assets)
  useEffect(() => { assetsRef.current = assets }, [assets])

  // Obtener precios con TWELVE DATA (Protección de 1 minuto)
  useEffect(() => {
    async function fetchStocks() {
      const currentAssets = assetsRef.current;
      const stockAssets = currentAssets.filter(a => (a.type === 'stocks' || a.type === 'cash') && a.symbol);
      
      if (stockAssets.length === 0) return;

      // Escudo: Si hace menos de 60 segundos que actualizamos, no llamamos a la API
      const lastFetch = localStorage.getItem('equality_td_last_fetch');
      const now = Date.now();
      if (lastFetch && now - parseInt(lastFetch) < 60000) return;

      const TD_KEY = import.meta.env.VITE_TWELVEDATA_KEY;
      if (!TD_KEY) return;

      let nextAssets = [...currentAssets];
      let hasChanges = false;
      const symbols = stockAssets.map(a => a.symbol).join(',');

      try {
        const res = await fetch(`https://api.twelvedata.com/quote?symbol=${symbols}&apikey=${TD_KEY}`);
        const data = await res.json();

        // Si hay error de límite, cancelamos silenciosamente y usamos lo que ya tenemos
        if (data.status === "error") return;

        const isMultiple = stockAssets.length > 1;

        nextAssets = nextAssets.map(a => {
          const quote = isMultiple ? data[a.symbol] : (data.symbol === a.symbol ? data : null);
          
          if (quote && quote.close) {
            hasChanges = true;
            const change = parseFloat(quote.percent_change);
            return { 
              ...a, 
              currentPrice: parseFloat(quote.close), 
              changePercent: `${change > 0 ? '+' : ''}${change.toFixed(2)}%` 
            };
          }
          return a;
        });

        localStorage.setItem('equality_td_last_fetch', now.toString());
      } catch (e) {
        console.error("Error conectando con Twelve Data:", e);
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