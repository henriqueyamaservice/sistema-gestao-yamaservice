import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import styles from './index.module.css';

export default function ModalCadastroGerador({ isOpen, onClose, onSave }) {
  const [granja, setGranja] = useState('');
  const [marca, setMarca] = useState('');
  const [horimetroAtual, setHorimetroAtual] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [geradoresCadastrados, setGeradoresCadastrados] = useState([]);

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

  const fetchGeradores = async () => {
    try {
      const res = await fetch(`/api/geradores`);
      const data = await res.json();
      setGeradoresCadastrados(data);
    } catch (err) {
      console.error('Erro ao buscar geradores:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGeradores();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!granja) {
      alert('Selecione a granja associada.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/geradores`, {
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
      fetchGeradores();
      
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

  const handleDeletar = async (id, granjaNome) => {
    if (!window.confirm(`Tem certeza que deseja excluir o gerador da ${granjaNome}?`)) return;

    try {
      const res = await fetch(`/api/geradores/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Falha ao deletar gerador');

      alert('Gerador excluído com sucesso!');
      fetchGeradores();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir gerador.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.p20}`} style={{ maxWidth: '600px' }}>
        <div className={styles.modalHeader}>
          <h2>Cadastrar e Gerenciar Geradores</h2>
          <button className={styles.closeBtn} onClick={onClose} type="button">X</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
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

          <div className={styles.formActions} style={{ marginTop: '16px' }}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Fechar</button>
            <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Gerador'}
            </button>
          </div>
        </form>

        {/* Tabela de Geradores Já Cadastrados */}
        <div style={{ borderTop: '1px solid var(--cor-borda-cartao)', paddingTop: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '10px', color: 'var(--cor-texto-principal)' }}>
            Geradores Cadastrados ({geradoresCadastrados.length})
          </h3>
          
          {geradoresCadastrados.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>Nenhum gerador cadastrado no momento.</p>
          ) : (
            <div style={{ maxHeight: '180px', overflowY: 'auto', borderRadius: '6px', border: '1px solid var(--cor-borda-cartao)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--cor-fundo-sutil-forte)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px' }}>GRANJA</th>
                    <th style={{ padding: '6px 10px' }}>MARCA</th>
                    <th style={{ padding: '6px 10px' }}>HORÍMETRO</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center' }}>AÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {geradoresCadastrados.map(g => (
                    <tr key={g.id} style={{ borderBottom: '1px solid var(--cor-borda-cartao)' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 'bold' }}>{g.granja}</td>
                      <td style={{ padding: '6px 10px' }}>{g.marca || '-'}</td>
                      <td style={{ padding: '6px 10px' }}>{g.horimetroAtual || 0} h</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeletar(g.id, g.granja)}
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Excluir este Gerador"
                        >
                          <Trash2 size={12} /> Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
