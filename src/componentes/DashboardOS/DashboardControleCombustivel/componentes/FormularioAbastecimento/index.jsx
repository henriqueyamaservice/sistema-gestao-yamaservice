import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Save, Fuel, X, Ban, User, Lock, Camera, Eye, RefreshCw, Trash2 } from 'lucide-react';
import styles from './index.module.css';
import { parseMoeda } from '../../../../../utils/parseMoeda';
import { ABASTECIDA } from '../../../../../utils/combustivelStatus';
import { validarAntiRetrocessoKM, formatarNumeroBR } from '../../../../../utils/formatadorOdometro';
import InputOdometroInteligente from '../InputOdometroInteligente';

const FormularioAbastecimento = ({ onAdd, requisicao, onClose }) => {
  const [erroRetrocesso, setErroRetrocesso] = useState(false);
  const [reqAtual, setReqAtual] = useState(requisicao);

  const [formData, setFormData] = useState(() => {
    const hoje = new Date();
    const anoHoje = hoje.getFullYear();
    const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0');
    const diaHoje = String(hoje.getDate()).padStart(2, '0');
    const dataHojeStr = `${anoHoje}-${mesHoje}-${diaHoje}`;
    const horaHojeStr = `${String(hoje.getHours()).padStart(2, '0')}:${String(hoje.getMinutes()).padStart(2, '0')}`;

    let cupomInicial = (requisicao && requisicao.cupom) || '';
    if (!cupomInicial && requisicao) {
      const forn = (requisicao.fornecedor || '').toUpperCase();
      if (!forn.includes('ORIENTE') && requisicao.numeroRequisicao) {
        cupomInicial = String(requisicao.numeroRequisicao);
      }
    }

    let dataAbastInicial = (requisicao && (requisicao.data_abastecimento || (requisicao.data_hora ? requisicao.data_hora.split('T')[0] : ''))) || dataHojeStr;
    let horaAbastInicial = (requisicao && (requisicao.hora_abastecimento || (requisicao.data_hora && requisicao.data_hora.includes('T') ? requisicao.data_hora.split('T')[1].substring(0, 5) : ''))) || horaHojeStr;

    return {
      cupom: cupomInicial,
      data_abastecimento: dataAbastInicial,
      hora_abastecimento: horaAbastInicial,
      km: (requisicao && (requisicao.km || requisicao.km_abastecimento)) || '',
      qtde: (requisicao && (requisicao.qtde || requisicao.litros)) || '',
      combustivel: requisicao ? requisicao.combustivel : 'DIESEL',
      valorUnitario: '',
      ultimoKm: '',
      media: '',
      loteTemValor: false
    };
  });

  // Identificação do Usuário e Colaborador ativo
  const currentUser = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('almoxarifado_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);
  const isAdmin = currentUser?.role === 'admin';

  // Identificação do Colaborador responsável pelo preenchimento manual (Bloqueado pelo login ativo)
  const colaboradorResponsavel = React.useMemo(() => {
    if (currentUser) {
      return currentUser.nome || currentUser.username || 'Colaborador (Almoxarifado)';
    }
    return 'Colaborador (Almoxarifado)';
  }, [currentUser]);

  // Foto do Comprovante / Visor da Bomba
  const [fotoComprovante, setFotoComprovante] = useState(
    (requisicao && (requisicao.fotoNota || requisicao.fotoVisor || requisicao.foto || requisicao.fotoComprovante)) || ''
  );
  const [fotoZoom, setFotoZoom] = useState(null);
  const fileInputRef = useRef(null);

  // Sincroniza foto do comprovante e dados caso a requisição seja atualizada (ex: vinda do chat)
  useEffect(() => {
    if (requisicao) {
      setReqAtual(requisicao);
      const f = requisicao.fotoNota || requisicao.fotoVisor || requisicao.foto || requisicao.fotoComprovante || '';
      if (f) {
        setFotoComprovante(f);
      }
      if (requisicao.cupom) {
        setFormData(prev => ({ ...prev, cupom: requisicao.cupom }));
      } else {
        const forn = (requisicao.fornecedor || '').toUpperCase();
        if (!forn.includes('ORIENTE') && requisicao.numeroRequisicao) {
          setFormData(prev => ({ ...prev, cupom: String(requisicao.numeroRequisicao) }));
        }
      }
      if (requisicao.data_abastecimento) {
        setFormData(prev => ({ ...prev, data_abastecimento: requisicao.data_abastecimento }));
      }
      if (requisicao.hora_abastecimento) {
        setFormData(prev => ({ ...prev, hora_abastecimento: requisicao.hora_abastecimento }));
      }
      if (requisicao.qtde || requisicao.litros) {
        setFormData(prev => ({ ...prev, qtde: requisicao.qtde || requisicao.litros }));
      }
      if (requisicao.km || requisicao.km_abastecimento) {
        setFormData(prev => ({ ...prev, km: requisicao.km || requisicao.km_abastecimento }));
      }

      // Busca dados frescos em tempo real para sincronizar foto ou apontamentos vindos do chatbox
      const reqId = requisicao.id || requisicao.numeroRequisicao;
      if (reqId) {
        fetch(`/api/combustivel?_t=${Date.now()}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              const fresh = data.find(r => String(r.id) === String(reqId) || String(r.numeroRequisicao) === String(reqId));
              if (fresh) {
                setReqAtual(fresh);
                const freshFoto = fresh.fotoNota || fresh.fotoVisor || fresh.foto || fresh.fotoComprovante;
                if (freshFoto) setFotoComprovante(freshFoto);
                if (fresh.cupom) {
                  setFormData(p => ({ ...p, cupom: fresh.cupom }));
                } else {
                  const forn = (fresh.fornecedor || requisicao.fornecedor || '').toUpperCase();
                  if (!forn.includes('ORIENTE') && (fresh.numeroRequisicao || requisicao.numeroRequisicao)) {
                    setFormData(p => ({ ...p, cupom: String(fresh.numeroRequisicao || requisicao.numeroRequisicao) }));
                  }
                }
                if (fresh.data_abastecimento) setFormData(p => ({ ...p, data_abastecimento: fresh.data_abastecimento }));
                if (fresh.hora_abastecimento) setFormData(p => ({ ...p, hora_abastecimento: fresh.hora_abastecimento }));
                if (fresh.qtde || fresh.litros) setFormData(p => ({ ...p, qtde: fresh.qtde || fresh.litros }));
                if (fresh.km || fresh.km_abastecimento) setFormData(p => ({ ...p, km: fresh.km || fresh.km_abastecimento }));
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [requisicao]);

  // Compressão e tratamento da foto
  const handleCaptureFoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.src = ev.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.70);
        setFotoComprovante(dataUrl);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  
  const [veiculosList, setVeiculosList] = useState([]);
  const [geradoresList, setGeradoresList] = useState([]);

  useEffect(() => {
    fetch('/api/veiculos')
      .then(res => res.json())
      .then(data => setVeiculosList(data))
      .catch(err => console.error('Erro ao buscar veículos:', err));

    fetch('/api/geradores')
      .then(res => res.json())
      .then(data => setGeradoresList(data))
      .catch(err => console.error('Erro ao buscar geradores:', err));
  }, []);

  // Efeito para preencher a placa automaticamente se vier da requisição
  useEffect(() => {
    if (requisicao && requisicao.veiculo) {
      // 1. Tenta achar nos veículos
      const vEncontrado = veiculosList.find(v => v.placa === requisicao.veiculo);
      if (vEncontrado) {
        const k1 = parseFloat(vEncontrado.kmAtual) || 0;
        const k2 = parseFloat(vEncontrado.kmTrocaOleo) || 0;
        const k3 = parseFloat(vEncontrado.kmRevisao) || 0;
        const maxKm = Math.max(k1, k2, k3);
        const kmSugerido = maxKm > 0 ? maxKm : '';
        setFormData(prev => ({ ...prev, ultimoKm: kmSugerido }));
        return;
      }

      // 2. Tenta achar nos geradores (pela granja)
      const gEncontrado = geradoresList.find(g => g.granja === requisicao.veiculo);
      if (gEncontrado) {
        const maxKm = parseFloat(gEncontrado.horimetroAtual) || 0;
        const kmSugerido = maxKm > 0 ? maxKm : '';
        setFormData(prev => ({ ...prev, ultimoKm: kmSugerido }));
      }
    }
  }, [requisicao, veiculosList, geradoresList]);

  // Efeito para preencher o Valor Unitário com base no Lote de Origem ou Posto Oriente
  useEffect(() => {
    if (!requisicao) return;

    const isPostoOriente = (requisicao.fornecedor || '').toUpperCase().includes('ORIENTE');

    if (isPostoOriente) {
      // Posto Oriente: Preço externo de mercado, fica vazio no manual para ser digitado pelo operador
      setFormData(prev => ({
        ...prev,
        valorUnitario: requisicao.valorUnitario || requisicao.valor_litro || '',
        loteTemValor: false
      }));
      return;
    }

    // Posto Yamaves / Almoxarifado / Tanques Internos: Custo contábil do estoque
    // 1. Se já veio gravado na requisição:
    const vGravado = requisicao.valorUnitario || requisicao.valor_litro;
    if (vGravado && parseFloat(vGravado) > 0) {
      setFormData(prev => ({
        ...prev,
        valorUnitario: vGravado,
        loteTemValor: true
      }));
      return;
    }

    // 2. Se tem lote_origem_id, busca nas entradas
    if (requisicao.lote_origem_id) {
      fetch(`/api/combustivel/entradas`)
        .then(res => res.json())
        .then(data => {
          const lote = data.find(e => String(e.id) === String(requisicao.lote_origem_id));
          if (lote && parseFloat(lote.valorUn) > 0) {
            setFormData(prev => ({ ...prev, valorUnitario: lote.valorUn, loteTemValor: true }));
          } else {
            setFormData(prev => ({ ...prev, loteTemValor: false }));
          }
        })
        .catch(err => console.error('Erro ao buscar lote origem:', err));
      return;
    }

    // 3. Fallback: busca lotes disponíveis do fornecedor/combustível
    if (requisicao.fornecedor && requisicao.combustivel) {
      fetch(`/api/combustivel/lotes-disponiveis?estoque=${requisicao.fornecedor}&produto=${requisicao.combustivel}`)
        .then(res => res.json())
        .then(lotes => {
          if (Array.isArray(lotes) && lotes.length > 0 && parseFloat(lotes[0].valorUn) > 0) {
            setFormData(prev => ({ ...prev, valorUnitario: lotes[0].valorUn, loteTemValor: true }));
          } else {
            setFormData(prev => ({ ...prev, loteTemValor: false }));
          }
        })
        .catch(err => console.error('Erro ao buscar fallback de lotes:', err));
    }
  }, [requisicao]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let finalValue = value;
    if (name === 'km') {
      finalValue = value;
    } else {
      const isNumberOrDate = type === 'number' || type === 'date' || type === 'time';
      finalValue = (typeof value === 'string' && !isNumberOrDate) ? value.toUpperCase() : value;
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleCancel = async () => {
    if (!requisicao) return;

    const confirm = window.confirm(`Deseja realmente cancelar a Requisição #${requisicao.numeroRequisicao}?`);
    if (!confirm) return;

    try {
      const identificador = requisicao.id || requisicao.numeroRequisicao;
      const response = await fetch(`/api/combustivel/cancelar/${identificador}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motivoCancelamento: 'Cancelado pelo usuário' })
      });

      const result = await response.json();

      if (response.ok) {
        if (onAdd) onAdd(result.requisicao);
        if (onClose) onClose();
      } else {
        alert(result.message || 'Erro ao cancelar requisição');
      }
    } catch (error) {
      console.error(error);
      alert('Erro na comunicação com o servidor ao cancelar requisição.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (erroRetrocesso) {
      alert("Corrija o KM / Horímetro antes de salvar. Não é permitido retroceder.");
      return;
    }
    if (!requisicao) return;

    if (formData.km && formData.ultimoKm > 0) {
      const isHorimetro = requisicao.veiculo && (requisicao.veiculo.toUpperCase().includes('GERADOR') || requisicao.veiculo.toUpperCase().includes('GRANJA') || requisicao.veiculo.toUpperCase().startsWith('G. ') || requisicao.tipo === 'granja' || requisicao.tipo === 'gerador');
      const tipoMedicao = isHorimetro ? 'Horas' : 'KM';
      const validacaoKm = validarAntiRetrocessoKM(formData.km, formData.ultimoKm, tipoMedicao);

      if (validacaoKm.retrocedeu) {
        const confirmar = window.confirm(
          `ℹ️ REGISTRO DE ODÔMETRO:\n\n` +
          `O valor informado (${formatarNumeroBR(formData.km)} ${tipoMedicao}) é menor que o odômetro atual da frota (${formatarNumeroBR(formData.ultimoKm)} ${tipoMedicao}).\n\n` +
          `Deseja confirmar e prosseguir com o lançamento?`
        );
        if (!confirmar) return;
      } else if (!validacaoKm.valido) {
        alert(validacaoKm.mensagem);
        return;
      }
    }

    // Identificação do Usuário/Colaborador para Auditoria
    let preenchidoPor = colaboradorResponsavel.trim() || 'Almoxarifado';
    let usuarioId = null;
    let usuarioUsername = '';
    let usuarioTipo = 'almoxarifado';
    try {
      const saved = localStorage.getItem('almoxarifado_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (!colaboradorResponsavel.trim()) {
          preenchidoPor = u.nome || u.username || 'Almoxarifado';
        }
        usuarioId = u.id || null;
        usuarioUsername = u.username || '';
        usuarioTipo = u.role || 'almoxarifado';
      }
    } catch (err) {
      console.error('Erro ao ler usuario:', err);
    }

    // Regra de Separação de Postos:
    // 1. Motorista abastece exclusivamente no Posto Oriente
    if (usuarioTipo === 'motorista') {
      const forn = (requisicao.fornecedor || '').toUpperCase();
      if (!forn.includes('ORIENTE')) {
        alert('Atenção: Motoristas têm permissão para registrar abastecimentos exclusivamente no Posto Oriente. Abastecimentos internos (Posto Yamaves e Bomba do Almoxarifado) são de responsabilidade do Frentista Yamaves.');
        return;
      }
    }

    // 2. Frentista Yamaves abastece Posto Yamaves e Bomba do Almoxarifado
    if (usuarioTipo === 'frentista') {
      const forn = (requisicao.fornecedor || '').toUpperCase();
      if (forn.includes('ORIENTE')) {
        alert('Atenção: Requisições do Posto Oriente (posto externo) devem ser lançadas diretamente pelo próprio motorista que abasteceu.');
        return;
      }
    }

    if (onAdd) {
      const valorTotal = (parseMoeda(formData.qtde) * parseMoeda(formData.valorUnitario)).toFixed(2);
      
      const dataHoraISO = formData.data_abastecimento 
        ? `${formData.data_abastecimento}T${formData.hora_abastecimento || '12:00'}:00` 
        : new Date().toISOString();

      const payload = {
        ...formData,
        data_abastecimento: formData.data_abastecimento,
        hora_abastecimento: formData.hora_abastecimento,
        data_hora: dataHoraISO,
        data_hora_abastecimento: dataHoraISO,
        data_finalizacao: dataHoraISO,
        mes: new Date(requisicao.data).toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }),
        motorista: requisicao.requisitante || requisicao.motorista,
        uConsu: requisicao.veiculo,
        valorTotal,
        preenchido_por: preenchidoPor,
        usuario_id: usuarioId,
        usuario_username: usuarioUsername,
        usuario_tipo: usuarioTipo,
        origem_abastecimento: 'MANUAL',
        foto: fotoComprovante,
        fotoNota: fotoComprovante,
        fotoVisor: fotoComprovante,
        fotoComprovante: fotoComprovante
      };

      try {
        const identificador = requisicao.id || requisicao.numeroRequisicao;
        const response = await fetch(`/api/combustivel/abastecimento/${identificador}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
          onAdd(result.requisicao);
          if (onClose) onClose();
        } else {
          alert(result.message || 'Erro ao registrar abastecimento');
        }
      } catch (error) {
        console.error(error);
        alert('Erro na comunicação com o servidor');
      }
    }
  };

  if (!requisicao) return null;

  const veiculoAlvo = veiculosList.find(v => (v.placa || '').toUpperCase() === (requisicao?.veiculo || '').toUpperCase()) 
    || geradoresList.find(g => (g.granja || '').toUpperCase() === (requisicao?.veiculo || '').toUpperCase() || (g.nome || '').toUpperCase() === (requisicao?.veiculo || '').toUpperCase());

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modalCard} ${styles.modalCardWide}`}>
        {onClose && (
          <button type="button" onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--cor-borda-cartao)', paddingBottom: '12px' }}>
          <h2 className={styles.cardTitle} style={{ margin: 0, borderBottom: 'none' }}>
            <Fuel size={20} className={styles.logoIcon} />
            Lançar Abastecimento - Req. {requisicao.numeroRequisicao}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={`${styles.label} ${styles.labelTiny}`}>Data Abertura</span>
              <strong className={styles.infoValue}>
                {(reqAtual?.data || requisicao?.data) ? (reqAtual?.data || requisicao?.data).split('T')[0].split('-').reverse().join('/') : ''}
                {(reqAtual?.hora || requisicao?.hora) ? ` (${reqAtual?.hora || requisicao?.hora})` : ''}
              </strong>
            </div>

            {/* Só exibe Abastecido em se a requisição estiver de fato ABASTECIDA */}
            {((reqAtual?.status === ABASTECIDA || requisicao?.status === ABASTECIDA) && (reqAtual?.data_abastecimento || requisicao?.data_abastecimento)) ? (
              <div className={styles.infoItem}>
                <span className={`${styles.label} ${styles.labelTiny}`}>Abastecido em</span>
                <strong className={styles.infoValue} style={{ color: '#10b981' }}>
                  {(reqAtual?.data_abastecimento || requisicao?.data_abastecimento || '').split('T')[0].split('-').reverse().join('/')}
                  {(reqAtual?.hora_abastecimento || requisicao?.hora_abastecimento) ? ` às ${reqAtual?.hora_abastecimento || requisicao?.hora_abastecimento}` : ''}
                </strong>
              </div>
            ) : null}

            <div className={styles.infoItem}>
              <span className={`${styles.label} ${styles.labelTiny}`}>Veículo / Destino</span>
              <strong className={styles.infoValue} style={{ color: 'var(--cor-destaque)' }}>
                {reqAtual?.veiculo || requisicao?.veiculo || '-'}
              </strong>
            </div>

            <div className={styles.infoItem}>
              <span className={`${styles.label} ${styles.labelTiny}`}>Motorista</span>
              <strong className={styles.infoValue}>
                {reqAtual?.requisitante || reqAtual?.motorista || requisicao?.requisitante || requisicao?.motorista || '-'}
              </strong>
            </div>

            <div className={styles.infoItem}>
              <span className={`${styles.label} ${styles.labelTiny}`}>Fornecedor / Posto</span>
              <strong className={styles.infoValue}>
                {reqAtual?.fornecedor || requisicao?.fornecedor || '-'}
              </strong>
            </div>

            <div className={styles.infoItem}>
              <span className={`${styles.label} ${styles.labelTiny}`}>Criado por</span>
              <strong className={styles.infoValue}>
                {reqAtual?.criado_por || requisicao?.criado_por || requisicao?.emitente || 'Almoxarifado'}
              </strong>
            </div>
          </div>

          <div className={styles.grid2Cols}>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>Data do Abastecimento</label>
              <input 
                type="date" 
                name="data_abastecimento" 
                value={formData.data_abastecimento} 
                onChange={handleChange} 
                className={`${styles.input} ${styles.inputSmall}`} 
                required 
              />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>Hora do Abastecimento</label>
              <input 
                type="time" 
                name="hora_abastecimento" 
                value={formData.hora_abastecimento} 
                onChange={handleChange} 
                className={`${styles.input} ${styles.inputSmall}`} 
                required 
              />
            </div>
          </div>

          <div className={styles.grid2Cols}>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>Cupom Fiscal</label>
              <input type="text" name="cupom" value={formData.cupom} onChange={handleChange} className={`${styles.input} ${styles.inputSmall}`} required />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>Combustível</label>
              <select 
                name="combustivel" 
                value={formData.combustivel} 
                onChange={handleChange} 
                className={`${styles.select} ${styles.inputSmall}`} 
                required 
                style={{ opacity: (requisicao.veiculo && (requisicao.veiculo.toUpperCase().includes('GERADOR') || requisicao.veiculo.toUpperCase().includes('GRANJA') || requisicao.veiculo.toUpperCase().startsWith('G. '))) ? 0.7 : 1 }}
                disabled={requisicao.veiculo && (requisicao.veiculo.toUpperCase().includes('GERADOR') || requisicao.veiculo.toUpperCase().includes('GRANJA') || requisicao.veiculo.toUpperCase().startsWith('G. '))}
              >
                <option value="DIESEL">DIESEL</option>
                <option value="GASOLINA">GASOLINA</option>
                <option value="ARLA REDUX">ARLA REDUX</option>
              </select>
            </div>
          </div>

          <div className={styles.grid2Cols}>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <InputOdometroInteligente 
                veiculo={veiculoAlvo}
                value={formData.km}
                onChange={(val) => setFormData(p => ({ ...p, km: val }))}
                onError={setErroRetrocesso}
                label={
                  requisicao.veiculo && (requisicao.veiculo.toUpperCase().includes('GERADOR') || requisicao.veiculo.toUpperCase().includes('GRANJA') || requisicao.veiculo.toUpperCase().startsWith('G. ') || requisicao.tipo === 'granja' || requisicao.tipo === 'gerador')
                    ? 'Horímetro Atual'
                    : (veiculosList.some(v => (v.placa || '').toUpperCase() === (requisicao.veiculo || '').toUpperCase()) ? 'KM Atual' : 'KM / Horímetro (Opcional)')
                }
              />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <label className={`${styles.label} ${styles.labelSmall}`}>Quantidade (L)</label>
              <input type="number" step="0.01" name="qtde" value={formData.qtde} onChange={handleChange} className={`${styles.input} ${styles.inputSmall}`} required />
            </div>
          </div>

          <div className={isAdmin ? styles.grid2Cols : styles.grid1Col}>
            <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className={`${styles.label} ${styles.labelSmall}`} style={{ margin: 0 }}>V. Unitário (R$)</label>
                {formData.loteTemValor ? (
                  <span style={{ fontSize: '0.68rem', color: 'var(--cor-destaque)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Lock size={10} /> Estoque
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--cor-texto-secundario)', fontWeight: 500 }}>
                    Manual
                  </span>
                )}
              </div>
              <input 
                type="number" 
                step="0.01" 
                name="valorUnitario" 
                value={formData.valorUnitario} 
                onChange={handleChange} 
                className={`${styles.input} ${styles.inputSmall} ${formData.loteTemValor ? styles.inputReadOnly : ''}`}
                readOnly={formData.loteTemValor}
                placeholder={formData.loteTemValor ? '' : 'Ex: 5.89'}
                required 
              />
            </div>
            {isAdmin && (
              <div className={`${styles.formGroup} ${styles.formGroupNoMargin}`}>
                <label className={`${styles.label} ${styles.labelSmall}`}>V. Total (R$)</label>
                <input type="text" readOnly value={formData.qtde && formData.valorUnitario ? `R$ ${(formData.qtde * formData.valorUnitario).toFixed(2)}` : 'R$ 0.00'} className={`${styles.input} ${styles.inputReadOnly} ${styles.inputSmall} ${styles.inputSmallTotal}`} />
              </div>
            )}
          </div>

          {/* Linha 5: Auditoria e Comprovante de Foto lado a lado */}
          <div className={styles.grid2Cols} style={{ marginTop: '14px', alignItems: 'stretch' }}>
            {/* Identificação do Colaborador Responsável pelo Lançamento Manual (Bloqueado pelo Login) */}
            <div style={{
              padding: '12px 14px',
              backgroundColor: 'var(--cor-fundo-sutil)',
              borderRadius: '8px',
              border: '1px solid var(--cor-borda-cartao)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <User size={14} color="var(--cor-destaque)" />
                    Colaborador Responsável (Auditoria)
                  </label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--cor-texto-secundario)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <Lock size={11} color="var(--cor-destaque)" /> Login ativo
                  </span>
                </div>
                <input
                  type="text"
                  value={colaboradorResponsavel}
                  readOnly
                  disabled
                  className={`${styles.input} ${styles.inputReadOnly}`}
                  style={{ padding: '8px 10px', fontSize: '0.85rem', cursor: 'not-allowed', backgroundColor: 'var(--cor-fundo-principal)', opacity: 0.9, fontWeight: 600 }}
                  title="Campo bloqueado: registrado automaticamente a partir do login do usuário conectado"
                />
              </div>
            </div>

            {/* Anexo de Imagem do Comprovante / Visor da Bomba */}
            <div style={{
              padding: '12px 14px',
              backgroundColor: 'var(--cor-fundo-sutil)',
              borderRadius: '8px',
              border: '1px dashed var(--cor-borda-cartao)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cor-texto-principal)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Camera size={14} color="var(--cor-destaque)" />
                  Foto do Comprovante / Visor da Bomba
                </label>
                {fotoComprovante && (
                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                    ✓ Anexada
                  </span>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleCaptureFoto}
              />

              {fotoComprovante ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={fotoComprovante}
                    alt="Comprovante"
                    style={{
                      width: '64px',
                      height: '46px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid var(--cor-borda-cartao)',
                      cursor: 'pointer'
                    }}
                    onClick={() => setFotoZoom(fotoComprovante)}
                    title="Clique para ampliar"
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      style={{ fontSize: '0.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setFotoZoom(fotoComprovante)}
                    >
                      <Eye size={12} /> Ampliar
                    </button>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      style={{ fontSize: '0.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <RefreshCw size={12} /> Trocar
                    </button>
                    <button
                      type="button"
                      style={{
                        fontSize: '0.72rem',
                        padding: '5px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'transparent',
                        color: 'var(--cor-erro, #ef4444)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      onClick={() => setFotoComprovante('')}
                    >
                      <Trash2 size={12} /> Remover
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    border: '1px dashed var(--cor-destaque)',
                    color: 'var(--cor-destaque)',
                    backgroundColor: 'rgba(255, 107, 0, 0.06)',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontWeight: 600
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={15} /> Anexar Comprovante / Foto da Bomba
                </button>
              )}
            </div>
          </div>

          <div className={styles.actionsRow}>
            <button type="button" onClick={handleCancel} className={styles.btnDanger}>
              <Ban size={18} />
              CANCELAR REQUISIÇÃO
            </button>
            <button type="submit" className={styles.btnPrimary}>
              <Save size={18} />
              FINALIZAR ABASTECIMENTO
            </button>
          </div>
        </form>
      </div>

      {fotoZoom && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setFotoZoom(null)}
        >
          <button
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            onClick={() => setFotoZoom(null)}
          >
            <X size={20} />
          </button>
          <img
            src={fotoZoom}
            alt="Comprovante em tela cheia"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default FormularioAbastecimento;
