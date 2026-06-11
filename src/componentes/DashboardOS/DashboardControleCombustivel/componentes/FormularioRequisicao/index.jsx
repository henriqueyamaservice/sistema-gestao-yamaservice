import React, { useState, useEffect } from 'react';
import { Save, FileText, X } from 'lucide-react';
import styles from '../../index.module.css';

const FormularioRequisicao = ({ onAdd, onClose }) => {
  const [formData, setFormData] = useState({
    numeroRequisicao: '',
    data: new Date().toISOString().split('T')[0],
    requisitante: '',
    veiculo: '',
    fornecedor: 'ORIENTE',
    combustivel: 'DIESEL'
  });

  const [veiculos, setVeiculos] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/veiculos')
      .then(res => res.json())
      .then(data => setVeiculos(data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/combustivel/requisicao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        if (onAdd) {
          onAdd(result.requisicao);
          if (onClose) onClose();
        }
      } else {
        alert(result.message || 'Erro ao cadastrar requisição');
      }
    } catch (error) {
      console.error(error);
      alert('Erro na comunicação com o servidor');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalCard}>
        {onClose && (
          <button type="button" onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        )}

        <h2 className={styles.cardTitle}>
          <FileText size={20} className={styles.logoIcon} />
          Nova Requisição
        </h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nº Requisição</label>
            <input 
              type="text" 
              name="numeroRequisicao"
              value={formData.numeroRequisicao}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Data</label>
            <input 
              type="date" 
              name="data"
              value={formData.data}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Requisitante</label>
            <input 
              type="text" 
              name="requisitante"
              value={formData.requisitante}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Veículo/Máquina/Trator</label>
            <select 
              name="veiculo"
              value={formData.veiculo}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="">Selecione...</option>
              {veiculos.map(v => (
                <option key={v.placa} value={v.placa}>{v.placa} {v.modelo ? `- ${v.modelo}` : ''}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Fornecedor</label>
            <select 
              name="fornecedor"
              value={formData.fornecedor}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="ORIENTE">ORIENTE</option>
              <option value="P YAMAVES">P YAMAVES</option>
              <option value="ALMOXARIFADO">ALMOXARIFADO</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Combustível</label>
            <select 
              name="combustivel"
              value={formData.combustivel}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="DIESEL">DIESEL</option>
              <option value="GASOLINA">GASOLINA</option>
              <option value="ARLA REDUX">ARLA REDUX</option>
            </select>
          </div>

          <button type="submit" className={styles.btnPrimary}>
            <Save size={18} />
            CADASTRAR REQUISIÇÃO
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormularioRequisicao;
