globalThis.File = class File {}; // Parche para Node v18

const express = require('express');
const Parser = require('rss-parser');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

// Configuramos el parser para que capture todas las etiquetas posibles de descripción
const parser = new Parser({
    customFields: {
        item: ['description', 'summary', 'content']
    }
});

const fetchOptions = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Cookie': 'GUCS=1; A3=d=1; B=1;' // Intento de evasión del muro GDPR
    }
};

// --- DISEÑO DE LA INTERFAZ WEB (Modo Oscuro macOS) ---
const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title></title>
    <style>
        :root {
            --bg-color: #1c1c1e; --card-bg: #2c2c2e; --text-main: #f5f5f7;
            --text-muted: #86868b; --apple-blue: #0a84ff;
            --apple-green: #32d74b; --apple-red: #ff453a;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            background-color: var(--bg-color); color: var(--text-main); 
            padding: 40px 20px; text-align: center; -webkit-font-smoothing: antialiased;
        }
        h1 { margin-bottom: 30px; font-size: 1.8rem; font-weight: 600; }
        
        .indices-container { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; 
            margin-bottom: 40px; max-width: 1000px; margin-left: auto; margin-right: auto;
        }
        .index-card { 
            background-color: var(--card-bg); padding: 15px 15px; border-radius: 14px; 
            text-align: left; display: flex; flex-direction: column;
        }
        .index-name { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .index-price { font-size: 1.2rem; font-weight: 600; margin-bottom: 4px; }
        .index-change { font-size: 0.85rem; font-weight: 500; }
        .positive { color: var(--apple-green); }
        .negative { color: var(--apple-red); }
        
        .container { 
            max-width: 1000px; margin: 0 auto; display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; padding-bottom: 40px; 
        }
        .card { 
            background: var(--card-bg); border-radius: 16px; padding: 24px; 
            text-align: left; display: flex; flex-direction: column; 
            transition: transform 0.2s ease, background 0.2s; cursor: pointer;
        }
        .card:hover { transform: scale(1.02); background: #323234; }
        .source-tag { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; display: block; }
        .card h3 { font-size: 1.15rem; font-weight: 600; line-height: 1.3; margin-bottom: 12px; }
        .card p { font-size: 0.95rem; color: var(--text-muted); flex-grow: 1; line-height: 1.5; margin-bottom: 10px; }
        .read-more { color: var(--apple-blue); font-size: 0.95rem; font-weight: 500; margin-top: auto; display: inline-block; }
        
        button { 
            background-color: var(--card-bg); color: var(--text-main); 
            border: 1px solid #3a3a3c; padding: 12px 24px; border-radius: 20px; 
            font-size: 1rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
        }
        button:hover { background-color: #3a3a3c; border-color: #48484a; }
        #loader { display: none; margin: 20px; font-size: 1rem; color: var(--text-muted); }

        /* Modal */
        .modal-overlay {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(5px);
            z-index: 1000; justify-content: center; align-items: center; padding: 20px;
        }
        .modal-content {
            background: var(--bg-color); width: 100%; max-width: 800px; max-height: 85vh;
            border-radius: 16px; border: 1px solid #3a3a3c; display: flex; flex-direction: column;
            overflow: hidden; text-align: left; box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .modal-header { padding: 20px 30px; border-bottom: 1px solid #3a3a3c; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h2 { font-size: 1.2rem; margin-right: 15px; }
        .close-btn { background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; padding: 5px; line-height: 1; }
        .close-btn:hover { color: var(--text-main); }
        .modal-body { padding: 30px; overflow-y: auto; line-height: 1.6; font-size: 1.05rem; color: #d1d1d6; }
        .modal-body p { margin-bottom: 18px; }
        .modal-loader { text-align: center; color: var(--apple-blue); padding: 40px; font-weight: 500; }
    </style>
</head>
<body>
    <h1></h1>
    <div class="indices-container" id="indices-container"></div>
    <div class="container" id="news-container"></div>
    <div id="loader">Buscando...</div>
    <button id="load-more">Cargar más</button>

    <!-- Modal -->
    <div class="modal-overlay" id="article-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modal-title">Cargando...</h2>
                <button class="close-btn" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body" id="modal-body">
                <div class="modal-loader">Extrayendo texto del artículo...</div>
            </div>
        </div>
    </div>

    <script>
        let currentPage = 1;

        async function fetchIndices() {
            try {
                const res = await fetch('/api/indices');
                const indices = await res.json();
                const container = document.getElementById('indices-container');
                container.innerHTML = '';
                
                indices.forEach(idx => {
                    const isPositive = idx.changeStr.includes('+');
                    const changeClass = isPositive ? 'positive' : 'negative';
                    container.innerHTML += \`
                        <div class="index-card">
                            <div class="index-name" title="\${idx.name}">\${idx.name}</div>
                            <div class="index-price">\${idx.price}</div>
                            <div class="index-change \${changeClass}">\${idx.changeStr}</div>
                        </div>
                    \`;
                });
            } catch (err) { console.error('Error cargando índices'); }
        }

        async function fetchNews(page) {
            const btn = document.getElementById('load-more');
            const loader = document.getElementById('loader');
            const container = document.getElementById('news-container');
            
            btn.style.display = 'none'; loader.style.display = 'block';
            
            try {
                const res = await fetch('/api/news?page=' + page);
                const news = await res.json();
                
                news.forEach(item => {
                    const safeUrl = encodeURIComponent(item.link);
                    const safeTitle = encodeURIComponent(item.title);
                    container.innerHTML += \`
                        <div class="card" onclick="openModal('\${safeUrl}', '\${safeTitle}')">
                            <span class="source-tag">\${item.source}</span>
                            <h3>\${item.title}</h3>
                            <p>\${item.description}</p>
                            <span class="read-more">Leer artículo completo</span>
                        </div>
                    \`;
                });
                currentPage++;
            } catch (err) { console.error('Error:', err); }
            
            loader.style.display = 'none'; btn.style.display = 'inline-block';
        }

        const modal = document.getElementById('article-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        async function openModal(url, title) {
            modal.style.display = 'flex';
            modalTitle.innerText = decodeURIComponent(title);
            modalBody.innerHTML = '<div class="modal-loader">Extrayendo texto del artículo...</div>';
            document.body.style.overflow = 'hidden';

            try {
                const res = await fetch('/api/article?url=' + url);
                const data = await res.json();
                modalBody.innerHTML = data.content || '<p>No se pudo extraer el texto de este artículo.</p>';
            } catch (e) {
                modalBody.innerHTML = '<p>Error de conexión al cargar la noticia.</p>';
            }
        }

        function closeModal() { modal.style.display = 'none'; document.body.style.overflow = 'auto'; }
        modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

        fetchIndices();
        fetchNews(currentPage);
        document.getElementById('load-more').addEventListener('click', () => { fetchNews(currentPage); });
    </script>
</body>
</html>
`;

app.get('/', (req, res) => { res.send(htmlContent); });

// API DE ÍNDICES: Nuevos índices y fondos añadidos
app.get('/api/indices', async (req, res) => {
    try {
        const fetchIndex = async (ticker, name) => {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d`;
            const response = await fetch(url, fetchOptions);
            const data = await response.json();
            
            const meta = data.chart.result[0].meta;
            const price = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose;
            
            const change = price - prevClose;
            const changePercent = (change / prevClose) * 100;
            const sign = change >= 0 ? '+' : '';
            
            return {
                name,
                price: price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                changeStr: `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`
            };
        };

        const results = await Promise.all([
            fetchIndex('%5EIBEX', 'IBEX 35'),
            fetchIndex('%5EGSPC', 'S&P 500'),
            fetchIndex('%5EIXIC', 'NASDAQ'),
            fetchIndex('URTH', 'MSCI World ETF'), // Proxy oficial del MSCI World
            fetchIndex('VWCE.DE', 'Vanguard All-World'), // Fondo indexado global muy popular
            fetchIndex('FXAIX', 'Fidelity 500') // Fondo indexado al SP500 de Fidelity
        ]);
        
        res.json(results);
    } catch (error) { 
        console.error("Error en índices:", error.message);
        res.status(500).json([]); 
    }
});

// API DE NOTICIAS
app.get('/api/news', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const itemsPerPage = 3; 
  const offset = (page - 1) * itemsPerPage;
  const allNews = [];

  // 1. YAHOO
  try {
    const feed = await parser.parseURL('https://es.finance.yahoo.com/news/rss');
    const yahooItems = feed.items.slice(offset, offset + itemsPerPage);
    
    for (let item of yahooItems) {
      // INTENTO 1: Usar la descripción directa del RSS (evita bloqueos)
      let description = item.contentSnippet || item.summary || item.description || item.content || '';
      description = description.replace(/<[^>]*>?/gm, '').trim();

      // INTENTO 2: Si el RSS viene mudo, extraemos de la web filtrando los textos de cookies
      if (description.length < 30) {
          try {
              const articleResp = await fetch(item.link, fetchOptions);
              const articleHtml = await articleResp.text();
              const $art = cheerio.load(articleHtml);
              
              const scrapedDesc = $art('meta[name="description"]').attr('content') || 
                                  $art('meta[property="og:description"]').attr('content') || 
                                  $art('.caas-body p').first().text().trim();
                                  
              // Si la descripción extraída no menciona "cookies" ni temas legales, la usamos
              if (scrapedDesc && !scrapedDesc.toLowerCase().includes('cookie') && !scrapedDesc.toLowerCase().includes('privacidad')) {
                  description = scrapedDesc;
              }
          } catch (e) { }
      }
      
      allNews.push({
        source: 'Yahoo Finance', title: item.title, link: item.link,
        description: description ? description.substring(0, 140) + '...' : 'Pulsa para leer la noticia...'
      });
    }
  } catch (e) {}

  // 2. FINECT
  try {
    const response = await fetch('https://www.finect.com/temas/economia', fetchOptions);
    const html = await response.text();
    const $ = cheerio.load(html);
    const rawLinks = [];
    
    $('a').each((i, el) => {
      const title = $(el).text().replace(/\s+/g, ' ').trim();
      let link = $(el).attr('href');
      if (title.length > 35 && link && (link.includes('/articulos/') || link.includes('/noticias/'))) {
        if (link.startsWith('/')) link = 'https://www.finect.com' + link;
        if (!rawLinks.find(a => a.link === link)) rawLinks.push({ title, link });
      }
    });

    const finectItems = rawLinks.slice(offset, offset + itemsPerPage);
    for (let item of finectItems) {
      let description = '';
      try {
        const articleResp = await fetch(item.link, fetchOptions);
        const articleHtml = await articleResp.text();
        const $art = cheerio.load(articleHtml);
        description = $art('meta[name="description"]').attr('content') || 
                      $art('p').filter((i, el) => $art(el).text().trim().length > 60).first().text().trim();
      } catch (err) {}

      allNews.push({
        source: 'Finect', title: item.title, link: item.link,
        description: description ? description.substring(0, 140) + '...' : 'Pulsa para leer la noticia...'
      });
    }
  } catch (e) {}

  res.json(allNews);
});

// API MODAL (LECTURA COMPLETA)
app.get('/api/article', async (req, res) => {
    const url = req.query.url;
    try {
        const response = await fetch(url, fetchOptions);
        const html = await response.text();
        const $ = cheerio.load(html);
        let paragraphs = [];

        if (url.includes('yahoo')) {
            // Buscamos párrafos ignorando el texto legal del muro de cookies
            $('.caas-body p, article p, body p').each((i, el) => {
                const text = $(el).text().trim();
                const textLower = text.toLowerCase();
                
                if (text.length > 60 && !textLower.includes('cookie') && !textLower.includes('privacidad') && !textLower.includes('yahoo forma parte de')) {
                    paragraphs.push(`<p>${text}</p>`);
                }
            });
        } else if (url.includes('finect')) {
            $('p').each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 80 && !text.toLowerCase().includes('cookies') && !text.toLowerCase().includes('suscríbete')) {
                    paragraphs.push(`<p>${text}</p>`);
                }
            });
        }

        const content = paragraphs.join('') || '<p>Lo sentimos, no se pudo extraer el texto. Es posible que el artículo sea un vídeo o se encuentre bloqueado tras un muro de privacidad regional.</p>';
        res.json({ content });

    } catch (error) {
        res.status(500).json({ content: '<p>Error de conexión al cargar la noticia.</p>' });
    }
});

app.listen(port, () => {
  console.log(`\nServidor web activo en http://localhost:${port}\n`);
});