import React, { useState, useEffect, useRef } from 'react';
import {
  X, ShieldCheck, KeyRound, UploadCloud, CheckCircle2,
  AlertTriangle, RefreshCw, Eye, EyeOff, Trash2, FileCheck,
  Building2, Check
} from 'lucide-react';
import styles from './ModalConfigCertificadoSefaz.module.css';

const ModalConfigCertificadoSefaz = ({ isOpen, onClose, onCertificadoAtualizado }) => {
  const [certInfo, setCertInfo] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [modoEdicao, setModoEdicao] = useState(false);

  // Form states
  const [arquivoCertificado, setArquivoCertificado] = useState(null);
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [uf, setUf] = useState('PA');
  const [ambiente, setAmbiente] = useState('1'); // 1 = Produção
  const [cpfManual, setCpfManual] = useState('');

  // Ações
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [resultadoTeste, setResultadoTeste] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      carregarStatus();
      setErro('');
      setSucesso('');
      setResultadoTeste(null);
    }
  }, [isOpen]);

  const carregarStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/sefaz/status-certificado');
      const data = await res.json();
      if (data.configurado) {
        setCertInfo(data);
        setModoEdicao(false);
      } else {
        setCertInfo(null);
        setModoEdicao(true);
      }
    } catch (err) {
      console.error('Falha ao verificar status do certificado:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[SEFAZ NAVEGADOR] Arquivo selecionado no PC:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.pfx') && !ext.endsWith('.p12')) {
      console.warn('[SEFAZ NAVEGADOR] Extensao invalida:', file.name);
      setErro('Por favor, selecione um arquivo de Certificado Digital válido (.pfx ou .p12).');
      return;
    }

    setArquivoCertificado(file);
    setErro('');
  };

  const handleSalvarCertificado = async (e) => {
    e.preventDefault();
    if (!arquivoCertificado) {
      console.warn('[SEFAZ NAVEGADOR] Nenhum arquivo selecionado.');
      setErro('Selecione o arquivo do Certificado Digital (.pfx ou .p12).');
      return;
    }
    if (!senha) {
      console.warn('[SEFAZ NAVEGADOR] Senha nao preenchida.');
      setErro('Informe a senha do Certificado Digital.');
      return;
    }

    setSalvando(true);
    setErro('');
    setSucesso('');

    console.log('----------------------------------------------------');
    console.log('[SEFAZ NAVEGADOR] Enviando certificado para o servidor...');
    console.log('[SEFAZ NAVEGADOR] Arquivo:', arquivoCertificado.name, `(${(arquivoCertificado.size / 1024).toFixed(1)} KB)`);
    console.log('[SEFAZ NAVEGADOR] Senha:', `${senha.length} caracteres informados`);
    console.log('[SEFAZ NAVEGADOR] UF:', uf, '| Ambiente:', ambiente === '1' ? 'Producao (1)' : 'Homologacao (2)');

    const formData = new FormData();
    formData.append('certificado', arquivoCertificado);
    formData.append('senha', senha);
    formData.append('uf', uf);
    formData.append('ambiente', ambiente);
    if (cpfManual) formData.append('cpfManual', cpfManual);

    try {
      const res = await fetch('/api/sefaz/upload-certificado', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      console.log('[SEFAZ NAVEGADOR] Resposta HTTP recebida do backend:', res.status, data);

      if (!res.ok || data.erro) {
        console.error('[SEFAZ NAVEGADOR ERRO]', data.mensagem || 'Falha na validacao');
        throw new Error(data.mensagem || 'Falha ao validar ou instalar o certificado.');
      }

      console.log('[SEFAZ NAVEGADOR SUCESSO] Certificado instalado com sucesso!', data.info);
      setSucesso(data.mensagem || 'Certificado Digital instalado com sucesso!');
      setArquivoCertificado(null);
      setSenha('');
      carregarStatus();
      if (onCertificadoAtualizado) onCertificadoAtualizado();
    } catch (err) {
      console.error('[SEFAZ NAVEGADOR EXCECAO]', err);
      setErro(err.message || 'Erro ao processar o certificado.');
    } finally {
      setSalvando(false);
      console.log('----------------------------------------------------');
    }
  };

  const handleTestarConexao = async () => {
    setTestando(true);
    setResultadoTeste(null);
    setErro('');

    console.log('[SEFAZ NAVEGADOR] Disparando teste de conexao com SEFAZ Nacional...');

    try {
      const res = await fetch('/api/sefaz/testar-conexao', {
        method: 'POST'
      });
      const data = await res.json();
      console.log('[SEFAZ NAVEGADOR] Retorno do teste SEFAZ:', data);

      if (!res.ok || data.erro) {
        throw new Error(data.mensagem || 'Falha no teste de conexão com a SEFAZ.');
      }
      setResultadoTeste(data);
    } catch (err) {
      console.error('[SEFAZ NAVEGADOR ERRO TESTE]', err);
      setErro('Erro no teste SEFAZ: ' + err.message);
    } finally {
      setTestando(false);
    }
  };

  const handleRemoverCertificado = async () => {
    if (!window.confirm('Tem certeza que deseja desinstalar este Certificado Digital da SEFAZ?')) {
      return;
    }

    try {
      const res = await fetch('/api/sefaz/remover-certificado', {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.erro) throw new Error(data.mensagem);

      setCertInfo(null);
      setModoEdicao(true);
      setSucesso('Certificado removido.');
      if (onCertificadoAtualizado) onCertificadoAtualizado();
    } catch (err) {
      alert('Erro ao remover certificado: ' + err.message);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <div className={styles.headerIcon}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2>Certificado Digital SEFAZ</h2>
              <p>Autenticação oficial da empresa para captura automática de NF-e</p>
            </div>
          </div>
          <button className={styles.btnClose} onClick={onClose} title="Fechar modal">
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {loadingStatus ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <RefreshCw size={24} className={styles.spin} color="var(--cor-destaque)" />
              <p style={{ marginTop: '8px', color: 'var(--cor-texto-secundario)' }}>Verificando certificado...</p>
            </div>
          ) : certInfo && !modoEdicao ? (
            /* VISUALIZAÇÃO DO CERTIFICADO ATIVO */
            <div className={styles.certCardAtivo}>
              <div className={styles.certCardHeader}>
                <div>
                  <h3 className={styles.certTitularNome}>{certInfo.nomeTitular}</h3>
                  <div className={styles.certDoc}>
                    {certInfo.tipo === 'e-PF' ? 'CPF: ' : 'CNPJ: '}
                    {certInfo.documento}
                  </div>
                </div>
                <span className={styles.certBadgeStatus}>
                  <CheckCircle2 size={13} /> Certificado Ativo
                </span>
              </div>

              <div className={styles.certGridInfo}>
                <div className={styles.certInfoItem}>
                  <span className={styles.infoLabel}>Tipo de Certificado</span>
                  <span className={styles.infoVal}>{certInfo.tipo} A1 (Soluti / ICP-Brasil)</span>
                </div>
                <div className={styles.certInfoItem}>
                  <span className={styles.infoLabel}>Ambiente SEFAZ</span>
                  <span className={styles.infoVal}>{certInfo.ambiente} ({certInfo.uf})</span>
                </div>
                <div className={styles.certInfoItem}>
                  <span className={styles.infoLabel}>Autoridade Emissora</span>
                  <span className={styles.infoVal}>{certInfo.emissor}</span>
                </div>
                <div className={styles.certInfoItem}>
                  <span className={styles.infoLabel}>Instalado em</span>
                  <span className={styles.infoVal}>
                    {new Date(certInfo.dataInstalacao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {resultadoTeste && (
                <div className={styles.alertaSucesso}>
                  <Check size={18} />
                  <div>
                    <strong>SEFAZ Respondeu com Sucesso!</strong>
                    <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                      Status {resultadoTeste.cStat}: {resultadoTeste.xMotivo} (NSU Atual: {resultadoTeste.ultNSU})
                    </div>
                  </div>
                </div>
              )}

              {erro && (
                <div className={styles.alertaErro}>
                  <AlertTriangle size={18} />
                  <span>{erro}</span>
                </div>
              )}

              <div className={styles.certAcoesRow}>
                <button
                  type="button"
                  className={styles.btnTestar}
                  onClick={handleTestarConexao}
                  disabled={testando}
                  title="Testar comunicação segura mTLS com a SEFAZ Nacional"
                >
                  <RefreshCw size={15} className={testando ? styles.spin : ''} />
                  <span>{testando ? 'Testando SEFAZ...' : 'Testar Conexão com SEFAZ'}</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={styles.btnSubstituir}
                    onClick={() => {
                      setModoEdicao(true);
                      setErro('');
                      setSucesso('');
                    }}
                  >
                    Substituir Arquivo
                  </button>
                  <button
                    type="button"
                    className={styles.btnRemover}
                    onClick={handleRemoverCertificado}
                    title="Desinstalar certificado"
                  >
                    <Trash2 size={15} />
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* FORMULÁRIO DE INSTALAÇÃO DO CERTIFICADO (.PFX) */
            <form onSubmit={handleSalvarCertificado} className={styles.formUploadCertificado}>
              <div
                className={styles.fileDropArea}
                onClick={() => fileInputRef.current?.click()}
                title="Clique para abrir a pasta do seu computador"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pfx,.p12"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div className={styles.fileDropIcon}>
                  <UploadCloud size={40} />
                </div>
                {arquivoCertificado ? (
                  <span className={styles.fileSelectedBadge}>
                    <FileCheck size={18} />
                    {arquivoCertificado.name} ({(arquivoCertificado.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  <>
                    <p className={styles.fileDropTitle}>Clique para selecionar o Certificado Digital</p>
                    <p className={styles.fileDropSub}>Abre a pasta do seu computador para selecionar o arquivo .pfx ou .p12</p>
                  </>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <KeyRound size={14} />
                  Senha do Certificado Digital:
                </label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    className={styles.inputSenha}
                    placeholder="Digite a senha de proteção do arquivo .pfx"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.btnTogglePassword}
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>UF da SEFAZ:</label>
                  <select
                    className={styles.selectField}
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                  >
                    <option value="PA">PA - Pará</option>
                    <option value="SP">SP - São Paulo</option>
                    <option value="TO">TO - Tocantins</option>
                    <option value="MA">MA - Maranhão</option>
                    <option value="MG">MG - Minas Gerais</option>
                    <option value="GO">GO - Goiás</option>
                    <option value="RJ">RJ - Rio de Janeiro</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ambiente:</label>
                  <select
                    className={styles.selectField}
                    value={ambiente}
                    onChange={(e) => setAmbiente(e.target.value)}
                  >
                    <option value="1">1 - Produção Oficial</option>
                    <option value="2">2 - Homologação (Testes)</option>
                  </select>
                </div>
              </div>

              {erro && (
                <div className={styles.alertaErro}>
                  <AlertTriangle size={18} />
                  <span>{erro}</span>
                </div>
              )}

              {sucesso && (
                <div className={styles.alertaSucesso}>
                  <Check size={18} />
                  <span>{sucesso}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                {certInfo && (
                  <button
                    type="button"
                    className={styles.btnSubstituir}
                    onClick={() => setModoEdicao(false)}
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className={styles.btnSalvarCertificado}
                  disabled={salvando || !arquivoCertificado || !senha}
                  style={{ flex: 2 }}
                >
                  <ShieldCheck size={18} />
                  <span>{salvando ? 'Instalando e Validando...' : 'Instalar Certificado Digital'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalConfigCertificadoSefaz;
