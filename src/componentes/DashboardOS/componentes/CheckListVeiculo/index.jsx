import React, { useState, useEffect } from 'react';
import styles from './index.module.css';
import { Save, Link as LinkIcon, CheckCircle, Printer, ClipboardCheck } from 'lucide-react';
import { handleImprimirChecklist } from '../../../../utils/printChecklist';

const itensChecklist = [
  "BUZINA", "CINTO DE SEGURANÇA", "QUEBRA SOL", "RETROVISOR INTERNO", "RETROVISOR -DIREITO/ESQUERDO",
  "LIMPADOR PÁRA-BRISA TRASEIRO", "FAROL BAIXO", "FAROL ALTO", "MEIA LUZ", "LUZ DE FREIO",
  "LUZ DE RÉ", "LUZ DA PLACA", "LUZES DO PAINEL", "SETA – DIREITA/ESQUERDA", "PISCA ALERTA",
  "ÓLEO HIDRAULICO", "VELOCÍMETRO / TACÓGRAFO", "FREIOS", "MACACO", "CHAVE DE RODA",
  "TRIÂNGULO DE SINALIZAÇÃO", "EXTINTOR DE INCÊNDIO", "PORTAS – TRAVAS", "ALARME", "FECHAMENTO DAS JANELAS",
  "PÁRA-BRISA", "ÓLEO DO MOTOR", "ÓLEO DE FREIO", "NÍVEL DA ÁGUA DO RADIADOR", "PNEUS (ESTADO/CALIBRAGEM)",
  "PNEU RESERVA (ESTEPE)", "BANCOS ENCOSTO/ASSENTOS", "PÁRA-CHOQUE DIANTEIRO", "PÁRA-CHOQUE TRASEIRO", "LATARIA",
  "LIMPEZA INTERNA", "CÂMERA DE MONITORAMENTO"
];

const CheckListVeiculo = ({ isPublic = false, onSave, onClose, initialData = {}, checklist = null, readOnly = false }) => {
  const [formData, setFormData] = useState(
    checklist ? checklist.formData : {
      placa: initialData.placa || '',
      modelo: initialData.modelo || '',
      condutorNome: initialData.condutorNome || '',
      condutorAssinatura: '',
      habilitacao: 'em_dia', // 'em_dia' or 'vencida'
      data: '',
      hora: '',
      obsGerais: '',
      assinaturaEncarregado: '',
      assinaturaSeguranca: ''
    }
  );

  const [items, setItems] = useState(checklist ? checklist.items : {});
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Initialize items and check if token is already used
  useEffect(() => {
    if (checklist) return; // If viewing a saved checklist, don't re-initialize

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (isPublic && token) {
      const alreadySubmitted = localStorage.getItem(`checklist_submitted_${token}`);
      if (alreadySubmitted) {
        setIsSubmitted(true);
      }
    }

    // Preencher dados vindo da URL no modo público
    if (isPublic) {
      const pPlaca = params.get('placa');
      const pModelo = params.get('modelo');
      const pCondutor = params.get('condutorNome');
      setFormData(prev => ({
        ...prev,
        placa: pPlaca || prev.placa,
        modelo: pModelo || prev.modelo,
        condutorNome: pCondutor || prev.condutorNome,
        data: prev.data || new Date().toISOString().split('T')[0]
      }));
    }

    const initItems = {};
    itensChecklist.forEach((item, index) => {
      initItems[index] = { status: '', obs: '' }; // status: 'ok' | 'ruim'
    });
    setItems(initItems);
  }, []);

  const handleItemChange = (index, field, value) => {
    const finalValue = (field === 'obs' && typeof value === 'string') ? value.toUpperCase() : value;
    setItems(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: finalValue
      }
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const isNumberOrDate = type === 'number' || type === 'date' || type === 'time' || type === 'radio';
    const finalValue = (typeof value === 'string' && !isNumberOrDate) ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleCopyLink = () => {
    if (!formData.placa || !formData.placa.trim()) {
      alert("⚠️ Digite a PLACA do veículo antes de gerar o link!");
      return;
    }
    if (!formData.modelo || !formData.modelo.trim()) {
      alert("⚠️ Digite o MODELO do veículo antes de gerar o link!");
      return;
    }

    const params = new URLSearchParams();
    params.append('checklist_publico', 'true');
    params.append('token', Date.now().toString() + Math.floor(Math.random() * 1000));
    
    if (formData.placa) params.append('placa', formData.placa);
    if (formData.modelo) params.append('modelo', formData.modelo);
    if (formData.condutorNome) params.append('condutorNome', formData.condutorNome);

    const url = `${window.location.origin}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 3000);
    });
  };

  const handleSave = () => {
    // 1. Validação dos Campos Gerais
    if (!formData.placa || !formData.placa.trim()) {
      alert("⚠️ Preencha a PLACA do veículo!");
      return;
    }
    if (!formData.modelo || !formData.modelo.trim()) {
      alert("⚠️ Preencha o MODELO do veículo!");
      return;
    }
    if (!formData.condutorNome || !formData.condutorNome.trim()) {
      alert("⚠️ Preencha o NOME DO CONDUTOR!");
      return;
    }
    if (!formData.data) {
      alert("⚠️ Selecione a DATA do check-list!");
      return;
    }
    if (!formData.hora) {
      alert("⚠️ Selecione a HORA do check-list!");
      return;
    }

    // 2. Validação Obrigatória de cada item (Obrigatório selecionar OK, RUIM ou escrever Observação)
    for (let i = 0; i < itensChecklist.length; i++) {
      const itemData = items[i];
      const hasStatus = itemData && (itemData.status === 'ok' || itemData.status === 'ruim');
      const hasObs = itemData && itemData.obs && itemData.obs.trim() !== '';

      if (!hasStatus && !hasObs) {
        const itemNome = itensChecklist[i];
        alert(`⚠️ ATENÇÃO - ITEM NÃO PREENCHIDO ⚠️\n\nO item "${String(i + 1).padStart(2, '0')} - ${itemNome}" precisa ter uma resposta!\n\nSelecione OK, RUIM ou digite uma Observação para este item.`);
        
        const el = document.getElementById(`item-tr-${i}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }

    console.log("Checklist Salvo!", { formData, items });
    
    if (onSave) {
      onSave({ formData, items });
    }

    alert("Checklist salvo com sucesso!");
    
    if (isPublic) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        localStorage.setItem(`checklist_submitted_${token}`, 'true');
      }
      
      // Salvar no backend via API
      fetch(`/api/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, items })
      }).catch(err => console.error("Erro ao enviar checklist público:", err));

      setIsSubmitted(true);
      return; // Stop here for public view
    }

    // Limpar o formulário (apenas no painel interno)
    setFormData({
      placa: '',
      modelo: '',
      condutorNome: '',
      condutorAssinatura: '',
      habilitacao: 'em_dia',
      data: '',
      hora: '',
      obsGerais: '',
      assinaturaEncarregado: '',
      assinaturaSeguranca: ''
    });
    const initItems = {};
    itensChecklist.forEach((item, index) => {
      initItems[index] = { status: '', obs: '' };
    });
  };

  if (isSubmitted) {
      return (
        <div className={`${styles.container} ${styles.publicContainer}`} style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CheckCircle size={64} color="green" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ color: 'var(--cor-texto-principal)', marginBottom: '10px' }}>Check-List Enviado!</h2>
          <p style={{ color: 'var(--cor-texto-secundario)' }}>
            Obrigado. Este check-list já foi enviado com sucesso e o link expirou. 
            Você pode fechar esta tela.
          </p>
        </div>
      );
  }

  return (
    <div className={`${styles.container} ${isPublic ? styles.publicContainer : ''}`} style={readOnly ? { maxHeight: '90vh', overflowY: 'auto' } : {}}>
      <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <ClipboardCheck size={24} style={{ marginRight: '8px', color: 'var(--cor-destaque)' }} />
          <h2 style={{ margin: 0, padding: 0 }}>CHECK LIST DO VEÍCULO</h2>
        </div>
        <div className={styles.vehicleInfo}>
          <div className={styles.inputGroup}>
            <label>PLACA:</label>
            <input 
              type="text" 
              name="placa" 
              value={formData.placa} 
              onChange={handleInputChange} 
              className={styles.input} 
              placeholder="AAA-1234"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>MODELO:</label>
            <input 
              type="text" 
              name="modelo" 
              value={formData.modelo} 
              onChange={handleInputChange} 
              className={styles.input} 
              placeholder="Ex: Fiat Uno"
            />
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th width="5%">ITEM</th>
              <th width="40%">DESCRIÇÃO</th>
              <th width="25%">CONDIÇÕES</th>
              <th width="30%">OBSERVAÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {itensChecklist.map((item, index) => (
              <tr key={index} id={`item-tr-${index}`}>
                <td>{String(index + 1).padStart(2, '0')}</td>
                <td className={styles.itemDescricao}>{item}</td>
                <td>
                  <div className={styles.radioGroup}>
                    <label className={`${styles.radioLabel} ${items[index]?.status === 'ok' ? styles.radioLabelOk : ''}`}>
                      <input 
                        type="radio" 
                        name={`status-${index}`} 
                        className={styles.radioInput}
                        checked={items[index]?.status === 'ok'}
                        onChange={() => handleItemChange(index, 'status', 'ok')}
                      />
                      OK
                    </label>
                    <label className={`${styles.radioLabel} ${items[index]?.status === 'ruim' ? styles.radioLabelRuim : ''}`}>
                      <input 
                        type="radio" 
                        name={`status-${index}`} 
                        className={styles.radioInput}
                        checked={items[index]?.status === 'ruim'}
                        onChange={() => handleItemChange(index, 'status', 'ruim')}
                      />
                      RUIM
                    </label>
                  </div>
                </td>
                <td>
                  <input 
                    type="text" 
                    className={styles.obsInput} 
                    value={items[index]?.obs || ''}
                    onChange={(e) => handleItemChange(index, 'obs', e.target.value)}
                    placeholder="Opcional..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.footerSection}>
        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>Nome do Condutor:</label>
            <input type="text" name="condutorNome" value={formData.condutorNome} onChange={handleInputChange} className={styles.input} />
          </div>
          <div className={styles.inputGroup}>
            <label>Assinatura (Motorista):</label>
            <input type="text" name="condutorAssinatura" value={formData.condutorAssinatura} onChange={handleInputChange} className={styles.input} placeholder="Digite seu nome para assinar" />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>Habilitação:</label>
            <div className={styles.radioGroup} style={{ marginTop: '10px' }}>
              <label className={styles.radioLabel}>
                <input type="radio" name="habilitacao" value="em_dia" checked={formData.habilitacao === 'em_dia'} onChange={handleInputChange} className={styles.radioInput} /> Em dia
              </label>
              <label className={styles.radioLabel}>
                <input type="radio" name="habilitacao" value="vencida" checked={formData.habilitacao === 'vencida'} onChange={handleInputChange} className={styles.radioInput} /> Vencida
              </label>
            </div>
          </div>
          <div className={styles.inputGroup}>
            <label>Data:</label>
            <input type="date" name="data" value={formData.data} onChange={handleInputChange} className={styles.input} />
          </div>
          <div className={styles.inputGroup}>
            <label>Hora:</label>
            <input type="time" name="hora" value={formData.hora} onChange={handleInputChange} className={styles.input} />
          </div>
        </div>

        <div className={styles.inputGroup} style={{ marginTop: '16px' }}>
          <label>Observações Gerais:</label>
          <textarea name="obsGerais" value={formData.obsGerais} onChange={handleInputChange} className={styles.textarea}></textarea>
        </div>

        {!isPublic && (
          <div className={styles.row} style={{ marginTop: '16px' }}>
            <div className={styles.inputGroup}>
              <label>Assinatura Encarregado de Oficina:</label>
              <input type="text" name="assinaturaEncarregado" value={formData.assinaturaEncarregado} onChange={handleInputChange} className={styles.input} />
            </div>
            <div className={styles.inputGroup}>
              <label>Setor de Segurança do Trabalho:</label>
              <input type="text" name="assinaturaSeguranca" value={formData.assinaturaSeguranca} onChange={handleInputChange} className={styles.input} />
            </div>
          </div>
        )}
      </div>
      </fieldset>

      <div className={styles.actions}>
        {readOnly ? (
          <>
            <button className={styles.btnPrimary} onClick={() => handleImprimirChecklist({ formData, items })}>
              <Printer size={18} />
              Imprimir Check-List
            </button>
            <button className={styles.btnSecondary} onClick={onClose}>
              Fechar
            </button>
          </>
        ) : (
          <>
            {!isPublic && (
              <button className={styles.btnSecondary} onClick={handleCopyLink}>
                {linkCopiado ? <CheckCircle size={18} color="green" /> : <LinkIcon size={18} />}
                {linkCopiado ? 'Link Copiado!' : 'Gerar Link Compartilhável'}
              </button>
            )}
            <button className={styles.btnPrimary} onClick={handleSave}>
              <Save size={18} />
              Salvar Check-List
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckListVeiculo;
