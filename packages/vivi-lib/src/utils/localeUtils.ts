import i18n, { LocaleName } from '@/i18n'
import generalUtils from './generalUtils'
export interface ILocale {
  abbreviation: string,
  code: string,
  base: string,
  name: string
}

class LocaleUtils {
  SUPPORTED_LOCALES: Array<ILocale>
  localeMap: { [index: string]: string }
  nativeLocaleMap: { [index: string]: string }
  defaultLocale: string
  NEED_FALLBACK_LOCALES = ['pt' as const]
  constructor() {
    this.SUPPORTED_LOCALES = [{
      abbreviation: 'us',
      code: 'us',
      base: '',
      name: 'English'
    },
    {
      abbreviation: 'tw',
      code: 'tw',
      base: '/tw',
      name: '繁體中文'
    },
    {
      abbreviation: 'jp',
      code: 'jp',
      base: '/jp',
      name: '日本語'
    }, {
      abbreviation: 'pt',
      code: 'pt',
      base: '/pt',
      name: '🍇🦷語測試',
    }]

    this.localeMap = {
      tw: 'tw',
      us: 'us',
      jp: 'jp',
      pt: 'pt',
    }

    this.nativeLocaleMap = {
      'zh-Hant': 'tw',
      en: 'us',
      ja: 'jp',
      pt: 'pt',
    }

    this.defaultLocale = 'us'
  }

  isDefaultLocale(): boolean {
    return i18n.global.locale === this.defaultLocale
  }

  currLocale(): string {
    return i18n.global.locale
  }

  get localeWithFallback() {
    return (this.NEED_FALLBACK_LOCALES as string[]).includes(i18n.global.locale)
      ? 'us'
      : i18n.global.locale as Exclude<LocaleName, typeof this.NEED_FALLBACK_LOCALES[number]>
  }

  getLocaleRegex(): string {
    let reg = '|'
    this.SUPPORTED_LOCALES.forEach((locale, index) => {
      reg = `${reg}${locale.abbreviation}${index !== this.SUPPORTED_LOCALES.length - 1 ? '|' : ''}`
    })
    return `(${reg})`
  }

  setLangAttr(locale: string) {
    document.documentElement.lang = locale
  }

  getLocaleInfo(): ILocale {
    return this.SUPPORTED_LOCALES.find(loc => loc.code === i18n.global.locale) as ILocale
  }

  getBrowserLang(): LocaleName {
    return navigator.language.includes('zh') ? 'tw'
      : navigator.language.includes('ja') ? 'jp'
      : (navigator.language.includes('pt') && generalUtils.isStk) ? 'pt'
      : 'us'
  }

  mapNativeLocale(nativeLocale: string): string | undefined {
    if (['tw', 'us', 'jp'].includes(nativeLocale)) return nativeLocale
    return this.nativeLocaleMap[nativeLocale]
  }
}

export default new LocaleUtils()
