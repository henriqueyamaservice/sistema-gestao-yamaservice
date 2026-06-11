import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, Calendar, Clock, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import styles from './index.module.css';

// Helpers para data
function formatDateBR(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

// Helpers numéricos
function parseKM(kmString) {
  if (!kmString) return 0;
  const val = parseFloat(String(kmString).replace(',', '.'));
  return isNaN(val) ? 0 : val;
}

const DetalhesVeiculoModal = ({ placa, osList, veiculosConfig, onClose }) => {

  // Encontra a configuração do veículo
  const conf = veiculosConfig?.find(v => v.placa === placa);

  // Filtra as O.S. que esse veículo participou
  const historicoOS = useMemo(() => {
    if (!osList) return [];

    const osDoVeiculo = [];

    osList.forEach(os => {
      // Extrai os veículos da O.S.
      const veiculosDestaOS = [];
      if (os.veiculos && os.veiculos.length > 0) {
        veiculosDestaOS.push(...os.veiculos);
      } else if (os.usouVeiculo === 'Sim' && os.placaVeiculo) {
        veiculosDestaOS.push({ 
          placa: os.placaVeiculo, 
          km: os.kmRodado, 
          kmInicial: os.kmInicial, 
          kmFinal: os.kmFinal 
        });
      }

      // Verifica se a placa procurada está nesta O.S.
      const veiculoNaOS = veiculosDestaOS.find(v => v.placa && v.placa.trim().toUpperCase() === placa);
      
      if (veiculoNaOS) {
        osDoVeiculo.push({
          ...os,
          dadosVeiculo: veiculoNaOS // Anexa os KMs específicos deste veículo na O.S.
        });
      }
    });

    // Ordena da O.S. mais recente (pela data de início ou data do cadastro) para a mais antiga
    return osDoVeiculo.sort((a, b) => {
      const dateA = new Date(a.dataFim || a.dataInicio || a.dataCadastro || 0);
      const dateB = new Date(b.dataFim || b.dataInicio || b.dataCadastro || 0);
      return dateB - dateA; // Descendente
    });

  }, [osList, placa]);

  // Encontrar o MAIOR KM FINAL registrado em TODA a história desse veículo (para cruzar com a meta)
  const kmAtualMaximo = useMemo(() => {
    let max = 0;
    historicoOS.forEach(os => {
      const kmf = parseKM(os.dadosVeiculo.kmFinal);
      if (kmf > max) max = kmf;
    });
    return max > 0 ? max : null;
  }, [historicoOS]);

  // Função para renderizar os cards de manutenção
  const renderCardManutencao = (tipo) => {
    if (!conf) return null;

    const kmTroca = Number(tipo === 'oleo' ? conf.kmTrocaOleo : conf.kmRevisao) || 0;
    const intervalo = Number(tipo === 'oleo' ? conf.intervaloTrocaOleo : conf.intervaloRevisao) || 0;
    const meta = kmTroca + intervalo;

    let status = 'Aguardando';
    let cor = '#3b82f6';
    let icone = <Clock size={20} />;
    let diff = 0;

    if (kmAtualMaximo !== null) {
      diff = meta - kmAtualMaximo;
      if (diff <= 0) {
        status = 'Vencida';
        cor = '#ef4444';
        icone = <AlertTriangle size={20} />;
      } else if (diff <= 500) {
        status = 'Atenção';
        cor = '#f59e0b';
        icone = <AlertTriangle size={20} />;
      } else {
        status = 'Ok';
        cor = '#10b981';
        icone = <CheckCircle size={20} />;
      }
    }

    return (
      <div className={styles.manutencaoCard} style={{ borderLeft: `4px solid ${cor}` }}>
        <div className={styles.manutencaoHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: cor }}>
            {icone}
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>
              {tipo === 'oleo' ? 'Troca de Óleo' : 'Revisão Geral'}
            </h4>
          </div>
          <div className={styles.statusBadge} style={{ backgroundColor: `${cor}15`, color: cor }}>
            {status === 'Aguardando' ? 'Aguardando O.S com KM Final' : status}
          </div>
        </div>

        <div className={styles.manutencaoBody}>
          <div className={styles.infoCol}>
            <span className={styles.infoLabel}>Última Troca:</span>
            <span className={styles.infoValue}>{kmTroca.toLocaleString('pt-BR')} KM</span>
          </div>
          <div className={styles.infoCol}>
            <span className={styles.infoLabel}>Próxima Meta:</span>
            <span className={styles.infoValue}>{meta.toLocaleString('pt-BR')} KM</span>
          </div>
          {kmAtualMaximo !== null && diff > 0 && (
            <div className={styles.infoCol} style={{ flex: '1 1 100%' }}>
              <span className={styles.infoLabel}>Faltam:</span>
              <span className={styles.infoValue} style={{ color: cor, fontSize: '1.05rem' }}>
                {diff.toLocaleString('pt-BR')} KM
              </span>
            </div>
          )}
          {kmAtualMaximo !== null && diff <= 0 && (
            <div className={styles.infoCol} style={{ flex: '1 1 100%' }}>
              <span className={styles.infoLabel}>Atraso:</span>
              <span className={styles.infoValue} style={{ color: cor, fontSize: '1.05rem' }}>
                {(diff * -1).toLocaleString('pt-BR')} KM vencidos
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modalCard} ${styles.animateFadeIn}`} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className={styles.closeButton}>
          <X size={24} />
        </button>

        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.iconWrapper}>
              <Truck size={24} />
            </div>
            <div>
              <h2 className={styles.title}>Histórico do Veículo: {placa}</h2>
              <p className={styles.subtitle}>{conf ? conf.modelo : 'Veículo não configurado na frota'}</p>
            </div>
          </div>
        </div>

        <div className={styles.content}>
          {conf && (
            <div className={styles.manutencaoContainer}>
              {renderCardManutencao('oleo')}
              {renderCardManutencao('revisao')}
            </div>
          )}

          {!conf && (
            <div className={styles.alertNotConfigured}>
              <AlertTriangle size={20} />
              <span>Este veículo ainda não foi configurado. Configure-o para habilitar os alertas de manutenção.</span>
            </div>
          )}

          <div className={styles.historicoSection}>
            <h3 className={styles.sectionTitle}>
              <FileText size={18} /> Histórico de Serviços (O.S.)
            </h3>
            
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data Fim</th>
                    <th>Código O.S.</th>
                    <th>Executor</th>
                    <th>Situação</th>
                    <th>KM Inicial</th>
                    <th>KM Final</th>
                    <th>KM Rodado</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoOS.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--cor-texto-secundario)' }}>
                        Nenhuma Ordem de Serviço encontrada para este veículo.
                      </td>
                    </tr>
                  ) : (
                    historicoOS.map((os, idx) => (
                      <tr key={idx}>
                        <td>{formatDateBR(os.dataFim) || '-'}</td>
                        <td><strong>{os.codigo}</strong></td>
                        <td>{os.executor || '-'}</td>
                        <td>
                          <span className={`${styles.badge} ${os.situacao === 'CONCLUÍDO' ? styles.badgeSuccess : styles.badgeNeutral}`}>
                            {os.situacao}
                          </span>
                        </td>
                        <td>{os.dadosVeiculo.kmInicial ? Number(os.dadosVeiculo.kmInicial).toLocaleString('pt-BR') : '-'}</td>
                        <td>{os.dadosVeiculo.kmFinal ? Number(os.dadosVeiculo.kmFinal).toLocaleString('pt-BR') : '-'}</td>
                        <td>{os.dadosVeiculo.km ? Number(os.dadosVeiculo.km).toLocaleString('pt-BR') : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DetalhesVeiculoModal;
