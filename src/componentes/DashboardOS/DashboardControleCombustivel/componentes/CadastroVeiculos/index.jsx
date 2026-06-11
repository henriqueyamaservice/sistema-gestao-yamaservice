import React, { useState, useEffect } from 'react';
import { Save, Plus, ArrowLeft, Truck, FileText, Settings, User } from 'lucide-react';
import styles from './index.module.css';

const CadastroVeiculos = () => {
  const [veiculos, setVeiculos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [avisoMostrado, setAvisoMostrado] = useState(false);
  
  const estadoInicial = {
    placa: '',
    modelo: '',
    anoModelo: '',
    anoFabricacao: '',
    capacidade: '',
    renavam: '',
    pesoBrutoTotal: '',
    especieTipo: '',
    chassi: '',
    categoria: '',
    carroceria: '',
    potenciaCilindrada: '',
    motor: '',
    cmt: '',
    eixos: '',
    lotacao: '',
    nomeProprietario: '',
    cpfCnpj: '',
    corPredominante: '',
    combustivel: '',
    // Mantendo os do ConfigurarFrota por compatibilidade
    kmTrocaOleo: '',
    intervaloTrocaOleo: '10000',
    kmRevisao: '',
    intervaloRevisao: '50000',
    tipoMedicao: 'KM'
  };

  const [formData, setFormData] = useState(estadoInicial);

  const carregarVeiculos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/veiculos');
      const data = await res.json();
      setVeiculos(data);
    } catch (error) {
      console.error("Erro ao buscar veículos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarVeiculos();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMaintenanceClick = () => {
    if (!avisoMostrado && formData.id) {
      // Se for edição de um veículo existente, avisa o usuário
      alert("⚠️ ATENÇÃO: Alterar manualmente a Última Revisão ou Troca de Óleo vai modificar o acompanhamento automático de frota no Dashboard de Revisão.");
      setAvisoMostrado(true);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!formData.placa) return alert('A placa é obrigatória');

    try {
      const res = await fetch('http://localhost:3000/api/veiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Falha ao salvar veículo');
      
      setFormData(estadoInicial);
      setMostrarFormulario(false);
      carregarVeiculos();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar veículo');
    }
  };

  const handleEditar = (veiculo) => {
    setFormData({
      ...estadoInicial,
      ...veiculo
    });
    setAvisoMostrado(false); // Reseta o aviso ao abrir um veículo
    setMostrarFormulario(true);
  };

  if (mostrarFormulario) {
    return (
      <div className={`${styles.formContainer} animateFadeIn`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 className={styles.cardTitle} style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
            {formData.id ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
          </h2>
          <button className={styles.btnSecondary} onClick={() => setMostrarFormulario(false)}>
            <ArrowLeft size={18} /> Voltar para a lista
          </button>
        </div>

        <form onSubmit={handleSalvar}>
          {/* Seção 1: Dados Principais */}
          <div className={styles.sessionBlock}>
            <div className={styles.sessionHeader}>
              <FileText size={18} /> 1. Dados Principais
            </div>
            <div className={`${styles.grid} ${styles.grid4}`}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Placa</label>
                <input type="text" name="placa" value={formData.placa} onChange={handleChange} className={styles.input} required placeholder="ABC1234" />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label className={styles.label}>Modelo</label>
                <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} className={styles.input} placeholder="Ex: VW/24.280 CRM 6X2" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Código RENAVAM</label>
                <input type="text" name="renavam" value={formData.renavam} onChange={handleChange} className={styles.input} />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Ano Modelo</label>
                <input type="text" name="anoModelo" value={formData.anoModelo} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Ano Fabricação</label>
                <input type="text" name="anoFabricacao" value={formData.anoFabricacao} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label className={styles.label}>Chassi</label>
                <input type="text" name="chassi" value={formData.chassi} onChange={handleChange} className={styles.input} />
              </div>
            </div>
          </div>

          {/* Seção 2: Especificações Técnicas */}
          <div className={styles.sessionBlock}>
            <div className={styles.sessionHeader}>
              <Settings size={18} /> 2. Especificações Técnicas
            </div>
            <div className={`${styles.grid} ${styles.grid4}`}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Espécie / Tipo</label>
                <input type="text" name="especieTipo" value={formData.especieTipo} onChange={handleChange} className={styles.input} placeholder="Ex: CARGA CAMINHAO" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Categoria</label>
                <input type="text" name="categoria" value={formData.categoria} onChange={handleChange} className={styles.input} placeholder="Ex: PARTICULAR" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Carroceria</label>
                <input type="text" name="carroceria" value={formData.carroceria} onChange={handleChange} className={styles.input} placeholder="Ex: BASCULANTE" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Combustível</label>
                <input type="text" name="combustivel" value={formData.combustivel} onChange={handleChange} className={styles.input} placeholder="Ex: DIESEL" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Capacidade (Ton)</label>
                <input type="text" name="capacidade" value={formData.capacidade} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Peso Bruto Total</label>
                <input type="text" name="pesoBrutoTotal" value={formData.pesoBrutoTotal} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>CMT</label>
                <input type="text" name="cmt" value={formData.cmt} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Potência/Cilindrada</label>
                <input type="text" name="potenciaCilindrada" value={formData.potenciaCilindrada} onChange={handleChange} className={styles.input} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Motor</label>
                <input type="text" name="motor" value={formData.motor} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Eixos</label>
                <input type="text" name="eixos" value={formData.eixos} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Lotação</label>
                <input type="text" name="lotacao" value={formData.lotacao} onChange={handleChange} className={styles.input} placeholder="Ex: 03P" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Cor Predominante</label>
                <input type="text" name="corPredominante" value={formData.corPredominante} onChange={handleChange} className={styles.input} />
              </div>
            </div>
          </div>

          {/* Seção 3: Proprietário / Motorista */}
          <div className={styles.sessionBlock}>
            <div className={styles.sessionHeader}>
              <User size={18} /> 3. Proprietário / Motorista Principal
            </div>
            <div className={`${styles.grid} ${styles.grid2}`}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome</label>
                <input type="text" name="nomeProprietario" value={formData.nomeProprietario} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>CPF/CNPJ</label>
                <input type="text" name="cpfCnpj" value={formData.cpfCnpj} onChange={handleChange} className={styles.input} />
              </div>
            </div>
          </div>

          {/* Seção 4: Manutenção Inicial (Opcional no Cadastro) */}
          <div className={styles.sessionBlock}>
            <div className={styles.sessionHeader}>
              <Truck size={18} /> 4. Manutenção Preventiva (Opcional)
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)', marginBottom: '12px' }}>
              Insira o KM inicial, se houver. As atualizações automáticas ocorrerão via Ordem de Serviço.
            </p>
            
            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', marginTop: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Revisão Geral</div>
            <div className={`${styles.grid} ${styles.grid4}`}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Última Revisão (KM)</label>
                <input type="number" step="0.1" name="kmRevisao" value={formData.kmRevisao} onChange={handleChange} onClick={handleMaintenanceClick} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Intervalo Revisão (KM)</label>
                <input type="number" step="1" name="intervaloRevisao" value={formData.intervaloRevisao} onChange={handleChange} onClick={handleMaintenanceClick} className={styles.input} />
              </div>
            </div>

            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', marginTop: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Troca de Óleo</div>
            <div className={`${styles.grid} ${styles.grid4}`}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Última Troca (KM)</label>
                <input type="number" step="0.1" name="kmTrocaOleo" value={formData.kmTrocaOleo} onChange={handleChange} onClick={handleMaintenanceClick} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Intervalo Óleo (KM)</label>
                <input type="number" step="1" name="intervaloTrocaOleo" value={formData.intervaloTrocaOleo} onChange={handleChange} onClick={handleMaintenanceClick} className={styles.input} />
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={() => setMostrarFormulario(false)}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary}>
              <Save size={18} /> {formData.id ? 'Salvar Alterações' : 'Cadastrar Veículo'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Visualização de Lista
  return (
    <div className={styles.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 className={styles.cardTitle} style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
          <Truck size={24} style={{ marginRight: '8px', color: 'var(--cor-texto-secundario)' }} />
          Ficha de Veículos
        </h2>
        <button className={styles.btnPrimary} onClick={() => { setFormData(estadoInicial); setMostrarFormulario(true); }}>
          <Plus size={18} /> Cadastrar Veículo
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>PLACA</th>
              <th>MODELO</th>
              <th>COR</th>
              <th>PROPRIETÁRIO</th>
              <th>RENAVAM</th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>Carregando...</td></tr>
            ) : veiculos.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center', color: '#64748b'}}>Nenhum veículo cadastrado.</td></tr>
            ) : (
              veiculos.map(v => (
                <tr key={v.placa}>
                  <td style={{ fontWeight: 'bold' }}>{v.placa}</td>
                  <td>{v.modelo || '-'}</td>
                  <td>{v.corPredominante || '-'}</td>
                  <td>{v.nomeProprietario || '-'}</td>
                  <td>{v.renavam || '-'}</td>
                  <td>
                    <button 
                      onClick={() => handleEditar(v)} 
                      className={styles.btnSecondary}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      Detalhes / Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CadastroVeiculos;
