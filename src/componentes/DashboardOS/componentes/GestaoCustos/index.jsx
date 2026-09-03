import React, { useState, useEffect } from 'react';
import LancamentoCusto from '../LancamentoCusto';
import RelatorioCustoMensal from '../RelatorioCustoMensal';
import CalendarioEmpresaModal from '../CalendarioEmpresaModal';
import { Lock, Eye, EyeOff, X, KeyRound, ShieldAlert, Calendar } from 'lucide-react';
import styles from './index.module.css';

const GestaoCustos = ({ osList }) => {
  const [modoVisualizacao, setModoVisualizacao] = useState(false);
  const [relatoriosSalvos, setRelatoriosSalvos] = useState([]);
  const [feriadosCustomizados, setFeriadosCustomizados] = useState([]);
  const [modalCalendarioAberto, setModalCalendarioAberto] = useState(false);
  const [configCalendarioInicial, setConfigCalendarioInicial] = useState(null);

  // Controle do Modal de Senha
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');

  const SENHA_MESTRE = '@123456YAMAVES';

  const carregarCustos = async () => {
    try {
      const response = await fetch(`/api/custos-funcionarios`);
      const data = await response.json();
      setRelatoriosSalvos(data || []);
    } catch (error) {
      console.error('Erro ao carregar custos:', error);
      setRelatoriosSalvos([]);
    }
  };

  const carregarFeriados = async () => {
    try {
      const response = await fetch(`/api/calendario-empresa`);
      if (response.ok) {
        const data = await response.json();
        setFeriadosCustomizados(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao carregar feriados do calendário:', error);
    }
  };

  useEffect(() => {
    carregarCustos();
    carregarFeriados();
  }, []);

  const handleAbrirCalendario = (config) => {
    if (config) {
      setConfigCalendarioInicial(config);
    } else {
      setConfigCalendarioInicial(null);
    }
    setModalCalendarioAberto(true);
  };

  const handleSolicitarAcesso = () => {
    setSenhaInput('');
    setErroSenha('');
    setModalSenhaAberto(true);
  };

  const handleValidarSenha = (e) => {
    if (e) e.preventDefault();
    if (senhaInput === SENHA_MESTRE) {
      setModalSenhaAberto(false);
      setSenhaInput('');
      setErroSenha('');
      setModoVisualizacao(true);
    } else {
      setErroSenha('Senha incorreta! Acesso negado.');
    }
  };

  const handleSalvarFeriados = async (novosFeriados) => {
    try {
      const res = await fetch(`/api/calendario-empresa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novosFeriados)
      });
      if (res.ok) {
        setFeriadosCustomizados(novosFeriados);
      }
    } catch (error) {
      console.error('Erro ao salvar feriados:', error);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {!modoVisualizacao ? (
        <LancamentoCusto
          osList={osList}
          relatoriosSalvos={relatoriosSalvos}
          carregarCustos={carregarCustos}
          feriadosCustomizados={feriadosCustomizados}
          onOpenCalendario={handleAbrirCalendario}
          onNavigateToRelatorio={handleSolicitarAcesso}
        />
      ) : (
        <RelatorioCustoMensal
          osList={osList}
          relatoriosSalvos={relatoriosSalvos}
          feriadosCustomizados={feriadosCustomizados}
          onNavigateToLancamento={() => setModoVisualizacao(false)}
        />
      )}

      {/* MODAL DO CALENDÁRIO DA EMPRESA */}
      {modalCalendarioAberto && (
        <CalendarioEmpresaModal
          onClose={() => setModalCalendarioAberto(false)}
          feriadosCustomizadosProps={feriadosCustomizados}
          onSalvarFeriados={handleSalvarFeriados}
          anoInicial={configCalendarioInicial?.ano}
          mesInicial={configCalendarioInicial?.mes}
        />
      )}

      {/* MODAL DE SEGURANÇA E SENHA */}
      {modalSenhaAberto && (
        <div className={styles.modalOverlay} onClick={() => setModalSenhaAberto(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.iconCircle}>
                <Lock size={22} color="var(--cor-destaque, #FF6B00)" />
              </div>
              <h3>Acesso Restrito a Relatórios</h3>
              <button className={styles.closeBtn} onClick={() => setModalSenhaAberto(false)}>
                <X size={20} />
              </button>
            </div>

            <p className={styles.modalDescription}>
              Esta área possui dados confidenciais de folha salarial. Informe a senha de autorização para prosseguir.
            </p>

            <form onSubmit={handleValidarSenha} className={styles.formContainer}>
              <div className={styles.inputWrapper}>
                <KeyRound size={18} className={styles.inputIcon} />
                <input
                  type={mostrarSenha ? "text" : "password"}
                  className={styles.passwordInput}
                  placeholder="Digite a senha de acesso..."
                  value={senhaInput}
                  onChange={(e) => {
                    setSenhaInput(e.target.value);
                    if (erroSenha) setErroSenha('');
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {erroSenha && (
                <div className={styles.errorMessage}>
                  <ShieldAlert size={16} />
                  {erroSenha}
                </div>
              )}

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setModalSenhaAberto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn}>
                  Acessar Relatórios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestaoCustos;
