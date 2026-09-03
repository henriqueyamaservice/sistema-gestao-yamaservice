import React, { useState, useEffect } from 'react';
import { X, ChevronDown, UserCheck } from 'lucide-react';
import styles from '../../DashboardChefeSetor.module.css';

const SeletorTecnico = ({ tecnicos, valorSelecionado, onSelect, placeholder = "DIGITE PARA FILTRAR O TÉCNICO..." }) => {
  const [busca, setBusca] = useState(valorSelecionado || '');
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (valorSelecionado !== undefined) {
      setBusca(valorSelecionado || '');
    }
  }, [valorSelecionado]);

  // Filtro dinâmico em tempo real à medida que o usuário digita
  const termo = busca.trim().toLowerCase();
  const filtrados = (tecnicos || []).filter(t => {
    if (!t) return false;
    if (!termo) return true;
    const nome = (t.nomeExibicao || t.nome || t.nome_fantasia || t.razao_social || '').toLowerCase();
    return nome.includes(termo);
  });

  const handleSelectOption = (nomeTecnico) => {
    setBusca(nomeTecnico);
    onSelect(nomeTecnico);
    setAberto(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setBusca(val);
    onSelect(val);
    setAberto(true);
  };

  const handleLimpar = (e) => {
    e.stopPropagation();
    setBusca('');
    onSelect('');
    setAberto(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input 
          type="text"
          placeholder={placeholder}
          value={busca}
          onFocus={() => setAberto(true)}
          onChange={handleInputChange}
          className={styles.seletorInput}
        />

        <div style={{ position: 'absolute', right: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {busca ? (
            <button
              type="button"
              onClick={handleLimpar}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--cor-texto-secundario)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
              title="Limpar seleção"
            >
              <X size={14} />
            </button>
          ) : (
            <ChevronDown size={16} style={{ color: 'var(--cor-texto-secundario)', pointerEvents: 'none' }} />
          )}
        </div>
      </div>

      {aberto && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1999 }} 
            onClick={() => setAberto(false)} 
          />

          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'var(--cor-fundo-cartao)',
            border: '1px solid var(--cor-borda-cartao)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 2000
          }}>
            {filtrados.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--cor-texto-secundario)', textAlign: 'center' }}>
                Nenhum técnico/mecânico encontrado com "{busca}".
              </div>
            ) : (
              filtrados.map(t => {
                const nomeTecnico = t.nomeExibicao || t.nome_fantasia || t.razao_social || t.nome;
                const isSelected = (busca || '').trim().toUpperCase() === (nomeTecnico || '').trim().toUpperCase();

                return (
                  <div
                    key={t.id || t.codigo || nomeTecnico}
                    onClick={() => handleSelectOption(nomeTecnico)}
                    style={{
                      padding: '10px 12px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--cor-borda-cartao)',
                      color: isSelected ? 'var(--cor-destaque)' : 'var(--cor-texto-principal)',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSelected ? 'var(--cor-fundo-sutil-forte)' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--cor-fundo-sutil)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? 'var(--cor-fundo-sutil-forte)' : 'transparent';
                    }}
                  >
                    <span>{nomeTecnico}</span>
                    {isSelected && <UserCheck size={14} style={{ color: 'var(--cor-destaque)' }} />}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SeletorTecnico;
