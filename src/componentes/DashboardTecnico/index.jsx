import React, { useState, useEffect } from 'react';
import { Wrench, CheckCircle, Play, X, Plus, AlertCircle, ShieldAlert, Eye } from 'lucide-react';
import styles from './DashboardTecnico.module.css';
import FormularioServicoTecnico from './componentes/FormularioServicoTecnico';
import ModalRequisicaoPecasTecnico from './componentes/ModalRequisicaoPecasTecnico';
import ModalVisualizarOSTecnico from './componentes/ModalVisualizarOSTecnico';
import HeaderTecnico from './componentes/HeaderTecnico';
import { FILA_TECNICO, CONCLUIDO, AGUARDANDO_ALMOXARIFADO, PECAS_ENTREGUES, EM_ANDAMENTO, EMERGENCIA_CHEFE_SETOR } from '../../utils/osStatus';
import RequisicaoMobile from '../DashboardBlocoRequisicao/componentes/RequisicaoMobile';
import AcompanhamentoMobile from '../DashboardBlocoRequisicao/componentes/AcompanhamentoMobile';
import MenuTecnico from './componentes/MenuTecnico';

const DashboardTecnico = () => {
  const [minhasOS, setMinhasOS] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('minhas');
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');

  // Dados Globais
  const [produtosEstoque, setProdutosEstoque] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [veiculosConfig, setVeiculosConfig] = useState([]);

  // Modal State
  const [osEmAtendimento, setOsEmAtendimento] = useState(null);
  const [osRequisicaoPecas, setOsRequisicaoPecas] = useState(null);
  const [osVisualizar, setOsVisualizar] = useState(null);
  const [showNovaOS, setShowNovaOS] = useState(false);

  const carregarDados = async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);
    try {
      const now = Date.now();
      const safeFetchJson = async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res || !res.ok) return null;
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) return null;
          return await res.json();
        } catch {
          return null;
        }
      };

      const [ordens, produtos, fornecedoresData, veicData] = await Promise.all([
        safeFetchJson(`/api/os?_t=${now}`),
        safeFetchJson(`/api/produtos/light?_t=${now}`),
        safeFetchJson(`/api/fornecedores?_t=${now}`),
        safeFetchJson(`/api/veiculos?_t=${now}`)
      ]);

      if (Array.isArray(ordens)) {
        setMinhasOS(ordens.filter(o => o && FILA_TECNICO.includes(o.situacao)));
        setHistorico(ordens.filter(o => o && o.situacao === CONCLUIDO));
      }
      if (Array.isArray(produtos)) setProdutosEstoque(produtos);
      if (Array.isArray(fornecedoresData)) setFornecedores(fornecedoresData);
      if (Array.isArray(veicData)) setVeiculosConfig(veicData);
    } catch (err) {
      console.error('Erro ao carregar dados do técnico:', err);
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados(true);
    const interval = setInterval(() => {
      carregarDados(false);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Filtragem por busca (pesquisa por código, solicitante, setor ou descrição)
  const listaExibida = (abaAtiva === 'minhas' ? minhasOS : historico).filter(os => {
    if (!os) return false;
    if (!termoBusca || !termoBusca.trim()) return true;
    const term = termoBusca.toLowerCase();
    return (
      (os.codigo && String(os.codigo).toLowerCase().includes(term)) ||
      (os.requisitante && String(os.requisitante).toLowerCase().includes(term)) ||
      (os.setor && String(os.setor).toLowerCase().includes(term)) ||
      (os.descricao && String(os.descricao).toLowerCase().includes(term)) ||
      (os.tecnicoResponsavel && String(os.tecnicoResponsavel).toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <MenuTecnico 
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        totalMinhas={minhasOS.length}
        totalHistorico={historico.length}
      />
      <div className={styles.container} style={{ flex: 1, overflowY: 'auto' }}>
        <HeaderTecnico 
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        totalMinhas={minhasOS.length}
        totalHistorico={historico.length}
        termoBusca={termoBusca}
        setTermoBusca={setTermoBusca}
        onNovoChamado={() => setShowNovaOS(true)}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--cor-texto-secundario)' }}>
          Carregando chamados do técnico...
        </div>
      ) : abaAtiva === 'meus_pedidos' ? (
        <AcompanhamentoMobile />
      ) : listaExibida.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--cor-texto-secundario)', background: 'var(--cor-fundo-cartao)', borderRadius: '12px', border: '1px solid var(--cor-borda-cartao)' }}>
          Nenhuma O.S. encontrada para esta visualização.
        </div>
      ) : (
        <div className={styles.gridCards}>
          {listaExibida.map((os, idx) => (
            <div 
              key={`${os.id || os.codigo}-${idx}`} 
              className={styles.cardOS} 
              style={os.isEmergencia ? { border: '1px solid #ef4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' } : {}}
            >
              {os.isEmergencia && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                  <ShieldAlert size={16} /> EMERGÊNCIA - MÁQUINA PARADA
                </div>
              )}
              <div className={styles.cardHeader} style={os.isEmergencia ? { paddingTop: '12px' } : {}}>
                <span className={styles.codigoOS}>{os.codigo}</span>
                <span className={styles.situacaoBadge} style={os.isEmergencia && os.situacao === EMERGENCIA_CHEFE_SETOR ? { backgroundColor: '#ef4444', color: '#fff' } : {}}>
                  {os.situacao}
                </span>
              </div>

              {/* ALERTA DE MATERIAL PENDENTE (O.S. EM ANDAMENTO MAS PEÇA ESTÁ NO ALMOXARIFADO) */}
              {os.pecasSolicitadas?.some(p => p.status === 'AGUARDANDO_ALMOXARIFADO' || p.status === 'AGUARDANDO_CHEFE_ADICIONAL') && (
                <div style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #fde68a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> Material Adicional Pendente (Almox/Chefe)
                </div>
              )}

              <div className={styles.cardBody}>
                <p className={styles.descricao}><strong>Serviço:</strong> {os.descricao || 'Sem descrição.'}</p>
                <div className={styles.infoMeta}>
                  <span>Solicitante: <strong>{os.requisitante}</strong></span>
                  <span>Setor: <strong>{os.setor}</strong></span>
                  <span>C.Custo: <strong>{os.centroCusto || '-'}</strong></span>
                </div>
              </div>

              {abaAtiva === 'minhas' && (
                <>
                  {os.situacao === AGUARDANDO_ALMOXARIFADO ? (
                    <button className={styles.btnAtender} style={{ backgroundColor: 'var(--cor-fundo-sutil)', color: 'var(--cor-texto-secundario)', border: '1px solid var(--cor-borda-cartao)', cursor: 'not-allowed' }} disabled>
                      <Wrench size={18} /> Aguardando Peças
                    </button>
                  ) : (
                    <button className={styles.btnAtender} onClick={() => {
                      if (os.tipoManutencao === 'COM_PECA' && os.situacao !== PECAS_ENTREGUES && os.situacao !== EM_ANDAMENTO) {
                        setOsRequisicaoPecas(os);
                      } else {
                        setOsEmAtendimento(os);
                      }
                    }}>
                      <Play size={18} /> {os.tipoManutencao === 'COM_PECA' && os.situacao !== PECAS_ENTREGUES && os.situacao !== EM_ANDAMENTO ? 'Solicitar Peças' : 'Apontar & Fechar O.S.'}
                    </button>
                  )}
                </>
              )}

              {abaAtiva === 'historico' && (
                <button 
                  className={styles.btnAtender} 
                  style={{ backgroundColor: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda-cartao)' }}
                  onClick={() => setOsVisualizar(os)}
                >
                  <Eye size={18} /> Visualizar Detalhes
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DA O.S. CONCLUÍDA */}
      {osVisualizar && (
        <ModalVisualizarOSTecnico 
          os={osVisualizar} 
          onClose={() => setOsVisualizar(null)} 
        />
      )}

      {/* MODAL EXTERNO DE FECHAMENTO PELO TÉCNICO */}
      {osEmAtendimento && (
        <FormularioServicoTecnico
          os={osEmAtendimento}
          produtosEstoque={produtosEstoque}
          fornecedores={fornecedores}
          veiculosConfig={veiculosConfig}
          onClose={() => setOsEmAtendimento(null)}
          onSave={() => {
            setOsEmAtendimento(null);
            carregarDados();
          }}
          onRequestMoreParts={(osParaPedir) => {
            setOsEmAtendimento(null);
            setOsRequisicaoPecas({ ...osParaPedir, isAdicional: true });
          }}
        />
      )}

      {/* MODAL DE REQUISIÇÃO DE PEÇAS */}
      {osRequisicaoPecas && (
        <ModalRequisicaoPecasTecnico
          os={osRequisicaoPecas}
          produtosEstoque={produtosEstoque}
          onClose={() => setOsRequisicaoPecas(null)}
          onSave={() => {
            setOsRequisicaoPecas(null);
            carregarDados();
          }}
        />
      )}

      {/* MODAL NOVO CHAMADO */}
      {showNovaOS && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--cor-fundo-principal)', width: '100%', maxWidth: '500px', height: '90vh', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <button 
              onClick={() => { setShowNovaOS(false); carregarDados(); }}
              style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <RequisicaoMobile produtos={produtosEstoque} />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default DashboardTecnico;
