import React, { useState, useEffect } from 'react';
import { FileText, Save, Clock, AlertCircle, Wrench, Calendar } from 'lucide-react';
import styles from './index.module.css';

const FormularioOS = ({ onAddOS, osList }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    data: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    requisitante: '',
    complexidade: 'NORMAL',
    prioridade: '1-NORMAL',
    setor: '',
    centroCusto: '',
    prazo: '',
    tipo: 'CORRETIVA',
    situacao: 'À EXECUTAR',
    descricao: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calcula o próximo código automaticamente
  useEffect(() => {
    if (!osList) return;
    
    const dataReq = formData.data;
    if (!dataReq) return;

    const [ano, mes] = dataReq.split('-');
    const mesAno = `${mes}${ano.slice(-2)}`;
    
    const osDoMes = osList.filter(o => o.codigo && o.codigo.endsWith(`-${mesAno}`));
    
    let proximoNumero = 1;
    if (osDoMes.length > 0) {
      const numeros = osDoMes.map(o => parseInt(o.codigo.split('-')[0]) || 0);
      proximoNumero = Math.max(...numeros) + 1;
    }
    
    const nextCode = `${proximoNumero.toString().padStart(2, '0')}-${mesAno}`;
    
    // Atualiza o formData se o código gerado for diferente e se o usuário não digitou um manualmente
    // Vamos assumir que a maioria vai ser automático
    setFormData(prev => ({ ...prev, codigo: nextCode }));
  }, [formData.data, osList]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Força a situação para 'EM ANDAMENTO' ao salvar, conforme pedido do usuário
      const novaOS = { ...formData, situacao: 'EM ANDAMENTO' };

      // Envia para o backend
      const response = await fetch('http://localhost:3000/api/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaOS)
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar a Ordem de Serviço');
      }

      const dataSalva = await response.json();
      onAddOS(dataSalva.os);

      // Limpar formulário mantendo alguns defaults e calculando novo código será feito pelo useEffect 
      // pois osList vai ser atualizada pelo parent (DashboardOS)
      setFormData(prev => ({
        ...prev,
        codigo: '', // vai ser preenchido pelo useEffect
        requisitante: '',
        setor: '',
        centroCusto: '',
        descricao: '',
        prazo: ''
      }));
    } catch (error) {
      console.error(error);
      alert('Erro ao cadastrar O.S. Verifique a conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${styles.card} ${styles.animateFadeIn}`}>
      <h2 className={styles.cardTitle}>
        <FileText size={20} className={styles.logoIcon} />
        Cadastrar Ordem de Serviço
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Informações Principais */}
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Código da O.S (Auto)</label>
            <input
              type="text"
              className={styles.input}
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              placeholder="Gerado automaticamente"
              readOnly
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Data</label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                className={styles.input}
                name="data"
                value={formData.data}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Hora</label>
            <input
              type="time"
              className={styles.input}
              name="hora"
              value={formData.hora}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Requisitante</label>
            <select
              className={styles.select}
              name="requisitante"
              value={formData.requisitante}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Selecione um requisitante</option>
              <option value="ARILSON MOURAS">ARILSON MOURAS</option>
              <option value="ARINALDO BORGES">ARINALDO BORGES</option>
              <option value="MONTEIRO">MONTEIRO</option>
              <option value="JUCELIO PONTES">JUCELIO PONTES</option>
              <option value="GRAZIELLY BARBOSA">GRAZIELLY BARBOSA</option>
              <option value="JAIR CAVALCANTE">JAIR CAVALCANTE</option>
              <option value="ADEMILSON">ADEMILSON</option>
              <option value="CLEYDSON">CLEYDSON</option>
              <option value="EMERSON OLIVEIRA">EMERSON OLIVEIRA</option>
              <option value="CLAUDOMIRO SILVA">CLAUDOMIRO SILVA</option>
              <option value="JONE">JONE</option>
              <option value="NAZARE YAMAGUCHI">NAZARE YAMAGUCHI</option>
              <option value="KAZUNORI YAMAGUCHI">KAZUNORI YAMAGUCHI</option>

            </select>
          </div>
        </div>

        {/* Classificação e Setor */}
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Setor de Execução</label>
            <select
              className={styles.select}
              name="setor"
              value={formData.setor}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Selecione um setor</option>
              <option value="ELETRICA">ELETRICA</option>
              <option value="MECANICA">MECANICA</option>
              <option value="SERRALHEIRO">SERRALHEIRO</option>
              <option value="SERVICO GERAL">SERVICO GERAL</option>
              <option value="METALURGICA">METALURGICA</option>
              <option value="CONSTRUCAO CIVIL">CONSTRUCAO CIVIL</option>
              <option value="SDL">SDL</option>
              <option value="ELETRONICA">ELETRONICA</option>
              <option value="FABRICA DE RACAO">FABRICA DE RACAO</option>
              <option value="LOGISTICA">LOGISTICA</option>

            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Centro de Custo Alvo</label>
            <input
              type="text"
              className={styles.input}
              name="centroCusto"
              value={formData.centroCusto}
              onChange={handleChange}
              placeholder="Ex: EL-1102"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Complexidade</label>
            <select
              className={styles.select}
              name="complexidade"
              value={formData.complexidade}
              onChange={handleChange}
            >
              <option value="BAIXA">Baixa</option>
              <option value="NORMAL">Normal</option>
              <option value="ALTA">Alta</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Prioridade</label>
            <select
              className={styles.select}
              name="prioridade"
              value={formData.prioridade}
              onChange={handleChange}
            >
              <option value="1-NORMAL">1 - Normal</option>
              <option value="2-URGENTE">2 - Urgente</option>
              <option value="3-EMERGÊNCIA">3 - Emergência</option>
            </select>
          </div>
        </div>

        {/* Prazo e Situação */}
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Prazo</label>
            <input
              type="date"
              className={styles.input}
              name="prazo"
              value={formData.prazo}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tipo</label>
            <select
              className={styles.select}
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
            >
              <option value="PREVENTIVA">Preventiva</option>
              <option value="CORRETIVA">Corretiva</option>
              <option value="IMPLANTAÇÃO">Implantação</option>
              <option value="MELHORIA">Melhoria</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Situação</label>
            <select
              className={styles.select}
              name="situacao"
              value={formData.situacao}
              onChange={handleChange}
            >
              <option value="À EXECUTAR">À Executar</option>
            </select>
          </div>
        </div>

        {/* Descrição */}
        <div className={styles.formGrid}>
          <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
            <label className={styles.label}>Descrição do Serviço</label>
            <textarea
              className={styles.textarea}
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              placeholder="Descreva detalhadamente o serviço a ser realizado..."
              required
            />
          </div>
        </div>

        {/* Ações */}
        <div className={styles.actions}>
          <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
            <Save size={18} />
            {isSubmitting ? 'CADASTRANDO...' : 'CADASTRAR O.S'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioOS;
