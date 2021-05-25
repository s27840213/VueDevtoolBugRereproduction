import Vue from 'vue'
import Vuex, { GetterTree, MutationTree, ActionTree } from 'vuex'
import { IShape, IText, IImage, IGroup, ITmp } from '@/interfaces/layer'
import { IEditorState, SidebarPanelType, FunctionPanelType } from './types'
import { IPage } from '@/interfaces/page'
import GroupUtils from '@/utils/groupUtils'
import apis from '@/apis/unsplash'
import orderMutation from '@/store/mutations/order'

Vue.use(Vuex)

const getDefaultState = (): IEditorState => ({
  pages: [
    {
      width: 600,
      height: 800,
      backgroundColor: '#ffffff',
      backgroundImage: {
        src: 'none',
        posX: -1,
        posY: -1
      },
      name: 'Default Page',
      layers: [
      ]
    },
    {
      width: 600,
      height: 800,
      backgroundColor: '#ffffff',
      backgroundImage: {
        src: 'none',
        posX: -1,
        posY: -1
      },
      name: 'Default Page',
      layers: []
    }
  ],
  currSidebarPanelType: SidebarPanelType.template,
  currFunctionPanelType: FunctionPanelType.none,
  pageScaleRatio: 100,
  lastSelectedPageIndex: 0,
  lastSelectedLayerIndex: 0,
  clipboard: [],
  photos: [],
  currSelectedInfo: {
    index: -1,
    layers: [],
    types: new Set<string>()
  },
  isOrderDropdownsOpened: false,
  isLayerDropdownsOpened: false
})
const state = getDefaultState()
const getters: GetterTree<IEditorState, unknown> = {
  getPage(state: IEditorState) {
    return (pageIndex: number): IPage => {
      return state.pages[pageIndex]
    }
  },
  getPages(state): Array<IPage> {
    return state.pages
  },
  getCurrSidebarPanelType(state): number {
    return state.currSidebarPanelType
  },
  getCurrFunctionPanelType(state): number {
    return state.currFunctionPanelType
  },
  getPageScaleRatio(state): number {
    return state.pageScaleRatio
  },
  getLayer(state: IEditorState) {
    return (pageIndex: number, layerIndex: number): IShape | IText | IImage | IGroup => {
      return state.pages[pageIndex].layers[layerIndex]
    }
  },
  getLayers(state: IEditorState) {
    return (pageIndex: number): Array<IShape | IText | IImage | IGroup> => {
      return state.pages[pageIndex].layers
    }
  },
  getLayersNum(state: IEditorState) {
    return (pageIndex: number): number => {
      return state.pages[pageIndex].layers.length
    }
  },
  getLastSelectedPageIndex(state: IEditorState): number {
    return state.lastSelectedPageIndex
  },
  getLastSelectedLayerIndex(state: IEditorState): number {
    return state.lastSelectedLayerIndex
  },
  getClipboard(state: IEditorState): Array<ITmp> {
    return state.clipboard
  },
  getPhotos(state: IEditorState) {
    return state.photos
  },
  getCurrSelectedInfo(state: IEditorState): {
    index: number,
    layers: Array<IShape | IText | IImage | IGroup | ITmp>,
    types: Set<string>
  } {
    return state.currSelectedInfo
  },
  getCurrSelectedIndex(state: IEditorState) {
    return state.currSelectedInfo.index
  },
  getCurrSelectedLayers(state: IEditorState) {
    return state.currSelectedInfo.layers
  },
  getCurrSelectedTypes(state: IEditorState) {
    return state.currSelectedInfo.types
  },
  getIsOrderDropdownsOpened(state: IEditorState) {
    return state.isOrderDropdownsOpened
  },
  getIsLayerDropdownsOpened(state: IEditorState) {
    return state.isLayerDropdownsOpened
  }
}

const mutations: MutationTree<IEditorState> = {
  SET_pages(state: IEditorState, newPages: Array<IPage>) {
    state.pages = newPages
  },
  SET_layers(state: IEditorState, updateInfo: { pageIndex: number, newLayers: Array<IShape | IText | IImage | IGroup> }) {
    state.pages[updateInfo.pageIndex].layers = [...updateInfo.newLayers]
  },
  SET_currSidebarPanelType(state: IEditorState, type: SidebarPanelType) {
    state.currSidebarPanelType = type
  },
  SET_currFunctionPanelType(state: IEditorState, type: SidebarPanelType) {
    state.currFunctionPanelType = type
  },
  SET_pageScaleRatio(state: IEditorState, ratio: number) {
    state.pageScaleRatio = ratio
  },
  SET_lastSelectedPageIndex(state: IEditorState, index: number) {
    state.lastSelectedPageIndex = index
  },
  SET_lastSelectedLayerIndex(state: IEditorState, index: number) {
    state.lastSelectedLayerIndex = index
  },
  SET_backgroundImageSrc(state: IEditorState, updateInfo: { pageIndex: number, imageSrc: string }) {
    state.pages[updateInfo.pageIndex].backgroundImage.src = updateInfo.imageSrc
  },
  SET_backgroundImagePos(state: IEditorState, updateInfo: { pageIndex: number, imagePos: { x: number, y: number } }) {
    state.pages[updateInfo.pageIndex].backgroundImage.posX = updateInfo.imagePos.x
    state.pages[updateInfo.pageIndex].backgroundImage.posY = updateInfo.imagePos.y
  },
  REMOVE_backgroundImage(state: IEditorState) {
    Object.assign(state.pages[state.lastSelectedPageIndex].backgroundImage, {
      src: 'none',
      posX: -1,
      posY: -1
    })
  },
  ADD_newLayers(state: IEditorState, updateInfo: { pageIndex: number, layers: Array<IShape | IText | IImage | IGroup> }) {
    updateInfo.layers.forEach(layer => {
      state.pages[updateInfo.pageIndex].layers.push(layer)
    })
  },
  ADD_layersToPos(state: IEditorState, updateInfo: { pageIndex: number, layers: Array<IShape | IText | IImage | IGroup>, pos: number }) {
    state.pages[updateInfo.pageIndex].layers.splice(updateInfo.pos, 0, ...updateInfo.layers)
  },
  DELETE_layer(state: IEditorState, updateInfo: { pageIndex: number, layerIndex: number }) {
    state.pages[updateInfo.pageIndex].layers.splice(updateInfo.layerIndex, 1)
  },
  UPDATE_layerProps(state: IEditorState, updateInfo: { pageIndex: number, layerIndex: number, props: { [key: string]: string | number | boolean } }) {
    /**
     * This Mutation is used to update the layer's properties excluding styles
     */
    Object.entries(updateInfo.props).forEach(([k, v]) => {
      state.pages[updateInfo.pageIndex].layers[updateInfo.layerIndex][k] = v
    })
  },
  UPDATE_layerStyles(state: IEditorState, updateInfo: { pageIndex: number, layerIndex: number, styles: { [key: string]: string | number } }) {
    Object.entries(updateInfo.styles).forEach(([k, v]) => {
      state.pages[updateInfo.pageIndex].layers[updateInfo.layerIndex].styles[k] = v
    })
  },
  UPDATE_layerOrders(state: IEditorState, updateInfo: { pageIndex: number }) {
    state.pages[updateInfo.pageIndex].layers.sort((a, b) => a.styles.zindex - b.styles.zindex)
  },
  UPDATE_tmpLayerStyles(state: IEditorState, updateInfo: { pageIndex: number, styles: { [key: string]: string | number } }) {
    Object.entries(updateInfo.styles).forEach(([k, v]) => {
      if (typeof v === 'number') {
        (state.pages[updateInfo.pageIndex].layers[state.currSelectedInfo.index].styles[k] as number) += v
      } else {
        state.pages[updateInfo.pageIndex].layers[state.currSelectedInfo.index].styles[k] = v
      }
    })
  },
  UPDATE_layersInTmp(state: IEditorState, updateInfo: { layers: Array<IShape | IText | IImage | IGroup> }) {
    state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index].layers = updateInfo.layers
  },
  UPDATE_tmpLayersZindex(state: IEditorState) {
    (state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index] as ITmp).layers.forEach((layer: IShape | IText | IImage | IGroup, index: number) => {
      layer.styles.zindex = state.currSelectedInfo.index + 1
    })
  },
  DELETE_selectedLayer(state: IEditorState) {
    const index = state.currSelectedInfo.index
    if (index < 0) {
      console.log('You didn\'t select any layer')
      return
    }
    state.pages[state.lastSelectedPageIndex].layers.splice(index, 1)

    GroupUtils.reset()
  },
  SET_clipboard(state: IEditorState, tmpLayer: IShape | IText | IImage | IGroup) {
    state.clipboard = [JSON.parse(JSON.stringify(tmpLayer))]
  },
  CLEAR_clipboard(state: IEditorState) {
    state.clipboard = []
  },
  SET_photos(state: IEditorState, data) {
    state.photos = [...data]
  },
  SET_currSelectedInfo(state: IEditorState, data: { index: number, layers: Array<IShape | IText | IImage | IGroup | ITmp>, types: Set<string> }) {
    Object.assign(state.currSelectedInfo, data)
  },
  SET_isOrderDropdownsOpened(state: IEditorState, isOpened: boolean) {
    state.isOrderDropdownsOpened = isOpened
  },
  SET_isLayerDropdownsOpened(state: IEditorState, isOpened: boolean) {
    state.isLayerDropdownsOpened = isOpened
  },
  ...orderMutation
}

const actions: ActionTree<IEditorState, unknown> = {
  async getRandomPhoto({ commit }, { count }) {
    try {
      const { data } = await apis.getRandomPhoto(count)
      commit('SET_photos', data)
    } catch (error) {
      console.log(error)
    }
  }
}
export default new Vuex.Store({
  state,
  getters,
  mutations,
  actions
})
