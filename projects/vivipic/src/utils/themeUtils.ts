import listService from '@/apis/list'
import i18n from '@/i18n'
import { Itheme } from '@/interfaces/theme'
import store from '@/store'
import PageUtils from '@/utils/pageUtils'
import _ from 'lodash'
import generalUtils from './generalUtils'

class ThemeUtils {
  get themes() { return store.state.themes }
  get themesMainHidden() { return _.filter(store.state.themes, ['mainHidden', 0]) }
  get groupType() { return store.state.groupType }
  get getPageSize() { return store.getters.getPageSize }

  getFocusPageSize(pageIndex = PageUtils.currFocusPageIndex): { width: number, height: number } {
    return this.getPageSize(pageIndex === -1 ? PageUtils.middlemostPageIndex : pageIndex)
  }

  setTemplateThemes(themes: Itheme[]) {
    store.commit('templates/SET_STATE', {
      theme: themes.map(theme => theme.id).join(',')
    })
  }

  checkAllThemes() { // Must be excute after get editorThemes
    const themes = store.getters.getEditThemes
      .map((it: Record<string, string>) => it.id)
      .sort((a: number, b: number) => a - b)
      .join(',')
    store.commit('templates/SET_STATE', { theme: themes })
  }

  async fetchTemplateContent() {
    generalUtils.panelInit('template',
      async (keyword: string) => {
        await store.dispatch('templates/getTagContent', { keyword })
      }, async (keyword: string, locale: string) => {
        await store.dispatch('templates/getContent', { keyword, locale })
      }, async ({ reset }: { reset: boolean }) => {
        store.dispatch('templates/getRecAndCate', { reset })
      })
  }

  refreshTemplateState() {
    // Refresh template in sidebar panel. If pageIndex give, use its width and height to sort template.
    // If newDesignType give, it should be the first priority template result.
    this.setTemplateThemes([])
    return this.checkThemeState().then(() => {
      this.setPageThemes()
    })
  }

  async checkThemeState() {
    const { themes } = this

    if (!themes.length) {
      try {
        const response = await listService.getTheme({ locale: i18n.global.locale })
        const { data } = response.data
        console.log(data)
        store.commit('SET_themes', data.content)
        if (store.getters.getHomeTags.length === 0) {
          store.commit('SET_homeTags', data.tags)
          store.commit('SET_shuffledThemesIds', data.theme_ids)
        }
      } catch (error) {
        // handle error
      }
    }
  }

  setPageThemes() {
    const urlParams = new URLSearchParams(window.location.search)
    const themeId = urlParams.get('themeId')
    if (themeId) {
      store.commit('templates/SET_STATE', { theme: themeId })
    } else {
      const pageSize = this.getFocusPageSize()
      const pageThemes = this.getThemesBySize(pageSize.width, pageSize.height)
      this.setTemplateThemes(pageThemes)
    }
  }

  sortedThemes(width: number, height: number) {
    const { themes } = this
    const currPageRatio = width / height

    // Sort themes by ratio and size.
    return _.sortBy(themes, [
      (theme: Itheme) => this.themeRatioDifference(theme, currPageRatio),
      (theme: Itheme) => Math.abs(theme.width - width)
    ]).reverse()
  }

  getThemesBySize(width: number, height: number) {
    const { themes, groupType } = this

    if (groupType === 1) return themes.filter(theme => theme.id === 7)

    const currPageRatio = width / height
    let recommendation = this.sortedThemes(width, height)
    recommendation = recommendation.filter(
      theme => this.themeRatioDifference(theme, currPageRatio) < 0.2
    )

    const urlParams = new URLSearchParams(window.location.search)
    const themeId = urlParams.get('themeId')
    const newDesignType = themeId ? parseInt(themeId) : null
    // Pick new design type to the top.
    if (newDesignType) {
      recommendation = recommendation.filter((item) => item.id !== newDesignType)
        .concat(recommendation.filter((item) => item.id === newDesignType))
    }
    return recommendation.length ? recommendation : themes
  }

  sortSelectedTheme(selectedThemesIndex: string) {
    const selectedThemes = selectedThemesIndex.split(',').map(Number)
    const pageSize = this.getFocusPageSize()
    const sortedThemes = this.sortedThemes(pageSize.width, pageSize.height)
    return [
      ...sortedThemes.filter(theme => !selectedThemes.includes(theme.id)),
      ...sortedThemes.filter(theme => selectedThemes.includes(theme.id))
    ].map(theme => theme.id)
      .join(',')
  }

  compareThemesWithPage(themes: string, pageIndex?: number) {
    const pageSize = this.getFocusPageSize(pageIndex)
    const pageThemes = this.getThemesBySize(pageSize.width, pageSize.height)
    return pageThemes.some(theme => themes.includes(`${theme.id}`))
  }

  getThemeTitleById(id: string) {
    const theme = this.themes.find(theme => theme.id === parseInt(id))
    return theme ? theme.title : ''
  }

  private isSameDirection(targetRatio: number, ratio: number) {
    // @TODO 正方形
    return targetRatio === 1 || (Math.floor(targetRatio) === Math.floor(ratio))
  }

  private isSimilarSize(targetRatio: number, ratio: number, range: number) {
    return targetRatio * (1 + range) >= ratio && targetRatio * (1 - range) <= ratio
  }

  private themeRatioDifference(theme: Itheme, baselineRatio: number) {
    const themeRatio = theme.width / theme.height
    return Math.abs(themeRatio - baselineRatio) / baselineRatio
  }
}

const themeUtils = new ThemeUtils()

export default themeUtils