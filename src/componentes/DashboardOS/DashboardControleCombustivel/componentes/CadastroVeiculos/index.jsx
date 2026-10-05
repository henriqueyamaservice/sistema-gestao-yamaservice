import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, Plus, ArrowLeft, Truck, Wrench, FileText, Settings, User, 
  Trash2, Edit, Camera, Search, Filter, Globe, Droplet, Clock, RefreshCw, Car, AlertTriangle
} from 'lucide-react';
import styles from './index.module.css';
import { formatarNumeroBR, formatarOdometroDisplay, limparNumeroOdometro, validarAntiRetrocessoKM } from '../../../../../utils/formatadorOdometro';

const CadastroVeiculos = () => {
  const [veiculos, setVeiculos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [avisoMostrado, setAvisoMostrado] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('TODOS'); // 'TODOS' | 'VEICULO' | 'MAQUINA'
  const [busca, setBusca] = useState('');
  
  const estadoInicial = {
    tipoEquipamento: 'VEICULO', // 'VEICULO' ou 'MAQUINA'
    subtipoMaquina: 'Trator Agrícola',
    placa: '', // Placa para veículos ou Prefixo/Identificação para máquinas
    modelo: '',
    kmAtualOriginal: '',
    marca: '',
    anoModelo: '',
    anoFabricacao: '',
    capacidade: '',
    renavam: '',
    pesoBrutoTotal: '',
    especieTipo: '',
    chassi: '',
    categoria: '',
    carroceria: '',
    potenciaCilindrada: '',
    motor: '',
    cmt: '',
    eixos: '',
    lotacao: '',
    tracao: '',
    nomeProprietario: '',
    cpfCnpj: '',
    corPredominante: '',
    combustivel: 'DIESEL',
    foto: '',
    // Manutenção / Metas
    kmAtual: '',
    kmTrocaOleo: '',
    intervaloTrocaOleo: '10000',
    kmRevisao: '',
    intervaloRevisao: '50000',
    tipoMedicao: 'KM'
  };

  const [formData, setFormData] = useState(estadoInicial);

  const carregarVeiculos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/veiculos`);
      const data = await res.json();
      setVeiculos(data);
    } catch (error) {
      console.error("Erro ao buscar veículos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarVeiculos();
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const isNumberOrDate = type === 'number' || type === 'date' || type === 'time';
    const finalValue = (typeof value === 'string' && !isNumberOrDate) ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleTrocaTipoEquipamento = (novoTipo) => {
    setFormData(prev => {
      const isMaq = novoTipo === 'MAQUINA';
      return {
        ...prev,
        tipoEquipamento: novoTipo,
        tipoMedicao: isMaq ? 'Horas' : 'KM',
        intervaloTrocaOleo: isMaq ? (prev.intervaloTrocaOleo === '10000' ? '250' : prev.intervaloTrocaOleo) : (prev.intervaloTrocaOleo === '250' ? '10000' : prev.intervaloTrocaOleo),
        intervaloRevisao: isMaq ? (prev.intervaloRevisao === '50000' ? '1000' : prev.intervaloRevisao) : (prev.intervaloRevisao === '1000' ? '50000' : prev.intervaloRevisao)
      };
    });
  };

  const handleMaintenanceClick = () => {
    if (!avisoMostrado && formData.id) {
      alert("⚠️ ATENÇÃO: Alterar manualmente a Última Revisão ou Troca de Óleo vai modificar o acompanhamento automático de frota no Dashboard de Revisão.");
      setAvisoMostrado(true);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.src = ev.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, foto: dataUrl }));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!formData.placa) {
      return alert(formData.tipoEquipamento === 'MAQUINA' ? 'O Prefixo / Identificação da máquina é obrigatório' : 'A placa do veículo é obrigatória');
    }

    if (formData.kmAtual && formData.kmAtualOriginal) {
      const validacaoKm = validarAntiRetrocessoKM(formData.kmAtual, formData.kmAtualOriginal, formData.tipoMedicao);
      if (validacaoKm.retrocedeu) {
        const confirmar = window.confirm(`⚠️ ATENÇÃO: O valor digitado (${formatarNumeroBR(formData.kmAtual)}) é MENOR que o último registrado (${formatarNumeroBR(formData.kmAtualOriginal)}).\n\nTem certeza que deseja salvar este valor reduzido?`);
        if (!confirmar) return;
      } else if (!validacaoKm.valido) {
        alert(validacaoKm.mensagem);
        return;
      }
    }

    try {
      const res = await fetch(`/api/veiculos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      
      setFormData(estadoInicial);
      setMostrarFormulario(false);
      carregarVeiculos();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar: ' + error.message);
    }
  };

  const handleEditar = (item) => {
    const isMaq = item.tipoEquipamento === 'MAQUINA' || item.tipoMedicao === 'Horas' || item.tipoMedicao === 'HORAS';
    setFormData({
      ...estadoInicial,
      ...item,
      kmAtualOriginal: item.kmAtual || '',
      tipoEquipamento: isMaq ? 'MAQUINA' : (item.tipoEquipamento || 'VEICULO'),
      tipoMedicao: isMaq ? 'Horas' : (item.tipoMedicao || 'KM')
    });
    setAvisoMostrado(false);
    setMostrarFormulario(true);
  };

  const handleDeletar = async (placa, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente "${placa}" da Frota?`)) return;

    try {
      const res = await fetch(`/api/veiculos/${encodeURIComponent(placa)}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Falha ao deletar');

      if (mostrarFormulario && formData.placa === placa) {
        setMostrarFormulario(false);
        setFormData(estadoInicial);
      }

      carregarVeiculos();
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao excluir. Tente novamente.");
    }
  };

  // Contagens para as abas
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

    return {
      veiculosFiltrados: filtrados,
      countTotal: veiculos.length,
      countVeiculos: vCount,
      countMaquinas: mCount
    };
  }, [veiculos, filtroTipo, busca]);

  const isMaquinaForm = formData.tipoEquipamento === 'MAQUINA';
  const labelMedicao = isMaquinaForm ? 'Horas' : 'KM';
  const placeholderMedicao = isMaquinaForm ? 'Ex: 1250' : 'Ex: 50000';

  if (mostrarFormulario) {
    return (
      <div className={`${styles.formContainer} animateFadeIn`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 className={styles.cardTitle} style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
            {formData.id ? (isMaquinaForm ? 'Editar Máquina / Trator' : 'Editar Veículo') : (isMaquinaForm ? 'Cadastrar Nova Máquina / Trator' : 'Cadastrar Novo Veículo')}
          </h2>
          <button className={styles.btnSecondary} onClick={() => setMostrarFormulario(false)}>
            <ArrowLeft size={18} /> Voltar para a lista
          </button>
        </div>

        {/* Seletor de Categoria (Veículo vs Máquina) */}
        <div className={styles.tipoEquipamentoContainer}>
          <span className={styles.tipoEquipamentoLabel}>Tipo de Cadastro:</span>
          <div className={styles.tipoEquipamentoRow}>
            <button
              type="button"
              className={`${styles.tipoEquipamentoBtn} ${!isMaquinaForm ? styles.active : ''}`}
              onClick={() => handleTrocaTipoEquipamento('VEICULO')}
            >
              <Truck size={20} color="var(--cor-destaque)" />
              <span>Veículo Rodoviário (Carro / Caminhão / Van)</span>
            </button>

            <button
              type="button"
              className={`${styles.tipoEquipamentoBtn} ${isMaquinaForm ? styles.active : ''}`}
              onClick={() => handleTrocaTipoEquipamento('MAQUINA')}
            >
              <Wrench size={20} color="#d97706" />
              <span>Máquina / Trator / Equipamento Agrícola</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSalvar}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* Foto do Equipamento */}
            <div className={styles.uploadArea} onClick={() => document.getElementById('fotoUpload').click()}>
              {formData.foto ? (
                <img src={formData.foto} alt="Equipamento" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
              ) : (
                <>
                  <Camera size={32} />
                  <span>{isMaquinaForm ? 'Foto da Máquina' : 'Foto do Veículo'}</span>
                </>
              )}
              <input type="file" id="fotoUpload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            </div>

            <div style={{ flex: 1 }}>
              {/* Seção 1: Identificação & Dados Principais */}
              <div className={styles.sessionBlock}>
                <div className={styles.sessionHeader}>
                  <FileText size={18} /> 1. Identificação & Dados Principais
                </div>
                <div className={`${styles.grid} ${styles.grid4}`}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      {isMaquinaForm ? 'Prefixo / Identificação da Máquina *' : 'Placa do Veículo *'}
                    </label>
                    <input
                      type="text"
                      name="placa"
                      value={formData.placa}
                      onChange={handleChange}
                      className={styles.input}
                      required
                      placeholder={isMaquinaForm ? "Ex: TRATOR-01 ou VALTRA-BH180" : "Ex: ABC1234"}
                      style={{ fontWeight: '800', color: 'var(--cor-destaque)' }}
                    />
                  </div>

                  {isMaquinaForm ? (
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Subtipo de Máquina</label>
                      <select
                        name="subtipoMaquina"
                        value={formData.subtipoMaquina || 'Trator Agrícola'}
                        onChange={handleChange}
                        className={styles.select}
                      >
                        <option value="Trator Agrícola">Trator Agrícola</option>
                        <option value="Retroescavadeira">Retroescavadeira</option>
                        <option value="Pá Carregadeira">Pá Carregadeira</option>
                        <option value="Colheitadeira">Colheitadeira</option>
                        <option value="Pulverizador">Pulverizador Autopropelido</option>
                        <option value="Empilhadeira">Empilhadeira</option>
                        <option value="Caminhão Pipa / Munck">Caminhão Pipa / Munck</option>
                        <option value="Implemento Agrícola">Implemento Agrícola</option>
                        <option value="Outro Maquinário">Outro Maquinário</option>
                      </select>
                    </div>
                  ) : (
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Código RENAVAM</label>
                      <input type="text" name="renavam" value={formData.renavam} onChange={handleChange} className={styles.input} />
                    </div>
                  )}

                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.label}>Modelo / Descrição</label>
                    <input
                      type="text"
                      name="modelo"
                      value={formData.modelo}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder={isMaquinaForm ? "Ex: BH 180 HI-TECH ou 6110M" : "Ex: VW/24.280 CRM 6X2"}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Marca / Fabricante</label>
                    <input
                      type="text"
                      name="marca"
                      value={formData.marca || ''}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder={isMaquinaForm ? "Ex: VALTRA, JOHN DEERE, CASE" : "Ex: VOLKSWAGEN, FIAT"}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Ano Fabricação</label>
                    <input type="text" name="anoFabricacao" value={formData.anoFabricacao} onChange={handleChange} className={styles.input} placeholder="Ex: 2022" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Ano Modelo</label>
                    <input type="text" name="anoModelo" value={formData.anoModelo} onChange={handleChange} className={styles.input} placeholder="Ex: 2023" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>{isMaquinaForm ? 'Nº de Série / Chassi' : 'Chassi'}</label>
                    <input type="text" name="chassi" value={formData.chassi} onChange={handleChange} className={styles.input} />
                  </div>
                </div>
              </div>

              {/* Seção 2: Especificações Técnicas */}
              <div className={styles.sessionBlock}>
                <div className={styles.sessionHeader}>
                  <Settings size={18} /> 2. Especificações Técnicas
                </div>
                <div className={`${styles.grid} ${styles.grid4}`}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Combustível</label>
                    <input type="text" name="combustivel" value={formData.combustivel} onChange={handleChange} className={styles.input} placeholder="Ex: DIESEL S10, GASOLINA" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Potência (CV / Cilindrada)</label>
                    <input type="text" name="potenciaCilindrada" value={formData.potenciaCilindrada} onChange={handleChange} className={styles.input} placeholder={isMaquinaForm ? "Ex: 180 CV" : "Ex: 280 CV"} />
                  </div>

                  {isMaquinaForm ? (
                    <>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Tipo de Tração</label>
                        <select name="tracao" value={formData.tracao || '4X4'} onChange={handleChange} className={styles.select}>
                          <option value="4X4">4x4 Integral</option>
                          <option value="4X2">4x2 Tração Traseira</option>
                          <option value="ESTEIRA">Esteira</option>
                          <option value="OUTRO">Outro</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Cor Predominante</label>
                        <input type="text" name="corPredominante" value={formData.corPredominante} onChange={handleChange} className={styles.input} placeholder="Ex: AMARELO, VERDE, VERMELHO" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Espécie / Tipo</label>
                        <input type="text" name="especieTipo" value={formData.especieTipo} onChange={handleChange} className={styles.input} placeholder="Ex: CARGA CAMINHAO" />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Carroceria</label>
                        <input type="text" name="carroceria" value={formData.carroceria} onChange={handleChange} className={styles.input} placeholder="Ex: BASCULANTE" />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Capacidade (Ton)</label>
                        <input type="text" name="capacidade" value={formData.capacidade} onChange={handleChange} className={styles.input} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Peso Bruto Total</label>
                        <input type="text" name="pesoBrutoTotal" value={formData.pesoBrutoTotal} onChange={handleChange} className={styles.input} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Eixos</label>
                        <input type="text" name="eixos" value={formData.eixos} onChange={handleChange} className={styles.input} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Cor Predominante</label>
                        <input type="text" name="corPredominante" value={formData.corPredominante} onChange={handleChange} className={styles.input} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Seção 3: Responsável / Operador */}
              <div className={styles.sessionBlock}>
                <div className={styles.sessionHeader}>
                  <User size={18} /> 3. Responsável / {isMaquinaForm ? 'Operador Principal' : 'Motorista Principal'}
                </div>
                <div className={`${styles.grid} ${styles.grid2}`}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nome do Responsável / Operador</label>
                    <input type="text" name="nomeProprietario" value={formData.nomeProprietario} onChange={handleChange} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>CPF / Matrícula</label>
                    <input type="text" name="cpfCnpj" value={formData.cpfCnpj} onChange={handleChange} className={styles.input} />
                  </div>
                </div>
              </div>

              {/* Seção 4: Manutenção Preventiva & Metas */}
              <div className={styles.sessionBlock}>
                <div className={styles.sessionHeader}>
                  {isMaquinaForm ? <Wrench size={18} /> : <Truck size={18} />} 4. Manutenção Preventiva & Metas ({labelMedicao})
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)', marginBottom: '12px' }}>
                  Insira o valor inicial do painel. As atualizações posteriores ocorrerão automaticamente via Ordem de Serviço.
                </p>
                
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', marginTop: '16px', borderBottom: '1px solid var(--cor-borda-cartao)', paddingBottom: '4px', color: 'var(--cor-destaque)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isMaquinaForm ? <Clock size={16} color="var(--cor-destaque)" /> : <Truck size={16} color="var(--cor-destaque)" />}
                  <span>{isMaquinaForm ? 'Horímetro do Painel' : 'Odômetro'}</span>
                  {formData.kmAtualOriginal && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--cor-texto-secundario)', fontWeight: '600' }}>
                      📌 Último Registro: <strong style={{ color: 'var(--cor-texto-principal)' }}>{formatarOdometroDisplay(formData.kmAtualOriginal, isMaquinaForm ? 'Horas' : 'KM')}</strong>
                    </span>
                  )}
                </div>
                <div className={`${styles.grid} ${styles.grid4}`}>
                  {(() => {
                    const validacaoKm = formData.kmAtualOriginal 
                      ? validarAntiRetrocessoKM(formData.kmAtual, formData.kmAtualOriginal, isMaquinaForm ? 'Horas' : 'KM') 
                      : { valido: true, retrocedeu: false };

                    return (
                      <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label className={styles.label} style={{ margin: 0 }}>
                            {isMaquinaForm ? 'Horímetro Atual (Horas)' : 'KM Atual do Painel'}
                          </label>
                          {formData.kmAtual && (
                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: validacaoKm.retrocedeu ? 'var(--cor-erro, #ef4444)' : 'var(--cor-destaque)' }}>
                              👀 {formatarOdometroDisplay(formData.kmAtual, isMaquinaForm ? 'Horas' : 'KM')}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          name="kmAtual"
                          value={formData.kmAtual}
                          onChange={handleChange}
                          className={styles.input}
                          placeholder={placeholderMedicao}
                          style={{ 
                            fontWeight: '800', 
                            color: validacaoKm.retrocedeu ? 'var(--cor-erro, #ef4444)' : 'var(--cor-destaque)',
                            borderColor: validacaoKm.retrocedeu ? 'var(--cor-erro, #ef4444)' : undefined 
                          }}
                        />
                        {validacaoKm.retrocedeu && (
                          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--cor-erro, #ef4444)', borderRadius: '6px', padding: '6px 10px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cor-erro, #ef4444)', fontSize: '0.75rem', fontWeight: '700' }}>
                            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                            <span>{validacaoKm.mensagem}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', marginTop: '16px', borderBottom: '1px solid var(--cor-borda-cartao)', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Droplet size={16} color="#3b82f6" />
                  <span>Troca de Óleo</span>
                </div>
                <div className={`${styles.grid} ${styles.grid4}`}>
                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className={styles.label} style={{ margin: 0 }}>{isMaquinaForm ? 'Última Troca (Horas)' : 'Última Troca (KM)'}</label>
                      {formData.kmTrocaOleo && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--cor-texto-secundario)' }}>
                          👀 {formatarOdometroDisplay(formData.kmTrocaOleo, isMaquinaForm ? 'Horas' : 'KM')}
                        </span>
                      )}
                    </div>
                    <input type="number" step="0.1" name="kmTrocaOleo" value={formData.kmTrocaOleo} onChange={handleChange} onClick={handleMaintenanceClick} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className={styles.label} style={{ margin: 0 }}>{isMaquinaForm ? 'Intervalo Troca de Óleo (Horas)' : 'Intervalo Troca de Óleo (KM)'}</label>
                      {formData.intervaloTrocaOleo && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--cor-texto-secundario)' }}>
                          👀 {formatarOdometroDisplay(formData.intervaloTrocaOleo, isMaquinaForm ? 'Horas' : 'KM')}
                        </span>
                      )}
                    </div>
                    <input type="number" step="1" name="intervaloTrocaOleo" value={formData.intervaloTrocaOleo} onChange={handleChange} onClick={handleMaintenanceClick} className={styles.input} placeholder={isMaquinaForm ? "250" : "10000"} />
                  </div>
                </div>

                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', marginTop: '16px', borderBottom: '1px solid var(--cor-borda-cartao)', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wrench size={16} color="#f59e0b" />
                  <span>Revisão Geral / Periódica</span>
                </div>
                <div className={`${styles.grid} ${styles.grid4}`}>
                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className={styles.label} style={{ margin: 0 }}>{isMaquinaForm ? 'Última Revisão (Horas)' : 'Última Revisão (KM)'}</label>
                      {formData.kmRevisao && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--cor-texto-secundario)' }}>
                          👀 {formatarOdometroDisplay(formData.kmRevisao, isMaquinaForm ? 'Horas' : 'KM')}
                        </span>
                      )}
                    </div>
                    <input type="number" step="0.1" name="kmRevisao" value={formData.kmRevisao} onChange={handleChange} onClick={handleMaintenanceClick} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className={styles.label} style={{ margin: 0 }}>{isMaquinaForm ? 'Intervalo Revisão Geral (Horas)' : 'Intervalo Revisão Geral (KM)'}</label>
                      {formData.intervaloRevisao && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--cor-texto-secundario)' }}>
                          👀 {formatarOdometroDisplay(formData.intervaloRevisao, isMaquinaForm ? 'Horas' : 'KM')}
                        </span>
                      )}
                    </div>
                    <input type="number" step="1" name="intervaloRevisao" value={formData.intervaloRevisao} onChange={handleChange} onClick={handleMaintenanceClick} className={styles.input} placeholder={isMaquinaForm ? "1000" : "50000"} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.actions} style={{ justifyContent: 'space-between' }}>
            {formData.placa ? (
              <button 
                type="button" 
                onClick={(e) => handleDeletar(formData.placa, e)}
                className={styles.btnExcluir}
                style={{ padding: '8px 16px', fontWeight: '700' }}
              >
                <Trash2 size={18} /> {isMaquinaForm ? 'Deletar Máquina' : 'Deletar Veículo'}
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className={styles.btnSecondary} onClick={() => setMostrarFormulario(false)}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnPrimary}>
                <Save size={18} /> {formData.id ? 'Salvar Alterações' : (isMaquinaForm ? 'Cadastrar Máquina' : 'Cadastrar Veículo')}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // Visualização de Lista
  return (
    <div className={styles.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 className={styles.cardTitle} style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
          <Truck size={24} style={{ marginRight: '8px', color: 'var(--cor-destaque)' }} />
          Ficha de Frota (Veículos & Máquinas)
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={styles.btnPrimary} onClick={() => { setFormData(estadoInicial); setMostrarFormulario(true); }}>
            <Plus size={18} /> Cadastrar Equipamento
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
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

      <div className={styles.veiculosGrid}>
        {isLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--cor-texto-secundario)', gridColumn: '1 / -1' }}>Carregando frota...</div>
        ) : veiculosFiltrados.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--cor-texto-secundario)', gridColumn: '1 / -1' }}>
            {busca ? 'Nenhum equipamento encontrado com a busca informada.' : 'Nenhum equipamento cadastrado nesta categoria.'}
          </div>
        ) : (
          veiculosFiltrados.map(v => {
            const isM = v.tipoEquipamento === 'MAQUINA' || v.tipoMedicao === 'Horas' || v.tipoMedicao === 'HORAS';
            const unidade = isM ? 'h' : 'km';
            const labelPainel = isM ? 'Horímetro' : 'KM';

            return (
              <div key={v.placa} className={styles.veiculoCard}>
                <div className={styles.veiculoCardInner}>
                  <div className={styles.veiculoFotoPlaceholder} style={{ padding: v.foto ? 0 : undefined, border: v.foto ? 'none' : undefined }}>
                    {v.foto ? (
                      <img src={v.foto} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <>
                        {isM ? <Wrench size={28} /> : <Truck size={28} />}
                        <span>Sem foto</span>
                      </>
                    )}
                  </div>
                  <div className={styles.veiculoInfo}>
                    <div className={styles.veiculoHeader}>
                      <h3 className={styles.veiculoPlaca}>{v.placa}</h3>
                      <span className={isM ? styles.badgeTipoMaquina : styles.badgeTipoVeiculo}>
                        {isM ? <><Wrench size={12} /> Máquina</> : <><Car size={12} /> Veículo</>}
                      </span>
                    </div>
                    <div className={styles.veiculoDetails}>
                      <p><strong>MODELO:</strong> {v.modelo || v.subtipoMaquina || '-'}</p>
                      <p><strong>MARCA:</strong> {v.marca || '-'}</p>
                      {v.kmAtual && (
                        <p style={{ color: 'var(--cor-destaque)', fontWeight: '700' }}>
                          <strong>{labelPainel}:</strong> {Number(v.kmAtual).toLocaleString('pt-BR')} {unidade}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.veiculoActions}>
                  <button className={styles.btnDetalhes} onClick={() => handleEditar(v)} title="Editar Detalhes">
                    <Edit size={16} /> Detalhes / Editar
                  </button>
                  <button className={styles.btnExcluir} onClick={(e) => handleDeletar(v.placa, e)} title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CadastroVeiculos;

