import React, { useState, useEffect, useRef } from 'react';
import { Truck, CheckCircle2, Bot, ArrowRight, Download, FileCheck, UploadCloud } from 'lucide-react';
import styles from './AguardandoNFe.module.css';

const AguardandoNFe = () => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileInputRefs = useRef({});

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    try {
      const response = await fetch('/api/requisicoes');
      const data = await response.json();
      
      // Filtrar requisições
      const requisicoesFiltradas = data.filter(r => r.status_compras === 'aguardando_nfe');
      
      setRequisicoes(requisicoesFiltradas);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setLoading(false);
    }
  };

  const handleSimularRobo = async (reqId) => {
    try {
      // Avança a etapa para concluído (NF-e recebida) para cair no Entrada de Estoque
      const response = await fetch(`/api/requisicoes/${reqId}/avancar-etapa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novoStatus: 'concluido' })
      });
      
      if (!response.ok) throw new Error('Erro ao avançar requisição');
      
      alert('Robô da SEFAZ processou a NF-e com sucesso! A requisição foi enviada para a tela de Entrada no Estoque.');
      fetchDados(); // Atualiza a tela
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao simular o Robô.');
    }
  };

  const handleUploadXml = async (e, reqId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      alert('Por favor, selecione um arquivo .xml válido.');
      return;
    }

    try {
      // Simula o processamento do XML manual
      const response = await fetch(`/api/requisicoes/${reqId}/avancar-etapa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novoStatus: 'concluido' })
      });
      
      if (!response.ok) throw new Error('Erro ao avançar requisição');
      
      alert(`Arquivo ${file.name} processado com sucesso! A requisição foi enviada para Entrada no Estoque.`);
      fetchDados();
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao ler o arquivo XML.');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Buscando entregas pendentes de faturamento...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconHighlight}>
            <Truck size={28} />
          </div>
          <div>
            <h2>Acompanhamento de Entregas (Aguardando NF-e)</h2>
            <p>Pedidos fechados aguardando o Fornecedor faturar a nota e a mercadoria chegar.</p>
          </div>
        </div>
      </header>
      
      {requisicoes.length === 0 ? (
        <div className={styles.empty}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
          <h3>Nenhuma entrega pendente</h3>
          <p>Todos os pedidos fechados já tiveram suas notas fiscais capturadas.</p>
        </div>
      ) : (
        <div className={styles.lista}>
          {requisicoes.map(req => (
            <div key={req.id} className={styles.card}>
              <div className={styles.cardInfo}>
                <div className={styles.idBox}>
                  <span className={styles.label}>Requisição</span>
                  <span className={styles.value}>#{req.id.split('-')[0]}</span>
                </div>
                <div className={styles.detalhe}>
                  <span className={styles.label}>Projeto/Obra</span>
                  <span className={styles.value}>{req.projeto || 'Almoxarifado'}</span>
                </div>
                <div className={styles.detalhe}>
                  <span className={styles.label}>Última Atualização</span>
                  <span className={styles.value}>
                    {new Date(
                      req.historico_status?.find(h => h.status === 'aguardando_nfe')?.data || req.dataCriacao
                    ).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className={`${styles.robotStatus} ${styles.pulse}`}>
                  <Bot size={18} /> Robô SEFAZ escutando...
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className={styles.btnSimularRobo} 
                    onClick={() => handleSimularRobo(req.id)}
                    title="Simula que a NF-e foi emitida e lida pelo Robô, empurrando a Req. para o Estoque"
                  >
                    <FileCheck size={18} /> Simular Leitura XML <ArrowRight size={16} />
                  </button>

                  <input 
                    type="file" 
                    accept=".xml" 
                    style={{ display: 'none' }} 
                    ref={el => fileInputRefs.current[req.id] = el}
                    onChange={(e) => handleUploadXml(e, req.id)}
                  />
                  
                  <button 
                    className={styles.btnSimularRobo} 
                    style={{ background: '#3b82f6', color: 'white', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)' }}
                    onClick={() => fileInputRefs.current[req.id].click()}
                    title="Fazer upload manual do XML fornecido pelo vendedor"
                  >
                    <UploadCloud size={18} /> Carregar XML Manual
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AguardandoNFe;
