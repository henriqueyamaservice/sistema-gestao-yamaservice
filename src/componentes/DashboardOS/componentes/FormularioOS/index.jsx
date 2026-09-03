import React, { useState, useEffect } from 'react';
import { FileText, Save, Clock, AlertCircle, Wrench, Calendar, X, Trash2 } from 'lucide-react';
import styles from './index.module.css';
import { EM_ANDAMENTO } from '../../../../utils/osStatus';

const FormularioOS = ({ onAddOS, osList, onClose }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    data: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    requisitante: '',
    complexidade: 'NORMAL',
    prioridade: '1-NORMAL',
    setor: '',
    centroCusto: '',
    prazo: '',
    tipo: 'CORRETIVA',
    situacao: EM_ANDAMENTO,
    descricao: '',
    motivo: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [servicosPadraoList, setServicosPadraoList] = useState({});
  const [mostrarAddServicoPadrao, setMostrarAddServicoPadrao] = useState(false);
  const [novoServicoPadrao, setNovoServicoPadrao] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [reqDropdownAberto, setReqDropdownAberto] = useState(false);
  const [modoExclusao, setModoExclusao] = useState(false);
  const [veiculos, setVeiculos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [requisitantesList, setRequisitantesList] = useState([]);
  const [fornecedoresList, setFornecedoresList] = useState([]);

  // Modal Novo Requisitante
  const [showAddReqModal, setShowAddReqModal] = useState(false);
  const [novoReqFuncionario, setNovoReqFuncionario] = useState('');
  const [novoReqApelido, setNovoReqApelido] = useState('');

  // Busca requisitantes
  useEffect(() => {
    fetch(`/api/requisitantes`)
      .then(res => res.json())
      .then(data => setRequisitantesList(data))
      .catch(err => console.error('Erro ao buscar requisitantes:', err));
  }, []);

  // Busca fornecedores/funcionários da Omie
  useEffect(() => {
    fetch(`/api/fornecedores`)
      .then(res => res.json())
      .then(data => setFornecedoresList(data))
      .catch(err => console.error('Erro ao buscar fornecedores:', err));
  }, []);

  const handleOpenAddRequisitante = () => {
    setShowAddReqModal(true);
    setNovoReqFuncionario('');
    setNovoReqApelido('');
  };

  const handleSalvarNovoRequisitante = async () => {
    if (!novoReqApelido || !novoReqApelido.trim()) {
      alert("Por favor, digite o Apelido do Requisitante.");
      return;
    }

    try {
      const response = await fetch(`/api/requisitantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoReqApelido.trim() })
      });
      if (response.ok) {
        const { nome: novoNome } = await response.json();
        setRequisitantesList(prev => {
          if (!prev.includes(novoNome)) return [...prev, novoNome];
          return prev;
        });
        setFormData(prev => ({ ...prev, requisitante: novoNome }));
        setShowAddReqModal(false);
      } else {
        alert('Erro ao salvar requisitante.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro na comunicação com o servidor.');
    }
  };

  const handleExcluirRequisitanteNaLista = async (nomeParaExcluir) => {
    if (!window.confirm(`Tem certeza que deseja apagar o requisitante "${nomeParaExcluir}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/requisitantes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeParaExcluir })
      });
      if (response.ok) {
        setRequisitantesList(prev => prev.filter(r => r !== nomeParaExcluir));
        if (formData.requisitante === nomeParaExcluir) {
          setFormData(prev => ({ ...prev, requisitante: '' }));
        }
      } else {
        alert('Erro ao apagar requisitante.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro na comunicação com o servidor.');
    }
  };

  // Busca veículos para o datalist
  useEffect(() => {
    fetch(`/api/veiculos`)
      .then(res => res.json())
      .then(data => setVeiculos(data))
      .catch(err => console.error('Erro ao buscar veículos:', err));
  }, []);

  // Busca departamentos para o datalist
  useEffect(() => {
    fetch(`/api/departamentos`)
      .then(res => res.json())
      .then(data => setDepartamentos(data))
      .catch(err => console.error('Erro ao buscar departamentos:', err));
  }, []);

  // Busca serviços padrão do backend
  useEffect(() => {
    fetch(`/api/servicos-padrao`)
      .then(res => res.json())
      .then(data => setServicosPadraoList(data))
      .catch(err => console.error('Erro ao buscar serviços padrão:', err));
  }, []);

  // O cálculo do próximo código foi removido do front-end.
  // O servidor (back-end) irá gerar o código automaticamente ao salvar,
  // prevenindo duplicações e erros de concorrência.

  const [userName, setUserName] = useState('Desconhecido');

  useEffect(() => {
    const userData = localStorage.getItem('almoxarifado_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserName(user.nome || user.name || user.login || user.username || 'Desconhecido');
      } catch (e) {
        console.error('Erro ao ler dados do usuário:', e);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const isDateOrTime = name === 'data' || name === 'hora';
    const finalValue = (typeof value === 'string' && !isDateOrTime) ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Força a situação para EM_ANDAMENTO ao salvar e salva o usuário logado
      const novaOS = { ...formData, situacao: EM_ANDAMENTO, abertoPor: userName };

      // Envia para o backend
      const response = await fetch(`/api/os`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaOS)
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar a Ordem de Serviço');
      }

      const dataSalva = await response.json();
      onAddOS(dataSalva.os);

      if (onClose) onClose();

      // Limpar formulário mantendo alguns defaults e calculando novo código será feito pelo useEffect 
      // pois osList vai ser atualizada pelo parent (DashboardOS)
      setFormData(prev => ({
        ...prev,
        codigo: '', // vai ser preenchido pelo useEffect
        requisitante: '',
        setor: '',
        centroCusto: '',
        descricao: '',
        prazo: ''
      }));
    } catch (error) {
      console.error(error);
      alert('Erro ao cadastrar O.S. Verifique a conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddServicoPadraoText = (servico) => {
    setFormData(prev => ({
      ...prev,
      descricao: prev.descricao ? `${prev.descricao}\n- ${servico}` : `- ${servico}`
    }));
  };

  const handleSalvarNovoServicoPadrao = async () => {
    if (!formData.setor) {
      alert('Selecione um Setor de Execução primeiro.');
      return;
    }
    if (!novoServicoPadrao.trim()) return;

    try {
      const response = await fetch(`/api/servicos-padrao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setor: formData.setor, servico: novoServicoPadrao.trim() })
      });
      if (response.ok) {
        const data = await response.json();
        setServicosPadraoList(data.servicos);
        setNovoServicoPadrao('');
        setMostrarAddServicoPadrao(false);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar o serviço padrão.');
    }
  };

  const handleExcluirServicoPadrao = async (servico) => {
    if (!window.confirm(`Tem certeza que deseja excluir o serviço "${servico}" da lista padrão?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/servicos-padrao`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setor: formData.setor, servico })
      });
      if (response.ok) {
        const data = await response.json();
        setServicosPadraoList(data.servicos);
        setModoExclusao(false);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir o serviço padrão.');
    }
  };

  const servicosExibicao = servicosPadraoList[formData.setor] ? [...servicosPadraoList[formData.setor]] : [];

  const isCentroCustoVeiculo = veiculos.some(v => v.placa === formData.centroCusto);

  if (formData.setor === 'MECANICA' && isCentroCustoVeiculo) {
    const padroesMecanica = ['TROCA DE ÓLEO E REVISÃO', 'REVISÃO', 'TROCA DE ÓLEO']; // Ordem inversa pois usa unshift
    padroesMecanica.forEach(p => {
      if (!servicosExibicao.includes(p)) {
        servicosExibicao.unshift(p);
      }
    });
  }

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modalCard} ${styles.animateFadeIn}`}>
        {onClose && (
          <button type="button" onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        )}

        <h2 className={styles.cardTitle}>
          <FileText size={36} className={styles.logoIcon} />
          Cadastrar Ordem de Serviço
        </h2>

        {/* Info de quem está abrindo a OS */}
        <div style={{ 
          marginBottom: '12px', 
          padding: '4px 8px', 
          backgroundColor: 'var(--cor-fundo-sutil)', 
          borderRadius: '4px', 
          borderLeft: '2px solid var(--cor-destaque)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.65rem'
        }}>
          <span style={{ color: 'var(--cor-texto-secundario)', fontWeight: '600', textTransform: 'uppercase' }}>Aberto por:</span>
          <span style={{ color: 'var(--cor-texto-principal)', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {userName}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Informações Principais */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Código da O.S (Auto)</label>
              <input
                type="text"
                className={styles.input}
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                placeholder="Gerado automaticamente"
                readOnly
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Data</label>
              <div className={styles.relativeContainer}>
                <input
                  type="date"
                  className={styles.input}
                  name="data"
                  value={formData.data}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Hora</label>
              <input
                type="time"
                className={styles.input}
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Requisitante</label>
              <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center', width: '100%' }}>
                <div className={styles.dropdownWrapper} style={{ flex: 1 }}>
                  <div
                    className={`${styles.select} ${styles.selectDropdown}`}
                    onClick={() => setReqDropdownAberto(!reqDropdownAberto)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>{formData.requisitante || 'Selecione um requisitante...'}</span>
                    <span style={{ fontSize: '10px' }}>{reqDropdownAberto ? '▲' : '▼'}</span>
                  </div>

                  {reqDropdownAberto && (
                    <div className={styles.dropdownList}>
                      {requisitantesList.map((reqNome, index) => (
                        <div key={index} className={`${styles.servicoTag} ${styles.servicoTagItem}`}>
                          <span
                            className={styles.servicoTagTexto}
                            onClick={() => { setFormData(prev => ({ ...prev, requisitante: reqNome })); setReqDropdownAberto(false); }}
                          >
                            {reqNome}
                          </span>
                          <button
                            type="button"
                            className={styles.servicoTagExcluir}
                            onClick={(e) => { e.stopPropagation(); handleExcluirRequisitanteNaLista(reqNome); }}
                            title="Excluir requisitante"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddRequisitante}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--cor-destaque)',
                    cursor: 'pointer',
                    fontSize: '24px',
                    lineHeight: '1',
                    fontWeight: 'bold',
                    padding: '0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Adicionar Novo Requisitante"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Classificação e Setor */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Setor de Execução</label>
              <select
                className={styles.select}
                name="setor"
                value={formData.setor}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Selecione um setor</option>
                <option value="ELETRICA">ELETRICA</option>
                <option value="MECANICA">MECANICA</option>
                <option value="SERRALHEIRO">SERRALHEIRO</option>
                <option value="SERVICO GERAL">SERVICO GERAL</option>
                <option value="METALURGICA">METALURGICA</option>
                <option value="CONSTRUCAO CIVIL">CONSTRUCAO CIVIL</option>
                <option value="SLD">SLD</option>
                <option value="ELETRONICA">ELETRONICA</option>
                <option value="FABRICA DE RACAO">FABRICA DE RACAO</option>
                <option value="LOGISTICA">LOGISTICA</option>

              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Centro de Custo Alvo / Veículo</label>
              <input
                type="text"
                className={styles.input}
                name="centroCusto"
                value={formData.centroCusto}
                onChange={handleChange}
                placeholder="Ex: Granja ou Placa (ABC-1234)"
                list="veiculos-list"
                required
              />
              <datalist id="veiculos-list">
                {departamentos.map(dep => (
                  <option key={`dep-${dep.codigo || dep.descricao}`} value={dep.descricao}>{dep.descricao}</option>
                ))}
                {veiculos.map(v => (
                  <option key={`veic-${v.placa}`} value={v.placa}>{v.modelo ? `${v.placa} - ${v.modelo}` : v.placa}</option>
                ))}
              </datalist>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Complexidade</label>
              <select
                className={styles.select}
                name="complexidade"
                value={formData.complexidade}
                onChange={handleChange}
              >
                <option value="BAIXA">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Prioridade</label>
              <select
                className={styles.select}
                name="prioridade"
                value={formData.prioridade}
                onChange={handleChange}
              >
                <option value="1-NORMAL">1 - Normal</option>
                <option value="2-URGENTE">2 - Urgente</option>
                <option value="3-EMERGÊNCIA">3 - Emergência</option>
              </select>
            </div>
          </div>

          {/* Prazo e Situação */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Prazo</label>
              <input
                type="date"
                className={styles.input}
                name="prazo"
                value={formData.prazo}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tipo</label>
              <select
                className={styles.select}
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
              >
                <option value="PREVENTIVA">Preventiva</option>
                <option value="CORRETIVA">Corretiva</option>
                <option value="IMPLANTAÇÃO">Implantação</option>
                <option value="PERIODICO">Periódico</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Situação</label>
              <select
                className={styles.select}
                name="situacao"
                value={formData.situacao}
                onChange={handleChange}
              >
                <option value="À EXECUTAR">À Executar</option>
              </select>
            </div>
          </div>

          {/* Serviços Padrão */}
          {formData.setor && (
            <div className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.label}>Serviços Padrão ({formData.setor})</label>

                <div className={`${styles.servicosContainer} ${styles.servicosContainerRow}`}>

                  {servicosExibicao.length > 0 ? (
                    <div className={styles.dropdownWrapper}>
                      <div
                        className={`${styles.select} ${styles.selectDropdown}`}
                        onClick={() => setDropdownAberto(!dropdownAberto)}
                      >
                        <span>Selecione um serviço para adicionar...</span>
                        <span style={{ fontSize: '10px' }}>{dropdownAberto ? '▲' : '▼'}</span>
                      </div>

                      {dropdownAberto && (
                        <div className={styles.dropdownList}>
                          {servicosExibicao.map((svc, i) => {
                            const isHardcoded = ['TROCA DE ÓLEO', 'REVISÃO', 'TROCA DE ÓLEO E REVISÃO'].includes(svc);
                            return (
                              <div key={i} className={`${styles.servicoTag} ${styles.servicoTagItem}`}>
                                <span
                                  className={styles.servicoTagTexto}
                                  onClick={() => { handleAddServicoPadraoText(svc); setDropdownAberto(false); }}
                                >
                                  {svc}
                                </span>
                                {!isHardcoded && (
                                  <button
                                    type="button"
                                    className={styles.servicoTagExcluir}
                                    onClick={(e) => { e.stopPropagation(); handleExcluirServicoPadrao(svc); }}
                                    title="Excluir serviço padrão"
                                  >
                                    X
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className={`${styles.ajudaTexto} ${styles.ajudaTextoInline}`}>Nenhum serviço padrão cadastrado para este setor.</span>
                  )}

                  {!mostrarAddServicoPadrao ? (
                    <button
                      type="button"
                      className={styles.novoServicoBtn}
                      onClick={() => setMostrarAddServicoPadrao(true)}
                    >
                      + Novo Serviço Padrão
                    </button>
                  ) : (
                    <div className={styles.novoServicoForm}>
                      <input
                        type="text"
                        className={styles.novoServicoInput}
                        placeholder="EX: TROCA DE LÂMPADA"
                        value={novoServicoPadrao}
                        onChange={(e) => setNovoServicoPadrao(e.target.value.toUpperCase())}
                      />
                      <button
                        type="button"
                        className={`${styles.btnAcaoPequeno} ${styles.btnSalvar}`}
                        onClick={handleSalvarNovoServicoPadrao}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        className={`${styles.btnAcaoPequeno} ${styles.btnCancelar}`}
                        onClick={() => { setMostrarAddServicoPadrao(false); setNovoServicoPadrao(''); }}
                      >
                        X
                      </button>
                    </div>
                  )}
                </div>
                <small className={styles.ajudaTexto}>Clique no texto de um serviço acima para adicioná-lo à descrição, ou clique no X para excluí-lo permanentemente da lista.</small>
              </div>
            </div>
          )}

          {/* Descrição e Motivo */}
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>Descrição do Serviço</label>
              <textarea
                className={styles.textarea}
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Descreva detalhadamente o serviço a ser realizado..."
                required
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>Motivo / Causa do Serviço (Por que o serviço foi necessário?)</label>
              <textarea
                className={styles.textarea}
                name="motivo"
                value={formData.motivo || ''}
                onChange={handleChange}
                placeholder="Ex: Pneu furou ao passar no canteiro; Peça desgastada por tempo de uso; Manutenção preventiva periódica..."
                rows={2}
              />
            </div>
          </div>

          {/* Ações */}
          <div className={styles.actions}>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              <Save size={18} />
              {isSubmitting ? 'CADASTRANDO...' : 'CADASTRAR O.S'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Novo Requisitante */}
      {showAddReqModal && (
        <div className={styles.overlay} style={{ zIndex: 9999 }}>
          <div className={styles.modalCard} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--cor-destaque)', fontSize: '1.2rem' }}>Novo Requisitante</h3>
              <button type="button" onClick={() => setShowAddReqModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--cor-texto-principal)' }}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
              <label className={styles.label}>Buscar Funcionário (Omie)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Nome do funcionário..."
                value={novoReqFuncionario}
                onChange={(e) => setNovoReqFuncionario(e.target.value)}
                list="omie-fornecedores-list"
              />
              <datalist id="omie-fornecedores-list">
                {fornecedoresList.map((f, i) => (
                  <option key={i} value={f.razao_social || f.nome_fantasia || f.nome} />
                ))}
              </datalist>
              <small className={styles.ajudaTexto} style={{ display: 'block', marginTop: '4px' }}>Selecione o funcionário integrado para referência.</small>
            </div>

            <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
              <label className={styles.label}>Apelido do Requisitante (Salvar como) <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ex: Monteiro"
                value={novoReqApelido}
                onChange={(e) => setNovoReqApelido(e.target.value.toUpperCase())}
              />
              <small className={styles.ajudaTexto} style={{ display: 'block', marginTop: '4px' }}>Como este nome aparecerá nas Ordens de Serviço.</small>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setShowAddReqModal(false)} className={`${styles.btnPrimary}`} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', border: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-principal)' }}>Cancelar</button>
              <button type="button" onClick={handleSalvarNovoRequisitante} className={styles.btnPrimary} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FormularioOS;
