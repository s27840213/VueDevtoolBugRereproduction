import store from '@/store'
class GeneralUtils {
  get scaleRatio() { return store.getters.getPageScaleRatio }

  isJsonString(str: string) {
    try {
      JSON.parse(str)
    } catch (e) {
      return false
    }
    return true
  }

  deepCopy(el: unknown) {
    return typeof el === 'undefined' ? {} : JSON.parse(JSON.stringify(el))
  }

  exact(conditions: Array<boolean>): boolean {
    return conditions.filter((condition: boolean) => {
      return condition === true
    }).length === 1
  }

  generateAssetId() {
    const date = new Date()
    const year = this.formatStr((date.getFullYear() - 2000).toString(), 2)
    const month = this.formatStr((date.getMonth() + 1).toString(), 2)
    const _date = this.formatStr((date.getDate()).toString(), 2)
    const hours = this.formatStr((date.getHours()).toString(), 2)
    const mins = this.formatStr((date.getMinutes()).toString(), 2)
    const sec = this.formatStr((date.getSeconds()).toString(), 2)
    const msec = this.formatStr((date.getMilliseconds()).toString(), 3)
    return year + month + _date + hours + mins + sec + msec + this.generateRandomString(8)
  }

  generateRandomString(length: number) {
    let result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() *
        charactersLength))
    }
    return result
  }

  generateRandomTime(start: Date, end: Date) {
    return start.getTime() + Math.random() * (end.getTime() - start.getTime())
  }

  formatStr(str: string, len: number) {
    if (str.length === len) {
      return str
    } else {
      const diff = len - str.length
      const complement = new Array(diff).fill(0).join('')
      return complement + str
    }
  }

  isValidInt(value: string) {
    return value.match(/^-?\d+$/)
  }

  isValidFloat(value: string) {
    return value.match(/[+-]?\d+(\.\d+)?/)
  }

  isValidHexColor(value: string) {
    value = value.toUpperCase()
    return value.match(/^#[0-9A-F]{6}$/)
  }

  copyText(text: string) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text)
    }
    const el = document.createElement('textarea')
    el.value = text
    el.style.display = 'none'
    document.body.appendChild(el)
    el.focus()
    el.select()
    document.execCommand('copy')
    el.remove()
    return Promise.resolve()
  }

  arrayCompare<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  fixSize(size: number) {
    return size * (100 / this.scaleRatio)
  }

  // log(params: string, data: any = '') {
  //   if (data) {
  //     console.log(data)
  //   } else {
  //     store.commit('SET_LOG' {
  //       params += 'time'
  //     })
  //     logData.push(params)
  //   }
  // }
}

const generalUtils = new GeneralUtils()

export default generalUtils
