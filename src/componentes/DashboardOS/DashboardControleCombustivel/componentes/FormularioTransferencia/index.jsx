import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import styles from './index.module.css';

const FormularioTransferencia = ({ onClose, onSuccess, estoqueFisico = {} }) => {
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    origem: 'P YAMAVES',
    destino: '',
    produto: 'DIESEL',
    quantidade: '',
    observacao: '',
    lote_origem_id: '',
    valorUn: 0
  });

  const [tipoOrigem, setTipoOrigem] = useState('POSTO'); // 'POSTO', 'CAMINHAO', 'RESERVATORIO'
  const [tipoDestino, setTipoDestino] = useState('CAMINHAO'); // 'POSTO', 'CAMINHAO', 'RESERVATORIO'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [veiculos, setVeiculos] = useState([]);

  useEffect(() => {
    fetch(`/api/veiculos`)
      .then(res => res.json())
      .then(data => setVeiculos(data))
      .catch(err => console.error('Erro ao buscar veículos:', err));
  }, []);

  const [lotesDisponiveis, setLotesDisponiveis] = useState([]);

  useEffect(() => {
    const fetchLotes = async () => {
      if (!formData.origem || !formData.produto) {
        setLotesDisponiveis([]);
        return;
      }
      try {
        const res = await fetch(`/api/combustivel/lotes-disponiveis?estoque=${formData.origem}&produto=${formData.produto}`);
        if (res.ok) {
          const data = await res.json();
          setLotesDisponiveis(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, lote_origem_id: data[0].id, valorUn: data[0].valorUn || 0 }));
          } else {
            setFormData(prev => ({ ...prev, lote_origem_id: '', valorUn: 0 }));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar lotes:', err);
      }
    };
    fetchLotes();
  }, [formData.origem, formData.produto]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const isNumberOrDate = type === 'number' || type === 'date' || type === 'time';
    const finalValue = (typeof value === 'string' && !isNumberOrDate) ? value.toUpperCase() : value;
    
    if (name === 'lote_origem_id') {
      const loteEscolhido = lotesDisponiveis.find(l => l.id === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        valorUn: loteEscolhido?.valorUn || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: finalValue
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.origem === formData.destino) {
      alert("A origem e o destino não podem ser os mesmos.");
      return;
    }

    setIsSubmitting(true);

    const dadosEnvio = {
      ...formData,
      quantidade: parseFloat(formData.quantidade)
    };

    try {
      const response = await fetch(`/api/combustivel/transferencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosEnvio)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar transferência');
      }

      await response.json(); // We don't necessarily need the result right now if we refresh data
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar transferência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Nova Transferência</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Data</label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Produto</label>
              <select name="produto" value={formData.produto} onChange={handleChange} required>
                <option value="DIESEL">DIESEL</option>
                <option value="GASOLINA">GASOLINA</option>
                <option value="ARLA REDUX">ARLA REDUX</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Tipo de Origem</label>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'normal', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="tipoOrigem" 
                    value="POSTO" 
                    checked={tipoOrigem === 'POSTO'} 
                    onChange={() => { setTipoOrigem('POSTO'); setFormData({...formData, origem: ''}); }} 
                  />
                  Posto Físico
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'normal', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="tipoOrigem" 
                    value="CAMINHAO" 
                    checked={tipoOrigem === 'CAMINHAO'} 
                    onChange={() => { setTipoOrigem('CAMINHAO'); setFormData({...formData, origem: ''}); }} 
                  />
                  Caminhão / Veículo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'normal', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="tipoOrigem" 
                    value="RESERVATORIO" 
                    checked={tipoOrigem === 'RESERVATORIO'} 
                    onChange={() => { setTipoOrigem('RESERVATORIO'); setFormData({...formData, origem: ''}); }} 
                  />
                  Reservatório
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Origem (De onde vai sair o combustível)</label>
              <select
                name="origem" 
                value={formData.origem} 
                onChange={handleChange} 
                required 
                className={styles.selectInput}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--cor-borda-cartao)' }}
              >
                <option value="">Selecione a origem...</option>
                {tipoOrigem === 'POSTO' && (
                  <>
                    <option value="P YAMAVES">P YAMAVES</option>
                    <option value="ALMOXARIFADO">ALMOXARIFADO</option>
                  </>
                )}
                {tipoOrigem === 'RESERVATORIO' && (
                  <>
                    {['RESERVATÓRIO 1.000 LITROS - 1', 'RESERVATÓRIO 1.000 LITROS - 2', 'RESERVATÓRIO 1.000 LITROS - 3']
                      .filter(r => (estoqueFisico[r]?.[formData.produto] || 0) > 0)
                      .map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))
                    }
                  </>
                )}
                {tipoOrigem === 'CAMINHAO' && (
                  <>
                    {veiculos
                      .filter(v => (estoqueFisico[v.placa]?.[formData.produto] || 0) > 0)
                      .map(v => (
                      <option key={`origem-${v.placa}`} value={v.placa}>
                        {v.modelo ? `${v.modelo} - ${v.placa}` : v.placa}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label style={{ color: 'var(--cor-destaque)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Lote de Origem (Automático)
                {lotesDisponiveis.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--cor-erro)' }}>(Sem Saldo)</span>}
              </label>
              <select 
                name="lote_origem_id"
                value={formData.lote_origem_id}
                onChange={handleChange}
                required
                disabled={lotesDisponiveis.length === 0}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--cor-borda-cartao)', borderColor: lotesDisponiveis.length === 0 ? 'var(--cor-erro)' : 'var(--cor-borda-cartao)' }}
              >
                {lotesDisponiveis.length === 0 ? (
                  <option value="">Nenhum saldo físico disponível</option>
                ) : (
                  lotesDisponiveis.map(lote => (
                    <option key={lote.id} value={lote.id}>
                      NF: {lote.notaFiscal || 'S/N'} - Saldo: {parseFloat(lote.saldoRestante).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Tipo de Destino</label>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'normal', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="tipoDestino" 
                    value="POSTO" 
                    checked={tipoDestino === 'POSTO'} 
                    onChange={() => { setTipoDestino('POSTO'); setFormData({...formData, destino: ''}); }} 
                  />
                  Posto Físico
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'normal', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="tipoDestino" 
                    value="CAMINHAO" 
                    checked={tipoDestino === 'CAMINHAO'} 
                    onChange={() => { setTipoDestino('CAMINHAO'); setFormData({...formData, destino: ''}); }} 
                  />
                  Caminhão / Veículo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'normal', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="tipoDestino" 
                    value="RESERVATORIO" 
                    checked={tipoDestino === 'RESERVATORIO'} 
                    onChange={() => { setTipoDestino('RESERVATORIO'); setFormData({...formData, destino: ''}); }} 
                  />
                  Reservatório
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Destino (Para onde vai o combustível)</label>
              <select
                name="destino" 
                value={formData.destino} 
                onChange={handleChange} 
                required 
                className={styles.selectInput}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--cor-borda-cartao)' }}
              >
                <option value="">Selecione o destino...</option>
                {tipoDestino === 'POSTO' && (
                  <>
                    <option value="P YAMAVES">P YAMAVES</option>
                    <option value="ALMOXARIFADO">ALMOXARIFADO</option>
                  </>
                )}
                {tipoDestino === 'RESERVATORIO' && (
                  <>
                    <option value="RESERVATÓRIO 1.000 LITROS - 1">RESERVATÓRIO 1.000 LITROS - 1</option>
                    <option value="RESERVATÓRIO 1.000 LITROS - 2">RESERVATÓRIO 1.000 LITROS - 2</option>
                    <option value="RESERVATÓRIO 1.000 LITROS - 3">RESERVATÓRIO 1.000 LITROS - 3</option>
                  </>
                )}
                {tipoDestino === 'CAMINHAO' && (
                  <>
                    {veiculos.map(v => (
                      <option key={`destino-${v.placa}`} value={v.placa}>
                        {v.modelo ? `${v.modelo} - ${v.placa}` : v.placa}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Quantidade (Litros)</label>
              <input
                type="number"
                name="quantidade"
                step="0.01"
                value={formData.quantidade}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Observação</label>
              <input
                type="text"
                name="observacao"
                value={formData.observacao}
                onChange={handleChange}
                placeholder="Motivo ou detalhe extra..."
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className={`${styles.btnPrimary} ${styles.btnTransferir}`} disabled={isSubmitting}>
              <ArrowRightLeft size={18} />
              {isSubmitting ? 'Transferindo...' : 'Transferir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioTransferencia;
