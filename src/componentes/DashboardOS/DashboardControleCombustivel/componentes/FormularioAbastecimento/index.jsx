import React, { useState, useEffect } from 'react';
import { Save, Fuel, X } from 'lucide-react';
import styles from './index.module.css';

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
  const [geradoresList, setGeradoresList] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/veiculos')
      .then(res => res.json())
      .then(data => setVeiculosList(data))
      .catch(err => console.error('Erro ao buscar veículos:', err));

    fetch('http://localhost:3000/api/geradores')
      .then(res => res.json())
      .then(data => setGeradoresList(data))
      .catch(err => console.error('Erro ao buscar geradores:', err));
  }, []);

  // Efeito para preencher a placa automaticamente se vier da requisição
  useEffect(() => {
    if (requisicao && requisicao.veiculo) {
      // 1. Tenta achar nos veículos
      const vEncontrado = veiculosList.find(v => v.placa === requisicao.veiculo);
      if (vEncontrado) {
        const k1 = parseFloat(vEncontrado.kmAtual) || 0;
        const k2 = parseFloat(vEncontrado.kmTrocaOleo) || 0;
        const k3 = parseFloat(vEncontrado.kmRevisao) || 0;
        const maxKm = Math.max(k1, k2, k3);
        const kmSugerido = maxKm > 0 ? maxKm : '';
        setFormData(prev => ({ ...prev, ultimoKm: kmSugerido }));
        return;
      }

      // 2. Tenta achar nos geradores (pela granja)
      const gEncontrado = geradoresList.find(g => g.granja === requisicao.veiculo);
      if (gEncontrado) {
        const maxKm = parseFloat(gEncontrado.horimetroAtual) || 0;
        const kmSugerido = maxKm > 0 ? maxKm : '';
        setFormData(prev => ({ ...prev, ultimoKm: kmSugerido }));
      }
    }
  }, [requisicao, veiculosList, geradoresList]);

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
      <div className={`${styles.modalCard} ${styles.modalCardWide}`}>
        {onClose && (
          <button type="button" onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        )}

        <h2 className={styles.cardTitle}>
          <Fuel size={20} className={styles.logoIcon} />
          Lançar Abastecimento - Req. {requisicao.numeroRequisicao}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          
          <div className={styles.infoGrid}>
            <div>
              <span className={`${styles.label} ${styles.labelTiny}`}>Data</span>
              <strong className={styles.infoValue}>{requisicao.data ? requisicao.data.split('-').reverse().join('/') : ''}</strong>
            </div>
            <div>
              <span className={`${styles.label} ${styles.labelTiny}`}>Motorista</span>
              <strong className={styles.infoValue}>{requisicao.requisitante}</strong>
            </div>
            <div>
              <span className={`${styles.label} ${styles.labelTiny}`}>Fornecedor</span>
              <strong className={styles.infoValue}>{requisicao.fornecedor}</strong>
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <span className={`${styles.label} ${styles.labelTiny}`}>Veículo</span>
              <select 
                className={`${styles.select} ${styles.selectDisabled}`}
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

          <div className={styles.grid2Cols}>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>Cupom Fiscal</label>
              <input type="text" name="cupom" value={formData.cupom} onChange={handleChange} className={`${styles.input} ${styles.inputSmall}`} required />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>Combustível</label>
              <select 
                name="combustivel" 
                value={formData.combustivel} 
                onChange={handleChange} 
                className={`${styles.select} ${styles.inputSmall}`} 
                required 
                style={{ opacity: (requisicao.veiculo && (requisicao.veiculo.toUpperCase().includes('GERADOR') || requisicao.veiculo.toUpperCase().includes('GRANJA') || requisicao.veiculo.toUpperCase().startsWith('G. '))) ? 0.7 : 1 }}
                disabled={requisicao.veiculo && (requisicao.veiculo.toUpperCase().includes('GERADOR') || requisicao.veiculo.toUpperCase().includes('GRANJA') || requisicao.veiculo.toUpperCase().startsWith('G. '))}
              >
                <option value="DIESEL">DIESEL</option>
                <option value="GASOLINA">GASOLINA</option>
                <option value="ARLA REDUX">ARLA REDUX</option>
              </select>
            </div>
          </div>

          <div className={styles.grid3Cols}>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>Horímetro / KM Atual</label>
              <input type="number" step="0.1" name="km" value={formData.km} onChange={handleChange} className={`${styles.input} ${styles.inputSmall}`} required />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>Último Horímetro / KM</label>
              <input type="number" step="0.1" name="ultimoKm" value={formData.ultimoKm} onChange={handleChange} className={`${styles.input} ${styles.inputSmall}`} />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>Quantidade (L)</label>
              <input type="number" step="0.01" name="qtde" value={formData.qtde} onChange={handleChange} className={`${styles.input} ${styles.inputSmall}`} required />
            </div>
          </div>

          <div className={styles.grid3Cols}>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>V. Unitário (R$)</label>
              <input type="number" step="0.01" name="valorUnitario" value={formData.valorUnitario} onChange={handleChange} className={`${styles.input} ${styles.inputSmall}`} required />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>V. Total (R$)</label>
              <input type="text" readOnly value={formData.qtde && formData.valorUnitario ? `R$ ${(formData.qtde * formData.valorUnitario).toFixed(2)}` : 'R$ 0.00'} className={`${styles.input} ${styles.inputReadOnly} ${styles.inputSmall} ${styles.inputSmallTotal}`} />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>Média Trabalhada</label>
              <input type="text" readOnly value={formData.km && formData.ultimoKm && formData.qtde ? ((formData.km - formData.ultimoKm) / formData.qtde).toFixed(2) : '-'} className={`${styles.input} ${styles.inputReadOnly} ${styles.inputSmall} ${styles.inputSmallBold}`} title="Diferença / Qtd Litros" />
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
