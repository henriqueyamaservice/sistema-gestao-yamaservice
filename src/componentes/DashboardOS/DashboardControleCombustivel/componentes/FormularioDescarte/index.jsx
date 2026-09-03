import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import styles from '../FormularioEntradaEstoque/index.module.css';

const FormularioDescarte = ({ entrada, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    tipoAjuste: 'DESCARTE DE BORRA',
    data: new Date().toISOString().split('T')[0],
    origem: entrada?.estoque_destino || 'P YAMAVES',
    produto: entrada?.tipo_combustivel || 'DIESEL',
    quantidade: '',
    observacao: `Limpeza do Tanque / Borra referente à NF: ${entrada?.nota_fiscal || 'S/N'}`
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTipoChange = (e) => {
    const novoTipo = e.target.value;
    setFormData(prev => ({
      ...prev,
      tipoAjuste: novoTipo,
      observacao: novoTipo === 'AFERIÇÃO (QUEBRA DE RÉGUA)' 
        ? `Ajuste de Aferição / Diferença de Régua (Estoque físico menor que o sistema)` 
        : `Limpeza do Tanque / Borra referente à NF: ${entrada?.nota_fiscal || 'S/N'}`
    }));
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const isNumberOrDate = type === 'number' || type === 'date' || type === 'time';
    const finalValue = (typeof value === 'string' && !isNumberOrDate) ? value.toUpperCase() : value;
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dadosEnvio = {
      ...formData,
      quantidade: parseFloat(formData.quantidade)
    };

    try {
      const response = await fetch(`/api/combustivel/descarte`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosEnvio)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar descarte');
      }

      await response.json();
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar o registro de descarte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
        <div className={styles.modalHeader}>
          <h2>Ajuste de Estoque / Aferição</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label>Motivo do Ajuste</label>
              <select 
                name="tipoAjuste" 
                value={formData.tipoAjuste} 
                onChange={handleTipoChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--cor-borda-cartao)',
                  backgroundColor: 'var(--cor-fundo-secundario)',
                  color: 'var(--cor-texto-principal)',
                  fontSize: '1rem'
                }}
              >
                <option value="DESCARTE DE BORRA">Limpeza / Descarte de Borra</option>
                <option value="AFERIÇÃO (QUEBRA DE RÉGUA)">Aferição (Quebra de Régua / Falta no Tanque)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Data do Ajuste</label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Tanque de Origem</label>
              <input 
                name="origem" 
                value={formData.origem} 
                onChange={handleChange} 
                required 
                readOnly
                style={{ backgroundColor: 'var(--cor-fundo-sutil)' }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Produto / Resíduo</label>
              <input 
                name="produto" 
                value={formData.produto} 
                onChange={handleChange} 
                required 
                readOnly
                style={{ backgroundColor: 'var(--cor-fundo-sutil)' }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Quantidade Reduzida (Litros)</label>
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

            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label>Observação / Motivo</label>
              <input
                type="text"
                name="observacao"
                value={formData.observacao}
                onChange={handleChange}
                placeholder="Ex: Diferença detectada na medição..."
                required
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} style={{ backgroundColor: 'var(--cor-erro)' }} disabled={isSubmitting}>
              <Trash2 size={18} />
              {isSubmitting ? 'Registrando...' : 'Confirmar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioDescarte;
