import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, Calendar, Clock, AlertTriangle, CheckCircle, FileText, Droplet, Wrench, Fuel } from 'lucide-react';
import { ABASTECIDA } from '../../../../utils/combustivelStatus';
import styles from './index.module.css';

// Helpers para data
function formatDateBR(dateStr, timeStr = '') {
  if (!dateStr) return '-';
  const onlyDate = dateStr.split('T')[0].split(' ')[0];
  let timeExtracted = timeStr;
  
  if (!timeExtracted && dateStr.includes('T')) {
    timeExtracted = dateStr.split('T')[1].substring(0, 5);
  } else if (!timeExtracted && dateStr.includes(' ')) {
    timeExtracted = dateStr.split(' ')[1].substring(0, 5);
  }

  const parts = onlyDate.split('-');
  let fDate = dateStr;
  if (parts.length === 3) {
    fDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  
  return timeExtracted ? `${fDate} às ${timeExtracted}` : fDate;
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
  const isMaq = conf?.tipoEquipamento === 'MAQUINA' || conf?.tipoMedicao === 'Horas' || conf?.tipoMedicao === 'HORAS';
  const unidade = isMaq ? 'Horas' : 'KM';
  const labelMedicao = isMaq ? 'Horímetro Atual' : 'KM Atual';

  // Buscar Histórico de Abastecimentos
  const [historicoAbastecimentos, setHistoricoAbastecimentos] = React.useState([]);
  React.useEffect(() => {
    fetch('/api/combustivel')
      .then(res => res.json())
      .then(data => {
        const abstVeiculo = data.filter(d => {
          const statusOk = d.status === ABASTECIDA || d.status === 'CONCLUÍDO' || d.status === 'CONCLUIDO' || !d.status || d.status === 'FINALIZADO';
          
          const placaRef = placa.trim().toUpperCase();
          const matchVeiculo = d.veiculo && String(d.veiculo).toUpperCase().includes(placaRef);
          const matchPlaca = d.placa && String(d.placa).toUpperCase().includes(placaRef);
          const matchUconsu = d.uConsu && String(d.uConsu).toUpperCase().includes(placaRef);
          
          return statusOk && (matchVeiculo || matchPlaca || matchUconsu);
        });
        // Ordenar do mais recente para o mais antigo
        abstVeiculo.sort((a, b) => {
          const dateA = new Date(a.data_abastecimento || a.data_hora || a.data || 0);
          const dateB = new Date(b.data_abastecimento || b.data_hora || b.data || 0);
          return dateB - dateA;
        });
        setHistoricoAbastecimentos(abstVeiculo);
      })
      .catch(err => console.error('Erro ao buscar abastecimentos do veículo:', err));
  }, [placa]);

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

      // Adiciona também os veículos do diário de bordo (turnos)
      if (os.servicosExecutados && Array.isArray(os.servicosExecutados)) {
        os.servicosExecutados.forEach(s => {
          if (s.veiculosUtilizados && Array.isArray(s.veiculosUtilizados)) {
            veiculosDestaOS.push(...s.veiculosUtilizados);
          }
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

  // Encontrar o MAIOR KM FINAL registrado em TODA a história desse veículo (O.S. + Abastecimentos)
  const kmAtualMaximo = useMemo(() => {
    let max = 0;
    // Checar KM nas O.S.
    historicoOS.forEach(os => {
      const kmf = parseKM(os.dadosVeiculo.kmFinal);
      if (kmf > max) max = kmf;
    });
    // Checar KM nos Abastecimentos
    historicoAbastecimentos.forEach(abast => {
      const kmAbast = parseKM(abast.km || abast.km_abastecimento);
      if (kmAbast > max) max = kmAbast;
    });
    return max > 0 ? max : null;
  }, [historicoOS, historicoAbastecimentos]);

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
      } else if (diff <= (isMaq ? 25 : 500)) {
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
            {status === 'Aguardando' ? 'Aguardando O.S com Fechamento' : status}
          </div>
        </div>

        <div className={styles.manutencaoBody}>
          <div className={styles.infoCol}>
            <span className={styles.infoLabel}>Última:</span>
            <span className={styles.infoValue}>{kmTroca.toLocaleString('pt-BR')} {unidade}</span>
          </div>
          <div className={styles.infoCol}>
            <span className={styles.infoLabel}>Próxima Meta:</span>
            <span className={styles.infoValue}>{meta.toLocaleString('pt-BR')} {unidade}</span>
          </div>
          {kmAtualMaximo !== null && diff > 0 && (
            <div className={styles.infoCol} style={{ flex: '1 1 100%' }}>
              <span className={styles.infoLabel}>Faltam:</span>
              <span className={styles.infoValue} style={{ color: cor, fontSize: '1.05rem' }}>
                {diff.toLocaleString('pt-BR')} {unidade}
              </span>
            </div>
          )}
          {kmAtualMaximo !== null && diff <= 0 && (
            <div className={styles.infoCol} style={{ flex: '1 1 100%' }}>
              <span className={styles.infoLabel}>Atraso:</span>
              <span className={styles.infoValue} style={{ color: cor, fontSize: '1.05rem' }}>
                {(diff * -1).toLocaleString('pt-BR')} {unidade} vencidos
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
              <h2 className={styles.title}>Histórico do Equipamento: {placa}</h2>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                <p className={styles.subtitle} style={{ margin: 0 }}>{conf ? (conf.modelo || conf.subtipoMaquina) : 'Não configurado na frota'}</p>
                {conf && conf.kmAtual && (
                  <span className={styles.badgeNeutral} style={{ fontSize: '0.85rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {labelMedicao}: <strong style={{ color: 'var(--cor-texto-principal)' }}>{Number(conf.kmAtual).toLocaleString('pt-BR')} {unidade}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.manutencaoSection}>
            <h3 className={styles.sectionTitle}>
              <Truck size={18} /> Metas de Manutenção ({unidade})
            </h3>
            
            <div className={styles.manutencaoGrid}>
              {renderCardManutencao('oleo')}
              {renderCardManutencao('revisao')}
            </div>
          </div>

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
                    <th>Data</th>
                    <th>Código O.S.</th>
                    <th>Executor</th>
                    <th>Manutenções</th>
                    <th>Situação</th>
                    <th>{labelMedicao} Inicial</th>
                    <th>{labelMedicao} Final</th>
                    <th>{isMaq ? 'Horas Trab.' : 'KM Rodado'}</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoOS.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--cor-texto-secundario)' }}>
                        Nenhuma Ordem de Serviço encontrada para este equipamento.
                      </td>
                    </tr>
                  ) : (
                    historicoOS.map((os, idx) => {
                      const executorNome = os.executor || os.tecnicoResponsavel || os.maoDeObra?.find(m => m.nome)?.nome || os.servicosExecutados?.flatMap(s => s.maoDeObra || [])?.find(m => m.nome)?.nome || '-';
                      const isConcluida = os.situacao === 'CONCLUIDO' || os.situacao === 'CONCLUÍDO';

                      return (
                        <tr key={idx}>
                          <td>{formatDateBR(os.dataFim || os.dataInicio || os.data || os.dataCadastro) || '-'}</td>
                          <td><strong>{os.codigo}</strong></td>
                          <td>{executorNome}</td>
                          <td style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {os.dadosVeiculo.trocouOleo || os.trocouOleo ? (
                              <span className={styles.badgeNeutral} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                <Droplet size={14} style={{ flexShrink: 0 }} /> Óleo
                              </span>
                            ) : null}
                            {os.dadosVeiculo.fezRevisao || os.fezRevisao ? (
                              <span className={styles.badgeNeutral} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                <Wrench size={14} style={{ flexShrink: 0 }} /> Revisão
                              </span>
                            ) : null}
                            {(!os.dadosVeiculo.trocouOleo && !os.trocouOleo && !os.dadosVeiculo.fezRevisao && !os.fezRevisao) ? '-' : null}
                          </td>
                          <td>
                            <span className={`${styles.badge} ${isConcluida ? styles.badgeSuccess : styles.badgeNeutral}`}>
                              {os.situacao}
                            </span>
                          </td>
                          <td>{os.dadosVeiculo.kmInicial ? `${Number(os.dadosVeiculo.kmInicial).toLocaleString('pt-BR')} ${unidade}` : '-'}</td>
                          <td>{os.dadosVeiculo.kmFinal ? `${Number(os.dadosVeiculo.kmFinal).toLocaleString('pt-BR')} ${unidade}` : '-'}</td>
                          <td>{os.dadosVeiculo.km ? `${Number(os.dadosVeiculo.km).toLocaleString('pt-BR')} ${unidade}` : '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Nova Seção: Histórico de Abastecimentos */}
          <div className={styles.historicoSection} style={{ marginTop: '24px' }}>
            <h3 className={styles.sectionTitle}>
              <Fuel size={18} /> Histórico de Abastecimentos
            </h3>
            
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Motorista</th>
                    <th>Posto / Fornecedor</th>
                    <th>Combustível</th>
                    <th>Qtd. (L)</th>
                    <th>{labelMedicao}</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoAbastecimentos.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--cor-texto-secundario)' }}>
                        Nenhum abastecimento encontrado para este equipamento.
                      </td>
                    </tr>
                  ) : (
                    historicoAbastecimentos.map((abast, idx) => (
                      <tr key={idx}>
                        <td>{formatDateBR(abast.data_abastecimento || abast.data_hora || abast.data, abast.hora_abastecimento)}</td>
                        <td>{abast.motorista || abast.requisitante || '-'}</td>
                        <td>{abast.fornecedor || '-'}</td>
                        <td>{abast.combustivel || abast.tipo_combustivel || '-'}</td>
                        <td>
                          <strong>
                            {Number(abast.qtde || abast.litros || 0).toLocaleString('pt-BR')} L
                          </strong>
                        </td>
                        <td>
                          {abast.km || abast.km_abastecimento 
                            ? <span style={{ color: 'var(--cor-destaque)', fontWeight: 'bold' }}>{Number(abast.km || abast.km_abastecimento).toLocaleString('pt-BR')} {unidade}</span> 
                            : '-'}
                        </td>
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
