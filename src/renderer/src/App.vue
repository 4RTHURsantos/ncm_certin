<script setup lang="ts">
import { ref, Ref } from 'vue';
import { actionLogs, LogInfo } from './store/ActionLogs';
import * as XLSX from 'xlsx'

interface NCMInfo {
  Codigo: string;
  Descricao: string;
  DataInicio: string;
  DataFim: string;
  TipoAto: string;
  NumeroAto: string;
  AnoAto: string;
}

interface ProductInfo {
  id: number;
  ncm: string;
  descricao: string;
  descricao_ncm?: string;
  ncm_original?: string;
  ncm_atualizado: boolean;
  ncm_valido: boolean;
}

const NCMS: Ref<NCMInfo[]> = ref([])

const currentAction: Ref<null | string> = ref(null)
const canChangeAction = ref(true)
const currentPage = ref(1)

const productsVerified: Ref<ProductInfo[]> = ref([])

const fileName = ref(null)

const logs: Ref<LogInfo[]> = ref([])

async function UpdateTable() {
  if (currentAction.value != 'update.table' && canChangeAction.value == true) {
    currentAction.value = 'update.table'
    canChangeAction.value = false

    const ncms: NCMInfo[] = await (window.api as any).fetchNcm()
    const parsedNcms: NCMInfo[] = ncms.map(ncm => {
      const ncmParts = ncm.Codigo.split('.')
      let ncmCode = ''
      ncmParts.forEach(part => ncmCode+=part)
      
      return {
        Codigo: ncmCode,
        Descricao: ncm.Descricao,
        DataInicio: ncm.DataInicio,
        DataFim: ncm.DataFim,
        TipoAto: ncm.TipoAto,
        NumeroAto: ncm.NumeroAto,
        AnoAto: ncm.AnoAto
      }
    })
    //console.log(parsedNcms)

    const newLogs = actionLogs.createLog(`Tabela NCM's atualizada. [${ncms.length}] encontrados.`, 'success')
    logs.value = [...newLogs]
    //console.log(logs.value)

    NCMS.value = [...parsedNcms]
    //console.log(NCMS.value)

    currentAction.value = null
    canChangeAction.value = true
  }
}

function OpenFile() {
  document.getElementById('file-input')?.click()
}
function UpdateFile(e) {
  let file = e.target.files[0]
  if (!file) return;

  fileName.value = file.name
  const reader = new FileReader()

  reader.onload = (evt) => {
    try {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws)
      //console.log(data)

      const products: ProductInfo[] = data.map((prod: any, i: number) => ({
        id: i + 1,
        ncm: String(prod.ncm || prod.NCM || '-').replace(/\D/g, ''),
        descricao: prod.nome || prod.descricao || prod.produto || prod['Descrição'] || prod.Produto || prod.Nome || '-',
        descricao_ncm: '-',
        ncm_valido: false,
        ncm_atualizado: false
      }))

      //console.log(products)
      productsVerified.value = [...products]

      logs.value = [...actionLogs.createLog(`Sucesso ao ler planilha: ${products.length} Produtos carregados`, 'success')]

      if (NCMS.value.length >= 1) {
        VerifyNcms(products)
      }

    } catch (error) {
      //console.log(error)
      logs.value = [...actionLogs.createLog('Erro ao ler planilha', 'error')]
    }
  }

  reader.readAsBinaryString(file)
}

function VerifyNcms(products: ProductInfo[]) {
  const produtosVerificados = products.map(produto => {

    //NCMS.value.forEach(ncm => console.log(`${ncm.Codigo} == ${produto.ncm}`))
    const ncmEncontrado = NCMS.value.find(ncm => ncm.Codigo == produto.ncm);
    //console.log(ncmEncontrado)
    return {
      ...produto,
      ncm_valido: !!ncmEncontrado,
      descricao_ncm: ncmEncontrado ? ncmEncontrado.Descricao : 'NCM não encontrado'
    };
  })

  productsVerified.value = [...produtosVerificados]
  //console.log(productsVerified)
};

function FindSimilarNcm(currentNcm: string, product: ProductInfo): NCMInfo | null {
  if (!currentNcm || currentNcm.length < 4) return null;

  const prefix = currentNcm.substring(0, 4)
  const keywords = product.descricao.toLowerCase().split(' ').filter(p => p.length > 3)

  let bestMatch: NCMInfo | null = null;
  let bestScore = 0;

  const candidates: NCMInfo[] = NCMS.value.filter(ncm => ncm.Codigo.startsWith(prefix))

  for (const ncm of candidates) {
    let score = 0;
    const descNcm = ncm.Descricao.toLowerCase()

    for (const word of keywords) {
      if (descNcm.includes(word)) {
        score += 2
      }
    }

    if (ncm.Codigo === currentNcm) {
      score += 10
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = ncm
    }
  }

  return bestMatch
}

function UpdateNcms(products: ProductInfo[]) {
  if (currentAction.value == 'update.productncm' || canChangeAction.value == false) return;

  currentAction.value = 'update.productncm'
  canChangeAction.value = false

  //console.log('AAA')
  let updated = 0;
  let notFound = 0;

  const updatedProducts: ProductInfo[] = products.map(prod => {
    if (!prod.ncm_valido) {
      const oldncm = prod.ncm
      const suggestedNcm = FindSimilarNcm(oldncm, prod)

      if (suggestedNcm) {
        updated++
        return {
          ...prod,
          ncm: suggestedNcm.Codigo,
          ncm_original: oldncm,
          ncm_valido: true,
          ncm_atualizado: true,
          descricao_ncm: suggestedNcm.Descricao
        }
      } else {
        notFound++
        return prod
      }
    } else {
      return prod
    }
  })
  //console.log(updated)

  logs.value = [...actionLogs.createLog(`Atualização concluida: ${updated} NCM's Atualizados | ${notFound} NCM's precisam ser atualizados manualmente`, 'success')]

  productsVerified.value = [...updatedProducts]

  currentAction.value = null
  canChangeAction.value = true
}

const UpdatePage = (e) => currentPage.value = e.currentTarget.value

function ExportTable(products: ProductInfo[]){
  if (products.length == 0 ){
    logs.value = [...actionLogs.createLog('Nenhum produto para ser exportado', 'error')]
    return
  }

  const ws = XLSX.utils.json_to_sheet(products.map(p => ({
    Prduto: p.descricao || '-',
    NCM: p.ncm,
    'NCM Original': p.ncm_original || '-',
    'NCM Atualizado?': p.ncm_atualizado ? 'Sim' : 'Não',
    'NCM Válido?': p.ncm_valido ? 'Sim' : 'Não',
    'Descrição NCM': p.descricao_ncm || '-',
  })))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos')

  const nomeArquivo = `produtos_ncm_atualizado_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, nomeArquivo)
  logs.value = [...actionLogs.createLog('Planilha gerada com sucesso.', 'success')]
}

</script>

<template>

  <header class="transparent-background row-container">
    <div class="row-container info">
      <span class="material-symbols-outlined">database</span>
      <div class="column-container">
        <h1>NCM Certin - SISCOMEX</h1>
        <p>{{ NCMS.length }} NCM's Carregados</p>
        <p v-if="fileName">Planilha: {{ fileName }}</p>
      </div>
    </div>

    <div class="row-container actions">
      <button @click="UpdateTable" class="row-container green">
        <span class="material-symbols-outlined">sync</span>
        <p>Atualizar Tabela</p>
      </button>

      <button @click="OpenFile" class="row-container green">
        <span class="material-symbols-outlined">upload</span>
        <p>Importar Tabela</p>
        <input id="file-input" @change="UpdateFile" accept=".xlsx" type="file" hidden />
      </button>

      <button v-if="productsVerified.length > 0" @click="VerifyNcms(productsVerified)" class="row-container orange">
        <span class="material-symbols-outlined">sync</span>
        <p>Validar NCM's</p>
      </button>

      <button v-if="productsVerified.length > 0" @click="UpdateNcms(productsVerified)" class="row-container orange">
        <span class="material-symbols-outlined">sync</span>
        <p>Atualizar NCM's</p>
      </button>

      <button v-if="productsVerified.length > 0" @click="ExportTable(productsVerified)" class="row-container green">
        <span class="material-symbols-outlined">download</span>
        <p>Exportar Tabela</p>
      </button>
    </div>
  </header>

  <aside v-if="productsVerified.length > 0" class="row-container products-info">

    <div class="column-container transparent-background info-card">
      <p>Total de produtos</p>
      <h1>{{ productsVerified.length }}</h1>
    </div>

    <div class="column-container transparent-background info-card">
      <p>NCM's Válidos</p>
      <h1>{{productsVerified.filter(prod => prod.ncm_valido == true).length}}</h1>
    </div>

    <div class="column-container transparent-background info-card red">
      <p>NCM's Inválidos</p>
      <h1>{{productsVerified.filter(prod => prod.ncm_valido != true).length}}</h1>
    </div>

    <div class="column-container transparent-background info-card orange">
      <p>NCM's Atualizados</p>
      <h1>{{ productsVerified.filter(prod => prod.ncm_atualizado == true).length }}</h1>
    </div>

  </aside>

  <main class="row-container">

    <div v-if="productsVerified.length == 0" class="transparent-background column-container no-products">
      <span class="material-symbols-outlined">docs</span>
      <h3>Nenhuma Planilha carregada</h3>
      <p>Importe uma planilha excel com as colunas: NCM, Descrição</p>
    </div>

    <div v-if="productsVerified.length > 0" class="transparent-background column-container table-holder">
      <table align="left">
        <tr class="header">
          <th>STATUS</th>
          <th>PRODUTO</th>
          <th>CÓDIGO</th>
          <th>DESCRIÇÃO NCM</th>
          <th>AÇÕES</th>
        </tr>

        <tr class="row" :class="product.ncm_valido ? 'valid' : 'invalid'" v-for="product in productsVerified.slice(currentPage*10, (currentPage*10)+10)">
          <td class="status">
            <span class="material-symbols-outlined">{{ !product.ncm_valido ? 'error' : 'check_circle' }}</span>
          </td>
          <td style="max-width: 270px;">
            <p>{{ product.descricao }}</p>
          </td>
          <td>
            <p>{{ product.ncm }}</p>
          </td>
          <td style="max-width: 230px;">
            <p>{{ product.descricao_ncm }}</p>
          </td>
        </tr>
      </table>

      <div class="row-container table-nav">
        <p>Mostrando página {{ currentPage }} de {{ Math.round(productsVerified.length/10) }}</p>
        <input type="number" @change="UpdatePage" :max="Math.round(productsVerified.length/10)" min="1">
      </div>
    </div>

    <div class="transparent-background column-container log-container">
      <div class="header">
        <h3>Log de Atividades</h3>
      </div>
      <div class="column-container holder">
        <div class="column-container log" :class="log.type" v-for="log in logs">
          <p>{{ `${String(log.timestamp.getHours()).padStart(2, '0')}:${String(log.timestamp.getMinutes()).padStart(2,
            '0')}:${String(log.timestamp.getSeconds()).padStart(2, '0')} : ${log.type}` }}</p>
          <h4>{{ log.message }}</h4>
        </div>
      </div>
    </div>

  </main>

</template>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap');

:root {
  font-size: 16px;
}

* {
  font-family: "Lato", sans-serif;

  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.column-container {
  display: flex;
  flex-direction: column;
}

.row-container {
  display: flex;
  flex-direction: row;
}

.transparent-background {
  color: white;
  background-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(2px);
  border-radius: 10px;
  border: 1px solid rgba(113, 228, 165, 0.39);
}

body {
  align-items: center;
  overflow-x: hidden;

  padding: 20px;

  width: 100dvw;
  min-height: 100dvh;

  background-image: linear-gradient(-45deg, rgb(8, 58, 30), rgb(15, 110, 58), rgb(8, 58, 30));
}

header {
  justify-content: space-between;
  align-items: center;
  padding: 25px;

  width: 100dvw;
  max-width: 1500px;

  .info {
    gap: 10px;
    align-items: center;

    span {
      color: rgb(27, 196, 103);
      font-size: 2rem;
    }

    p {
      font-size: .9rem;
      color: rgb(27, 196, 103);
    }
  }

  .actions {
    align-items: center;
    gap: 10px;

    button {
      cursor: pointer;
      transition: all .3s ease;

      align-items: center;
      gap: 10px;

      padding: 10px 20px;

      border: 0;
      outline: 0;
      border-radius: 10px;

      color: white;

      p {
        font-size: 1rem;
        font-weight: 500;
      }

      span {
        font-weight: 200;
      }

      &.green {
        background-color: rgb(27, 196, 103);
      }

      &.orange {
        background-color: orange;
      }

      &:hover {
        transform: translateY(-3px);

        &.green {
          background-color: rgb(9, 243, 114);
        }

        &.orange {
          background-color: rgb(255, 182, 46);
        }
      }

      &:active {
        transform: scale(.99, .99);
      }
    }
  }
}

.products-info {
  gap: 20px;
  justify-content: space-between;

  margin-top: 20px;

  .info-card {
    transition: all .25s ease;
    flex: 1;
    gap: 15px;
    padding: 20px 20px;

    p {
      opacity: .8;
    }

    &.red {
      background-color: rgba(255, 0, 0, 0.2);
      color: rgb(255, 127, 127);
      border: 1px solid red;
    }

    &.orange {
      background-color: rgba(255, 187, 0, 0.2);
      color: rgb(255, 210, 127);
      border: 1px solid rgb(255, 210, 127);
    }

    &:hover {
      transform: translateY(-3px);
    }
  }

}

main {
  justify-content: space-between;
  gap: 20px;

  margin: 20px 0;
}

.no-products {
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 10px;

  span {
    font-size: 7rem;
  }

  p {
    opacity: .8;
  }
}

.log-container {
  overflow: hidden;

  width: 400px;
  height: fit-content;

  .header {
    padding: 20px 10px;
    background-color: rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(113, 228, 165, 0.39);
  }

  .holder {
    padding: 10px;
    gap: 10px;
    overflow-y: scroll;

    width: 100%;
    height: 400px;
  }

  .log {
    transition: all .25s ease;
    user-select: none;
    gap: 10px;
    padding: 20px;

    border-radius: 10px;
    background-color: rgba(255, 255, 255, 0.068);

    p {
      opacity: .7;
      font-size: .9rem;
    }

    h4 {
      font-size: .9rem;
      font-weight: 500;
    }

    &.error {
      background-color: rgba(255, 0, 0, 0.68);
      color: red;
    }

    &:hover {
      transform: translateY(-3px);
    }
  }
}

.table-holder {
  height: fit-content;
  overflow: hidden;
  flex: 1;
  max-width: 800px;
  height: 700px;

  margin-right: 20px;
  margin-bottom: 10px;

  table {
    flex: 1;
    border: 0;
    border-collapse: collapse;

    tr {
      max-height: 50px;
      text-overflow: ellipsis;

      p{
        max-height: 50px;
        text-wrap: wrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }

      &.header {
        background-color: rgba(255, 255, 255, 0.1);
        height: 30px;

        th {
          text-align: left;
          padding: 10px;
          font-size: .8rem;
          color: rgba(255, 255, 255, 0.8);
        }
      }

      &.row {
        td {
          padding: 10px;
          text-align: left;
        }
      }

      &.invalid {
        .status {
          span {
            color: rgb(252, 96, 96);
          }
        }
      }

      &.valid {
        span {
          color: greenyellow;
        }
      }
    }
  }

  .table-nav{
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    align-items: center;
    gap: 10px;
    padding: 10px;

    input{
      padding: 5px;
      border-radius: 5px;
      border: 0;
    }
  }
}
</style>
