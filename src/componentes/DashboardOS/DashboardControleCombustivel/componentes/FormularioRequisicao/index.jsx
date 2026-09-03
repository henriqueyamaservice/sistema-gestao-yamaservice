import React, { useState, useEffect } from 'react';
import { Save, FileText, X } from 'lucide-react';
import styles from './index.module.css';

const FormularioRequisicao = ({ onAdd, onClose, tipo = 'carro' }) => {
  const getNowLocal = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [formData, setFormData] = useState({
    numeroRequisicao: '',
    data: getNowLocal(),
    requisitante: '',
    emitente: '',
    veiculo: '',
    fornecedor: 'ORIENTE',
    combustivel: 'DIESEL',
    lote_origem_id: ''
  });

  const [veiculos, setVeiculos] = useState([]);
  const [caminhoes, setCaminhoes] = useState([]);
  const [estoquesSecundarios, setEstoquesSecundarios] = useState([]);
  const [lotesDisponiveis, setLotesDisponiveis] = useState([]);
  const [loadingEstoque, setLoadingEstoque] = useState(true);

  // Busca o próximo número de requisição automaticamente
  useEffect(() => {
    fetch('/api/combustivel')
      .then(res => res.json())
      .then(data => {
        // Assume that numeroRequisicao is a number string
        const numeros = data.map(req => parseInt(req.numeroRequisicao) || 0);
        const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
        setFormData(prev => ({ ...prev, numeroRequisicao: proximo.toString() }));
      })
      .catch(err => console.error('Erro ao buscar o próximo número de requisição:', err));
  }, []);
  useEffect(() => {
    fetch(`/api/veiculos`)
      .then(res => res.json())
      .then(data => setVeiculos(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const fetchEstoqueSecundario = async () => {
      setLoadingEstoque(true);
      try {
        const [resEntradas, resSaidas] = await Promise.all([
          fetch(`/api/combustivel/entradas`),
          fetch(`/api/combustivel`)
        ]);
        const dataEntradas = await resEntradas.json();
        const dataSaidas = await resSaidas.json();

        const controle = {};
        const postosFixos = ['P YAMAVES', 'ORIENTE', 'ALMOXARIFADO'];
        
        dataEntradas.forEach(ent => {
          const posto = ent.estoque;
          if (posto && !postosFixos.includes(posto.toUpperCase())) {
            if (ent.produto === 'DIESEL') {
              if (!controle[posto]) controle[posto] = 0;
              controle[posto] += parseFloat(ent.quantidade) || 0;
            }
          }
        });

        dataSaidas.forEach(sai => {
          const posto = sai.fornecedor;
          if ((sai.status === 'CONCLUÍDO' || sai.status === 'ABASTECIDA') && posto && !postosFixos.includes(posto.toUpperCase()) && controle[posto] !== undefined) {
            if (sai.combustivel === 'DIESEL') {
              controle[posto] -= parseFloat(sai.qtde) || 0;
            }
          }
        });

        const disponiveis = Object.keys(controle).filter(p => controle[p] > 0);
        setEstoquesSecundarios(disponiveis);
        setCaminhoes(disponiveis); // Mantido para compatibilidade com tipo === 'granja'
        
        if (tipo === 'granja' && disponiveis.length > 0) {
          setFormData(prev => ({ ...prev, fornecedor: disponiveis[0] }));
        } else if (tipo === 'granja') {
          setFormData(prev => ({ ...prev, fornecedor: '' }));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingEstoque(false);
      }
    };
    fetchEstoqueSecundario();
  }, [tipo]);

  useEffect(() => {
    const fetchLotes = async () => {
      if (!formData.fornecedor || !formData.combustivel) {
        setLotesDisponiveis([]);
        return;
      }
      try {
        const res = await fetch(`/api/combustivel/lotes-disponiveis?estoque=${formData.fornecedor}&produto=${formData.combustivel}`);
        if (res.ok) {
          const data = await res.json();
          setLotesDisponiveis(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, lote_origem_id: data[0].id }));
          } else {
            setFormData(prev => ({ ...prev, lote_origem_id: '' }));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar lotes:', err);
      }
    };
    fetchLotes();
  }, [formData.fornecedor, formData.combustivel]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const isNumberOrDate = type === 'number' || type === 'date' || type === 'time';
    const finalValue = (typeof value === 'string' && !isNumberOrDate) ? value.toUpperCase() : value;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: finalValue };
      if (name === 'combustivel') {
        if (finalValue === 'ARLA REDUX' && (prev.fornecedor === 'P YAMAVES' || prev.fornecedor === 'ORIENTE' || !prev.fornecedor)) {
          updated.fornecedor = 'ALMOXARIFADO';
        } else if (finalValue === 'DIESEL' && prev.fornecedor === 'ALMOXARIFADO') {
          updated.fornecedor = 'P YAMAVES';
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/combustivel/requisicao`, {
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

        {tipo === 'granja' && caminhoes.length === 0 && !loadingEstoque && (
          <div className={styles.alertWarning}>
            Nenhum caminhão possui combustível. Realize uma transferência para algum caminhão na tela de Estoque antes de abastecer a granja!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nº da Requisição</label>
            <input 
              type="text" 
              name="numeroRequisicao"
              value={formData.numeroRequisicao}
              onChange={handleChange}
              className={styles.input}
              placeholder="Digite o número da requisição"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Data e Hora</label>
            <input 
              type="datetime-local" 
              name="data"
              value={formData.data}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Emitente (Autorizado por)</label>
            <input 
              type="text" 
              name="emitente"
              value={formData.emitente}
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
            <label className={styles.label}>{tipo === 'granja' ? 'Granja / Gerador' : 'Veículo/Máquina/Trator'}</label>
            {tipo === 'carro' ? (
              <>
                <input 
                  list="veiculos-cadastrados"
                  name="veiculo"
                  value={formData.veiculo}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Digite a placa..."
                  required
                />
                <datalist id="veiculos-cadastrados">
                  {veiculos.map(v => (
                    <option key={v.placa} value={v.placa}>{v.modelo ? `${v.placa} - ${v.modelo}` : v.placa}</option>
                  ))}
                </datalist>
              </>
            ) : (
              <select 
                name="veiculo"
                value={formData.veiculo}
                onChange={handleChange}
                className={styles.select}
                required
              >
                <option value="">Selecione a Granja...</option>
                <option value="G. AREAL">G. AREAL</option>
                <option value="G. PALMEIRA">G. PALMEIRA</option>
                <option value="G. ITA">G. ITA</option>
                <option value="G. MOSQUEIRO">G. MOSQUEIRO</option>
                <option value="G. GENIPAUBA">G. GENIPAUBA</option>
                <option value="G. CAMPINA">G. CAMPINA</option>
                <option value="G. AGUA BRANCA">G. AGUA BRANCA</option>
                <option value="G. CASTANHEIRA">G. CASTANHEIRA</option>
                <option value="G. GUARIMÃ">G. GUARIMÃ</option>
                <option value="G. SÃO CAETANO">G. SÃO CAETANO</option>
                <option value="G. AVICEMA">G. AVICEMA</option>
                <option value="G. KIMURA">G. KIMURA</option>
                <option value="G. KAWAMURA">G. KAWAMURA</option>
              </select>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{tipo === 'granja' ? 'Caminhão (Fornecedor)' : 'Fornecedor'}</label>
            {tipo === 'carro' ? (
              <select 
                name="fornecedor"
                value={formData.fornecedor}
                onChange={handleChange}
                className={styles.select}
                required
              >
                <optgroup label="Tanques e Postos Padrão">
                  <option value="P YAMAVES">P YAMAVES</option>
                  <option value="ALMOXARIFADO">ALMOXARIFADO</option>
                  <option value="ORIENTE">ORIENTE</option>
                </optgroup>
                {estoquesSecundarios.length > 0 && (
                  <optgroup label="Estoques Internos (Com Saldo)">
                    {estoquesSecundarios.map(e => <option key={e} value={e}>{e}</option>)}
                  </optgroup>
                )}
              </select>
            ) : (
              <select 
                name="fornecedor"
                value={formData.fornecedor}
                onChange={handleChange}
                className={styles.select}
                required
                disabled={caminhoes.length === 0 || loadingEstoque}
              >
                {loadingEstoque ? (
                  <option value="">Carregando estoque...</option>
                ) : caminhoes.length === 0 ? (
                  <option value="">Nenhum caminhão disponível</option>
                ) : (
                  caminhoes.map(c => <option key={c} value={c}>{c}</option>)
                )}
              </select>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Combustível</label>
            <select 
              name="combustivel"
              value={formData.combustivel}
              onChange={handleChange}
              className={`${styles.select} ${tipo === 'granja' ? styles.selectDisabled : ''}`}
              required
              disabled={tipo === 'granja'}
            >
              <option value="DIESEL">DIESEL</option>
              <option value="GASOLINA">GASOLINA</option>
              <option value="ARLA REDUX">ARLA REDUX</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} style={{ color: 'var(--cor-destaque)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Lote / Fornecedor Origem
              {lotesDisponiveis.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--cor-erro)' }}>(Sem Saldo)</span>}
            </label>
            <select 
              name="lote_origem_id"
              value={formData.lote_origem_id}
              onChange={handleChange}
              className={styles.select}
              required
              disabled={lotesDisponiveis.length === 0}
              style={{ borderColor: lotesDisponiveis.length === 0 ? 'var(--cor-erro)' : 'var(--cor-borda-cartao)' }}
            >
              {lotesDisponiveis.length === 0 ? (
                <option value="">Nenhum saldo físico disponível</option>
              ) : (
                lotesDisponiveis.map(lote => (
                  <option key={lote.id} value={lote.id}>
                    {lote.fornecedor} (NF: {lote.notaFiscal || 'S/N'}) - Saldo: {parseFloat(lote.saldoRestante).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                  </option>
                ))
              )}
            </select>
          </div>

          <button 
            type="submit" 
            className={`${styles.btnPrimary} ${tipo === 'granja' && caminhoes.length === 0 ? styles.btnDisabled : ''}`}
            disabled={tipo === 'granja' && caminhoes.length === 0}
          >
            <Save size={18} />
            CADASTRAR REQUISIÇÃO
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormularioRequisicao;
