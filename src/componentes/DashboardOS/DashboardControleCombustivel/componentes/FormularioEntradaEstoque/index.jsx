import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import styles from './index.module.css';
import { parseMoeda } from '../../../../../utils/parseMoeda';

const FormularioEntradaEstoque = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    fornecedor: '',
    produto: 'DIESEL',
    quantidade: '',
    notaFiscal: '',
    valorUn: '',
    estoque: 'P YAMAVES',
    situacao: 'AGUARDANDO COMBUSTIVEL',
    prazoEntrega: '',
    observacao: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const isNumberOrDate = type === 'number' || type === 'date' || type === 'time';
    const finalValue = (typeof value === 'string' && !isNumberOrDate) ? value.toUpperCase() : value;
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const calcularValorTotal = () => {
    const qtd = parseMoeda(formData.quantidade);
    const vu = parseMoeda(formData.valorUn);
    return (qtd * vu).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dadosEnvio = {
      ...formData,
      valorTotal: calcularValorTotal(),
      quantidade: parseMoeda(formData.quantidade),
      quantidadeNf: parseMoeda(formData.quantidade),
      valorUn: parseMoeda(formData.valorUn)
    };

    try {
      const response = await fetch(`/api/combustivel/entradas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosEnvio)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar pedido de entrada');
      }

      const result = await response.json();
      onAdd(result.entrada);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar pedido de entrada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Novo Pedido de Combustível</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Data do Pedido</label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Prazo de Entrega</label>
              <input
                type="date"
                name="prazoEntrega"
                value={formData.prazoEntrega}
                onChange={handleChange}
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
              <label>Quantidade Pedida / NF (L)</label>
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
                className={styles.inputReadOnly}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Estoque (Destino)</label>
              <input 
                list="estoques-list"
                name="estoque" 
                value={formData.estoque} 
                onChange={handleChange} 
                required 
                placeholder="Ex: P YAMAVES, CAMINHÃO X"
              />
              <datalist id="estoques-list">
                <option value="P YAMAVES" />
                <option value="ALMOXARIFADO" />
              </datalist>
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
              {isSubmitting ? 'Salvando...' : 'Salvar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioEntradaEstoque;
