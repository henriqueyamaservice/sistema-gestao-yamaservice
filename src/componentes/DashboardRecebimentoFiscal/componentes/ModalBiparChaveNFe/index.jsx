import React, { useState, useRef, useEffect } from 'react';
import { X, Barcode, UploadCloud, FileEdit, AlertCircle, Search, Check } from 'lucide-react';
import styles from './ModalBiparChaveNFe.module.css';

const ModalBiparChaveNFe = ({ isOpen, onClose, onNotaCarregada }) => {
  const [chave, setChave] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const inputChaveRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setChave('');
      setErro('');
      // Auto-foco imediato no campo para quem estiver com leitor óptico
      setTimeout(() => {
        if (inputChaveRef.current) {
          inputChaveRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBuscarChave = async (e) => {
    if (e) e.preventDefault();
    const chaveLimpa = chave.replace(/\D/g, '');

    if (chaveLimpa.length !== 44) {
      setErro(`A chave de acesso da NF-e precisa ter exatamente 44 dígitos (atualmente tem ${chaveLimpa.length}).`);
      return;
    }

    setLoading(true);
    setErro('');

    try {
      const res = await fetch('/api/recebimento-fiscal/bipar-chave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: chaveLimpa })
      });

      const data = await res.json();
      if (!res.ok || data.erro) {
        throw new Error(data.mensagem || 'Erro ao processar chave de acesso.');
      }

      onNotaCarregada(data.dados);
      onClose();
    } catch (err) {
      console.error(err);
      setErro(err.message || 'Erro ao consultar chave de acesso da NF-e.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadXml = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      setErro('Por favor, selecione um arquivo no formato .XML.');
      return;
    }

    setLoading(true);
    setErro('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const xmlString = event.target.result;
        const res = await fetch('/api/recebimento-fiscal/upload-xml', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xmlString })
        });

        const data = await res.json();
        if (!res.ok || data.erro) {
          throw new Error(data.mensagem || 'Falha ao processar arquivo XML.');
        }

        onNotaCarregada(data.dados);
        onClose();
      } catch (err) {
        console.error(err);
        setErro(err.message || 'Erro ao ler arquivo XML.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleCriarManual = () => {
    const notaManual = {
      chaveAcesso: '',
      numeroNF: '',
      serie: '1',
      modelo: '55',
      dataEmissao: new Date().toISOString().split('T')[0],
      valorTotal: 0,
      emitente: {
        nome: '',
        cnpj_cpf: '',
        inscrEstadual: '',
        uf: 'PA'
      },
      itens: [
        {
          codigo: '',
          descricao: '',
          quantidade: 1,
          unidade: 'UN',
          valorUnitario: 0,
          valorTotal: 0,
          cfop: '1.556',
          codigo_local_estoque: '01'
        }
      ],
      transporte: {
        tipoFrete: '0 - Contratação do Frete por conta do Remetente (CIF)',
        previsaoEntrega: '',
        transportador: { nome: '', cnpj_cpf: '', ie: '', uf: 'PA' },
        veiculo: { placa: '', uf: 'PA', rntrc: '' },
        volumes: { qVol: 0, esp: '', marca: '', nVol: '', pesoL: 0, pesoB: 0, nLacre: '' }
      },
      totaisTributos: {
        vBC: 0,
        vICMS: 0,
        vICMSDeson: 0,
        vBCST: 0,
        vST: 0,
        vProd: 0,
        vFrete: 0,
        vSeg: 0,
        vDesc: 0,
        vIPI: 0,
        vPIS: 0,
        vCOFINS: 0,
        vTotTrib: 0,
        vNF: 0,
        vIS: 0,
        vIBS: 0,
        vCBS: 0
      },
      parcelas: [
        {
          nParcela: 1,
          nNumTitulo: '',
          dDtVenc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
          nValor: 0
        }
      ],
      isManual: true
    };
    onNotaCarregada(notaManual);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <Barcode size={24} color="var(--cor-destaque)" />
            <div>
              <h3>Novo Recebimento</h3>
              <p>Entrada de NF-e, arquivo XML ou nota fiscal manual</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={styles.btnClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          {erro && (
            <div className={styles.erroMsg}>
              <AlertCircle size={18} />
              <span>{erro}</span>
            </div>
          )}

          {/* Área 1: Leitor Óptico / Bipagem */}
          <form onSubmit={handleBuscarChave} className={styles.scannerCard}>
            <div className={styles.scannerHeader}>
              <div className={styles.barcodeVisual}>
                <span className={styles.barcodeLines}>|||| | ||| || ||| | ||||</span>
                <span className={styles.barcodeLabel}>Chave da NF-e</span>
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ color: 'var(--cor-texto-principal)', fontSize: '0.95rem' }}>
                  Digite aqui a chave de acesso da NF-e ou CT-e
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--cor-texto-secundario)', lineHeight: 1.3 }}>
                  Obs.: Nem todas as NF-es e CT-es podem ser baixadas da SEFAZ sem a autenticação de um certificado digital válido.
                </p>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <input
                ref={inputChaveRef}
                type="text"
                value={chave}
                onChange={(e) => {
                  setChave(e.target.value);
                  if (erro) setErro('');
                }}
                maxLength={44}
                placeholder="Ex: 3526 0915 4232 0700 0146 5500 1000 0003 8914 4276 6430"
                className={styles.inputChave}
              />
              <button
                type="submit"
                disabled={loading || chave.replace(/\D/g, '').length !== 44}
                className={styles.btnBuscarChave}
              >
                <Search size={18} />
                <span>{loading ? 'Consultando...' : 'Carregar Nota'}</span>
              </button>
            </div>
          </form>

          <div className={styles.divisor}>
            <span>OU</span>
          </div>

          {/* Área 2: Upload de XML */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.zip"
            style={{ display: 'none' }}
            onChange={handleUploadXml}
          />
          <div className={styles.dropzone} onClick={() => fileInputRef.current?.click()}>
            <UploadCloud size={32} color="var(--cor-destaque)" />
            <p>Ou clique aqui para selecionar o arquivo da NF-e ou CT-e</p>
            <span>Pode ser o arquivo XML ou pacote com notas fiscais eletrônicas</span>
          </div>

          <div className={styles.divisor}>
            <span>OU</span>
          </div>

          {/* Área 3: Nota Manual / Recibo */}
          <button type="button" onClick={handleCriarManual} className={styles.btnManual}>
            <FileEdit size={18} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: '700' }}>Ou cadastre manualmente uma nota fiscal do fornecedor</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--cor-texto-secundario)', fontWeight: 'normal' }}>
                Muito útil para cadastrar notas fiscais que ainda não são eletrônicas ou produtores rurais
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalBiparChaveNFe;
