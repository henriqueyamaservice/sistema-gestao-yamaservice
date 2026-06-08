import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Calendar, Clock, User, Wrench, AlertCircle } from 'lucide-react';
import styles from './index.module.css';

const FormularioServicoOS = ({ os, onClose, onUpdateOS }) => {
  const isFinalizada = os.situacao === 'CONCLUÍDO' || os.situacao === 'CANCELADO';

  // Inicializar estado com dados existentes ou vazios
  const [formData, setFormData] = useState({
    executor: os.executor || '',
    dataInicio: os.dataInicio || new Date().toISOString().split('T')[0],
    horaInicio: os.horaInicio || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    dataFim: os.dataFim || new Date().toISOString().split('T')[0],
    horaFim: os.horaFim || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    dataJustificativa: os.dataJustificativa || new Date().toISOString().split('T')[0],
    observacao: os.observacao || '',
    resultado: os.resultado || 'EXECUTADA',
    usouVeiculo: os.usouVeiculo === 'Sim' ? 'Sim' : 'Não',
    placaVeiculo: os.placaVeiculo || '',
    kmRodado: os.kmRodado || '',
    descricaoServico: os.descricaoServico || ''
  });

  const [consumiveis, setConsumiveis] = useState(os.consumiveis || []);
  const [maoDeObra, setMaoDeObra] = useState(os.maoDeObra || []);
  const [servicosExecutados, setServicosExecutados] = useState(os.servicosExecutados || []);
  const [veiculos, setVeiculos] = useState(
    os.veiculos ? os.veiculos : (os.usouVeiculo === 'Sim' && os.placaVeiculo ? [{placa: os.placaVeiculo, km: os.kmRodado}] : [])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mostrarJustificativa, setMostrarJustificativa] = useState(!!os.observacao);
  const [produtosEstoque, setProdutosEstoque] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  // Buscar produtos e funcionários (fornecedores) para autocomplete
  useEffect(() => {
    fetch('http://localhost:3000/api/produtos')
      .then(res => res.json())
      .then(data => setProdutosEstoque(data))
      .catch(err => console.error('Erro ao buscar produtos:', err));

    fetch('http://localhost:3000/api/fornecedores')
      .then(res => res.json())
      .then(data => setFornecedores(data))
      .catch(err => console.error('Erro ao buscar funcionários:', err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addConsumivel = () => {
    setConsumiveis([...consumiveis, {
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      codigo: '',
      quantidade: 1,
      descricao: ''
    }]);
  };

  const updateConsumivel = (index, field, value) => {
    const newConsumiveis = [...consumiveis];
    newConsumiveis[index][field] = value;
    
    // Auto-preenchimento
    if (field === 'codigo') {
      const prod = produtosEstoque.find(p => p.codigo === value);
      if (prod) newConsumiveis[index].descricao = prod.descricao;
    } else if (field === 'descricao') {
      const prod = produtosEstoque.find(p => p.descricao === value);
      if (prod) newConsumiveis[index].codigo = prod.codigo;
    }

    setConsumiveis(newConsumiveis);
  };

  const removeConsumivel = (index) => {
    setConsumiveis(consumiveis.filter((_, i) => i !== index));
  };

  const addMaoDeObra = () => {
    setMaoDeObra([...maoDeObra, {
      matricula: '',
      nome: '',
      funcao: 'Executor',
      horas: ''
    }]);
  };

  const updateMaoDeObra = (index, field, value) => {
    const newMaoDeObra = [...maoDeObra];
    newMaoDeObra[index][field] = value;
    
    // Auto-preenchimento
    if (field === 'matricula') {
      const func = fornecedores.find(f => String(f.codigo_cliente_omie) === String(value));
      if (func) newMaoDeObra[index].nome = func.razao_social || func.nome_fantasia;
    } else if (field === 'nome') {
      const func = fornecedores.find(f => (f.razao_social && f.razao_social === value) || (f.nome_fantasia && f.nome_fantasia === value));
      if (func) newMaoDeObra[index].matricula = String(func.codigo_cliente_omie);
    }

    setMaoDeObra(newMaoDeObra);
  };

  const removeMaoDeObra = (index) => {
    setMaoDeObra(maoDeObra.filter((_, i) => i !== index));
  };

  const addServicoExecutado = () => {
    setServicosExecutados([...servicosExecutados, {
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      descricao: ''
    }]);
  };

  const updateServicoExecutado = (index, field, value) => {
    const newServicos = [...servicosExecutados];
    newServicos[index][field] = value;
    setServicosExecutados(newServicos);
  };

  const removeServicoExecutado = (index) => {
    setServicosExecutados(servicosExecutados.filter((_, i) => i !== index));
  };

  const addVeiculo = () => {
    setVeiculos([...veiculos, { placa: '', km: '' }]);
  };

  const updateVeiculo = (index, field, value) => {
    const newVeiculos = [...veiculos];
    newVeiculos[index][field] = value;
    setVeiculos(newVeiculos);
  };

  const removeVeiculo = (index) => {
    setVeiculos(veiculos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFinalizada) return; // Proteção extra
    
    // Validação extra para atrasos
    if (os.prazo && formData.dataFim > os.prazo) {
      if (!mostrarJustificativa || !formData.observacao.trim()) {
        alert("O serviço foi finalizado com atraso. Você precisa clicar em 'JUSTIFICAR ATRASO' e preencher o motivo.");
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      let statusFinal = 'PENDENTE';
      if (formData.resultado === 'EXECUTADA') statusFinal = 'CONCLUÍDO';
      else if (formData.resultado === 'EM ANDAMENTO') statusFinal = 'EM ANDAMENTO';
      else if (formData.resultado === 'AGUARDANDO INSUMO') statusFinal = 'AGUARDANDO INSUMO';
      else if (formData.resultado === 'CANCELADA') statusFinal = 'CANCELADO';

      const updates = {
        maoDeObra: maoDeObra,
        servicosExecutados: servicosExecutados,
        dataInicio: formData.dataInicio,
        horaInicio: formData.horaInicio,
        dataFim: formData.dataFim,
        horaFim: formData.horaFim,
        usouVeiculo: formData.usouVeiculo,
        veiculos: formData.usouVeiculo === 'Sim' ? veiculos : [],
        placaVeiculo: formData.usouVeiculo === 'Sim' && veiculos.length > 0 ? veiculos[0].placa : '',
        kmRodado: formData.usouVeiculo === 'Sim' && veiculos.length > 0 ? veiculos[0].km : '',
        descricaoServico: formData.descricaoServico,
        dataJustificativa: mostrarJustificativa ? formData.dataJustificativa : null,
        observacao: mostrarJustificativa ? formData.observacao : '',
        resultado: formData.resultado,
        situacao: statusFinal,
        consumiveis: consumiveis
      };

      const response = await fetch(`http://localhost:3000/api/os/${os.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Falha ao atualizar a O.S.');

      const result = await response.json();
      onUpdateOS(result.os);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao fechar O.S. Verifique a conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modalCard} ${styles.animateFadeIn}`}>
        {/* Botão Fechar */}
        <button 
          onClick={onClose}
          className={styles.closeButton}
        >
          <X size={24} />
        </button>

        <h2 className={styles.cardTitle}>
          <Wrench size={20} className={styles.logoIcon} />
          {isFinalizada ? `Detalhes da O.S. - ${os.codigo}` : `Fechamento da O.S. - ${os.codigo}`}
        </h2>

        {/* Resumo da OS (Sempre Read-Only) */}
        <div className={styles.summaryGrid}>
          <div><strong>Requisitante:</strong> <br/>{os.requisitante}</div>
          <div><strong>Setor:</strong> <br/>{os.setor}</div>
          <div><strong>Prazo Original:</strong> <br/>{os.prazo ? os.prazo.split('-').reverse().join('/') : 'Não definido'}</div>
          <div><strong>Complexidade:</strong> <br/>{os.complexidade}</div>
          <div className={styles.summaryDesc}>
            <strong>Descrição do Problema (Abertura):</strong> <br/>{os.descricaoProblema || os.descricao}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <h3 className={styles.sectionTitle}>Dados do Atendimento</h3>
          
          {os.prazo && formData.dataFim > os.prazo && !mostrarJustificativa && (
            <div className={styles.alert}>
              <AlertCircle size={18} />
              Atenção: A data final do serviço passou do prazo. Clique em "JUSTIFICAR ATRASO" abaixo.
            </div>
          )}
          
          {/* NOVA TABELA DE MÃO DE OBRA */}
          <div className={styles.sectionHeader}>
            <h3><User size={16} className={styles.sectionHeaderIcon} /> Mão de Obra (Horas Trabalhadas)</h3>
            {!isFinalizada && (
              <button type="button" onClick={addMaoDeObra} className={`${styles.btnSecondary} ${styles.btnSecondarySmall}`}>
                <Plus size={16} /> Adicionar Funcionário
              </button>
            )}
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Nome do Funcionário</th>
                  <th>Função</th>
                  <th>Horas (Quant.)</th>
                  {!isFinalizada && <th>Ação</th>}
                </tr>
              </thead>
              <tbody>
                {maoDeObra.length === 0 ? (
                  <tr>
                    <td colSpan={isFinalizada ? 4 : 5} className={styles.tableEmpty}>Nenhuma mão de obra registrada.</td>
                  </tr>
                ) : (
                  maoDeObra.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <input type="text" className={`${styles.input} ${styles.inputSmall}`} style={{ width: '100px' }} placeholder="Ex: 71"
                          value={item.matricula} onChange={(e) => updateMaoDeObra(index, 'matricula', e.target.value)} disabled={isFinalizada} required list="funcionarios-matricula" />
                      </td>
                      <td>
                        <input type="text" className={`${styles.input} ${styles.inputSmall}`} placeholder="Nome completo"
                          value={item.nome} onChange={(e) => updateMaoDeObra(index, 'nome', e.target.value)} disabled={isFinalizada} required list="funcionarios-nome" />
                      </td>
                      <td>
                        <select className={`${styles.select} ${styles.inputSmall}`}
                          value={item.funcao} onChange={(e) => updateMaoDeObra(index, 'funcao', e.target.value)} disabled={isFinalizada} required>
                          <option value="Executor">Executor</option>
                          <option value="Ajudante">Ajudante</option>
                        </select>
                      </td>
                      <td>
                        <input type="text" className={`${styles.input} ${styles.inputSmall}`} style={{ width: '80px' }} placeholder="Ex: 9h"
                          value={item.horas} onChange={(e) => updateMaoDeObra(index, 'horas', e.target.value)} disabled={isFinalizada} required />
                      </td>
                      {!isFinalizada && (
                        <td>
                          <button type="button" onClick={() => removeMaoDeObra(index)} className={styles.btnDangerIcon}>
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Datalists de Mão de Obra */}
            {!isFinalizada && (
              <>
                <datalist id="funcionarios-matricula">
                  {fornecedores.map(f => <option key={f.codigo_cliente_omie} value={f.codigo_cliente_omie}>{f.razao_social || f.nome_fantasia}</option>)}
                </datalist>
                <datalist id="funcionarios-nome">
                  {fornecedores.map(f => <option key={f.codigo_cliente_omie} value={f.razao_social || f.nome_fantasia}>{f.codigo_cliente_omie}</option>)}
                </datalist>
              </>
            )}
          </div>

          {/* NOVA TABELA DE SERVIÇOS EXTRAS */}
          <div className={styles.sectionHeader}>
            <h3><Wrench size={16} className={styles.sectionHeaderIcon} /> Serviços Adicionais Executados</h3>
            {!isFinalizada && (
              <button type="button" onClick={addServicoExecutado} className={`${styles.btnSecondary} ${styles.btnSecondarySmall}`}>
                <Plus size={16} /> Adicionar Serviço
              </button>
            )}
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Descrição do Serviço Realizado</th>
                  {!isFinalizada && <th>Ação</th>}
                </tr>
              </thead>
              <tbody>
                {servicosExecutados.length === 0 ? (
                  <tr>
                    <td colSpan={isFinalizada ? 3 : 4} className={styles.tableEmpty}>Nenhum serviço adicional registrado.</td>
                  </tr>
                ) : (
                  servicosExecutados.map((item, index) => (
                    <tr key={index}>
                      <td style={{ width: '130px' }}>
                        <input type="date" className={`${styles.input} ${styles.inputSmall}`}
                          value={item.data} onChange={(e) => updateServicoExecutado(index, 'data', e.target.value)} disabled={isFinalizada} />
                      </td>
                      <td style={{ width: '110px' }}>
                        <input type="time" className={`${styles.input} ${styles.inputSmall}`}
                          value={item.hora} onChange={(e) => updateServicoExecutado(index, 'hora', e.target.value)} disabled={isFinalizada} />
                      </td>
                      <td>
                        <input type="text" className={`${styles.input} ${styles.inputSmall}`} placeholder="O que foi feito? Ex: Troca de rolamentos, Limpeza"
                          value={item.descricao} onChange={(e) => updateServicoExecutado(index, 'descricao', e.target.value)} disabled={isFinalizada} required />
                      </td>
                      {!isFinalizada && (
                        <td style={{ width: '60px' }}>
                          <button type="button" onClick={() => removeServicoExecutado(index)} className={styles.btnDangerIcon}>
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}><Calendar size={14} className={styles.labelIcon}/> Data Início</label>
              <input 
                type="date" className={styles.input} name="dataInicio"
                value={formData.dataInicio} onChange={handleChange} required disabled={isFinalizada}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}><Clock size={14} className={styles.labelIcon}/> Hora Início</label>
              <input 
                type="time" className={styles.input} name="horaInicio"
                value={formData.horaInicio} onChange={handleChange} required disabled={isFinalizada}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}><Calendar size={14} className={styles.labelIcon}/> Data Fim</label>
              <input 
                type="date" className={styles.input} name="dataFim"
                value={formData.dataFim} onChange={handleChange} required disabled={isFinalizada}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}><Clock size={14} className={styles.labelIcon}/> Hora Fim</label>
              <input 
                type="time" className={styles.input} name="horaFim"
                value={formData.horaFim} onChange={handleChange} required disabled={isFinalizada}
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Utilizou Veículo na Execução?</label>
              <select className={styles.select} name="usouVeiculo" value={formData.usouVeiculo} onChange={handleChange} disabled={isFinalizada}>
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
          </div>
            
          {formData.usouVeiculo === 'Sim' && (
            <div className={styles.veiculosContainer}>
              <div className={styles.veiculosHeader}>
                <h4>Veículos Utilizados</h4>
                {!isFinalizada && (
                  <button type="button" onClick={addVeiculo} className={`${styles.btnSecondary} ${styles.btnSecondarySmall}`}>
                    <Plus size={16} /> Adicionar Veículo
                  </button>
                )}
              </div>
              
              {veiculos.length === 0 ? (
                <p className={styles.veiculoEmpty}>Nenhum veículo adicionado.</p>
              ) : (
                <div className={styles.veiculoList}>
                  {veiculos.map((v, index) => (
                    <div key={index} className={styles.veiculoItem}>
                      <div className={styles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
                        <label className={styles.label}>Placa do Veículo</label>
                        <input 
                          type="text" className={styles.input} placeholder="Ex: ABC-1234"
                          value={v.placa} onChange={(e) => updateVeiculo(index, 'placa', e.target.value)} required disabled={isFinalizada}
                        />
                      </div>
                      <div className={styles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
                        <label className={styles.label}>KM Rodado</label>
                        <input 
                          type="number" className={styles.input} placeholder="Ex: 15" min="0" step="0.1"
                          value={v.km} onChange={(e) => updateVeiculo(index, 'km', e.target.value)} required disabled={isFinalizada}
                        />
                      </div>
                      {!isFinalizada && (
                        <button type="button" onClick={() => removeVeiculo(index)} className={`${styles.btnDangerIcon} ${styles.btnDangerIconSmall}`} style={{ marginBottom: '2px' }}>
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={styles.sectionHeader}>
            <h3><Wrench size={16} className={styles.sectionHeaderIcon} /> Consumíveis / Peças Usadas (Materiais)</h3>
            {!isFinalizada && (
              <button type="button" onClick={addConsumivel} className={`${styles.btnSecondary} ${styles.btnSecondarySmall}`}>
                <Plus size={16} /> Adicionar Peça
              </button>
            )}
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Cód. Peça</th>
                  <th>Quant.</th>
                  <th>Descrição</th>
                  {!isFinalizada && <th>Ação</th>}
                </tr>
              </thead>
              <tbody>
                {consumiveis.length === 0 ? (
                  <tr>
                    <td colSpan={isFinalizada ? 5 : 6} className={styles.tableEmpty}>Nenhuma peça ou material registrado.</td>
                  </tr>
                ) : (
                  consumiveis.map((item, index) => (
                    <tr key={index}>
                      <td style={{ width: '130px' }}>
                        <input type="date" className={`${styles.input} ${styles.inputSmall}`}
                          value={item.data} onChange={(e) => updateConsumivel(index, 'data', e.target.value)} disabled={isFinalizada} />
                      </td>
                      <td style={{ width: '110px' }}>
                        <input type="time" className={`${styles.input} ${styles.inputSmall}`}
                          value={item.hora} onChange={(e) => updateConsumivel(index, 'hora', e.target.value)} disabled={isFinalizada} />
                      </td>
                      <td style={{ width: '120px' }}>
                        <input type="text" className={`${styles.input} ${styles.inputSmall}`} placeholder="Código"
                          value={item.codigo} onChange={(e) => updateConsumivel(index, 'codigo', e.target.value)} disabled={isFinalizada} list="produtos-codigo" />
                      </td>
                      <td style={{ width: '80px' }}>
                        <input type="number" className={`${styles.input} ${styles.inputSmall}`} min="1"
                          value={item.quantidade} onChange={(e) => updateConsumivel(index, 'quantidade', parseInt(e.target.value))} disabled={isFinalizada} />
                      </td>
                      <td>
                        <input type="text" className={`${styles.input} ${styles.inputSmall}`} placeholder="Descrição do consumível"
                          value={item.descricao} onChange={(e) => updateConsumivel(index, 'descricao', e.target.value)} disabled={isFinalizada} required list="produtos-descricao" />
                      </td>
                      {!isFinalizada && (
                        <td style={{ width: '60px' }}>
                          <button type="button" onClick={() => removeConsumivel(index)} className={styles.btnDangerIcon}>
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Datalists para autocomplete nativo */}
            {!isFinalizada && (
              <>
                <datalist id="produtos-codigo">
                  {produtosEstoque.map(p => <option key={p.id} value={p.codigo}>{p.descricao}</option>)}
                </datalist>
                <datalist id="produtos-descricao">
                  {produtosEstoque.map(p => <option key={p.id} value={p.descricao}>{p.codigo}</option>)}
                </datalist>
              </>
            )}
          </div>

          {!isFinalizada && (
            <>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>Resultado do Atendimento (Status Final)</label>
                  <select className={styles.select} name="resultado" value={formData.resultado} onChange={handleChange}>
                    <option value="EXECUTADA">Executada / Concluído</option>
                    <option value="EM ANDAMENTO">Em Andamento (Não finalizada)</option>
                    <option value="AGUARDANDO INSUMO">Aguardando Insumo / Peça</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
              </div>
              
              <div className={styles.formGrid}>
                {!mostrarJustificativa ? (
                  <button 
                    type="button" 
                    onClick={() => setMostrarJustificativa(true)}
                    className={styles.btnJustificar}
                  >
                    <AlertCircle size={18} />
                    JUSTIFICAR ATRASO / ADICIONAR OBSERVAÇÃO
                  </button>
                ) : (
                  <div className={styles.justificativaContainer}>
                    <div className={styles.justificativaHeader}>
                      <h4>
                        <AlertCircle size={18} /> Justificativa de Atraso
                      </h4>
                      <button type="button" onClick={() => setMostrarJustificativa(false)} className={styles.btnCancelLink}>
                        Cancelar
                      </button>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Data do Atraso / Justificativa</label>
                        <input 
                          type="date" 
                          className={styles.input} 
                          name="dataJustificativa"
                          value={formData.dataJustificativa}
                          onChange={handleChange}
                          required={mostrarJustificativa}
                        />
                      </div>
                    </div>
                    <div className={styles.formGrid} style={{ marginTop: '12px' }}>
                      <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <label className={styles.label}>Observação / Motivo do Atraso</label>
                        <textarea 
                          className={styles.textarea} 
                          name="observacao"
                          value={formData.observacao}
                          onChange={handleChange}
                          placeholder="Descreva o motivo do atraso ou detalhes adicionais..."
                          required={mostrarJustificativa}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.actionsFooter}>
                <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                  <Save size={18} />
                  {isSubmitting ? 'SALVANDO...' : 'SALVAR E FECHAR O.S.'}
                </button>
              </div>
            </>
          )}

          {isFinalizada && (
            <>
              {formData.observacao && (
                <div className={styles.formGrid} style={{ marginTop: '16px' }}>
                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label className={styles.label}>Justificativa de Atraso / Observações ({formData.dataJustificativa ? formData.dataJustificativa.split('-').reverse().join('/') : ''})</label>
                    <div className={styles.readonlyBox}>
                      {formData.observacao}
                    </div>
                  </div>
                </div>
              )}
              <div className={styles.actionsFooter}>
                <button type="button" onClick={onClose} className={styles.btnPrimary}>
                  Fechar Visualização
                </button>
              </div>
            </>
          )}

        </form>
      </div>
    </div>
  );
};

export default FormularioServicoOS;
