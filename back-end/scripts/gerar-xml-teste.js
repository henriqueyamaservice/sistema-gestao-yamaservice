import fs from 'fs';

const fornecedorCpf = "73161756215"; // CPF do Francisco de Jesus Silva
const fornecedorNome = "FRANCISCO DE JESUS SILVA";
const valorTotal = "35.00";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe versao="4.00" Id="NFe35230112345678000190550010000001231000001234">
      <ide>
        <cUF>35</cUF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>123</nNF>
        <dhEmi>2026-10-02T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CPF>${fornecedorCpf}</CPF>
        <xNome>${fornecedorNome}</xNome>
        <enderEmit>
          <xLgr>RUA TESTE</xLgr>
          <nro>123</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01000000</CEP>
        </enderEmit>
        <IE>123456789012</IE>
      </emit>
      <dest>
        <CNPJ>00000000000000</CNPJ>
        <xNome>MINHA EMPRESA</xNome>
        <enderDest>
          <UF>SP</UF>
        </enderDest>
        <IE>ISENTO</IE>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>PRD0000021</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>TESTE DE NITROGENIO</xProd>
          <NCM>84212300</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>35.0000</vUnCom>
          <vProd>35.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>1.0000</qTrib>
          <vUnTrib>35.0000</vUnTrib>
          <indTot>1</indTot>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>35.00</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${valorTotal}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>SP_NFE_PL_009_V4</verAplic>
      <chNFe>3523011234567800019055001000000135000001234</chNFe>
      <dhRecbto>2026-10-02T10:01:00-03:00</dhRecbto>
      <nProt>135030000000001</nProt>
      <digVal>abc123def456ghi789=</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

fs.writeFileSync('C:\\Users\\Henrique\\Desktop\\NFe_Teste_Omie.xml', xml);
console.log('XML gerado com sucesso na Área de Trabalho!');
