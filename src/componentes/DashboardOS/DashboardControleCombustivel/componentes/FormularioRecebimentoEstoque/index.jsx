import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import styles from '../FormularioEntradaEstoque/index.module.css';

const FormularioRecebimentoEstoque = ({ entrada, onClose, onUpdate }) => {
  const [conferencia, setConferencia] = useState({
    dataChegada: new Date().toISOString().split('T')[0],
    pesoBruto: '',
    pesoTara: '',
    temperatura: '',
    densidade: ''
  });
  const [usarQuantidadeReal, setUsarQuantidadeReal] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConferenciaChange = (e) => {
    const { name, value } = e.target;
    setConferencia(prev => ({ ...prev, [name]: value }));
  };

  const pesoBrutoNum = parseFloat(conferencia.pesoBruto) || 0;
  const pesoTaraNum = parseFloat(conferencia.pesoTara) || 0;
  const pesoLiquido = Math.max(0, pesoBrutoNum - pesoTaraNum);
  
  const densidadeNum = parseFloat(conferencia.densidade) || 0;
  const volumeReal = densidadeNum > 0 ? (pesoLiquido / densidadeNum) : 0;
  
  const quantidadeNf = parseFloat(entrada.quantidade) || parseFloat(entrada.quantidadeNf) || 0;
  const diferencaLitros = volumeReal > 0 ? (volumeReal - quantidadeNf) : 0;
  
  const valorUnNum = parseFloat(entrada.valorUn) || 0;
  const valorQuebra = diferencaLitros * valorUnNum;
  
  let statusAmostra = '-';
  let statusCor = '#64748b';

  if (densidadeNum > 0) {
    if (densidadeNum < 0.810) {
      statusAmostra = 'FALTANDO COMPONENTE';
      statusCor = '#ef4444';
    } else if (densidadeNum > 0.875) {
      statusAmostra = 'MUITO COMPONENTE';
      statusCor = '#ef4444';
    } else {
      statusAmostra = 'OK (NO PARÂMETRO)';
      statusCor = '#10b981';
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const quantidadeFinal = (entrada.produto === 'DIESEL' && usarQuantidadeReal && volumeReal > 0) ? volumeReal : quantidadeNf;

    const dadosEnvio = {
      ...entrada,
      quantidade: quantidadeFinal,
      situacao: 'INTEGRO',
      conferencia: {
        dataChegada: conferencia.dataChegada,
        pesoBruto: pesoBrutoNum,
        pesoTara: pesoTaraNum,
        pesoLiquido,
        temperatura: parseFloat(conferencia.temperatura) || 0,
        densidade: densidadeNum,
        volumeReal,
        diferencaLitros,
        valorQuebra,
        status: statusAmostra,
        usarQuantidadeReal
      }
    };

    try {
      const response = await fetch(`/api/combustivel/entradas/${entrada.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosEnvio)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar recebimento');
      }

      const result = await response.json();
      onUpdate(result.entrada);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao registrar recebimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Recebimento de Combustível (NF: {entrada.notaFiscal || '-'})</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.conferenciaSection} style={{ padding: '16px', backgroundColor: 'var(--cor-fundo-secundario)', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--cor-texto-principal)', borderBottom: '1px solid var(--cor-borda-cartao)', paddingBottom: '8px' }}>
              Conferência Densimétrica (Balança / Proveta)
            </h3>
            
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Data de Chegada</label>
                <input
                  type="date"
                  name="dataChegada"
                  value={conferencia.dataChegada}
                  onChange={handleConferenciaChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Peso Bruto (Cheio) KG</label>
                <input
                  type="number"
                  name="pesoBruto"
                  step="0.01"
                  value={conferencia.pesoBruto}
                  onChange={handleConferenciaChange}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Peso Tara (Vazio) KG</label>
                <input
                  type="number"
                  name="pesoTara"
                  step="0.01"
                  value={conferencia.pesoTara}
                  onChange={handleConferenciaChange}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Temperatura (ºC)</label>
                <input
                  type="number"
                  name="temperatura"
                  step="0.1"
                  value={conferencia.temperatura}
                  onChange={handleConferenciaChange}
                  placeholder="0.0"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Densidade Observada</label>
                <input
                  type="number"
                  name="densidade"
                  step="0.001"
                  value={conferencia.densidade}
                  onChange={handleConferenciaChange}
                  placeholder="Ex: 0.832"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginTop: '16px', backgroundColor: 'var(--cor-fundo-cartao)', padding: '12px', borderRadius: '6px', border: '1px dashed var(--cor-borda-cartao)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', display: 'block' }}>Quantidade NF (L)</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--cor-texto-principal)' }}>{entrada.quantidade.toLocaleString('pt-BR')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', display: 'block' }}>Peso Líquido (KG)</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--cor-texto-principal)' }}>{pesoLiquido > 0 ? pesoLiquido.toLocaleString('pt-BR') : '-'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', display: 'block' }}>Qtd. Real Obtida (L)</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--cor-texto-principal)' }}>{volumeReal > 0 ? volumeReal.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '-'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', display: 'block' }}>Diferença NF (L)</span>
                <strong style={{ fontSize: '1.1rem', color: diferencaLitros < 0 ? 'var(--cor-erro)' : (diferencaLitros > 0 ? 'var(--cor-sucesso)' : 'var(--cor-texto-principal)') }}>
                  {volumeReal > 0 ? diferencaLitros.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '-'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', display: 'block' }}>Status Amostra</span>
                {statusAmostra !== '-' ? (
                  <span style={{ backgroundColor: statusCor, color: '#fff', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', display: 'inline-block', marginTop: '4px', textAlign: 'center' }}>
                    {statusAmostra}
                  </span>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Regra de Estoque: Qual quantidade deve dar entrada no sistema?</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '8px', backgroundColor: usarQuantidadeReal ? 'var(--cor-fundo-sutil)' : 'transparent' }}>
                  <input 
                    type="radio" 
                    name="regraEstoque"
                    checked={usarQuantidadeReal === true} 
                    onChange={() => setUsarQuantidadeReal(true)} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>
                    <b>Salvar o Volume Físico Real (Recomendado)</b> - O sistema ignora a NF e injeta apenas os litros reais obtidos na pesagem.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '8px', backgroundColor: !usarQuantidadeReal ? 'var(--cor-fundo-sutil)' : 'transparent' }}>
                  <input 
                    type="radio" 
                    name="regraEstoque"
                    checked={usarQuantidadeReal === false} 
                    onChange={() => setUsarQuantidadeReal(false)} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>
                    <b>Salvar a Quantidade da Nota Fiscal</b> - O sistema injeta os litros exatos da NF, mesmo que falte ou sobre no tanque físico.
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              <Save size={18} />
              {isSubmitting ? 'Salvando...' : 'Confirmar Recebimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioRecebimentoEstoque;
