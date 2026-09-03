import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  FileText, 
  Users, 
  Package, 
  Car, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Sunrise, 
  Sunset,
  Search,
  Camera,
  Eye
} from 'lucide-react';
import styles from './ModalEdicaoDiaTotem.module.css';

const ModalEdicaoDiaTotem = ({
  diaIndex = 0,
  turnoInicial,
  onSalvar,
  onClose,
  produtosEstoque = [],
  fornecedores = [],
  veiculosConfig = [],
  calcularHorasTurno
}) => {
  const [turno, setTurno] = useState(() => JSON.parse(JSON.stringify(turnoInicial)));
  const [activePecaSearch, setActivePecaSearch] = useState({ pecaIdx: null, query: '' });
  const [fotoVisualizandoModal, setFotoVisualizandoModal] = useState(null);

  const handleChange = (campo, valor) => {
    setTurno(prev => {
      const tAtualizado = { ...prev, [campo]: valor };
      if (['horaInicio', 'horaFim1', 'horaInicio2', 'horaFim'].includes(campo)) {
        const horasCalc = calcularHorasTurno(tAtualizado);
        if (parseFloat(horasCalc) > 0) {
          tAtualizado.maoDeObra = (tAtualizado.maoDeObra || []).map(m => ({
            ...m,
            horas: horasCalc
          }));
        }
      }
      return tAtualizado;
    });
  };

  // Equipe
  const handleAddMembro = () => {
    const hCalc = calcularHorasTurno(turno);
    setTurno(prev => ({
      ...prev,
      maoDeObra: [...(prev.maoDeObra || []), { matricula: '', nome: '', funcao: 'Ajudante', horas: hCalc }]
    }));
  };

  const handleMembroChange = (idx, campo, valor) => {
    const list = [...(turno.maoDeObra || [])];
    if (campo === 'nome') {
      const vUpper = (valor || '').trim().toUpperCase();
      const funcEncontrado = (fornecedores || []).find(f => {
        const r = (f.razao_social || f.razaoSocial || '').trim().toUpperCase();
        const nf = (f.nome_fantasia || f.nomeFantasia || '').trim().toUpperCase();
        const n = (f.nome || '').trim().toUpperCase();
        return r === vUpper || nf === vUpper || n === vUpper;
      });

      list[idx] = {
        ...list[idx],
        nome: valor,
        matricula: funcEncontrado ? (funcEncontrado.cnpj_cpf || funcEncontrado.cnpjCpf || funcEncontrado.matricula || '') : list[idx].matricula
      };
    } else {
      list[idx] = { ...list[idx], [campo]: valor };
    }
    setTurno(prev => ({ ...prev, maoDeObra: list }));
  };

  const handleRemoveMembro = (idx) => {
    setTurno(prev => ({
      ...prev,
      maoDeObra: (prev.maoDeObra || []).filter((_, i) => i !== idx)
    }));
  };

  // Peças
  const handleAddPeca = () => {
    setTurno(prev => ({
      ...prev,
      pecasUtilizadas: [...(prev.pecasUtilizadas || []), { codigo: '', descricao: '', quantidade: 1, valor_unitario: 0, tipo: 'ESTOQUE' }]
    }));
  };

  const handleAddPecaExterna = () => {
    setTurno(prev => ({
      ...prev,
      pecasUtilizadas: [...(prev.pecasUtilizadas || []), { codigo: 'EXTERNO', descricao: '', quantidade: 1, valor_unitario: '', tipo: 'EXTERNA', fotoNota: '' }]
    }));
  };

  const handlePecaChange = (idx, campo, valor) => {
    const list = [...(turno.pecasUtilizadas || [])];
    const itemAtual = { ...list[idx], [campo]: valor };

    if (campo === 'descricao' && itemAtual.tipo !== 'EXTERNA') {
      const prod = (produtosEstoque || []).find(p => p.descricao === valor || p.codigo === valor);
      if (prod) {
        itemAtual.codigo = prod.codigo || '';
        itemAtual.descricao = prod.descricao || valor;
        itemAtual.valor_unitario = prod.valor_unitario || prod.preco_venda || prod.preco_unitario || 0;
        itemAtual.tipo = 'ESTOQUE';
      }
    }

    list[idx] = itemAtual;
    setTurno(prev => ({ ...prev, pecasUtilizadas: list }));
  };

  const handleUploadFotoNota = (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.src = ev.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        handlePecaChange(idx, 'fotoNota', dataUrl);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSelecionarProduto = (idx, prod) => {
    const list = [...(turno.pecasUtilizadas || [])];
    list[idx] = {
      ...list[idx],
      codigo: prod.codigo || '',
      descricao: prod.descricao || '',
      valor_unitario: prod.valor_unitario || prod.preco || 0
    };
    setTurno(prev => ({ ...prev, pecasUtilizadas: list }));
    setActivePecaSearch({ pecaIdx: null, query: '' });
  };

  const handleRemovePeca = (idx) => {
    setTurno(prev => ({
      ...prev,
      pecasUtilizadas: (prev.pecasUtilizadas || []).filter((_, i) => i !== idx)
    }));
  };

  // Veículos
  const handleAddVeiculo = () => {
    setTurno(prev => ({
      ...prev,
      veiculosUtilizados: [...(prev.veiculosUtilizados || []), { placa: '', kmInicial: '', kmFinal: '', km: '' }]
    }));
  };

  const handleVeiculoChange = (idx, campo, valor) => {
    const list = [...(turno.veiculosUtilizados || [])];
    list[idx] = { ...list[idx], [campo]: valor };

    if (campo === 'placa') {
      const vEncontrado = (veiculosConfig || []).find(vc => vc.placa === valor);
      if (vEncontrado) {
        const k1 = parseFloat(vEncontrado.kmAtual) || 0;
        const k2 = parseFloat(vEncontrado.kmTrocaOleo) || 0;
        const k3 = parseFloat(vEncontrado.kmRevisao) || 0;
        const kmSugerido = Math.max(k1, k2, k3);
        if (kmSugerido > 0) list[idx].kmInicial = kmSugerido;
      }
    }

    if (campo === 'kmInicial' || campo === 'kmFinal' || campo === 'placa') {
      const ini = parseFloat(list[idx].kmInicial) || 0;
      const fim = parseFloat(list[idx].kmFinal) || 0;
      list[idx].km = fim >= ini && ini > 0 ? (fim - ini).toFixed(1) : '';
    }
    setTurno(prev => ({ ...prev, veiculosUtilizados: list }));
  };

  const handleRemoveVeiculo = (idx) => {
    setTurno(prev => ({
      ...prev,
      veiculosUtilizados: (prev.veiculosUtilizados || []).filter((_, i) => i !== idx)
    }));
  };

  // Submissão com Validação
  const handleConfirmar = (e) => {
    e.preventDefault();
    if (!turno.data) {
      alert('⚠️ Por favor, informe a data deste dia.');
      return;
    }
    const horasCalc = parseFloat(calcularHorasTurno(turno) || 0);
    if (horasCalc <= 0) {
      alert('⚠️ O total de horas calculadas deste dia deve ser maior que zero.');
      return;
    }
    if (!turno.descricao || turno.descricao.trim().length < 3) {
      alert('⚠️ Por favor, preencha a descrição do que foi feito neste dia.');
      return;
    }
    const temMembro = (turno.maoDeObra || []).some(m => m.nome && m.nome.trim());
    if (!temMembro) {
      alert('⚠️ Informe pelo menos 1 membro na equipe de trabalho deste dia.');
      return;
    }

    const temDoisPeriodos = Boolean(turno.horaInicio2 || turno.temSegundoPeriodo);
    const turnoNormalizado = {
      ...turno,
      horaInicio: turno.horaInicio || '',
      horaFim1: temDoisPeriodos ? (turno.horaFim1 || '') : '',
      horaInicio2: temDoisPeriodos ? (turno.horaInicio2 || '') : '',
      horaFim: temDoisPeriodos ? (turno.horaFim || '') : (turno.horaFim || turno.horaFim1 || '')
    };

    onSalvar(diaIndex, turnoNormalizado);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContainer}>
        {/* Header do Modal */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <span>Editar Apontamento</span>
            <span className={styles.badgeDia}>Dia #{diaIndex + 1}</span>
          </div>
          <button type="button" onClick={onClose} className={styles.btnFechar} title="Fechar Edição">
            <X size={22} />
          </button>
        </div>

        {/* Corpo do Formulário de Edição */}
        <form onSubmit={handleConfirmar} className={styles.modalBody}>
          
          {/* 1. HORÁRIOS & DATA */}
          <div className={styles.secaoCard}>
            <div className={styles.secaoTitulo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--cor-destaque)" />
                <span>1. Data & Horários de Trabalho</span>
              </div>
              <div className={styles.displayHorasModal}>
                <Clock size={16} />
                <span>{calcularHorasTurno(turno)} horas calculadas</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--cor-texto-principal)' }}>
                Data do Dia #{diaIndex + 1}:
              </label>
              <input
                type="date"
                className={styles.inputField}
                style={{ width: 'auto', padding: '6px 12px' }}
                value={turno.data || ''}
                onChange={e => handleChange('data', e.target.value)}
              />
            </div>

            <div className={styles.gridHorarios}>
              {/* 1º Período */}
              <div className={styles.periodoCardMini}>
                <div className={styles.periodoCardMiniHeader}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f97316' }}>
                    <Sunrise size={16} />
                    {turno.horaInicio2 || turno.temSegundoPeriodo ? '1º Período (Entrada & Almoço)' : '1º Período (Entrada & Saída)'}
                  </span>
                </div>
                <div className={styles.inputsRowHoras}>
                  <div className={styles.campoHoraMini}>
                    <label>Entrada</label>
                    <input
                      type="time"
                      className={styles.inputField}
                      value={turno.horaInicio || ''}
                      onChange={e => handleChange('horaInicio', e.target.value)}
                    />
                  </div>
                  <div className={styles.campoHoraMini}>
                    <label>{turno.horaInicio2 || turno.temSegundoPeriodo ? 'Saída Almoço' : 'Saída'}</label>
                    <input
                      type="time"
                      className={styles.inputField}
                      value={turno.horaFim1 || (!turno.horaInicio2 && !turno.temSegundoPeriodo ? turno.horaFim : '') || ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (turno.horaInicio2 || turno.temSegundoPeriodo) {
                          handleChange('horaFim1', val);
                        } else {
                          handleChange('horaFim1', val);
                          handleChange('horaFim', val);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2º Período (Se ativo) */}
              {(turno.horaInicio2 || turno.temSegundoPeriodo) ? (
                <div className={styles.periodoCardMini}>
                  <div className={styles.periodoCardMiniHeader}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6' }}>
                      <Sunset size={16} />
                      2º Período (Retorno & Final)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('horaInicio2', '');
                        handleChange('temSegundoPeriodo', false);
                      }}
                      className={styles.btnRemoverMini}
                      title="Remover 2º Período"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className={styles.inputsRowHoras}>
                    <div className={styles.campoHoraMini}>
                      <label>Retorno Almoço</label>
                      <input
                        type="time"
                        className={styles.inputField}
                        value={turno.horaInicio2 || ''}
                        onChange={e => handleChange('horaInicio2', e.target.value)}
                      />
                    </div>
                    <div className={styles.campoHoraMini}>
                      <label>Saída Final</label>
                      <input
                        type="time"
                        className={styles.inputField}
                        value={turno.horaFim || ''}
                        onChange={e => handleChange('horaFim', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleChange('temSegundoPeriodo', true)}
                    className={styles.btnAdicionarMini}
                    style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                  >
                    <Plus size={16} /> Adicionar 2º Período (Tarde)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. DESCRIÇÃO DO SERVIÇO */}
          <div className={styles.secaoCard}>
            <div className={styles.secaoTitulo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--cor-destaque)" />
                <span>2. O que foi executado neste dia? *</span>
              </div>
            </div>
            <textarea
              className={styles.textareaField}
              placeholder="Descreva detalhadamente o serviço executado..."
              value={turno.descricao || ''}
              onChange={e => handleChange('descricao', e.target.value)}
            />
          </div>

          {/* 3. EQUIPE DE TRABALHO */}
          <div className={styles.secaoCard}>
            <div className={styles.secaoTitulo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--cor-destaque)" />
                <span>3. Equipe de Trabalho deste Dia</span>
              </div>
              <button type="button" onClick={handleAddMembro} className={styles.btnAdicionarMini}>
                <Plus size={14} /> Adicionar Membro
              </button>
            </div>

            <table className={styles.tabelaMini}>
              <thead>
                <tr>
                  <th>Nome do Funcionário *</th>
                  <th style={{ width: '180px' }}>Função</th>
                  <th style={{ width: '100px' }}>Horas</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {(turno.maoDeObra || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--cor-texto-secundario)', padding: '10px' }}>
                      Nenhum membro adicionado.
                    </td>
                  </tr>
                ) : (
                  turno.maoDeObra.map((m, mIdx) => (
                    <tr key={mIdx}>
                      <td>
                        <input
                          type="text"
                          className={styles.inputField}
                          list="listaFuncionariosTotem"
                          placeholder="Nome do colaborador..."
                          value={m.nome || ''}
                          onChange={e => handleMembroChange(mIdx, 'nome', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className={styles.inputField}
                          value={m.funcao || 'Ajudante'}
                          onChange={e => handleMembroChange(mIdx, 'funcao', e.target.value)}
                        >
                          <option value="Executor">Executor (Principal)</option>
                          <option value="Executor Substituto">Executor Substituto</option>
                          <option value="Ajudante">Ajudante (Auxiliar)</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          className={styles.inputField}
                          placeholder="Horas"
                          value={m.horas !== undefined && m.horas !== '' ? m.horas : calcularHorasTurno(turno)}
                          onChange={e => handleMembroChange(mIdx, 'horas', e.target.value)}
                        />
                      </td>
                      <td>
                        <button type="button" onClick={() => handleRemoveMembro(mIdx)} className={styles.btnRemoverMini}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 4. PEÇAS & INSUMOS */}
          <div className={styles.secaoCard}>
            <div className={styles.secaoTitulo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="var(--cor-destaque)" />
                <span>4. Peças / Insumos Consumidos</span>
              </div>
              {!turno.semPecas && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={handleAddPeca} className={styles.btnAdicionarMini} title="Buscar peça no estoque da Omie">
                    <Package size={13} /> + Peça Estoque
                  </button>
                  <button type="button" onClick={handleAddPecaExterna} className={styles.btnAdicionarMini} style={{ borderColor: '#d97706', color: '#d97706' }} title="Adicionar peça externa / nota fiscal">
                    <Camera size={13} /> + Peça Externa / NF
                  </button>
                </div>
              )}
            </div>

            {/* Checkbox Mão de Obra Pura */}
            <label className={`${styles.checkboxOptionRow} ${turno.semPecas ? styles.checked : ''}`}>
              <input
                type="checkbox"
                className={styles.customCheckboxInput}
                checked={Boolean(turno.semPecas)}
                onChange={e => {
                  const checked = e.target.checked;
                  handleChange('semPecas', checked);
                  if (checked) {
                    handleChange('pecasUtilizadas', []);
                  }
                }}
              />
              <span>Serviço apenas com Mão de Obra (Não foram utilizadas peças/materiais)</span>
            </label>

            {turno.semPecas ? (
              <div className={styles.avisoMaoDeObraPura}>
                <CheckCircle size={16} />
                <span>Confirmado: Este serviço foi realizado apenas com mão de obra, sem peças.</span>
              </div>
            ) : (
              <table className={styles.tabelaMini}>
                <thead>
                  <tr>
                    <th style={{ width: '95px', textAlign: 'center' }}>Tipo</th>
                    <th>Descrição da Peça / Código</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Qtd</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Valor Un.</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Comprovante / NF</th>
                    <th style={{ width: '40px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(turno.pecasUtilizadas || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--cor-texto-secundario)', padding: '10px' }}>
                        Nenhuma peça consumida. Clique em "+ Peça Estoque" ou "+ Peça Externa / NF".
                      </td>
                    </tr>
                  ) : (
                    turno.pecasUtilizadas.map((p, pIdx) => {
                      const isExterna = p.tipo === 'EXTERNA' || p.codigo === 'EXTERNO';

                      return (
                        <tr key={pIdx}>
                          <td style={{ textAlign: 'center' }}>
                            {isExterna ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: '800', padding: '2px 5px', borderRadius: '4px', backgroundColor: 'rgba(217, 119, 6, 0.15)', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.4)' }}>
                                <Camera size={10} /> Externa
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: '800', padding: '2px 5px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                <Package size={10} /> Estoque
                              </span>
                            )}
                          </td>
                          <td>
                            {isExterna ? (
                              <input
                                type="text"
                                className={styles.inputField}
                                placeholder="Nome da peça comprada fora..."
                                value={p.descricao || ''}
                                onChange={e => handlePecaChange(pIdx, 'descricao', e.target.value)}
                              />
                            ) : (
                              <input
                                type="text"
                                className={styles.inputField}
                                list="listaProdutosTotem"
                                placeholder="Buscar peça no estoque..."
                                value={p.descricao || ''}
                                onChange={e => handlePecaChange(pIdx, 'descricao', e.target.value)}
                              />
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              className={styles.inputField}
                              style={{ textAlign: 'center', fontWeight: '700' }}
                              value={p.quantidade !== undefined && p.quantidade !== null ? p.quantidade : ''}
                              onChange={e => handlePecaChange(pIdx, 'quantidade', e.target.value)}
                              onWheel={e => e.target.blur()}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isExterna ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0,00"
                                className={styles.inputField}
                                style={{ textAlign: 'right', fontWeight: '700', color: 'var(--cor-destaque)' }}
                                value={p.valor_unitario !== undefined && p.valor_unitario !== null ? p.valor_unitario : ''}
                                onChange={e => handlePecaChange(pIdx, 'valor_unitario', e.target.value)}
                                onWheel={e => e.target.blur()}
                              />
                            ) : (
                              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--cor-texto-secundario)', paddingRight: '6px' }}>
                                {p.valor_unitario ? `R$ ${formatarNumeroBR(p.valor_unitario, 2)}` : '—'}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isExterna ? (
                              p.fotoNota ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                                  <img 
                                    src={p.fotoNota} 
                                    alt="NF" 
                                    style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--cor-borda-cartao)', cursor: 'pointer' }}
                                    onClick={() => setFotoVisualizandoModal(p.fotoNota)}
                                    title="Clique para ampliar"
                                  />
                                  <button 
                                    type="button" 
                                    style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#059669', padding: '3px 6px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                    onClick={() => setFotoVisualizandoModal(p.fotoNota)}
                                  >
                                    <Eye size={10} /> Ver NF
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => handlePecaChange(pIdx, 'fotoNota', '')}
                                    title="Remover Foto da NF"
                                    style={{ background: 'none', border: 'none', color: 'var(--cor-erro)', cursor: 'pointer', padding: '2px' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ) : (
                                <label style={{ background: 'var(--cor-fundo-secundario)', border: '1px dashed var(--cor-borda-cartao)', color: 'var(--cor-texto-secundario)', padding: '5px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Camera size={12} /> Anexar NF
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment"
                                    style={{ display: 'none' }} 
                                    onChange={e => handleUploadFotoNota(pIdx, e)} 
                                  />
                                </label>
                              )
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', fontStyle: 'italic' }}>
                                Almoxarifado
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button type="button" onClick={() => handleRemovePeca(pIdx)} className={styles.btnRemoverMini}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* 5. VEÍCULOS DE APOIO */}
          <div className={styles.secaoCard}>
            <div className={styles.secaoTitulo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Car size={18} color="var(--cor-destaque)" />
                <span>5. Veículos de Deslocamento (Frota)</span>
              </div>
              {!turno.semVeiculo && (
                <button type="button" onClick={handleAddVeiculo} className={styles.btnAdicionarMini}>
                  <Plus size={14} /> Adicionar Veículo
                </button>
              )}
            </div>

            {/* Checkbox Sem Veículo */}
            <label className={`${styles.checkboxOptionRow} ${turno.semVeiculo ? styles.checked : ''}`}>
              <input
                type="checkbox"
                className={styles.customCheckboxInput}
                checked={Boolean(turno.semVeiculo)}
                onChange={e => {
                  const checked = e.target.checked;
                  handleChange('semVeiculo', checked);
                  if (checked) {
                    handleChange('veiculosUtilizados', []);
                  }
                }}
              />
              <span>Não utilizei veículo de deslocamento da frota neste dia</span>
            </label>

            {turno.semVeiculo ? (
              <div className={styles.avisoMaoDeObraPura}>
                <CheckCircle size={16} />
                <span>Confirmado: Nenhum veículo de deslocamento utilizado neste dia.</span>
              </div>
            ) : (
              <table className={styles.tabelaMini}>
                <thead>
                  <tr>
                    <th>Placa do Veículo</th>
                    <th style={{ width: '120px' }}>KM Inicial</th>
                    <th style={{ width: '120px' }}>KM Final</th>
                    <th style={{ width: '90px' }}>KM Total</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(turno.veiculosUtilizados || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--cor-texto-secundario)', padding: '10px' }}>
                        Nenhum veículo de apoio. Clique em "+ Adicionar Veículo" ou confirme na opção acima.
                      </td>
                    </tr>
                  ) : (
                    turno.veiculosUtilizados.map((v, vIdx) => (
                      <tr key={vIdx}>
                        <td>
                          <input
                            type="text"
                            className={styles.inputField}
                            list="listaVeiculosTotem"
                            placeholder="Placa..."
                            value={v.placa || ''}
                            onChange={e => handleVeiculoChange(vIdx, 'placa', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className={styles.inputField}
                            placeholder="KM Inicial"
                            value={v.kmInicial || ''}
                            onChange={e => handleVeiculoChange(vIdx, 'kmInicial', e.target.value)}
                            title="KM Inicial (editável para O.S. antigas)"
                            style={{ fontWeight: '700' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className={styles.inputField}
                            value={v.kmFinal || ''}
                            onChange={e => handleVeiculoChange(vIdx, 'kmFinal', e.target.value)}
                          />
                        </td>
                        <td style={{ fontWeight: '700', color: 'var(--cor-destaque)' }}>{v.km ? `${v.km} km` : '-'}</td>
                        <td>
                          <button type="button" onClick={() => handleRemoveVeiculo(vIdx)} className={styles.btnRemoverMini}>
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer com Botões de Ação */}
          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.btnCancelar}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnSalvarModal}>
              <CheckCircle size={18} />
              <span>Salvar Alterações deste Dia</span>
            </button>
          </div>

        </form>

        {/* MODAL DE VISUALIZAÇÃO DE FOTO DA NOTA FISCAL */}
        {fotoVisualizandoModal && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 100000,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px'
            }}
            onClick={() => setFotoVisualizandoModal(null)}
          >
            <div 
              style={{
                backgroundColor: 'var(--cor-fundo-cartao)',
                border: '1px solid var(--cor-borda-cartao)',
                borderRadius: '16px',
                padding: '20px',
                maxWidth: '90vw',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
                position: 'relative'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--cor-borda-cartao)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.05rem', color: 'var(--cor-texto-principal)' }}>
                  <Camera size={20} color="var(--cor-destaque)" />
                  <span>Comprovante / Nota Fiscal Anexada</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setFotoVisualizandoModal(null)} 
                  style={{ background: 'none', border: 'none', color: 'var(--cor-texto-secundario)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={22} />
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                <img 
                  src={fotoVisualizandoModal} 
                  alt="Nota Fiscal" 
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', backgroundColor: '#000' }} 
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ModalEdicaoDiaTotem;
