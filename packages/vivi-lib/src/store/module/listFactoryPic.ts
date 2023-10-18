import i18n from '@/i18n'
import { IListServiceData } from '@/interfaces/api'
import { IListModuleState, IPending } from '@/interfaces/module'
import store from '@/store'
import localeUtils from '@/utils/localeUtils'
import logUtils from '@/utils/logUtils'
import themeUtils from '@/utils/themeUtils'
import { captureException } from '@sentry/browser'
import { cloneDeep, find } from 'lodash'
import { ActionTree, GetterTree, MutationTree } from 'vuex'

export default function (this: any) {
  const getDefaultState = (): IListModuleState => ({
    content: {},
    categories: [],
    searchResult: {},
    searchCategoryInfo: { // Extra data for category search.
      categoryName: '',
      tags: [],
      url: ''
    },
    tags: [],
    keyword: '',
    theme: '',
    page: 0,
    perPage: 0,
    nextCategory: 0,
    nextPage: 0,
    nextSearch: 0,
    pending: {
      categories: false,
      content: false,
      recently: false,
      favorites: false
    },
    // host: '',
    // data: '',
    // preview: '',
    // preview2: '',
    locale: '',
    error: '',
    sum: 0,
    favorites: {
      items: {
        order: [],
        obj: {}
      },
      tags: {
        order: [],
        obj: {}
      },
      categories: {
        order: [],
        obj: {}
      },
      nextItems: [],
      nextTags: [],
      nextCategories: [],
      itemsContent: {},
      tagsContent: {},
      categoriesContent: {},
      searchTarget: '',
    }
  })

  const actions: ActionTree<IListModuleState, unknown> = {
    // For panel template, object, bg, text, only get recently used.
    // For others, get recently used and categoryies.
    getRecently: async ({ commit, state }, writeBack = true) => {
      const { theme } = state
      const locale = localeUtils.currLocale()
      commit('SET_STATE', { categories: [], locale }) // Reset categories
      commit('SET_pending', { recently: true })
      try {
        const apiParams = {
          token: store.getters['user/getToken'],
          locale,
          theme,
          listAll: 0,
          listCategory: 0
        }

        const { data } = await this.api(apiParams)
        logUtils.setLog(`api(${JSON.stringify(apiParams)}): content = [${data.data.content.map((c: { title: string, list: { id: string }[] }) => `${c.title}[${c.list.slice(0, 3).map((l: { id: string }) => l.id)}...]`)}]`)
        if (writeBack) commit('SET_RECENTLY', data.data)
        else {
        commit('SET_pending', { recently: false })
        return data.data
      }
      } catch (error) {
        logUtils.setLogForError(error as Error)
        captureException(error)
      }
    },

    // For mutiple categories.
    getCategories: async ({ commit, dispatch, state }, writeBack = true) => {
      const { theme } = state
      const locale = localeUtils.currLocale()
      commit('SET_STATE', { locale })
      commit('SET_pending', { categories: true })
      try {
        const isAdmin = store.getters['user/isAdmin']
        const apiParams = {
          token: '1',
          locale,
          theme,
          listAll: 0,
          listCategory: 1,
          pageIndex: state.nextCategory,
          cache: !isAdmin
        }
        const { data } = await this.api(apiParams)
        logUtils.setLog(`api(${JSON.stringify(apiParams)}): contentTitle = [${data.data.content.map((l: { title: string }) => l.title)}]`)
        if (writeBack) commit('SET_CATEGORIES', data.data)
        else return data.data
        // If content empty, auto load more category
        if (data.data.content.length === 0) {
          dispatch('getMoreContent')
        }
      } catch (error) {
        logUtils.setLogForError(error as Error)
        captureException(error)
      }
    },

    // For panel initial, get recently and categories at the same time.
    getRecAndCate: async ({ dispatch, commit }, { reset = true } = {}) => {
      if (reset) dispatch('resetContent')
      await Promise.all([
        dispatch('getRecently', false),
        dispatch('getCategories', false)
      ]).then(([recently, category]) => {
        const result = cloneDeep(category)
        result.content = recently.content.concat(category.content)
        commit('SET_CATEGORIES', result)
        if (category.content.length === 0) {
          dispatch('getMoreContent')
        }
      })
    },

    // For all item or single category search result.
    getContent: async ({ commit, state }, params = {}) => {
      const { theme } = state
      const { keyword }: { keyword: string } = params
      const locale = params.locale || localeUtils.currLocale()
      commit('SET_STATE', { locale })
      commit('SET_pending', { content: true })
      if (keyword) commit('SET_STATE', { keyword })
      try {
        const isAdmin = store.getters['user/isAdmin']
        const needCache = !((keyword && find(state.categories, ['title', keyword])?.is_recent) || isAdmin)
        const apiParams = {
          token: needCache ? '1' : store.getters['user/getToken'],
          locale,
          keyword,
          theme,
          listAll: 1,
          listCategory: 0,
          cache: needCache
        }
        const { data } = await this.api(apiParams)
        logUtils.setLog(`api(${JSON.stringify(apiParams)}): contentId = [${data.data.content[0].list.slice(0, 3).map((l: { id: string }) => l.id)}...], amount: ${data.data.content[0].list.length}`)
        commit('SET_CONTENT', { objects: data.data, isSearch: !!keyword })
      } catch (error) {
        logUtils.setLogForError(error as Error)
        captureException(error)
      }
    },

    // Only for template center.
    getThemeContent: async ({ commit }, params = {}) => {
      const { keyword, theme } = params
      const locale = localeUtils.currLocale()
      commit('SET_STATE', { keyword, theme, locale, content: {} })
      commit('SET_pending', { content: true })
      try {
        const apiParams = {
          token: '1',
          locale,
          keyword,
          theme,
          listAll: 1,
          listCategory: 0,
          cache: true
        }
        const { data } = await this.api(apiParams)
        logUtils.setLog(`api(${JSON.stringify(apiParams)}): contentId = [${data.data.content[0].list.slice(0, 3).map((l: { id: string }) => l.id)}...], amount: ${data.data.content[0].list.length}`)
        commit('SET_CONTENT', { objects: data.data, isSearch: !!keyword })
      } catch (error) {
        logUtils.setLogForError(error as Error)
        captureException(error)
      }
    },

    // For search result.
    getTagContent: async ({ commit, state }, params = {}) => {
      let { theme } = state
      let { keyword } = params
      const locale = localeUtils.currLocale()
      keyword = keyword.includes('::') ? keyword : `tag::${keyword}`
      commit('SET_STATE', { keyword, locale })
      commit('SET_pending', { content: true })
      if (this.namespace === 'templates') theme = themeUtils.sortSelectedTheme(theme)
      const isAdmin = store.getters['user/isAdmin']
      try {
        const apiParams = {
          token: isAdmin ? store.getters['user/getToken'] : '1',
          locale,
          theme,
          keyword,
          listAll: 1,
          listCategory: 0,
          cache: !isAdmin
        }
        const { data } = await this.api(apiParams)
        logUtils.setLog(`api(${JSON.stringify(apiParams)}): contentId = [${data.data.content[0].list.slice(0, 3).map((l: { id: string }) => l.id)}...], amount: ${data.data.content[0].list.length}`)
        commit('SET_CONTENT', { objects: data.data, isSearch: true })
      } catch (error) {
        logUtils.setLogForError(error as Error)
        captureException(error)
      }
    },

    // For all and search/category result, it is also used by TemplateCenter.
    getMoreContent: async ({ commit, getters, dispatch, state }) => {
      const { nextParams, hasNextPage } = getters
      const { keyword } = state
      if (!hasNextPage || state.pending.content || state.pending.categories) return
      if (!keyword && state.categories.length > 0 && state.nextCategory !== -1) {
        // Get more categories
        dispatch('getCategories')
        return
      } else if (!keyword && state.nextPage === 0) {
        // Get first all or search/category result
        dispatch('getContent')
        return
      }

      commit('SET_pending', { content: true })
      try {
        const { data } = await this.api(nextParams)
        logUtils.setLog(`api(${JSON.stringify(nextParams)}): contentId = [${data.data.content[0].list.slice(0, 3).map((l: { id: string }) => l.id)}...], amount: ${data.data.content[0].list.length}`)
        commit('SET_MORE_CONTENT', data.data)
      } catch (error) {
        logUtils.setLogForError(error as Error)
        captureException(error)
      }
    },

    resetContent({ commit }) {
      commit('SET_STATE', {
        content: {},
        categories: [],
        keyword: '',
        page: 0,
        nextCategory: 0,
        nextPage: 0
      })
    },

    // Clear search keyword and result.
    resetSearch: async ({ commit }) => {
      commit('SET_STATE', {
        searchResult: {},
        nextSearch: 0,
        keyword: ''
      })
    },

    getSum: async ({ commit, state }, params = {}) => {
      let { theme } = state
      const { keyword } = params
      const locale = localeUtils.currLocale()
      commit('SET_STATE', { locale, sum: -1 })
      if (keyword && this.namespace === 'templates') theme = themeUtils.sortSelectedTheme(theme)
      try {
        const { data } = await this.api({
          token: store.getters['user/getToken'],
          locale,
          theme,
          keyword: (keyword.includes('::') ? keyword : `tag::${keyword}`).concat(';;sum::1'),
          listAll: 1,
          listCategory: 0,
          cache: false
        })
        commit('SET_STATE', { sum: data.data.sum })
      } catch (error) {
        logUtils.setLogForError(error as Error)
        captureException(error)
      }
    }
  }

  const mutations: MutationTree<IListModuleState> = {
    SET_STATE(state: IListModuleState, data: Partial<IListModuleState>) {
      const newState = data || getDefaultState()
      const keys = Object.keys(newState) as Array<keyof IListModuleState>
      keys
        .forEach(key => {
          if (key in state) {
            (state[key] as unknown) = newState[key]
          }
        })
    },
    SET_pending(state: IListModuleState, data: Record<keyof IPending, boolean>) {
      for (const item of Object.entries(data)) {
        state.pending[item[0] as keyof IPending] = item[1]
      }
    },
    SET_RECENTLY(state: IListModuleState, objects: IListServiceData) {
      state.categories = objects.content.concat(state.categories) || []
      if (objects.next_page) state.nextPage = objects.next_page as number
      state.pending.recently = false
    },
    SET_CATEGORIES(state: IListModuleState, objects: IListServiceData) {
      state.categories = state.categories.concat(objects.content) || []
      state.nextCategory = objects.next_page as number
      state.pending.categories = false
      // state.host = objects.host?.endsWith('/') ? objects.host.slice(0, -1) : (objects.host || '')
      // state.data = objects.data
      // state.preview = objects.preview
      // state.preview2 = objects.preview2
    },
    UPDATE_RECENTLY_PAGE(state: IListModuleState, { index, format }) {
      const targetCategory = state.categories.find((category: any) => {
        return category.title === `${i18n.global.t('NN0024')}`
      })?.list
      if (targetCategory) {
        targetCategory.splice(index, 1)
        targetCategory.unshift(format)
      }
    },
    SET_CONTENT(state: IListModuleState, { objects, isSearch = false }: { objects: IListServiceData, isSearch: boolean }) {
      const {
        content = [],
        // host = '',
        // data = '',
        // preview = '',
        // preview2 = '',
        next_page: nextPage = 0
      } = objects || {}
      const assetContent = content.filter(content => content.title === 'asset')
      const publicContent = content.filter(content => content.title !== 'asset')
      const result = {
        title: content[0]?.title ?? '',
        list: assetContent.flatMap(content => content.list).concat(
          publicContent.flatMap(content => content.list)
        )
      }

      if (isSearch) { // Is search, write to search result.
        state.searchResult = result
        state.nextSearch = nextPage
      } else {
        state.content = result
        state.nextPage = nextPage
      }
      state.pending.content = false
      // state.host = host.endsWith('/') ? host.slice(0, -1) : host
      // state.data = data
      // state.preview = preview
      // state.preview2 = preview2
    },
    SET_MORE_CONTENT(state: IListModuleState, objects: IListServiceData) {
      const isSearch = Boolean(state.keyword)
      const { list = [] } = isSearch ? state.searchResult : state.content
      const {
        content,
        next_page: nextPage = 0
      } = objects
      const newList = content.flatMap(content => content.list)
      const result = {
        ...state.content,
        list: list.concat(newList)
      }

      if (isSearch) { // Is search, write to search result.
        state.searchResult = result
        state.nextSearch = nextPage
      } else {
        state.content = result
        state.nextPage = nextPage
      }
      state.pending.content = false
    }
  }

  const getters: GetterTree<IListModuleState, any> = {
    pending(state) {
      return Object.entries(state.pending).some(([key, value]) => value)
    },
    nextParams: (state) => {
      let { nextPage, nextSearch, keyword, theme, locale } = state
      const isAdmin = store.getters['user/isAdmin']
      const needCache = !((keyword && find(state.categories, ['title', keyword])?.is_recent) ||
        isAdmin)
      if (keyword && keyword.startsWith('tag::') &&
        this.namespace === 'templates') {
        theme = themeUtils.sortSelectedTheme(theme)
      }
      return {
        token: needCache ? '1' : store.getters['user/getToken'],
        locale,
        keyword,
        theme,
        listAll: 1,
        listCategory: 0,
        pageIndex: keyword ? nextSearch : nextPage,
        cache: needCache
      }
    },
    hasNextPage(state) {
      if (state.keyword) return state.nextSearch > 0
      else return (state.nextPage !== undefined && state.nextPage >= 0) || state.nextCategory > 0
    }
  }

  return {
    namespaced: true,
    state: getDefaultState,
    getters,
    mutations,
    actions
  }
}