import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import styles from './index.module.css';

const FormularioTransferencia = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    origem: 'P YAMAVES',
    destino: '',
    produto: 'DIESEL',
    quantidade: '',
    observacao: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [veiculos, setVeiculos] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/veiculos')
      .then(res => res.json())
      .then(data => setVeiculos(data))
      .catch(err => console.error('Erro ao buscar veículos:', err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      const response = await fetch('http://localhost:3000/api/combustivel/transferencia', {
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
              <label>Origem</label>
              <input 
                list="estoques-origem"
                name="origem" 
                value={formData.origem} 
                onChange={handleChange} 
                required 
                placeholder="De onde vai sair o combustível"
              />
              <datalist id="estoques-origem">
                <option value="P YAMAVES" />
                <option value="ALMOXARIFADO" />
              </datalist>
            </div>

            <div className={styles.formGroup}>
              <label>Destino (Caminhão / Posto)</label>
              <input 
                list="estoques-destino"
                name="destino" 
                value={formData.destino} 
                onChange={handleChange} 
                required 
                placeholder="Para onde vai o combustível"
              />
              <datalist id="estoques-destino">
                {veiculos.map(v => (
                  <option key={v.placa} value={v.placa}>
                    {v.nome ? `${v.nome} - ${v.placa}` : v.placa}
                  </option>
                ))}
              </datalist>
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
