import Vue from 'vue'
import Vuex, { GetterTree, MutationTree, ActionTree } from 'vuex'
import { IShape, IText, IImage, IGroup, ITmp, IParagraph } from '@/interfaces/layer'
import { IEditorState, SidebarPanelType, FunctionPanelType } from './types'
import { IPage } from '@/interfaces/page'
import unsplashApis from '@/apis/unsplash'
import userApis from '@/apis/user'
import orderMutation from '@/store/mutations/order'

Vue.use(Vuex)

const getDefaultState = (): IEditorState => ({
  pages: [
    {
      width: 1080,
      height: 1080,
      backgroundColor: '#ffffff',
      backgroundImage: {
        src: 'none',
        config: {
          type: 'image',
          src: 'none',
          clipPath: '',
          active: false,
          shown: false,
          locked: false,
          imgControl: false,
          styles: {
            x: 0,
            y: 0,
            scale: 1,
            scaleX: 0,
            scaleY: 0,
            rotate: 0,
            width: 0,
            height: 0,
            initWidth: 0,
            initHeight: 0,
            imgX: 0,
            imgY: 0,
            imgWidth: 0,
            imgHeight: 0,
            zindex: -1,
            opacity: 100
          }
        },
        posX: -1,
        posY: -1
      },
      name: 'Default Page',
      layers: [
      ]
    }
  ],
  currSidebarPanelType: SidebarPanelType.template,
  currFunctionPanelType: FunctionPanelType.none,
  pageScaleRatio: 100,
  lastSelectedPageIndex: 0,
  lastSelectedLayerIndex: -1,
  clipboard: [],
  photos: [],
  currSelectedInfo: {
    index: -1,
    layers: [],
    types: new Set<string>()
  },
  isOrderDropdownsOpened: false,
  isLayerDropdownsOpened: false,
  isPageDropdownsOpened: false,
  isColorPickerOpened: false
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
  getPageSize(state: IEditorState) {
    return {
      width: state.pages[0].width,
      height: state.pages[0].height
    }
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
  getBackgroundImage(state: IEditorState) {
    return (pageIndex: number) => {
      return state.pages[pageIndex].backgroundImage
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
  },
  getIsPageDropdownsOpened(state: IEditorState) {
    return state.isPageDropdownsOpened
  },
  getIColorPickerOpened(state: IEditorState) {
    return state.isPageDropdownsOpened
  }
}

const mutations: MutationTree<IEditorState> = {
  SET_pages(state: IEditorState, newPages: Array<IPage>) {
    state.pages = newPages
  },
  UPDATE_pageProps(state: IEditorState, updateInfo: { pageIndex: number, props: { [key: string]: string | number } }) {
    /**
     * This Mutation is used to update the layer's properties excluding styles
     */
    Object.entries(updateInfo.props).forEach(([k, v]) => {
      state.pages[updateInfo.pageIndex][k] = v
    })
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
  SET_backgroundColor(state: IEditorState, updateInfo: { pageIndex: number, color: string }) {
    state.pages[updateInfo.pageIndex].backgroundColor = updateInfo.color
  },
  SET_backgroundImage(state: IEditorState, updateInfo: { pageIndex: number, config: IImage }) {
    state.pages[updateInfo.pageIndex].backgroundImage.src = updateInfo.config.src
    state.pages[updateInfo.pageIndex].backgroundImage.config = updateInfo.config
  },
  SET_backgroundImageSrc(state: IEditorState, updateInfo: { pageIndex: number, imageSrc: string }) {
    state.pages[updateInfo.pageIndex].backgroundImage.src = updateInfo.imageSrc
  },
  SET_backgroundImageConfig(state: IEditorState, updateInfo: { pageIndex: number, config: IImage }) {
    state.pages[updateInfo.pageIndex].backgroundImage.config = updateInfo.config
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
  UPDATE_textProps(state: IEditorState, updateInfo: { pageIndex: number, layerIndex: number,
    paragraphs: [IParagraph] }) {
    /**
     * This Mutation is used to update the text's hierarchy between paragraphs and spans while hitting the enter key or typing with selection range
     */
    (state.pages[updateInfo.pageIndex].layers[updateInfo.layerIndex] as IText).paragraphs = updateInfo.paragraphs
  },
  UPDATE_textContent(state: IEditorState, updateInfo: { pageIndex: number, layerIndex: number, pIndex: number, sIndex: number, text: string }) {
    (state.pages[updateInfo.pageIndex].layers[updateInfo.layerIndex] as IText).paragraphs[updateInfo.pIndex].spans[updateInfo.sIndex].text = updateInfo.text
  },
  UPDATE_textStyle(state: IEditorState, updateInfo: { pageIndex: number, layerIndex: number, pIndex: number, sIndex: number,
    styles: { [key: string]: number | string } }) {
    Object.entries(updateInfo.styles).forEach(([k, v]) => {
      (state.pages[updateInfo.pageIndex].layers[updateInfo.layerIndex] as IText).paragraphs[updateInfo.pIndex].spans[updateInfo.sIndex].styles[k] = v
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
  UPDATE_selectedLayersStyles(state: IEditorState, updateInfo: { styles: { [key: string]: string | number } }) {
    Object.entries(updateInfo.styles).forEach(([k, v]) => {
      (state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index] as ITmp).layers.forEach((layer: IShape | IText | IImage | IGroup) => {
        layer.styles[k] = v
      })
    })
    state.currSelectedInfo.layers = (state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index] as ITmp).layers
  },
  UPDATE_tmpLayersZindex(state: IEditorState) {
    (state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index] as ITmp).layers.forEach((layer: IShape | IText | IImage | IGroup) => {
      layer.styles.zindex = state.currSelectedInfo.index + 1
    })
    Object.assign(state.currSelectedInfo, {
      layers: (state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index] as ITmp).layers
    })
  },
  // DELETE_textParagraphsSpans(state: IEditorState, deleteInfo: { pageIndex: number, layerIndex: number, pIndex: number | number[], sIndex: number | number[] }) {
  //   if ((Array.isArray(deleteInfo.pIndex) && deleteInfo.pIndex.length !== 2) || (Array.isArray(deleteInfo.sIndex) && deleteInfo.sIndex.length !== 2 )) {
  //     console.log('The delete range of array is wrong!')
  //     return
  //   }
  //   /**
  //    *  If the selected delete range is multi-paragraphs, pIndex and sIndex are both of type of array
  //    */
  //   if (Array.isArray(deleteInfo.pIndex) && Array.isArray(deleteInfo.sIndex)) {
  //     const text = (state.pages[deleteInfo.pageIndex].layers[deleteInfo.layerIndex] as IText)
  //     let spanLength = text.paragraphs[deleteInfo.pIndex[0]].spans.length

  //     text.paragraphs[deleteInfo.pIndex[0]].spans.splice(deleteInfo.sIndex[0], spanLength - deleteInfo.sIndex[0])
  //     text.paragraphs[deleteInfo.pIndex[1]].spans.splice(0, deleteInfo.sIndex[1] + 1)
  //     text.paragraphs.splice(deleteInfo.pIndex[0] + 1, deleteInfo.pIndex[1] - (deleteInfo.pIndex[0] + 1))
  //     console.log(text.paragraphs)
  //   /**
  //    *  If the delete range is about only a certain span inside a certain paragraph, pIndex and sIndex are both of type of number
  //    */
  //   } else if (Array.isArray(deleteInfo.sIndex)) {

  //   }
  // },
  DELETE_selectedLayer(state: IEditorState) {
    const index = state.currSelectedInfo.index
    if (index < 0) {
      console.log('You didn\'t select any layer')
      return
    }
    state.pages[state.lastSelectedPageIndex].layers.splice(index, 1)
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
  SET_isPageDropdownsOpened(state: IEditorState, isOpened: boolean) {
    state.isPageDropdownsOpened = isOpened
  },
  SET_isColorPickerOpened(state: IEditorState, isOpened: boolean) {
    state.isColorPickerOpened = isOpened
  },
  ...orderMutation
}

const actions: ActionTree<IEditorState, unknown> = {
  async getRandomPhoto({ commit }, { count }) {
    try {
      const { data } = await unsplashApis.getRandomPhoto(count)
      commit('SET_photos', data)
    } catch (error) {
      console.log(error)
    }
  },
  async getAssets({ commit }, { token }) {
    try {
      const { data } = await userApis.getAssets(token)
      console.log(data)
    } catch (error) {
      console.log(error)
    }
  },
  async login({ commit }, { token, account, password }) {
    try {
      const { data } = await userApis.login(token, account, password)
      console.log(data)
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
