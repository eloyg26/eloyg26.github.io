export const BROKER_DOMAINS = {
  'Trade Republic': 'traderepublic.com',
  'Interactive Brokers': 'interactivebrokers.com',
  'Binance': 'binance.com',
  'Coinbase': 'coinbase.com',
  'Revolut': 'revolut.com',
  'eToro': 'etoro.com',
  'Scalable Capital': 'scalable.capital',
  'DEGIRO': 'degiro.com',
  'MyInvestor': 'myinvestor.es',
  'XTB': 'xtb.com',
  'TradingView': 'es.tradingview.com'
}

export function getBrokerIcon(brokerName) {
  const domain = BROKER_DOMAINS[brokerName]
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}