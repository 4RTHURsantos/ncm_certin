import axios from 'axios'

interface NCMInfo {
  Codigo: string
  Descricao: string
  DataInicio: string
  DataFim: string
  TipoAto: string
  NumeroAto: string
  AnoAto: string
}

class NcmManager {
  private NCMS: NCMInfo[] = []

  constructor() {}

  public async FetchNcms(): Promise<NCMInfo[]> {
    const response = await axios
      .get('https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json')
      .then((res) => {
        return res.data
      })
      .catch((err) => {
        throw err
      })

    if (!response.Nomenclaturas) throw new Error('ERR_NCM_NOT_FOUND')

    this.NCMS = response.Nomenclaturas

    return response.Nomenclaturas
  }

  public async getNcms(): Promise<NCMInfo[]> {
    if (this.NCMS.length >= 1) {
      return this.NCMS
    }

    const ncms = await this.FetchNcms()
    return ncms
  }
}

const ncmManager = new NcmManager()
export default ncmManager
