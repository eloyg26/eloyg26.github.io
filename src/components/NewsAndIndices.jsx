// src/components/dashboard/NewsAndIndices.jsx
import React, { useState, useEffect } from 'react';
import '../../src/NewsAndIndices.css' // Asegúrate de crear este archivo para los estilos

const NewsAndIndices = () => {
  // 1. Estados
  const [indices, setIndices] = useState([]);
  const [news, setNews] = useState([]);
  const [page, setPage] = useState(1);
  const [loadingNews, setLoadingNews] = useState(false);
  
  // Estado para el Modal
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    content: '',
    loading: false
  });

  // 2. Fetch de Índices (Se ejecuta solo una vez al montar el componente)
  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const res = await fetch('/api/indices');
        const data = await res.json();
        setIndices(data);
      } catch (err) {
        console.error('Error cargando índices', err);
      }
    };
    fetchIndices();
  }, []);

  // 3. Fetch de Noticias (Se ejecuta al inicio y cada vez que cambia la 'page')
  useEffect(() => {
    const fetchNews = async () => {
      setLoadingNews(true);
      try {
        const res = await fetch(`/api/news?page=${page}`);
        const data = await res.json();
        // Añadimos las nuevas noticias a las que ya teníamos
        setNews(prevNews => [...prevNews, ...data]);
      } catch (err) {
        console.error('Error cargando noticias:', err);
      } finally {
        setLoadingNews(false);
      }
    };
    fetchNews();
  }, [page]);

  // 4. Funciones del Modal
  const openModal = async (link, title) => {
    // Abrimos el modal en estado de carga
    setModal({
      isOpen: true,
      title: title,
      content: '',
      loading: true
    });

    // Desactivar scroll del fondo
    document.body.style.overflow = 'hidden';

    try {
      const safeUrl = encodeURIComponent(link);
      const res = await fetch(`/api/article?url=${safeUrl}`);
      const data = await res.json();
      
      setModal(prev => ({
        ...prev,
        content: data.content || '<p>No se pudo extraer el texto de este artículo.</p>',
        loading: false
      }));
    } catch (e) {
      setModal(prev => ({
        ...prev,
        content: '<p>Error de conexión al cargar la noticia.</p>',
        loading: false
      }));
    }
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: '', content: '', loading: false });
    document.body.style.overflow = 'auto'; // Restaurar scroll
  };

  // 5. Renderizado del JSX
  return (
    <div className="news-indices-section">
      
      {/* --- SECCIÓN DE ÍNDICES --- */}
      <div className="indices-container">
        {indices.map((idx, index) => {
          const isPositive = idx.changeStr.includes('+');
          return (
            <div key={index} className="index-card">
              <div className="index-name" title={idx.name}>{idx.name}</div>
              <div className="index-price">{idx.price}</div>
              <div className={`index-change ${isPositive ? 'positive' : 'negative'}`}>
                {idx.changeStr}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- SECCIÓN DE NOTICIAS --- */}
      <div className="container news-container">
        {news.map((item, index) => (
          <div 
            key={index} 
            className="card" 
            onClick={() => openModal(item.link, item.title)}
          >
            <span className="source-tag">{item.source}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <span className="read-more">Leer artículo completo</span>
          </div>
        ))}
      </div>

      {/* Botón de Cargar Más / Loader */}
      {loadingNews ? (
        <div id="loader" style={{ display: 'block', textAlign: 'center', margin: '20px' }}>
          Buscando...
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => setPage(prev => prev + 1)}>
            Cargar más
          </button>
        </div>
      )}

      {/* --- MODAL DE LECTURA --- */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={closeModal} style={{ display: 'flex' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal.title || 'Cargando...'}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {modal.loading ? (
                <div className="modal-loader">Extrayendo texto del artículo...</div>
              ) : (
                /* Usamos dangerouslySetInnerHTML porque la API devuelve HTML (<p>text</p>) */
                <div dangerouslySetInnerHTML={{ __html: modal.content }} />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NewsAndIndices;