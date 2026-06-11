import React, { useState, useEffect } from 'react';
import { FileText, Save, Clock, AlertCircle, Wrench, Calendar, X } from 'lucide-react';
import styles from './index.module.css';

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
    situacao: 'À EXECUTAR',
    situacao: 'À EXECUTAR',
    descricao: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [servicosPadraoList, setServicosPadraoList] = useState({});
  const [mostrarAddServicoPadrao, setMostrarAddServicoPadrao] = useState(false);
  const [novoServicoPadrao, setNovoServicoPadrao] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modoExclusao, setModoExclusao] = useState(false);
  const [veiculos, setVeiculos] = useState([]);

  // Busca veículos para o datalist
  useEffect(() => {
    fetch('http://localhost:3000/api/veiculos')
      .then(res => res.json())
      .then(data => setVeiculos(data))
      .catch(err => console.error('Erro ao buscar veículos:', err));
  }, []);

  // Busca serviços padrão do backend
  useEffect(() => {
    fetch('http://localhost:3000/api/servicos-padrao')
      .then(res => res.json())
      .then(data => setServicosPadraoList(data))
      .catch(err => console.error('Erro ao buscar serviços padrão:', err));
  }, []);

  // Calcula o próximo código automaticamente
  useEffect(() => {
    if (!osList) return;
    
    const dataReq = formData.data;
    if (!dataReq) return;

    const [ano, mes] = dataReq.split('-');
    const mesAno = `${mes}${ano.slice(-2)}`;
    
    const osDoMes = osList.filter(o => o.codigo && o.codigo.endsWith(`-${mesAno}`));
    
    let proximoNumero = 1;
    if (osDoMes.length > 0) {
      const numeros = osDoMes.map(o => parseInt(o.codigo.split('-')[0]) || 0);
      proximoNumero = Math.max(...numeros) + 1;
    }
    
    const nextCode = `${proximoNumero.toString().padStart(2, '0')}-${mesAno}`;
    
    // Atualiza o formData se o código gerado for diferente e se o usuário não digitou um manualmente
    // Vamos assumir que a maioria vai ser automático
    setFormData(prev => ({ ...prev, codigo: nextCode }));
  }, [formData.data, osList]);

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
      // Força a situação para 'EM ANDAMENTO' ao salvar, conforme pedido do usuário
      const novaOS = { ...formData, situacao: 'EM ANDAMENTO' };

      // Envia para o backend
      const response = await fetch('http://localhost:3000/api/os', {
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
      const response = await fetch('http://localhost:3000/api/servicos-padrao', {
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
      const response = await fetch('http://localhost:3000/api/servicos-padrao', {
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
          <FileText size={20} className={styles.logoIcon} />
          Cadastrar Ordem de Serviço
        </h2>

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
            <div style={{ position: 'relative' }}>
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
            <select
              className={styles.select}
              name="requisitante"
              value={formData.requisitante}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Selecione um requisitante</option>
              <option value="ARILSON MOURAS">ARILSON MOURAS</option>
              <option value="ARINALDO BORGES">ARINALDO BORGES</option>
              <option value="MONTEIRO">MONTEIRO</option>
              <option value="JUCELIO PONTES">JUCELIO PONTES</option>
              <option value="GRAZIELLY BARBOSA">GRAZIELLY BARBOSA</option>
              <option value="JAIR CAVALCANTE">JAIR CAVALCANTE</option>
              <option value="ADEMILSON">ADEMILSON</option>
              <option value="CLEYDSON">CLEYDSON</option>
              <option value="EMERSON OLIVEIRA">EMERSON OLIVEIRA</option>
              <option value="CLAUDOMIRO SILVA">CLAUDOMIRO SILVA</option>
              <option value="JONE">JONE</option>
              <option value="NAZARE YAMAGUCHI">NAZARE YAMAGUCHI</option>
              <option value="KAZUNORI YAMAGUCHI">KAZUNORI YAMAGUCHI</option>

            </select>
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
              <option value="SDL">SDL</option>
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
              {veiculos.map(v => (
                <option key={v.placa} value={v.placa}>{v.modelo ? `${v.placa} - ${v.modelo}` : v.placa}</option>
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
              <option value="MELHORIA">Melhoria</option>
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
              
              <div className={styles.servicosContainer} style={{ flexDirection: 'row', alignItems: 'center' }}>
                
                {servicosExibicao.length > 0 ? (
                  <div style={{ position: 'relative', width: '350px' }}>
                    <div 
                      className={styles.select} 
                      onClick={() => setDropdownAberto(!dropdownAberto)}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--cor-fundo-principal)' }}
                    >
                      <span>Selecione um serviço para adicionar...</span>
                      <span style={{ fontSize: '10px' }}>{dropdownAberto ? '▲' : '▼'}</span>
                    </div>

                    {dropdownAberto && (
                      <div style={{ 
                        position: 'absolute', top: '100%', left: 0, right: 0, 
                        backgroundColor: 'var(--cor-fundo-principal)', 
                        border: '1px solid var(--cor-destaque)', 
                        borderRadius: '6px', marginTop: '4px', zIndex: 50,
                        maxHeight: '220px', overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}>
                        {servicosExibicao.map((svc, i) => {
                          const isHardcoded = ['TROCA DE ÓLEO', 'REVISÃO', 'TROCA DE ÓLEO E REVISÃO'].includes(svc);
                          return (
                            <div key={i} className={styles.servicoTag} style={{ border: 'none', borderBottom: '1px solid var(--cor-borda-cartao)', borderRadius: 0, boxShadow: 'none' }}>
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
                  <span className={styles.ajudaTexto} style={{ marginRight: '8px', marginTop: 0 }}>Nenhum serviço padrão cadastrado para este setor.</span>
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

        {/* Descrição */}
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

        {/* Ações */}
        <div className={styles.actions}>
          <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
            <Save size={18} />
            {isSubmitting ? 'CADASTRANDO...' : 'CADASTRAR O.S'}
          </button>
        </div>
      </form>
    </div>
    </div>
  );
};

export default FormularioOS;
