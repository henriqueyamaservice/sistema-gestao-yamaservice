import React, { useState, useEffect } from 'react';
import { X, Wrench, Droplet, CheckCircle, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import styles from './index.module.css';
import DetalhesVeiculoModal from '../../../componentes/DetalhesVeiculoModal';

const RevisaoVeiculo = ({ onClose, osList }) => {
  const [veiculos, setVeiculos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);

  const carregarVeiculos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/veiculos');
      const data = await res.json();
      // Filtrar veículos que tenham configuração de revisão ou óleo
      const veiculosConfigurados = data.filter(v => v.intervaloRevisao > 0 || v.intervaloTrocaOleo > 0);
      setVeiculos(veiculosConfigurados);
    } catch (error) {
      console.error("Erro ao buscar veículos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarVeiculos();
  }, []);

  // Função para calcular status (Simulado com base em KM Atual se existir)
  // Como o sistema ainda não rastreia o kmAtual globalmente em tempo real para todos, 
  // mostramos o alvo. Se v.kmAtual existir no futuro, o status será calculado.
  const calcularStatus = (kmUltimo, intervalo, kmAtual) => {
    if (!kmUltimo || !intervalo) return { cor: '#cbd5e1', icone: <Info size={16}/>, texto: 'Não Configurado' };
    
    const proxima = Number(kmUltimo) + Number(intervalo);
    
    if (!kmAtual) {
      return { cor: '#3b82f6', icone: <Info size={16}/>, texto: `Alvo: ${proxima.toLocaleString('pt-BR')}` };
    }

    const falta = proxima - Number(kmAtual);
    const proporcao = falta / Number(intervalo);

    if (falta <= 0) {
      return { cor: '#ef4444', icone: <AlertOctagon size={16}/>, texto: 'Atrasado' };
    } else if (proporcao <= 0.1) {
      return { cor: '#f59e0b', icone: <AlertTriangle size={16}/>, texto: 'Atenção (Próximo)' };
    } else {
      return { cor: '#10b981', icone: <CheckCircle size={16}/>, texto: 'Em Dia' };
    }
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <h2 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: 'var(--cor-texto-principal)' }}>
          <Wrench size={24} style={{ color: 'var(--cor-primaria)' }} />
          Dashboard de Revisão e Óleo
        </h2>
      </div>

      <div className={styles.content}>
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--cor-texto-secundario)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></div> Em Dia
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--cor-texto-secundario)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div> Atenção (Próximo)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--cor-texto-secundario)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div> Atrasado
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--cor-texto-secundario)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></div> Monitorando Alvo
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Placa / Modelo</th>
                  <th>Status Óleo</th>
                  <th>Próxima Troca Óleo</th>
                  <th>Status Revisão</th>
                  <th>Próxima Revisão</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="5" style={{textAlign: 'center', padding: '32px'}}>Carregando dashboard...</td></tr>
                ) : veiculos.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign: 'center', padding: '32px', color: '#64748b'}}>Nenhum veículo com metas de manutenção configuradas.</td></tr>
                ) : (
                  veiculos.map(v => {
                    const statusOleo = calcularStatus(v.kmTrocaOleo, v.intervaloTrocaOleo, v.kmAtual);
                    const statusRevisao = calcularStatus(v.kmRevisao, v.intervaloRevisao, v.kmAtual);
                    
                    return (
                      <tr 
                        key={v.placa} 
                        onClick={() => setVeiculoSelecionado(v.placa)}
                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                        className={styles.rowHover}
                      >
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <strong style={{ fontSize: '1rem' }}>{v.placa}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)' }}>{v.modelo || v.especieTipo || '-'}</span>
                          </div>
                        </td>
                        
                        {/* Óleo */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusOleo.cor, fontWeight: '600', fontSize: '0.85rem' }}>
                            {statusOleo.icone}
                            {statusOleo.texto}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--cor-texto-principal)', fontSize: '0.9rem' }}>
                              {(Number(v.kmTrocaOleo) + Number(v.intervaloTrocaOleo)).toLocaleString('pt-BR')} KM
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--cor-texto-secundario)' }}>
                              Última: {Number(v.kmTrocaOleo).toLocaleString('pt-BR')} KM
                            </span>
                          </div>
                        </td>

                        {/* Revisão */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusRevisao.cor, fontWeight: '600', fontSize: '0.85rem' }}>
                            {statusRevisao.icone}
                            {statusRevisao.texto}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--cor-texto-principal)', fontSize: '0.9rem' }}>
                              {(Number(v.kmRevisao) + Number(v.intervaloRevisao)).toLocaleString('pt-BR')} KM
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--cor-texto-secundario)' }}>
                              Última: {Number(v.kmRevisao).toLocaleString('pt-BR')} KM
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      </div>
      
      {veiculoSelecionado && (
        <DetalhesVeiculoModal 
          placa={veiculoSelecionado} 
          osList={osList} 
          veiculosConfig={veiculos} 
          onClose={() => setVeiculoSelecionado(null)} 
        />
      )}
    </div>
  );
};

export default RevisaoVeiculo;
