import React from 'react';
import styles from './index.module.css';
import { Eye, Printer, Plus, ClipboardList } from 'lucide-react';
import { handleImprimirChecklist } from '../../../../utils/printChecklist';

const TabelaCheckList = ({ checklists = [], onView, onNovoCheckList }) => {
  // Função auxiliar para analisar o resumo do checklist
  const getResumo = (items) => {
    let ruins = 0;
    Object.values(items || {}).forEach(item => {
      if (item.status === 'ruim') ruins++;
    });

    if (ruins === 0) return { texto: 'Tudo OK', tipo: 'success' };
    if (ruins <= 3) return { texto: `${ruins} itens ruins`, tipo: 'warning' };
    return { texto: `${ruins} itens ruins`, tipo: 'error' };
  };

  const getBadgeClass = (tipo) => {
    switch (tipo) {
      case 'success': return styles.badgeSuccess;
      case 'warning': return styles.badgeWarning;
      case 'error': return styles.badgeError;
      default: return '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ClipboardList size={24} style={{ marginRight: '8px', color: 'var(--cor-destaque)' }} />
          <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--cor-texto-principal)' }}>Relatório de Check-Lists</h3>
        </div>

        {onNovoCheckList && (
          <button 
            type="button" 
            onClick={onNovoCheckList}
            style={{
              backgroundColor: 'var(--cor-destaque)',
              color: 'var(--cor-texto-inverso, #fff)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: '600',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 107, 0, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={18} /> Novo Check-List
          </button>
        )}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Data / Hora</th>
              <th>Veículo (Placa / Modelo)</th>
              <th>Condutor</th>
              <th>Resumo da Inspeção</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {checklists.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className={styles.emptyState}>
                    Nenhum check-list salvo ainda.
                  </div>
                </td>
              </tr>
            ) : (
              checklists.map((check) => {
                const resumo = getResumo(check.items);
                return (
                  <tr key={check.id}>
                    <td>
                      <div>{check.formData.data || '--/--/----'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>
                        {check.formData.hora || '--:--'}
                      </div>
                    </td>
                    <td>
                      <div><strong>{check.formData.placa || 'Sem placa'}</strong></div>
                      <div style={{ fontSize: '0.85rem' }}>{check.formData.modelo || 'Sem modelo'}</div>
                    </td>
                    <td>{check.formData.condutorNome || 'Não informado'}</td>
                    <td>
                      <span className={`${styles.badge} ${getBadgeClass(resumo.tipo)}`}>
                        {resumo.texto}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                        <button className={styles.btnIcon} title="Visualizar Detalhes" onClick={() => onView && onView(check)}>
                          <Eye size={18} />
                        </button>
                        <button className={styles.btnIcon} title="Imprimir" onClick={() => handleImprimirChecklist(check)}>
                          <Printer size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TabelaCheckList;
