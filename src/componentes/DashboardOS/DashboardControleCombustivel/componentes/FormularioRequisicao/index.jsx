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
    combustivel: 'DIESEL'
  });

  const [veiculos, setVeiculos] = useState([]);
  const [caminhoes, setCaminhoes] = useState([]);
  const [loadingEstoque, setLoadingEstoque] = useState(tipo === 'granja');

  useEffect(() => {
    fetch('http://localhost:3000/api/veiculos')
      .then(res => res.json())
      .then(data => setVeiculos(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (tipo === 'granja') {
      const fetchEstoqueCaminhoes = async () => {
        try {
          const [resEntradas, resSaidas] = await Promise.all([
            fetch('http://localhost:3000/api/combustivel/entradas'),
            fetch('http://localhost:3000/api/combustivel')
          ]);
          const dataEntradas = await resEntradas.json();
          const dataSaidas = await resSaidas.json();

          const controle = {};
          const postosFixos = ['P YAMAVES', 'ALMOXARIFADO', 'ORIENTE'];
          
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
          setCaminhoes(disponiveis);
          
          if (disponiveis.length > 0) {
            setFormData(prev => ({ ...prev, fornecedor: disponiveis[0] }));
          } else {
            setFormData(prev => ({ ...prev, fornecedor: '' }));
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoadingEstoque(false);
        }
      };
      fetchEstoqueCaminhoes();
    }
  }, [tipo]);

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

        {tipo === 'granja' && caminhoes.length === 0 && !loadingEstoque && (
          <div className={styles.alertWarning}>
            Nenhum caminhão possui combustível. Realize uma transferência para algum caminhão na tela de Estoque antes de abastecer a granja!
          </div>
        )}

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
            <label className={styles.label}>Veículo/Máquina/Trator</label>
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
                <option value="ORIENTE">ORIENTE</option>
                <option value="P YAMAVES">P YAMAVES</option>
                <option value="ALMOXARIFADO">ALMOXARIFADO</option>
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
