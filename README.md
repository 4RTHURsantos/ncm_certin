# 📦 NCM Validator & Corrector

![Badge de Versão](https://img.shields.io/badge/version-1.0.0-blue.svg) ![Badge License](https://img.shields.io/badge/license-MIT-green.svg) ![Electron](https://img.shields.io/badge/Electron-Vue-42b883.svg)

Uma aplicação Desktop robusta desenvolvida com **Vue.js** e **Electron** para automatizar a validação e correção de NCMs (Nomenclatura Comum do Mercosul) em planilhas de produtos. O sistema cruza os dados locais com a tabela oficial mais recente, garantindo conformidade fiscal e logística.

## 🚀 Funcionalidades

- **📥 Importação de Planilhas:** Suporte para leitura de arquivos `.xlsx` contendo colunas de NCM e Descrição do Produto.
- **🔄 Atualização Automática:** Baixa a tabela TIPI/NCM mais recente diretamente de fontes oficiais/APIs configuradas para garantir que a base de validação esteja sempre atualizada.
- **✅ Validação Inteligente:**
  - Verifica se o NCM existe.
  - Verifica se o NCM foi extinto.
  - Valida a descrição.
- **🛠️ Correção Assistida:** Tenta sugerir ou corrigir NCMs inválidos baseando-se na similaridade da **descrição do produto** e no histórico de mudanças da tabela oficial.
- **📤 Exportação:** Gera uma nova planilha com os dados validados e um relatório de inconsistências.

## 🛠️ Tecnologias Utilizadas

Este projeto foi desenvolvido utilizando as seguintes tecnologias:

- **[Vue.js 3](https://vuejs.org/)**: Framework JavaScript progressivo para a interface do usuário.
- **[Electron](https://www.electronjs.org/)**: Para empacotar a aplicação web como um software desktop cross-platform (Windows, Linux, Mac).
- **[Vite](https://vitejs.dev/)**: Build tool rápida.
- **[SheetJS (xlsx)](https://github.com/SheetJS/sheetjs)**: Para leitura e manipulação de planilhas Excel.
- **Node.js**: Ambiente de execução.
