import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import styles from './index.module.css';

const FormularioEntradaEstoque = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    fornecedor: '',
    produto: 'DIESEL',
    quantidade: '',
    notaFiscal: '',
    valorUn: '',
    estoque: 'P YAMAVES', // Local
    situacao: 'INTEGRO',
    observacao: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calcularValorTotal = () => {
    const qtd = parseFloat(formData.quantidade) || 0;
    const vu = parseFloat(formData.valorUn) || 0;
    return (qtd * vu).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dadosEnvio = {
      ...formData,
      valorTotal: calcularValorTotal(),
      quantidade: parseFloat(formData.quantidade),
      valorUn: parseFloat(formData.valorUn)
    };

    try {
      const response = await fetch('http://localhost:3000/api/combustivel/entradas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosEnvio)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar entrada de estoque');
      }

      const result = await response.json();
      onAdd(result.entrada);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar entrada de estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Nova Entrada de Estoque</h2>
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
              <label>Fornecedor</label>
              <input
                type="text"
                name="fornecedor"
                value={formData.fornecedor}
                onChange={handleChange}
                placeholder="Ex: M G PETROLEO"
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
              <label>Nota Fiscal</label>
              <input
                type="text"
                name="notaFiscal"
                value={formData.notaFiscal}
                onChange={handleChange}
                placeholder="Nº da NF"
              />
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
              <label>Valor Unitário (R$)</label>
              <input
                type="number"
                name="valorUn"
                step="0.01"
                value={formData.valorUn}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Valor Total (R$)</label>
              <input
                type="text"
                value={calcularValorTotal()}
                readOnly
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Estoque (Destino)</label>
              <select name="estoque" value={formData.estoque} onChange={handleChange} required>
                <option value="P YAMAVES">P YAMAVES</option>
                <option value="ALMOXARIFADO">ALMOXARIFADO</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Situação</label>
              <select name="situacao" value={formData.situacao} onChange={handleChange}>
                <option value="INTEGRO">INTEGRO</option>
                <option value="EM CONSUMO">EM CONSUMO</option>
                <option value="ESGOTADO">ESGOTADO</option>
              </select>
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label>Observação</label>
              <textarea
                name="observacao"
                value={formData.observacao}
                onChange={handleChange}
                rows="2"
                placeholder="Observações adicionais..."
              ></textarea>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              <Save size={18} />
              {isSubmitting ? 'Salvando...' : 'Salvar Entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioEntradaEstoque;
