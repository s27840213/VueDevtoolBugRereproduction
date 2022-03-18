import store from '@/store'
import file from '@/apis/file'
import userApis from '@/apis/user'
import _ from 'lodash'
import apiUtils from '@/utils/apiUtils'
import { ModuleTree, ActionTree, MutationTree, GetterTree } from 'vuex'
import { captureException } from '@sentry/browser'
import { IAssetPhoto, IUserImageContentData } from '@/interfaces/api'
import { IFrame, IGroup, IImage } from '@/interfaces/layer'
import { SrcObj } from '@/interfaces/gallery'

const SET_STATE = 'SET_STATE' as const
const UPDATE_CHECKED_ASSETS = 'UPDATE_CHECKED_ASSETS' as const
const DELETE_CHECKED_ASSETS = 'DELETE_CHECKED_ASSETS' as const
const ADD_CHECKED_ASSETS = 'ADD_CHECKED_ASSETS' as const
const CLEAR_CHECKED_ASSETS = 'CLEAR_CHECKED_ASSETS' as const
const ADD_PREVIEW = 'ADD_PREVIEW' as const
const UPDATE_PROGRESS = 'UPDATE_PROGRESS' as const
const UPDATE_IMAGE_URLS = 'UPDATE_IMAGE_URLS' as const

interface IPhotoState {
  list: Array<IAssetPhoto>,
  editorViewImage: Record<string, Record<string, string>>,
  pageIndex: number,
  pending: boolean,
  checkedAssets: Array<number>,
  initialized: boolean
}

const getDefaultState = (): IPhotoState => ({
  list: [],
  editorViewImage: {},
  pageIndex: 0,
  pending: true,
  checkedAssets: [],
  initialized: false
})

const state = getDefaultState()

function addPerviewUrl(data: any[]) {
  const isAdmin = store.getters['user/isAdmin']
  const teamId = store.getters['user/getTeamId']
  const userId = store.getters['user/getTeamId']

  return data.map((image: IUserImageContentData) => {
    const aspectRatio = image.width / image.height
    const prevW = image.width > image.height ? image.width : 384 * aspectRatio
    const prevH = image.height > image.width ? image.height : 384 / aspectRatio
    return {
      width: image.width,
      height: image.height,
      id: image.id,
      assetIndex: image.asset_index,
      preview: {
        width: prevW,
        height: prevH
      },
      urls: {
        prev: isAdmin ? `https://template.vivipic.com/admin/${teamId || userId}/asset/image/${image.id}/prev` : image.signed_url?.prev ?? '',
        full: isAdmin ? `https://template.vivipic.com/admin/${teamId || userId}/asset/image/${image.id}/full` : image.signed_url?.full ?? '',
        larg: isAdmin ? `https://template.vivipic.com/admin/${teamId || userId}/asset/image/${image.id}/larg` : image.signed_url?.larg ?? '',
        original: isAdmin ? `https://template.vivipic.com/admin/${teamId || userId}/asset/image/${image.id}/original` : image.signed_url?.original ?? '',
        midd: isAdmin ? `https://template.vivipic.com/admin/${teamId || userId}/asset/image/${image.id}/midd` : image.signed_url?.midd ?? '',
        smal: isAdmin ? `https://template.vivipic.com/admin/${teamId || userId}/asset/image/${image.id}/smal` : image.signed_url?.smal ?? '',
        tiny: isAdmin ? `https://template.vivipic.com/admin/${teamId || userId}/asset/image/${image.id}/tiny` : image.signed_url?.tiny ?? ''
      }
    }
  })
}

function isPrivate(srcObj: SrcObj):string {
  return (srcObj && srcObj.type === 'private') ? srcObj.assetId.toString() : ''
}

function addMyfile(response: [IUserImageContentData]):void {
  const data: Record<string, any> = {}
  for (const img of response) {
    data[img.asset_index] = img.signed_url
  }

  if (!store.getters['user/isAdmin']) {
    store.commit('file/SET_STATE', {
      editorViewImage: Object.assign({}, state.editorViewImage, data)
    })
  }

  store.commit('file/SET_STATE', {
    list: state.list.concat(addPerviewUrl(response)),
    pageIndex: state.pageIndex + response.length,
    pending: false,
    initialized: true
  })
}

const actions: ActionTree<IPhotoState, unknown> = {
  async getMoreMyfiles({ commit }) {
    const { pageIndex } = state

    if (pageIndex === -1) {
      return
    }

    commit(SET_STATE, { pending: true })
    try {
      const rawData = await apiUtils.requestWithRetry(() => file.getFiles({ pageIndex }))
      addMyfile(rawData.data.data.image.content)
    } catch (error) {
      captureException(error)
    }
  },
  async deleteAssets({ commit }) {
    try {
      const keyList = state.checkedAssets.join(',')
      const params = {
        token: userApis.getToken(),
        locale: userApis.getLocale(),
        team_id: userApis.getTeamId(),
        type: 'image',
        update_type: 'delete',
        src_asset: keyList,
        target: '1'
      }
      userApis.updateAsset({ ...params }).then(() => {
        commit(SET_STATE, {
          checkedAssets: [],
          list: state.list.filter((item: IAssetPhoto) => {
            return !state.checkedAssets.includes(item.assetIndex as number)
          })
        })
      })
    } catch (error) {
      console.log(error)
    }
  },
  async updatePageImages({ dispatch }, { pageIndex }: { pageIndex: number }) {
    const { layers, backgroundImage } = store.state.pages[pageIndex]
    const imgToRequest = new Set<string>()

    imgToRequest.add(isPrivate(backgroundImage.config.srcObj))
    for (const layer of layers) {
      const targets = layer.type === 'group' ? (layer as IGroup).layers : [layer]

      for (const target of targets) {
        switch (target.type) {
          case 'image':
            imgToRequest.add(isPrivate((target as IImage).srcObj))
            break
          case 'frame':
            for (const clip of (target as IFrame).clips) {
              imgToRequest.add(isPrivate(clip.srcObj))
            }
            break
        }
      }
    }

    imgToRequest.delete('') // delete empty asset id
    await dispatch('updateImages', { assetSet: imgToRequest })
  },
  async updateImages({ commit }, { assetSet }) {
    // Request unknown private image url
    // If you want to reduce redundant update asset, assetSet should be Set<string>.
    // If you want to force update expired image, assetSet should be Set<number>, therefore diff will not take effect.

    const token = userApis.getToken()
    assetSet = _.difference(Array.from(assetSet), Object.keys(state.editorViewImage))
    assetSet = Array.from(assetSet).join(',')
    if (assetSet.length === 0) {
      return
    }

    await userApis.getAllAssets(token, {
      asset_list: assetSet
    }).then((data) => {
      commit(SET_STATE, {
        editorViewImage: Object.assign({}, state.editorViewImage, data.data.url_map)
      })
    })
  },
  initImages({ commit }, { imgs }: { 'imgs': [IUserImageContentData]}) {
    if (state.initialized) {
      return
    }

    addMyfile(imgs)
  }
}

const mutations: MutationTree<IPhotoState> = {
  [SET_STATE](state: IPhotoState, data: Partial<IPhotoState>) {
    const newState = data || getDefaultState()
    const keys = Object.keys(newState) as Array<keyof IPhotoState>
    keys
      .forEach(key => {
        if (key in state) {
          (state[key] as any) = newState[key]
        }
      })
  },
  [UPDATE_CHECKED_ASSETS](state: IPhotoState, val) {
    state.checkedAssets = [...val]
  },
  [ADD_CHECKED_ASSETS](state: IPhotoState, id) {
    state.checkedAssets.push(id)
  },
  [DELETE_CHECKED_ASSETS](state: IPhotoState, index: number) {
    const targetIndex = state.checkedAssets.findIndex((assetIndex) => {
      return assetIndex === index
    })
    state.checkedAssets.splice(targetIndex, 1)
  },
  [CLEAR_CHECKED_ASSETS](state: IPhotoState) {
    state.checkedAssets = []
  },
  [ADD_PREVIEW](state: IPhotoState, { imageFile, assetId }) {
    const previewImage = {
      width: imageFile.width,
      height: imageFile.height,
      id: assetId,
      assetIndex: assetId,
      progress: 0,
      preview: {
        width: imageFile.width,
        height: imageFile.height
      },
      urls: {
        prev: imageFile.src,
        full: imageFile.src,
        larg: imageFile.src,
        original: imageFile.src,
        midd: imageFile.src,
        smal: imageFile.src,
        tiny: imageFile.src
      }
    }
    state.list.unshift(previewImage)
  },
  [UPDATE_PROGRESS](state: IPhotoState, { assetId, progress }) {
    const targetIndex = state.list.findIndex((img: IAssetPhoto) => {
      return img.id === assetId
    })
    state.list[targetIndex].progress = progress
  },
  [UPDATE_IMAGE_URLS](state: IPhotoState, { assetId, urls, assetIndex, type = 'private' }) {
    const { list } = state

    const isAdmin = type === 'public'
    const targetIndex = state.list.findIndex((img: IAssetPhoto) => {
      return isAdmin ? img.id === assetId : img.assetIndex === assetId
    })

    const data = addPerviewUrl([{
      width: list[targetIndex].width,
      height: list[targetIndex].height,
      id: isAdmin ? assetId : undefined,
      asset_index: assetIndex ?? assetId,
      signed_url: urls
    }])
    state.list[targetIndex] = data[0]
    state.editorViewImage[data[0].assetIndex] = data[0].urls
  }
}

const getters: GetterTree<IPhotoState, any> = {
  getImages(state) {
    return state.list
  },
  getCheckedAssets(state) {
    return state.checkedAssets
  },
  getEditorViewImageIndex: (state) => (assetId: string|undefined = undefined) => {
    return assetId ? state.editorViewImage[assetId] : state.editorViewImage
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
} as ModuleTree<IPhotoState>
