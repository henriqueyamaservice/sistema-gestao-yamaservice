import React, { useState, useEffect } from 'react';
import { PackageSearch, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import styles from './PortalFornecedor.module.css';

const PortalFornecedor = ({ token }) => {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cotacoes, setCotacoes] = useState({});
  const [descontoGeral, setDescontoGeral] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/cotacao-externa/${token}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Erro ao carregar dados');
        }
        const data = await response.json();
        setDados(data);

        const stateInicial = {};
        data.itens.forEach(item => {
          stateInicial[item.codigo] = { valorUnitario: '', previsaoDias: '', marca: '', tipoUnidade: 'Unidade', quantidadePacote: '', desconto: '' };
        });
        setCotacoes(stateInicial);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [token]);

  const handleChange = (codigo, campo, valor) => {
    // Se for valor monetário, troca vírgula por ponto para o backend
    let valorTratado = valor;
    if (campo === 'valorUnitario' || campo === 'desconto') {
      valorTratado = valor.replace(',', '.');
      // Permite apenas números e um ponto
      valorTratado = valorTratado.replace(/[^0-9.]/g, '');
    }

    setCotacoes(prev => ({
      ...prev,
      [codigo]: {
        ...prev[codigo],
        [campo]: valorTratado
      }
    }));
  };

  const handleDescontoGeralChange = (valor) => {
    let valorTratado = valor.replace(',', '.');
    valorTratado = valorTratado.replace(/[^0-9.]/g, '');
    setDescontoGeral(valorTratado);
  };

  const handleEnviar = async () => {
    // Validar se TODOS os itens foram preenchidos ou marcados como "Não Possuo"
    let erros = [];
    dados.itens.forEach((item, index) => {
      const cot = cotacoes[item.codigo] || {};
      
      if (!cot.naoPossui) {
        // Se NÃO marcou que não possui, então tem que preencher os 3 campos obrigatórios!
        if (!cot.valorUnitario || Number(cot.valorUnitario) <= 0) {
          erros.push(`- Item ${index + 1} (${item.codigo}) está sem Preço.`);
        }
        if (!cot.marca || cot.marca.trim() === '') {
          erros.push(`- Item ${index + 1} (${item.codigo}) está sem Marca.`);
        }
        if (!cot.previsaoDias || cot.previsaoDias.toString().trim() === '') {
          erros.push(`- Item ${index + 1} (${item.codigo}) está sem Prazo.`);
        }
      }
    });

    if (erros.length > 0) {
      alert(`Para enviar a cotação, você precisa informar Preço, Marca e Prazo para todos os itens.\n\nSe você não tem algum item no estoque, marque a caixinha "Não possuo este item".\n\nPendências:\n${erros.join('\n')}`);
      return;
    }

    // Filtrar apenas os itens que o fornecedor preencheu o preço (e que não estão marcados como Não Possui)
    const cotacoesPreenchidas = {};
    Object.keys(cotacoes).forEach(codigo => {
      if (!cotacoes[codigo].naoPossui && cotacoes[codigo].valorUnitario > 0) {
        cotacoesPreenchidas[codigo] = cotacoes[codigo];
      }
    });

    setEnviando(true);
    try {
      const response = await fetch(`http://localhost:3000/api/cotacao-externa/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotacoes: cotacoesPreenchidas, descontoGeral: Number(descontoGeral) || 0 })
      });

      if (!response.ok) throw new Error('Erro ao enviar cotação');

      setSucesso(true);
    } catch (err) {
      alert('Ocorreu um erro ao enviar sua cotação. Tente novamente.');
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

  const calcularTotal = () => {
    const totalItens = dados?.itens.reduce((acc, item) => {
      const preco = Number(cotacoes[item.codigo]?.valorUnitario) || 0;
      const desconto = Number(cotacoes[item.codigo]?.desconto) || 0;
      const tipo = cotacoes[item.codigo]?.tipoUnidade || 'Unidade';
      const qtdInterna = Number(cotacoes[item.codigo]?.quantidadePacote) || 1;

      let qtdComprar = item.quantidade;
      if (tipo === 'Pacote' || tipo === 'Caixa') {
        qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
      }

      const subtotalItem = (preco * qtdComprar) * (1 - desconto / 100);
      return acc + Math.max(0, subtotalItem);
    }, 0) || 0;

    const descGeral = Number(descontoGeral) || 0;
    return Math.max(0, totalItens * (1 - descGeral / 100));
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loader}></div>
        <p>Acessando portal seguro de cotação...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={64} className={styles.stateIcon} />
        <h2>Acesso Negado ou Expirado</h2>
        <p>{error}</p>
        <p style={{ color: 'var(--cor-texto-secundario)', marginTop: '1rem', fontSize: '0.9rem' }}>
          O link de cotação só pode ser utilizado uma única vez e possui validade.
          <br />Caso precise enviar novamente, solicite um novo link ao comprador.
        </p>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className={styles.successState}>
        <CheckCircle2 size={80} className={styles.stateIcon} />
        <h2>Cotação Enviada com Sucesso!</h2>
        <p>Os seus preços foram registrados diretamente no sistema de Compras da empresa.</p>
        <p style={{ color: 'var(--cor-texto-secundario)', marginTop: '1rem' }}>Você já pode fechar esta página.</p>
      </div>
    );
  }

  return (
    <div className={styles.portalContainer}>
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.logoArea}>
            <PackageSearch size={32} color="var(--cor-destaque)" />
            <h1>Portal do Fornecedor</h1>
          </div>
          <div className={styles.fornecedorInfo}>
            <p>Cotação para:</p>
            <strong>{dados.fornecedorNome}</strong>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Solicitação de Cotação - ID #{dados.requisicaoId.slice(-6)}</h2>
            <p>Por favor, informe o preço unitário e a previsão de entrega (em dias) apenas para os itens que você possui em estoque.</p>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição do Produto</th>
                  <th style={{ textAlign: 'center', color: '#ef4444' }}>Não possuo</th>
                  <th style={{ textAlign: 'center' }}>Qtd. Solicitada</th>
                  <th>Marca</th>
                  <th>Embalagem / Unidade</th>
                  <th>
                    {(() => {
                      const primeiroItem = dados.itens[0];
                      const tipoPrimeiro = primeiroItem ? (cotacoes[primeiroItem.codigo]?.tipoUnidade || 'Unidade') : 'Unidade';
                      return tipoPrimeiro === 'Pacote' ? 'Preço do Pacote' : tipoPrimeiro === 'Caixa' ? 'Preço da Caixa' : 'Preço da Unidade';
                    })()}
                  </th>
                  <th>Desconto Item (%)</th>
                  <th>Prazo (Dias)</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {dados.itens.map(item => {
                  const preco = Number(cotacoes[item.codigo]?.valorUnitario) || 0;
                  const desconto = Number(cotacoes[item.codigo]?.desconto) || 0;
                  const tipo = cotacoes[item.codigo]?.tipoUnidade || 'Unidade';
                  const qtdInterna = Number(cotacoes[item.codigo]?.quantidadePacote) || 1;

                  const naoPossui = cotacoes[item.codigo]?.naoPossui || false;
                  
                  let qtdComprar = item.quantidade;
                  if (tipo === 'Pacote' || tipo === 'Caixa') {
                    qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
                  }

                  const subtotal = Math.max(0, (preco * qtdComprar) * (1 - desconto / 100));

                  return (
                    <tr key={item.codigo} style={{ opacity: naoPossui ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                      <td data-label="Código"><span style={{ background: 'var(--cor-fundo-sutil-forte)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--cor-texto-principal)' }}>{item.codigo}</span></td>
                      <td data-label="Descrição" style={{ fontWeight: 500 }}>{item.descricao}</td>
                      <td data-label="Não possuo" style={{ textAlign: 'center' }}>
                        <label style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', background: naoPossui ? '#fee2e2' : '#f1f5f9', padding: '8px', borderRadius: '6px', transition: 'all 0.2s', border: `1px solid ${naoPossui ? '#fca5a5' : '#cbd5e1'}` }} title="Marque se você não possui este item">
                          <input 
                            type="checkbox"
                            checked={naoPossui}
                            onChange={(e) => handleChange(item.codigo, 'naoPossui', e.target.checked)}
                            style={{ width: '20px', height: '20px', accentColor: '#ef4444', margin: 0, cursor: 'pointer' }}
                          />
                        </label>
                      </td>
                      <td data-label="Qtd. Solicitada" style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--cor-destaque)' }}>{item.quantidade}</td>
                      <td data-label="Marca">
                        <input
                          type="text"
                          className={styles.inputTexto}
                          placeholder="Ex: Tigre"
                          value={cotacoes[item.codigo]?.marca || ''}
                          onChange={(e) => handleChange(item.codigo, 'marca', e.target.value)}
                          disabled={naoPossui}
                        />
                      </td>
                      <td data-label="Unidade/Emb.">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select
                            className={styles.inputTexto}
                            style={{ width: '80px' }}
                            value={cotacoes[item.codigo]?.tipoUnidade || 'Unidade'}
                            onChange={(e) => handleChange(item.codigo, 'tipoUnidade', e.target.value)}
                            disabled={naoPossui}
                          >
                            <option value="Unidade">Unid.</option>
                            <option value="Pacote">Pacote</option>
                            <option value="Caixa">Caixa</option>
                          </select>

                          {(cotacoes[item.codigo]?.tipoUnidade === 'Pacote' || cotacoes[item.codigo]?.tipoUnidade === 'Caixa') && (
                            <>
                              <span style={{ color: 'var(--cor-texto-secundario)' }}>/</span>
                              <input
                                type="number"
                                className={styles.inputTexto}
                                style={{ width: '60px' }}
                                placeholder="Qtd"
                                title="Quantas unidades vêm nesta embalagem?"
                                value={cotacoes[item.codigo]?.quantidadePacote || ''}
                                onChange={(e) => handleChange(item.codigo, 'quantidadePacote', e.target.value)}
                                disabled={naoPossui}
                              />
                            </>
                          )}
                        </div>
                      </td>
                      <td data-label={tipo === 'Pacote' ? 'Preço do Pacote' : tipo === 'Caixa' ? 'Preço da Caixa' : 'Preço da Unidade'}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div className={styles.inputGroup}>
                            <span className={styles.currencySymbol}>R$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              className={styles.input}
                              placeholder="0,00"
                              value={cotacoes[item.codigo]?.valorUnitario || ''}
                              onChange={(e) => handleChange(item.codigo, 'valorUnitario', e.target.value)}
                              disabled={naoPossui}
                            />
                          </div>
                        </div>
                      </td>
                      <td data-label="Desconto Item (%)">
                        <div className={styles.inputGroup}>
                          <span className={styles.currencySymbol}>%</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={styles.input}
                            placeholder="0,00"
                            value={cotacoes[item.codigo]?.desconto || ''}
                            onChange={(e) => handleChange(item.codigo, 'desconto', e.target.value)}
                            disabled={naoPossui}
                          />
                        </div>
                      </td>
                      <td data-label="Prazo (Dias)">
                        <select
                          className={styles.inputDias}
                          value={cotacoes[item.codigo]?.previsaoDias || ''}
                          onChange={(e) => handleChange(item.codigo, 'previsaoDias', e.target.value)}
                          disabled={naoPossui}
                        >
                          <option value="">Selecione...</option>
                          <option value="Retirada">Retirada</option>
                          <option value="Hoje">Hoje</option>
                          {Array.from({ length: 90 }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num.toString()}>{num} {num === 1 ? 'dia' : 'dias'}</option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Subtotal" style={{ textAlign: 'right', fontWeight: 500, color: preco > 0 ? 'var(--cor-destaque)' : 'var(--cor-texto-secundario)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}
                        {(tipo === 'Pacote' || tipo === 'Caixa') && preco > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--cor-texto-secundario)', marginTop: '4px' }}>
                            Serão comprados: {qtdComprar} {tipo}(s)
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.footer}>
            <div style={{ marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0, color: 'var(--cor-texto-secundario)', fontSize: '0.8rem' }}>Itens sem preço preenchido serão ignorados na cotação.</p>

              <div className={styles.descontoGeralContainer}>
                <label>Desconto Geral (%):</label>
                <div className={styles.inputGroup}>
                  <span className={styles.currencySymbol}>%</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={styles.input}
                    placeholder="0,00"
                    value={descontoGeral}
                    onChange={(e) => handleDescontoGeralChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', marginRight: '1rem' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Valor Total Ofertado:</p>
              <span className={styles.totalValue}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcularTotal())}
              </span>
            </div>
            <button
              className={styles.btnSubmit}
              onClick={handleEnviar}
              disabled={enviando}
            >
              <Send size={18} />
              {enviando ? 'Enviando...' : 'Enviar Cotação'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PortalFornecedor;
