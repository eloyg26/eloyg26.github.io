import React, { useEffect, useState, useRef } from 'react'
import Dashboard from './components/Dashboard'
import AssetForm from './components/AssetForm'
import AssetList from './components/AssetList'
import { ThemeProvider, useTheme } from './components/ThemeProvider'

const defaultAssets = [
  { id: 1, type: 'cash', name: 'Fondo indexado', symbol: 'VOO', quantity: 8, purchasePrice: 420, currentPrice: 458, changePercent: '+1.75%', broker: 'Trade Republic' },
  { id: 2, type: 'crypto', name: 'Bitcoin', symbol: 'BTC', quantity: 0.45, purchasePrice: 24000, currentPrice: 62800, coinId: 'bitcoin', change24h: '+2.41%', broker: 'Binance' },
  { id: 3, type: 'stocks', name: 'Apple', symbol: 'AAPL', quantity: 14, purchasePrice: 180, currentPrice: 212, changePercent: '+0.92%', broker: 'Trade Republic' }
]

function AppContent({ assets, history, addAsset, updateAsset, removeAsset, resetAssets }) {
  const { theme, setTheme } = useTheme()

  return (
      <main className="container relative min-h-screen pt-12 bg-background text-foreground transition-colors duration-300">
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
            className="absolute bottom-4 left-4 rounded-md border border-border bg-card text-card-foreground p-2 text-sm font-medium hover:bg-accent transition-colors flex items-center justify-center shadow-sm"
            aria-label="Alternar tema"
          >
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            )}
          </button>
          
        <section className="panel">
          <div className="flex items-center justify-between">
            <Dashboard assets={assets} history={history} />        
          </div>
        </section>

        <section className="panel side">
          <AssetForm onAdd={addAsset} />
          <AssetList assets={assets} onUpdate={updateAsset} onDelete={removeAsset} />
        </section>
      </main>
  )
}

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

  // Removed the conflicting local state for 'theme' and its associated localStorage/dataset effects

  useEffect(() => { localStorage.setItem('equality_assets', JSON.stringify(assets)) }, [assets])
  useEffect(() => { localStorage.setItem('equality_history', JSON.stringify(history)) }, [history])

  const assetsRef = useRef(assets)
  useEffect(() => { assetsRef.current = assets }, [assets])

  useEffect(() => {
    async function fetchStocks() {
      const currentAssets = assetsRef.current;
      const stockAssets = currentAssets.filter(a => (a.type === 'stocks' || a.type === 'cash') && a.symbol);

      if (stockAssets.length === 0) return;

      const lastFetch = localStorage.getItem('equality_fh_last_fetch');
      const now = Date.now();
      if (lastFetch && now - parseInt(lastFetch) < 60000) return;

      const FH_KEY = import.meta.env.VITE_FINNHUB_KEY;
      if (!FH_KEY) {
        console.warn('VITE_FINNHUB_KEY not set — skipping price update');
        return;
      }

      let nextAssets = [...currentAssets];
      let hasChanges = false;
      const symbols = stockAssets.map(a => a.symbol);

      try {
        const responses = await Promise.all(symbols.map(s => fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(s)}&token=${FH_KEY}`)));
        const datas = await Promise.all(responses.map(r => r.ok ? r.json() : null));

        nextAssets = nextAssets.map(a => {
          const idx = symbols.indexOf(a.symbol);
          const data = datas[idx];
          if (data && (data.c || data.c === 0)) {
            hasChanges = true;
            const dp = typeof data.dp === 'number' ? data.dp : 0;
            return {
              ...a,
              currentPrice: Number(data.c),
              changePercent: `${dp > 0 ? '+' : ''}${Number(dp).toFixed(2)}%`
            };
          }
          return a;
        });

        if (hasChanges) {
          localStorage.setItem('equality_fh_last_fetch', now.toString());
          setAssets(nextAssets);
        }
      } catch (e) {
        console.error('Error conectando con Finnhub:', e);
      }
    }

    fetchStocks();
  }, []);

  function computeNetWorth(list) {
    return list.reduce((s,a) => s + (Number(a.currentPrice || 0) * Number(a.quantity || 0)), 0)
  }

  function resetAssets() {
    setAssets(defaultAssets)
    localStorage.setItem('equality_assets', JSON.stringify(defaultAssets))
    pushSnapshot(defaultAssets)
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

  useEffect(() => {
    console.debug('App assets updated:', assets.length, assets)
  }, [assets])

  return (
    <ThemeProvider defaultTheme="light" storageKey="privallet_theme">
      <AppContent 
        assets={assets} 
        history={history} 
        addAsset={addAsset} 
        updateAsset={updateAsset} 
        removeAsset={removeAsset} 
        resetAssets={resetAssets}
      />
    </ThemeProvider>
  )
}