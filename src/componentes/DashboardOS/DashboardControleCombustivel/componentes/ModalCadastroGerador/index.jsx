import React, { useState } from 'react';
import styles from './index.module.css';

export default function ModalCadastroGerador({ isOpen, onClose, onSave }) {
  const [granja, setGranja] = useState('');
  const [marca, setMarca] = useState('');
  const [horimetroAtual, setHorimetroAtual] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const granjas = [
    'G. AREAL',
    'G. PALMEIRA',
    'G. ITA',
    'G. MOSQUEIRO',
    'G. GENIPAUBA',
    'G. CAMPINA',
    'G. AGUA BRANCA',
    'G. CASTANHEIRA',
    'G. GUARIMÃ',
    'G. SÃO CAETANO',
    'G. AVICEMA',
    'G. KIMURA',
    'G. KAWAMURA'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!granja) {
      alert('Selecione a granja associada.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:3000/api/geradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          granja,
          marca,
          horimetroAtual: parseFloat(horimetroAtual) || 0
        })
      });

      if (!response.ok) throw new Error('Erro ao salvar gerador');
      
      const data = await response.json();
      alert('Gerador cadastrado com sucesso!');
      onSave(data.gerador);
      onClose();
      // Limpa form
      setGranja('');
      setMarca('');
      setHorimetroAtual('');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar o gerador.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.p20}`} style={{ maxWidth: '500px' }}>
        <div className={styles.modalHeader}>
          <h2>Cadastrar Gerador</h2>
          <button className={styles.closeBtn} onClick={onClose} type="button">X</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label>Granja Associada *</label>
              <select 
                value={granja} 
                onChange={e => setGranja(e.target.value)}
                required
              >
                <option value="">Selecione a Granja</option>
                {granjas.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Marca do Gerador</label>
              <input 
                type="text" 
                placeholder="Ex: MWM, CUMMINS..."
                value={marca}
                onChange={e => setMarca(e.target.value.toUpperCase())}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Horímetro Atual Inicial</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="Ex: 855"
                value={horimetroAtual}
                onChange={e => setHorimetroAtual(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Gerador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
