import React, { useState } from 'react';
import { Wrench, Search, Send, Trash2, CheckCircle, X, AlertCircle } from 'lucide-react';
import styles from './ModalRequisicaoPecasTecnico.module.css';
import { PECAS_ENTREGUES, AGUARDANDO_ALMOXARIFADO } from '../../../../utils/osStatus';

const ModalRequisicaoPecasTecnico = ({ os, produtosEstoque, onClose, onSave }) => {
  const isAdicional = os.isAdicional === true;
  const [termoPeca, setTermoPeca] = useState('');
  const [pecaSelecionada, setPecaSelecionada] = useState(null);
  const [qtdPeca, setQtdPeca] = useState(1);
  const [pecasSolicitadas, setPecasSolicitadas] = useState(os.pecasSolicitadas || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prodsFiltrados = termoPeca.length >= 2
    ? produtosEstoque.filter(p =>
      (p.descricao || '').toLowerCase().includes(termoPeca.toLowerCase()) ||
      (p.codigo || '').toLowerCase().includes(termoPeca.toLowerCase())
    ).slice(0, 5)
    : [];

  const handleAdicionarPeca = () => {
    if (!pecaSelecionada || qtdPeca <= 0) return;
    const itemExistente = pecasSolicitadas.find(p => p.codigo === pecaSelecionada.codigo && p._nova);
    if (itemExistente) {
      setPecasSolicitadas(pecasSolicitadas.map(p =>
        (p.codigo === pecaSelecionada.codigo && p._nova) ? { ...p, quantidade: Number(p.quantidade) + Number(qtdPeca) } : p
      ));
    } else {
      setPecasSolicitadas([...pecasSolicitadas, {
        codigo: pecaSelecionada.codigo,
        descricao: pecaSelecionada.descricao,
        quantidade: Number(qtdPeca),
        valor_unitario: pecaSelecionada.valor_unitario || 0,
        status: 'AGUARDANDO_CHEFE_ADICIONAL',
        _nova: true
      }]);
    }
    setPecaSelecionada(null); setTermoPeca(''); setQtdPeca(1);
  };

  const handleRemoverPeca = (codigo) => {
    // Só permite remover as que são novas nesta sessão
    setPecasSolicitadas(pecasSolicitadas.filter(p => !(p.codigo === codigo && p._nova)));
  };

  const pecasAntigas = pecasSolicitadas.filter(p => !p._nova);
  const pecasNovas = pecasSolicitadas.filter(p => p._nova);

  const handleEnviarRequisicao = async () => {
    if (pecasNovas.length === 0) {
      alert("Adicione pelo menos uma nova peça para solicitar ao Chefe de Setor.");
      return;
    }

    // Garantir que todas as peças novas estejam com status AGUARDANDO_CHEFE_ADICIONAL
    const pecasLimpas = pecasSolicitadas.map(p => {
      const { _nova, ...rest } = p;
      if (p._nova) {
        return { ...rest, status: 'AGUARDANDO_CHEFE_ADICIONAL' };
      }
      return rest;
    });

    setIsSubmitting(true);

    try {
      // Atualiza a OS enviando as novas peças para aprovação do Chefe do Setor
      const res = await fetch(`/api/os/${os.id || os.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pecasSolicitadas: pecasLimpas,
          dataRequisicaoPecas: new Date().toISOString()
        })
      });

      if (res.ok) {
        alert('Material solicitado com sucesso! Um alerta foi enviado para a aprovação do Chefe do Setor.');
        onSave();
      } else {
        alert('Erro ao atualizar a O.S.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ou sistema: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.stickyModalHeader}>
          <div className={styles.modalHeaderFlex} style={{ margin: 0 }}>
            <h3>{isAdicional ? 'Solicitação de Material Adicional (O.S. ' + os.codigo + ')' : 'Requisição de Peças (Almoxarifado)'}</h3>
            <button className={styles.btnCloseModal} onClick={onClose}><X size={20} /></button>
          </div>
        </div>
        
        {!isAdicional ? (
          <div className={styles.alertaInformativo} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>ATENÇÃO:</strong> O Chefe do Setor já enviou o material para você retirar no Almoxarifado, mas você pode conferir as peças e também solicitar mais materiais para esta O.S.
            </div>
          </div>
        ) : (
          <div className={styles.alertaInformativo} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: '#8b5cf6', color: '#6d28d9' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>ATENÇÃO:</strong> Você pode pedir mais materiais para esta O.S. para o Chefe de Setor autorizar. Assim que ele autorizar, você poderá retirar diretamente no Almoxarifado.
            </div>
          </div>
        )}

        <div className={styles.sectionForm}>
          <h4 className={styles.sectionTitle}><Search size={16} /> Buscar no Estoque</h4>

          {!pecaSelecionada ? (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar peça por nome ou código..."
                value={termoPeca}
                onChange={e => setTermoPeca(e.target.value)}
                className={styles.modalInput}
              />
              {prodsFiltrados.length > 0 && (
                <ul className={styles.listaBusca}>
                  {prodsFiltrados.map(p => (
                    <li key={p.codigo} onClick={() => { setPecaSelecionada(p); setTermoPeca(''); }}>
                      <strong>{p.codigo}</strong> - {p.descricao}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className={styles.pecaSelectedRow}>
              <span className={styles.pecaName}><strong>Selecionado:</strong> {pecaSelecionada.descricao}</span>
              <input
                type="number"
                min="1"
                className={styles.qtdInput}
                value={qtdPeca}
                onChange={e => setQtdPeca(e.target.value)}
                title="Quantidade"
              />
              <button className={styles.btnSmallConfirm} onClick={handleAdicionarPeca}>Adicionar à Lista</button>
              <button className={styles.btnSmallCancel} onClick={() => setPecaSelecionada(null)}>Cancelar</button>
            </div>
          )}
        </div>

        {pecasAntigas.length > 0 && (
          <div className={styles.sectionForm} style={{ backgroundColor: 'var(--cor-fundo-sutil)', border: '1px solid var(--cor-borda-cartao)' }}>
            <h4 className={styles.sectionTitle} style={{ color: 'var(--cor-texto-secundario)' }}>Peças Já Retiradas/Solicitadas Anteriormente ({pecasAntigas.length})</h4>
            <div className={styles.tableResp}>
              <table className={styles.tableForm} style={{ opacity: 0.8 }}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Qtd.</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pecasAntigas.map((p, idx) => {
                    const isEntregue = p.status === 'ENTREGUE' || p.status === PECAS_ENTREGUES || p.status === 'ENTREGUE_ALMOXARIFADO';
                    const isAguardandoChefe = p.status === 'AGUARDANDO_CHEFE_ADICIONAL';
                    
                    const statusText = p.status || 'AGUARDANDO_ALMOXARIFADO';

                    const statusColor = isEntregue 
                      ? '#059669' 
                      : isAguardandoChefe 
                      ? '#d97706' 
                      : '#2563eb';

                    return (
                      <tr key={idx} style={{ fontSize: '0.72rem' }}>
                        <td style={{ fontSize: '0.72rem', opacity: 0.8 }}>{p.codigo}</td>
                        <td style={{ fontSize: '0.72rem' }}>{p.descricao}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.72rem' }}>{p.quantidade}</td>
                        <td style={{ fontSize: '0.72rem', color: statusColor, fontWeight: 'bold' }}>
                          {statusText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={styles.sectionForm}>
          <h4 className={styles.sectionTitle}>Novo Lote de Peças a Solicitar ({pecasNovas.length})</h4>

          {pecasNovas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--cor-texto-secundario)', fontStyle: 'italic', fontSize: '0.9rem' }}>
              Nenhuma nova peça adicionada neste lote.
            </div>
          ) : (
            <div className={styles.tableResp}>
              <table className={styles.tableForm}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Qtd.</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pecasNovas.map((p, idx) => (
                    <tr key={idx} style={{ fontSize: '0.72rem' }}>
                      <td style={{ fontSize: '0.72rem', opacity: 0.8 }}>{p.codigo}</td>
                      <td style={{ fontSize: '0.72rem' }}>{p.descricao}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.72rem' }}>{p.quantidade}</td>
                      <td>
                        <button className={styles.btnDelLine} onClick={() => handleRemoverPeca(p.codigo)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.btnSalvarRascunho} onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button
            className={styles.btnFinalizarOS}
            onClick={handleEnviarRequisicao}
            disabled={(isAdicional ? pecasNovas.length === 0 : pecasSolicitadas.length === 0) || isSubmitting}
          >
            <Send size={18} /> Enviar Requisição ao Almoxarifado
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalRequisicaoPecasTecnico;
