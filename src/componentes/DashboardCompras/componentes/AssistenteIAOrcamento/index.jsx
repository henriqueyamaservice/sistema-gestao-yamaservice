import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Image as ImageIcon, Loader2, FileCheck2, Trash2 } from 'lucide-react';
import styles from './AssistenteIAOrcamento.module.css';

const AssistenteIAOrcamento = ({ isOpen, onClose, reqId, fornId, fornNome, tipo, itensRequisicao, onTextSaved, onPrecosExtraidos }) => {
  const [file, setFile] = useState(null);
  const [textoColado, setTextoColado] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setTextoColado('');
      setIsProcessing(false);
      setIsExtractingText(false);
    }
  }, [isOpen, fornId, reqId]);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    // Validação básica do tipo
    if (tipo === 'pdf' && selectedFile.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo PDF.');
      return;
    }
    if (tipo === 'imagem' && !selectedFile.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem (PNG, JPG, etc).');
      return;
    }
    setFile(selectedFile);

    if (tipo === 'pdf') {
      extrairTextoPdf(selectedFile);
    }
  };

  const extrairTextoPdf = async (selectedFile) => {
    setIsExtractingText(true);
    try {
      const formData = new FormData();
      formData.append('documento', selectedFile);
      const response = await fetch('/api/ia-orcamento/extrair-texto-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.sucesso) {
        setTextoColado(data.texto);
      } else {
        alert('Erro ao ler PDF: ' + (data.erro || 'Desconhecido'));
        clearFile();
      }
    } catch (err) {
      console.error(err);
      alert('Erro na comunicação com servidor.');
      clearFile();
    } finally {
      setIsExtractingText(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setTextoColado('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProcessarIA = async () => {
    if (tipo === 'pdf' && !textoColado.trim()) return;
    if (tipo === 'imagem' && !file) return;
    
    setIsProcessing(true);
    
    // GUARDA O TEXTO ANTES DA API! Assim, mesmo se o Google der erro 503,
    // o texto fica salvo na memória para o Consultor Global!
    if (tipo === 'pdf' && onTextSaved) {
      onTextSaved(reqId, fornId, textoColado);
    }
    
    try {
      let response;

      if (tipo === 'pdf') {
        response = await fetch('/api/ia-orcamento/texto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: textoColado, fornId, reqId, itensRequisicao })
        });
      } else {
      }

      const responseText = await response.text();
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { erro: "O servidor não retornou um formato JSON válido (provavelmente erro do provedor)." };
      }

      if (response.ok) {
        console.log("Dados extraídos pela IA:", data.dados);
        if (onPrecosExtraidos) {
          const itensExtraidos = data.dados.itens || (Array.isArray(data.dados) ? data.dados : []);
          onPrecosExtraidos(reqId, fornId, itensExtraidos);
        }
        if (tipo === 'pdf' && onTextSaved && data.dados.textoOriginalExtraido) {
          onTextSaved(reqId, fornId, data.dados.textoOriginalExtraido);
        }
        onClose();
      } else {
        // Se for erro 503, avisa o usuário que o texto foi salvo de qualquer jeito.
        if (tipo === 'pdf' && (response.status === 503 || response.status === 502 || response.status === 500)) {
          alert(`Aviso: A API do Google falhou em processar a extração (Erro ${response.status}).\n\nMAS NÃO SE PREOCUPE! O texto foi guardado para o Chat Global!`);
          onClose(); // Deixa o usuário fechar
        } else {
          alert(`Erro na extração: ${data.erro || 'Falha ao conectar com a API.'}`);
        }
      }
    } catch (error) {
      console.error('Erro no processamento da IA:', error);
      alert('Erro ao tentar comunicar com o servidor da IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getIcon = () => tipo === 'pdf' ? <FileText size={24} color="#c026d3" /> : <ImageIcon size={24} color="#c026d3" />;
  const acceptAttr = tipo === 'pdf' ? 'application/pdf' : 'image/*';

  return (
    <div className={styles.modalOverlay} onClick={!isProcessing ? onClose : undefined}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>
            <span style={{ fontSize: '1.4rem' }}>🤖</span> Assistente de Leitura IA
          </h3>
          <button className={styles.closeBtn} onClick={onClose} disabled={isProcessing}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.body}>
          <div>
            <p style={{ margin: '0 0 5px', fontWeight: 'bold', color: '#334155' }}>Fornecedor: {fornNome}</p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
              {tipo === 'pdf' ? 'Arraste ou selecione o PDF do Orçamento. O sistema vai extrair o texto automaticamente para você sem complicação!' : 'Envie a foto/imagem da cotação e a Inteligência Artificial preencherá os valores automaticamente.'}
            </p>
          </div>

          {!isProcessing ? (
            <>
              {!file ? (
                <div 
                  className={styles.dropzone}
                  style={{ borderColor: isDragging ? '#9333ea' : '#c026d3', background: isDragging ? '#f3e8ff' : '#faf5ff' }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={48} color="#9333ea" />
                  <p>Arraste e solte o {tipo === 'pdf' ? 'PDF' : 'arquivo'} aqui</p>
                  <span>ou clique para selecionar do computador</span>
                  <input 
                    type="file" 
                    accept={acceptAttr}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleFileInput}
                  />
                </div>
              ) : (
                <div className={styles.fileInfo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <FileCheck2 size={24} color="#10b981" />
                    <div className={styles.fileName} style={{ marginLeft: '10px' }}>{file.name}</div>
                    <button className={styles.removeFile} onClick={clearFile} title="Remover Arquivo" style={{ marginLeft: 'auto' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  {isExtractingText && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px', color: '#94a3b8' }}>
                      <Loader2 size={16} className="spin" /> <span>Lendo PDF...</span>
                    </div>
                  )}

                  {tipo === 'pdf' && textoColado && !isExtractingText && (
                    <div style={{ width: '100%', marginTop: '15px' }}>
                      <p style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#64748b' }}>
                        Texto extraído do PDF (Você pode conferir ou editar antes de enviar para a IA):
                      </p>
                      <textarea
                        className={styles.textAreaPDF}
                        value={textoColado}
                        onChange={(e) => setTextoColado(e.target.value)}
                        style={{
                          width: '100%',
                          height: '200px',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          resize: 'none',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className={styles.processingBox}>
              <Loader2 size={48} className="spin" />
              <div className={styles.processingText}>A IA está lendo o documento...</div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, textAlign: 'center' }}>
                Extraindo preços, marcas e prazos.<br/>Por favor, aguarde.
              </p>
            </div>
          )}
        </div>

        {!isProcessing && (
          <div className={styles.footer}>
            <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
            <button 
              className={styles.btnSubmit} 
              onClick={handleProcessarIA}
              disabled={isExtractingText || (tipo === 'pdf' ? !textoColado.trim() : !file)}
            >
              {getIcon()}
              Extrair Preços com IA
            </button>
          </div>
        )}
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AssistenteIAOrcamento;
