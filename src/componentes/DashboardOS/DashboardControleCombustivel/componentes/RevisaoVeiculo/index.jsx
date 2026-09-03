import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Wrench, Droplet, CheckCircle, AlertTriangle, AlertOctagon, 
  Info, Truck, FileText, FilePlus, Globe, Search, Car 
} from 'lucide-react';
import styles from './index.module.css';
import DetalhesVeiculoModal from '../../../componentes/DetalhesVeiculoModal';
import RelatorioRevisoes from '../RelatorioRevisoes';

const RevisaoVeiculo = ({ onClose, osList }) => {
  const [veiculos, setVeiculos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('TODOS'); // 'TODOS' | 'VEICULO' | 'MAQUINA'
  const [busca, setBusca] = useState('');

  const handleGerarOS = async (veiculo, tipo) => {
    let tipoTexto = '';
    if (tipo === 'oleo') tipoTexto = 'Troca de Óleo';
    if (tipo === 'revisao') tipoTexto = 'Revisão Geral';
    if (tipo === 'ambos') tipoTexto = 'Revisão Geral e Troca de Óleo';

    const isMaq = veiculo.tipoEquipamento === 'MAQUINA' || veiculo.tipoMedicao === 'Horas' || veiculo.tipoMedicao === 'HORAS';
    const labelTipo = isMaq ? 'a máquina/trator' : 'o veículo';

    if (!window.confirm(`Deseja abrir uma Ordem de Serviço de ${tipoTexto} para ${labelTipo} ${veiculo.placa}?`)) {
      return;
    }

    try {
      const osData = {
        data: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        requisitante: 'SISTEMA FROTA',
        complexidade: 'NORMAL',
        prioridade: '1-NORMAL',
        setor: 'MECÂNICA',
        centroCusto: veiculo.placa,
        prazo: new Date().toISOString().split('T')[0],
        tipo: 'PREVENTIVA',
        situacao: 'EM_ANDAMENTO',
        descricao: `${tipoTexto} do ${isMaq ? 'Equipamento/Máquina' : 'Veículo'}: ${veiculo.placa}\nModelo: ${veiculo.modelo || '-'}\n${isMaq ? 'Horímetro' : 'KM'} Atual: ${veiculo.kmAtual || '-'}\n\nFavor preencher na OS os insumos utilizados.`,
        motivo: 'Manutenção Preventiva de Frota',
        veiculoRevisaoPlaca: veiculo.placa
      };

      const res = await fetch(`/api/os`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(osData)
      });

      if (!res.ok) throw new Error("Falha ao abrir O.S.");

      alert(`Ordem de Serviço gerada com sucesso para ${veiculo.placa}!`);
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar Ordem de Serviço.");
    }
  };

  const carregarVeiculos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/veiculos`);
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

  const calcularStatus = (kmUltimo, intervalo, kmAtual) => {
    if (!kmUltimo || !intervalo) return { id: 'nao_configurado', cor: '#cbd5e1', icone: <Info size={16}/>, texto: 'Não Configurado', pct: 0 };
    
    const proxima = Number(kmUltimo) + Number(intervalo);
    
    if (!kmAtual) {
      return { id: 'alvo', cor: '#3b82f6', icone: <Info size={16}/>, texto: `Alvo: ${proxima.toLocaleString('pt-BR')}`, pct: 0 };
    }

    const falta = proxima - Number(kmAtual);
    const proporcao = falta / Number(intervalo);
    let pct = ((Number(kmAtual) - Number(kmUltimo)) / Number(intervalo)) * 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;

    if (falta <= 0) {
      return { id: 'atrasado', cor: '#ef4444', icone: <AlertOctagon size={16}/>, texto: 'Atrasado', pct };
    } else if (proporcao <= 0.1) {
      return { id: 'atencao', cor: '#f59e0b', icone: <AlertTriangle size={16}/>, texto: 'Atenção', pct };
    } else {
      return { id: 'em_dia', cor: '#10b981', icone: <CheckCircle size={16}/>, texto: 'Em Dia', pct };
    }
  };

  const getPrioridade = (statusOleoId, statusRevisaoId) => {
    const prioridades = { 'atrasado': 1, 'atencao': 2, 'em_dia': 3, 'alvo': 4, 'nao_configurado': 5 };
    const pOleo = prioridades[statusOleoId] || 5;
    const pRev = prioridades[statusRevisaoId] || 5;
    return Math.min(pOleo, pRev);
  };

  // Filtragem e Ordenação
  const { veiculosFiltrados, countTotal, countVeiculos, countMaquinas } = useMemo(() => {
    let vCount = 0;
    let mCount = 0;

    veiculos.forEach(v => {
      const isM = v.tipoEquipamento === 'MAQUINA' || v.tipoMedicao === 'Horas' || v.tipoMedicao === 'HORAS';
      if (isM) mCount++;
      else vCount++;
    });

    const filtrados = veiculos.filter(v => {
      const isM = v.tipoEquipamento === 'MAQUINA' || v.tipoMedicao === 'Horas' || v.tipoMedicao === 'HORAS';
      if (filtroTipo === 'VEICULO' && isM) return false;
      if (filtroTipo === 'MAQUINA' && !isM) return false;

      if (busca) {
        const b = busca.trim().toUpperCase();
        const p = (v.placa || '').toUpperCase();
        const m = (v.modelo || '').toUpperCase();
        const ma = (v.marca || '').toUpperCase();
        const sub = (v.subtipoMaquina || '').toUpperCase();
        return p.includes(b) || m.includes(b) || ma.includes(b) || sub.includes(b);
      }

      return true;
    });

    const ordenados = [...filtrados].sort((a, b) => {
      const stOleoA = calcularStatus(a.kmTrocaOleo, a.intervaloTrocaOleo, a.kmAtual);
      const stRevA = calcularStatus(a.kmRevisao, a.intervaloRevisao, a.kmAtual);
      const stOleoB = calcularStatus(b.kmTrocaOleo, b.intervaloTrocaOleo, b.kmAtual);
      const stRevB = calcularStatus(b.kmRevisao, b.intervaloRevisao, b.kmAtual);

      const prioA = getPrioridade(stOleoA.id, stRevA.id);
      const prioB = getPrioridade(stOleoB.id, stRevB.id);

      if (prioA !== prioB) return prioA - prioB;
      return a.placa.localeCompare(b.placa);
    });

    return {
      veiculosFiltrados: ordenados,
      countTotal: veiculos.length,
      countVeiculos: vCount,
      countMaquinas: mCount
    };
  }, [veiculos, filtroTipo, busca]);

  return (
    <div style={{ backgroundColor: 'var(--cor-fundo-cartao)', color: 'var(--cor-texto-principal)', borderRadius: '12px', padding: '24px', border: '1px solid var(--cor-borda-cartao)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--cor-borda-cartao)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: 'var(--cor-texto-principal)', margin: 0 }}>
          <Wrench size={24} style={{ color: 'var(--cor-destaque)' }} />
          Dashboard de Revisão e Óleo (Veículos & Máquinas)
        </h2>
        <button className={styles.btnPrimary} style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => setMostrarRelatorio(true)}>
          <FileText size={18} />
          Relatório de Manutenção
        </button>
      </div>

      <div className={styles.content}>
        {/* Toolbar com Abas de Categoria e Barra de Busca */}
        <div className={styles.listToolbar}>
          <div className={styles.tabsContainer}>
            <button
              type="button"
              className={`${styles.tabButton} ${filtroTipo === 'TODOS' ? styles.active : ''}`}
              onClick={() => setFiltroTipo('TODOS')}
            >
              <Globe size={16} />
              <span>Todos</span>
              <span className={styles.tabBadge}>{countTotal}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabButton} ${filtroTipo === 'VEICULO' ? styles.active : ''}`}
              onClick={() => setFiltroTipo('VEICULO')}
            >
              <Truck size={16} />
              <span>Veículos Rodoviários</span>
              <span className={styles.tabBadge}>{countVeiculos}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabButton} ${filtroTipo === 'MAQUINA' ? styles.active : ''}`}
              onClick={() => setFiltroTipo('MAQUINA')}
            >
              <Wrench size={16} />
              <span>Máquinas & Tratores</span>
              <span className={styles.tabBadge}>{countMaquinas}</span>
            </button>
          </div>

          <div className={styles.searchContainer}>
            <Search size={16} color="var(--cor-texto-secundario)" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por placa, prefixo ou modelo..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>

        {/* Legenda de Status */}
        <div style={{ backgroundColor: 'var(--cor-fundo-sutil)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--cor-texto-secundario)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></div> Não Configurado
          </div>
        </div>

        {isLoading ? (
          <div style={{textAlign: 'center', padding: '32px', color: 'var(--cor-texto-secundario)'}}>Carregando dashboard...</div>
        ) : veiculosFiltrados.length === 0 ? (
          <div style={{textAlign: 'center', padding: '32px', color: 'var(--cor-texto-secundario)'}}>
            {busca ? 'Nenhum equipamento encontrado com a busca informada.' : 'Nenhum equipamento com metas de manutenção configuradas nesta categoria.'}
          </div>
        ) : (
          <div className={styles.veiculosCardsGrid}>
            {veiculosFiltrados.map(v => {
              const statusOleo = calcularStatus(v.kmTrocaOleo, v.intervaloTrocaOleo, v.kmAtual);
              const statusRevisao = calcularStatus(v.kmRevisao, v.intervaloRevisao, v.kmAtual);
              const prioridade = getPrioridade(statusOleo.id, statusRevisao.id);
              
              const osAberta = osList?.some(os => os.centroCusto === v.placa && os.situacao !== 'CONCLUIDO' && os.situacao !== 'CANCELADO' && os.situacao !== 'REJEITADO_DIRETORIA');
              
              let cardClass = styles.veiculoCard;
              if (prioridade === 1) cardClass += ` ${styles.atrasado}`;
              else if (prioridade === 2) cardClass += ` ${styles.atencao}`;

              const isMaq = v.tipoEquipamento === 'MAQUINA' || v.tipoMedicao === 'Horas' || v.tipoMedicao === 'HORAS';
              const unidade = isMaq ? 'h' : 'km';
              const labelMedicao = isMaq ? 'Horímetro Atual' : 'KM Atual';

              return (
                <div key={v.placa} className={cardClass}>
                  {/* Header do Card com Foto e Identificação */}
                  <div className={styles.cardHeaderInfo} onClick={() => setVeiculoSelecionado(v.placa)} style={{ cursor: 'pointer' }}>
                    {v.foto ? (
                      <img src={v.foto} alt="Foto" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--cor-borda-cartao)' }} />
                    ) : (
                      <div style={{ width: '56px', height: '56px', borderRadius: '8px', backgroundColor: 'var(--cor-fundo-secundario)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isMaq ? '#d97706' : 'var(--cor-texto-secundario)', border: '1px dashed var(--cor-borda-cartao)' }}>
                        {isMaq ? <Wrench size={24} /> : <Truck size={24} />}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.15rem' }}>{v.placa}</strong>
                        <span className={isMaq ? styles.badgeTipoMaquina : styles.badgeTipoVeiculo}>
                          {isMaq ? <><Wrench size={11} /> Máquina</> : <><Car size={11} /> Veículo</>}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>{v.modelo || v.subtipoMaquina || v.especieTipo || 'Sem Modelo'}</span>
                      {v.kmAtual && (
                        <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--cor-destaque)', marginTop: '2px' }}>
                          {labelMedicao}: {Number(v.kmAtual).toLocaleString('pt-BR')} {unidade}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Área de Óleo */}
                  <div className={styles.manutencaoSection}>
                    <div className={styles.manutencaoItem}>
                      <div className={styles.manutencaoHeader}>
                        <span className={styles.manutencaoLabel}><Droplet size={14} color="var(--cor-texto-secundario)"/> Óleo</span>
                        <span className={styles.manutencaoStatus} style={{ backgroundColor: `${statusOleo.cor}20`, color: statusOleo.cor }}>
                          {statusOleo.texto}
                        </span>
                      </div>
                      <div className={styles.progressBarContainer}>
                        <div className={styles.progressBarFill} style={{ width: `${statusOleo.pct}%`, backgroundColor: statusOleo.cor }}></div>
                      </div>
                      <div className={styles.kmInfo}>
                        <span>Última: {v.kmTrocaOleo ? `${Number(v.kmTrocaOleo).toLocaleString('pt-BR')} ${unidade}` : '--'}</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--cor-texto-principal)' }}>
                          Alvo: {v.kmTrocaOleo && v.intervaloTrocaOleo ? `${(Number(v.kmTrocaOleo) + Number(v.intervaloTrocaOleo)).toLocaleString('pt-BR')} ${unidade}` : '--'}
                        </span>
                      </div>
                    </div>

                    {/* Área de Revisão */}
                    <div className={styles.manutencaoItem}>
                      <div className={styles.manutencaoHeader}>
                        <span className={styles.manutencaoLabel}><Wrench size={14} color="var(--cor-texto-secundario)"/> Revisão</span>
                        <span className={styles.manutencaoStatus} style={{ backgroundColor: `${statusRevisao.cor}20`, color: statusRevisao.cor }}>
                          {statusRevisao.texto}
                        </span>
                      </div>
                      <div className={styles.progressBarContainer}>
                        <div className={styles.progressBarFill} style={{ width: `${statusRevisao.pct}%`, backgroundColor: statusRevisao.cor }}></div>
                      </div>
                      <div className={styles.kmInfo}>
                        <span>Última: {v.kmRevisao ? `${Number(v.kmRevisao).toLocaleString('pt-BR')} ${unidade}` : '--'}</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--cor-texto-principal)' }}>
                          Alvo: {v.kmRevisao && v.intervaloRevisao ? `${(Number(v.kmRevisao) + Number(v.intervaloRevisao)).toLocaleString('pt-BR')} ${unidade}` : '--'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer de Ações */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--cor-fundo-sutil-forte)' }}>
                    {osAberta ? (
                      <button disabled style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--cor-fundo-sutil)', color: 'var(--cor-texto-secundario)', cursor: 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <FileText size={16} /> O.S. em Andamento
                      </button>
                    ) : (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handleGerarOS(v, 'oleo'); }} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', backgroundColor: 'var(--cor-fundo-principal)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--cor-texto-principal)' }}>
                          <Droplet size={14} color="#3b82f6" /> Óleo
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleGerarOS(v, 'revisao'); }} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', backgroundColor: 'var(--cor-fundo-principal)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--cor-texto-principal)' }}>
                          <Wrench size={14} color="#f59e0b" /> Revisão
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleGerarOS(v, 'ambos'); }} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--cor-destaque)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>
                          <FilePlus size={14} /> Ambos
                        </button>
                      </>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {veiculoSelecionado && (
        <DetalhesVeiculoModal 
          placa={veiculoSelecionado} 
          osList={osList} 
          veiculosConfig={veiculos} 
          onClose={() => setVeiculoSelecionado(null)} 
        />
      )}

      {mostrarRelatorio && (
        <RelatorioRevisoes 
          veiculos={veiculos} 
          onClose={() => setMostrarRelatorio(false)} 
        />
      )}
    </div>
  );
};

export default RevisaoVeiculo;

