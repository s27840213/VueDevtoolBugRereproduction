import Vue from 'vue'
import VueRouter, { RawLocation, Route, RouteConfig } from 'vue-router'
import Editor from '@/views/Editor.vue'
import SignUp from '@/views/Login/SignUp.vue'
import Login from '@/views/Login/Login.vue'
import MyDesign from '@/views/MyDesign.vue'
import Home from '@/views/Home.vue'
import Settings from '@/views/Settings.vue'
import TemplateCenter from '@/views/TemplateCenter.vue'
import MobileWarning from '@/views/MobileWarning.vue'
import Preview from '@/views/Preview.vue'
import SvgIconView from '@/views/SvgIconView.vue'
import NubtnList from '@/views/NubtnList.vue'
import BrandKit from '@/views/BrandKit.vue'
import Pricing from '@/views/Pricing.vue'
import CopyTool from '@/views/CopyTool.vue'
import store from '@/store'
import { editorRouteHandler } from './handler'
import i18n from '@/i18n'
import localeUtils from '@/utils/localeUtils'
import logUtils from '@/utils/logUtils'
import assetUtils from '@/utils/assetUtils'
import brandkitUtils from '@/utils/brandkitUtils'
import appJson from '@/assets/json/app.json'
import generalUtils from '@/utils/generalUtils'

Vue.use(VueRouter)

const MOBILE_ROUTES = [
  'Home',
  'TemplateCenter',
  'Settings',
  'SignUp',
  'Login',
  'MobileWarning',
  'Preview',
  'MobileEditor',
  'MyDesign',
  'Pricing'
]

// Ingore some normal router console error
const originalPush = VueRouter.prototype.push
VueRouter.prototype.push = function push(location: RawLocation): Promise<Route> {
  return (originalPush.call(this, location) as unknown as Promise<Route>)
    .catch(err => {
      switch (err.name) {
        case 'NavigationDuplicated':
          break
        default:
          console.error(err)
      }
      return err
    })
}

const originalReplace = VueRouter.prototype.replace
VueRouter.prototype.replace = function repalce(location: RawLocation): Promise<Route> {
  return (originalReplace.call(this, location) as unknown as Promise<Route>)
    .catch(err => {
      switch (err.name) {
        case 'NavigationDuplicated':
          break
        default:
          console.error(err)
      }
      return err
    })
}

const routes: Array<RouteConfig> = [
  {
    path: '',
    name: 'Home',
    component: Home,
    beforeEnter: async (to, from, next) => {
      try {
        next()
      } catch (error) {
        console.log(error)
      }
    }
  },
  {
    path: 'editor',
    name: 'Editor',
    component: Editor,
    beforeEnter: editorRouteHandler
  },
  // {
  //   path: 'mobile-editor',
  //   name: 'MobileEditor',
  //   component: MobileEditor,
  //   // eslint-disable-next-line space-before-function-paren
  //   beforeEnter: editorRouteHandler
  // },
  {
    path: 'preview',
    name: 'Preview',
    component: Preview,
    beforeEnter: async (to, from, next) => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const url = urlParams.get('url')
        const teamId = urlParams.get('team_id')
        const token = urlParams.get('token')
        const dpi = +(urlParams.get('dpi') ?? -1)

        if (token && teamId && url) {
          // for new version
          // e.g.: /preview?url=template.vivipic.com%2Fexport%2F<design_team_id>%2F<design_export_id>%2Fpage_<page_index>.json%3Fver%3DJeQnhk9N%26token%3DQT0z7B3D3ZuXVp6R%26team_id%3DPUPPET
          store.commit('user/SET_STATE', { token, teamId })
          const response = await (await fetch(`https://${url}`)).json()
          await assetUtils.addTemplate(response, { pageIndex: 0 })
          store.commit('file/SET_setLayersDone')
          store.commit('user/SET_STATE', { userId: 'backendRendering', dpi })
        } else if (url) {
          // for old version
          // e.g.: /preview?url=template.vivipic.com%2Fexport%2F<design_team_id>%2F<design_export_id>%2Fpage_<page_index>.json%3Fver%3DJeQnhk9N%26token%3DQT0z7B3D3ZuXVp6R%26team_id%3DPUPPET
          const hasToken = url.indexOf('token=') !== -1
          let tokenKey = ''
          let src = url
          if (hasToken) {
            tokenKey = url.match('&token') ? '&token=' : '?token='
            src = url.substring(0, url.indexOf(tokenKey))
            const querys: { [index: string]: string } = {}
            url.split('?')[1].split('&').forEach((query: string) => {
              const [key, val] = query.split('=')
              querys[key] = val
            })
            const token = querys.token
            const teamId = querys.team_id
            const dpi = +(querys.dpi ?? -1)
            store.commit('user/SET_STATE', { token, teamId, dpi })
          }
          const response = await (await fetch(`https://${src}`)).json()
          await assetUtils.addTemplate(response, { pageIndex: 0 })
          store.commit('file/SET_setLayersDone')
          store.commit('user/SET_STATE', { userId: 'backendRendering' })
        }
        next()
      } catch (error) {
        console.log(error)
      }
    }
  },
  {
    path: 'signup',
    name: 'SignUp',
    props: route => ({ redirect: route.query.redirect }),
    component: SignUp,
    beforeEnter: async (to, from, next) => {
      try {
        if (store.getters['user/isLogin']) {
          next({ path: from.query.redirect as string || '/' })
        } else {
          next()
        }
      } catch (error) {
        console.log(error)
      }
    }
  },
  {
    path: 'login',
    name: 'Login',
    props: route => ({ redirect: route.query.redirect }),
    component: Login,
    beforeEnter: async (to, from, next) => {
      try {
        if (to.query.type) {
          next()
        } else {
          if (store.getters['user/isLogin']) {
            next({ path: from.query.redirect as string || '/' })
          } else {
            next()
          }
        }
      } catch (error) {
        console.log(error)
      }
    }
  },
  {
    path: 'mydesign/:view?',
    name: 'MyDesign',
    component: MyDesign,
    props: true
  },
  {
    path: 'templates',
    name: 'TemplateCenter',
    component: TemplateCenter
  },
  {
    path: 'settings/:view?',
    name: 'Settings',
    component: Settings,
    props: true
  },
  {
    path: 'mobilewarning',
    name: 'MobileWarning',
    component: MobileWarning
  },
  {
    path: 'brandkit',
    name: 'BrandKit',
    component: BrandKit,
    beforeEnter: async (to, from, next) => {
      try {
        if (!brandkitUtils.isBrandkitAvailable) {
          next({ path: '/' })
        } else {
          next()
        }
      } catch (error) {
        console.log(error)
      }
    }
  },
  {
    path: 'pricing',
    name: 'Pricing',
    component: Pricing
  }
]

if (window.location.host !== 'vivipic.com') {
  routes.push({
    path: 'svgicon',
    name: 'SvgIconView',
    component: SvgIconView
  })
  routes.push({
    path: 'copytool',
    name: 'CopyTool',
    component: CopyTool
  })
  routes.push({
    path: 'nubtnlist',
    name: 'NubtnList',
    component: NubtnList
  })
}

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      // Include the locales you support between ()
      path: `/:locale${localeUtils.getLocaleRegex()}?`,
      component: {
        render(h) { return h('router-view') }
      },
      beforeEnter(to, from, next) {
        if (logUtils.getLog()) {
          logUtils.uploadLog()
        }
        logUtils.setLog('App Start')
        let locale = localStorage.getItem('locale')
        // if local storage is empty
        if (locale === '' || !locale) {
          locale = to.params.locale
          // without locale param, determine the locale with browser language
          if (locale === '' || !locale) {
            i18n.locale = localeUtils.getBrowserLang()
          } else {
            i18n.locale = locale
          }
        } else if (locale && ['tw', 'us', 'jp'].includes(locale) && locale !== i18n.locale) {
          // if local storage has been set
          i18n.locale = locale
          localStorage.setItem('locale', locale)
        }
        next()
        if ((window as any).__PRERENDER_INJECTED === undefined && router.currentRoute.params.locale) {
          // Delete locale in url, will be ignore by prerender.
          delete router.currentRoute.params.locale
          router.replace({ query: router.currentRoute.query, params: router.currentRoute.params })
        }
      },
      children: routes
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  document.title = to.meta?.title || i18n.t('SE0001')

  if ((window as any).__PRERENDER_INJECTED !== undefined) {
    next()
    return
  }
  // Store campaign param to local storage.
  const urlParams = new URLSearchParams(window.location.search)
  const campaign = urlParams.get('campaign')
  if (campaign) {
    localStorage.setItem('campaign', campaign)
  }

  // Force login in these page
  if (['Settings', 'MyDesign', 'BrandKit', 'Editor'].includes(to.name as string)) {
    if (!store.getters['user/isLogin']) {
      const token = localStorage.getItem('token')
      if (token === '' || !token) {
        next({ name: 'SignUp', query: { redirect: to.fullPath } })
        return
      } else {
        await store.dispatch('user/login', { token: token })
      }
    }
  } else {
    if (!store.getters['user/isLogin']) {
      const token = localStorage.getItem('token')
      if (token && token.length > 0) {
        await store.dispatch('user/login', { token: token })
      }
    }
  }

  if (store.getters['user/getImgSizeMap'].length === 0 && (window as any).__PRERENDER_INJECTED === undefined) {
    /**
     * @MobileDebug - comment the following two line, and use const json = appJSON, or the request will be blocked by CORS
     */
    const response = await fetch(`https://template.vivipic.com/static/app.json?ver=${generalUtils.generateRandomString(6)}`)
    const json = await response.json()

    // const json = appJson

    process.env.NODE_ENV === 'development' && console.log('static json loaded: ', json)

    store.commit('user/SET_STATE', {
      verUni: json.ver_uni,
      verApi: json.ver_api,
      imgSizeMap: json.image_size_map,
      imgSizeMapExtra: json.image_size_map_extra
    })
    let defaultFontsJson = json.default_font as Array<{ id: string, ver: number }>

    // Firefox doesn't support Noto Color Emoji font, so remove it from the default fonts.
    if (/Firefox/i.test(navigator.userAgent || navigator.vendor)) {
      defaultFontsJson = defaultFontsJson.filter(font => font.id !== 'zVUjQ0MaGOm7HOJXv5gB')
    }

    defaultFontsJson
      .forEach(_font => {
        const font = {
          type: 'public',
          face: _font.id,
          ver: _font.ver
        }
        store.commit('text/UPDATE_DEFAULT_FONT', { font })
      })
  }
  if (!MOBILE_ROUTES.includes(to.name ?? '') && (to.name === 'Editor' || !localStorage.getItem('not-mobile'))) {
    let isMobile = false
    const userAgent = navigator.userAgent || navigator.vendor
    logUtils.setLog(`Read device width: ${window.screen.width}`)
    logUtils.setLog(`User agent: ${userAgent}`)
    if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      // is Desktop
      if (userAgent.indexOf('Mac OS X') > 0) {
        // is Mac (could be iPad)
        if (window.screen.width <= 1024) {
          // less than iPad Pro width
          isMobile = true
        } // wider
      }
      // not Mac
    } else {
      // is Mobile
      isMobile = true
    }
    if (isMobile) {
      logUtils.setLog('=> as mobile')
      if (to.name !== 'Editor' || !localStorage.getItem('not-mobile')) {
        next({ name: 'MobileWarning', query: { width: window.screen.width.toString(), url: to.fullPath } })
        return
      } else {
        store.commit('SET_useMobileEditor', true)
      }
    } else {
      logUtils.setLog('=> as non-mobile')
    }
  }

  next()
})

export default router
