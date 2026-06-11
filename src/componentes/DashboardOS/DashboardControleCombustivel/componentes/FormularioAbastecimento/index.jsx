import React, { useState, useEffect } from 'react';
import { Save, Fuel, X } from 'lucide-react';
import styles from '../../index.module.css';

const FormularioAbastecimento = ({ onAdd, requisicao, onClose }) => {
  const [formData, setFormData] = useState({
    cupom: '',
    km: '',
    qtde: '',
    combustivel: requisicao ? requisicao.combustivel : 'DIESEL',
    valorUnitario: '',
    ultimoKm: '',
    media: ''
  });
  
  const [veiculosList, setVeiculosList] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/veiculos')
      .then(res => res.json())
      .then(data => setVeiculosList(data))
      .catch(err => console.error('Erro ao buscar veículos:', err));
  }, []);

  // Efeito para preencher a placa automaticamente se vier da requisição
  useEffect(() => {
    if (requisicao && requisicao.veiculo) {
      // O veículo da requisição pode vir já preenchido. 
      // Se vier, podemos tentar achar o KM Atual dele.
      const vEncontrado = veiculosList.find(v => v.placa === requisicao.veiculo);
      if (vEncontrado) {
        const k1 = parseFloat(vEncontrado.kmAtual) || 0;
        const k2 = parseFloat(vEncontrado.kmTrocaOleo) || 0;
        const k3 = parseFloat(vEncontrado.kmRevisao) || 0;
        const maxKm = Math.max(k1, k2, k3);
        const kmSugerido = maxKm > 0 ? maxKm : '';
        setFormData(prev => ({ ...prev, ultimoKm: kmSugerido }));
      }
    }
  }, [requisicao, veiculosList]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requisicao) return;

    if (onAdd) {
      const valorTotal = (parseFloat(formData.qtde) * parseFloat(formData.valorUnitario)).toFixed(2);
      
      const payload = {
        ...formData,
        mes: new Date(requisicao.data).toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }),
        motorista: requisicao.requisitante,
        uConsu: requisicao.veiculo,
        valorTotal
      };

      try {
        const identificador = requisicao.id || requisicao.numeroRequisicao;
        const response = await fetch(`http://localhost:3000/api/combustivel/abastecimento/${identificador}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
          onAdd(result.requisicao);
          if (onClose) onClose();
        } else {
          alert(result.message || 'Erro ao registrar abastecimento');
        }
      } catch (error) {
        console.error(error);
        alert('Erro na comunicação com o servidor');
      }
    }
  };

  if (!requisicao) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalCard} style={{ maxWidth: '700px' }}>
        {onClose && (
          <button type="button" onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        )}

        <h2 className={styles.cardTitle}>
          <Fuel size={20} className={styles.logoIcon} />
          Lançar Abastecimento - Req. {requisicao.numeroRequisicao}
        </h2>

        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px', padding: '8px', backgroundColor: 'var(--cor-fundo-sutil)', borderRadius: '8px' }}>
            <div>
              <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>Data</span>
              <strong style={{ fontSize: '0.85rem' }}>{requisicao.data ? requisicao.data.split('-').reverse().join('/') : ''}</strong>
            </div>
            <div>
              <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>Motorista</span>
              <strong style={{ fontSize: '0.85rem' }}>{requisicao.requisitante}</strong>
            </div>
            <div>
              <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>Fornecedor</span>
              <strong style={{ fontSize: '0.85rem' }}>{requisicao.fornecedor}</strong>
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>Veículo</span>
              <select 
                className={styles.select} 
                style={{ padding: '2px 8px', fontSize: '0.85rem', width: '100%', border: 'none', background: 'transparent', fontWeight: 'bold' }}
                value={requisicao.veiculo || ''}
                onChange={(e) => {
                  const placaSelecionada = e.target.value;
                  // Atualiza a requisição localmente se necessário, mas o FormularioAbastecimento 
                  // usa o requisicao.veiculo direto do parent. Como a requisição já foi criada, 
                  // talvez o usuário só possa ver a placa. Vamos ver a regra.
                }}
                disabled
              >
                <option value={requisicao.veiculo}>{requisicao.veiculo}</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Cupom Fiscal</label>
              <input type="text" name="cupom" value={formData.cupom} onChange={handleChange} className={styles.input} required style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Combustível</label>
              <select name="combustivel" value={formData.combustivel} onChange={handleChange} className={styles.select} required style={{ padding: '6px 8px', fontSize: '0.85rem' }}>
                <option value="DIESEL">DIESEL</option>
                <option value="GASOLINA">GASOLINA</option>
                <option value="ARLA REDUX">ARLA REDUX</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>KM Atual</label>
              <input type="number" step="0.1" name="km" value={formData.km} onChange={handleChange} className={styles.input} required style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Último KM</label>
              <input type="number" step="0.1" name="ultimoKm" value={formData.ultimoKm} onChange={handleChange} className={styles.input} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Quantidade (L)</label>
              <input type="number" step="0.01" name="qtde" value={formData.qtde} onChange={handleChange} className={styles.input} required style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>V. Unitário (R$)</label>
              <input type="number" step="0.01" name="valorUnitario" value={formData.valorUnitario} onChange={handleChange} className={styles.input} required style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>V. Total (R$)</label>
              <input type="text" readOnly value={formData.qtde && formData.valorUnitario ? `R$ ${(formData.qtde * formData.valorUnitario).toFixed(2)}` : 'R$ 0.00'} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem', color: 'var(--cor-destaque)', fontWeight: 'bold' }} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Média KM/L</label>
              <input type="text" readOnly value={formData.km && formData.ultimoKm && formData.qtde ? ((formData.km - formData.ultimoKm) / formData.qtde).toFixed(2) : '-'} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem', fontWeight: 'bold' }} />
            </div>
          </div>

          <button type="submit" className={styles.btnPrimary}>
            <Save size={18} />
            FINALIZAR ABASTECIMENTO
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormularioAbastecimento;
