import Vue from 'vue'
import Vuex, { GetterTree, MutationTree, ActionTree } from 'vuex'
import { IShape, IText, IImage, IGroup, ITmp, IParagraph, IFrame } from '@/interfaces/layer'
import { IEditorState, SidebarPanelType, FunctionPanelType, ISpecLayerData } from './types'
import { IPage } from '@/interfaces/page'
import zindexUtils from '@/utils/zindexUtils'

import photos from '@/store/photos'
import user from '@/store/module/user'
import color from '@/store/module/color'
import text from '@/store/text'
import objects from '@/store/module/objects'
import markers from '@/store/module/markers'
import templates from '@/store/module/templates'
import textStock from '@/store/module/text'
import font from '@/store/module/font'
import background from '@/store/module/background'
import modal from '@/store/module/modal'
import popup from '@/store/module/popup'
import page from '@/store/module/page'
import groupUtils from '@/utils/groupUtils'
import { ICurrSubSelectedInfo } from '@/interfaces/editor'
import { SrcObj } from '@/interfaces/gallery'

Vue.use(Vuex)

const getDefaultState = (): IEditorState => ({
  pages: [
    {
      width: 1080,
      height: 1080,
      backgroundColor: '#ffffff',
      backgroundImage: {
        config: {
          type: 'image',
          srcObj: {
            type: '',
            userId: '',
            assetId: ''
          },
          clipPath: '',
          active: false,
          shown: false,
          locked: false,
          moved: false,
          imgControl: false,
          isClipper: false,
          dragging: false,
          designId: '',
          styles: {
            x: 0,
            y: 0,
            scale: 1,
            scaleX: 1,
            scaleY: 1,
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
            opacity: 100,
            horizontalFlip: false,
            verticalFlip: false
          }
        },
        posX: -1,
        posY: -1
      },
      name: 'Default Page',
      layers: [
      ],
      documentColor: [],
      designId: ''
    },
    {
      width: 1080,
      height: 1080,
      backgroundColor: '#ffffff',
      backgroundImage: {
        config: {
          type: 'image',
          srcObj: {
            type: '',
            userId: '',
            assetId: ''
          },
          clipPath: '',
          active: false,
          shown: false,
          locked: false,
          moved: false,
          imgControl: false,
          isClipper: false,
          dragging: false,
          designId: '',
          styles: {
            x: 0,
            y: 0,
            scale: 1,
            scaleX: 1,
            scaleY: 1,
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
            opacity: 100,
            horizontalFlip: false,
            verticalFlip: false
          }
        },
        posX: -1,
        posY: -1
      },
      name: 'Default Page',
      layers: [
      ],
      documentColor: [],
      designId: ''
    }
  ],
  designId: '',
  currSidebarPanelType: SidebarPanelType.template,
  currFunctionPanelType: FunctionPanelType.none,
  pageScaleRatio: 100,
  lastSelectedPageIndex: 0,
  currActivePageIndex: -1,
  lastSelectedLayerIndex: -1,
  clipboard: [],
  currSelectedInfo: {
    pageIndex: -1,
    index: -1,
    layers: [],
    types: new Set<string>()
  },
  currSubSelectedInfo: {
    index: -1,
    type: ''
  },
  isColorPickerOpened: false,
  currSelectedPhotoInfo: {},
  asset: {},
  textInfo: {
    heading: [],
    subheading: [],
    body: []
  },
  isMoving: false
})
const state = getDefaultState()
const getters: GetterTree<IEditorState, unknown> = {
  getPage(state: IEditorState) {
    return (pageIndex: number): IPage => {
      return state.pages[pageIndex]
    }
  },
  getPages(state: IEditorState): Array<IPage> {
    return state.pages
  },
  getDesignId(state: IEditorState): string {
    return state.designId
  },
  getPageSize(state: IEditorState) {
    return {
      width: state.pages[0].width,
      height: state.pages[0].height
    }
  },
  getCurrSidebarPanelType(state: IEditorState): number {
    return state.currSidebarPanelType
  },
  getCurrFunctionPanelType(state: IEditorState): number {
    return state.currFunctionPanelType
  },
  getPageScaleRatio(state: IEditorState): number {
    return state.pageScaleRatio
  },
  getLayer(state: IEditorState) {
    return (pageIndex: number, layerIndex: number): IShape | IText | IImage | IGroup | IFrame => {
      return state.pages[pageIndex].layers[layerIndex >= 0 ? layerIndex : state.pages[pageIndex].layers.length + layerIndex]
    }
  },
  getLayers(state: IEditorState) {
    return (pageIndex: number): Array<IShape | IText | IImage | IGroup | IFrame> => {
      return state.pages[pageIndex] ? state.pages[pageIndex].layers : []
    }
  },
  getLayersNum(state: IEditorState) {
    return (pageIndex = state.lastSelectedPageIndex): number => {
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
  getCurrActivePageIndex(state: IEditorState): number {
    return state.currActivePageIndex
  },
  getLastSelectedLayerIndex(state: IEditorState): number {
    return state.lastSelectedLayerIndex
  },
  getClipboard(state: IEditorState): Array<ITmp> {
    return state.clipboard
  },
  getCurrSelectedInfo(state: IEditorState): {
    pageIndex: number,
    index: number,
    layers: Array<IShape | IText | IImage | IGroup | ITmp>,
    types: Set<string>
  } {
    return state.currSelectedInfo
  },
  getCurrSubSelectedInfo(state: IEditorState): ICurrSubSelectedInfo {
    return state.currSubSelectedInfo
  },
  getCurrSelectedPageIndex(state: IEditorState) {
    return state.currSelectedInfo.pageIndex
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
  getIsColorPickerOpened(state: IEditorState) {
    return state.isColorPickerOpened
  },
  getCurrSelectedPhotoInfo(state: IEditorState) {
    return state.currSelectedPhotoInfo
  },
  getAsset(state: IEditorState) {
    return (id: string) => state.asset[id]
  },
  getTextInfo(state: IEditorState) {
    return state.textInfo
  }
}

const mutations: MutationTree<IEditorState> = {
  SET_pages(state: IEditorState, newPages: Array<IPage>) {
    groupUtils.reset()
    state.pages = newPages
  },
  ADD_page(state: IEditorState, newPage: IPage) {
    state.pages.push(newPage)
  },
  ADD_pageToPos(state: IEditorState, updateInfo: { newPage: IPage, pos: number }) {
    state.pages.splice(updateInfo.pos, 0, updateInfo.newPage)
  },
  DELETE_page(state: IEditorState, pageIndex: number) {
    state.pages.splice(pageIndex, 1)
  },
  SET_designId(state: IEditorState, designId: string) {
    state.designId = designId
  },
  SET_pageDesignId(state: IEditorState, updateInfo: { pageIndex: number, designId: string }) {
    state.pages[updateInfo.pageIndex].designId = updateInfo.designId
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
  SET_currActivePageIndex(state: IEditorState, index: number) {
    state.currActivePageIndex = index
  },
  SET_lastSelectedLayerIndex(state: IEditorState, index: number) {
    state.lastSelectedLayerIndex = index
  },
  SET_backgroundColor(state: IEditorState, updateInfo: { pageIndex: number, color: string }) {
    state.pages[updateInfo.pageIndex].backgroundColor = updateInfo.color
    state.pages[updateInfo.pageIndex].backgroundImage.config.srcObj = { type: '', userId: '', assetId: '' }
  },
  SET_backgroundImage(state: IEditorState, updateInfo: { pageIndex: number, config: IImage }) {
    state.pages[updateInfo.pageIndex].backgroundImage.config = updateInfo.config
  },
  SET_backgroundImageSrc(state: IEditorState, updateInfo: { pageIndex: number, srcObj: any }) {
    Object.assign(state.pages[updateInfo.pageIndex].backgroundImage.config.srcObj, updateInfo.srcObj)
  },
  SET_backgroundImageConfig(state: IEditorState, updateInfo: { pageIndex: number, config: IImage }) {
    Object.assign(state.pages[updateInfo.pageIndex].backgroundImage.config, updateInfo.config)
  },
  SET_backgroundImagePos(state: IEditorState, updateInfo: { pageIndex: number, imagePos: { x: number, y: number } }) {
    state.pages[updateInfo.pageIndex].backgroundImage.posX = updateInfo.imagePos.x
    state.pages[updateInfo.pageIndex].backgroundImage.posY = updateInfo.imagePos.y
  },
  SET_backgroundImageSize(state: IEditorState, updateInfo: { pageIndex: number, imageSize: { width: number, height: number } }) {
    state.pages[updateInfo.pageIndex].backgroundImage.config.styles.imgWidth = updateInfo.imageSize.width
    state.pages[updateInfo.pageIndex].backgroundImage.config.styles.imgHeight = updateInfo.imageSize.height
  },
  SET_backgroundImageMode(state: IEditorState, updateInfo: { pageIndex: number, newDisplayMode: boolean }) {
    state.pages[updateInfo.pageIndex].backgroundImage.newDisplayMode = updateInfo.newDisplayMode
  },
  SET_backgroundImageControl(state: IEditorState, updateInfo: { pageIndex: number, imgControl: boolean }) {
    state.pages[updateInfo.pageIndex].backgroundImage.config.imgControl = updateInfo.imgControl
  },
  SET_allBackgroundImageControl(state: IEditorState, imgControl: boolean) {
    state.pages.forEach((page) => {
      page.backgroundImage.config.imgControl = imgControl
    })
  },
  SET_textInfo(state: IEditorState, textInfo: { [key: string]: Array<string> }) {
    Object.entries(textInfo).forEach(([k, v]) => {
      if (Object.keys(state.textInfo).includes(k)) {
        Object.assign(state.textInfo, { [k]: v })
      }
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
  DELETE_subLayer(state: IEditorState, updateInfo: { pageIndex: number, primaryIndex: number, subIndex: number }) {
    const { pageIndex, primaryIndex, subIndex } = updateInfo
    const { currSelectedInfo, pages } = state
    const targetLayer = pages[pageIndex].layers[primaryIndex] as IGroup | ITmp
    targetLayer.layers.splice(subIndex, 1)
    // currSelectedInfo.layers.splice(subIndex, 1)
    // currSelectedInfo.types = groupUtils.calcType(currSelectedInfo.layers)
  },
  REPLACE_layer(state: IEditorState, updateInfo: { pageIndex: number, layerIndex: number, layer: IShape | IGroup | IImage | IText }) {
    const { pageIndex, layerIndex, layer } = updateInfo
    state.pages[pageIndex].layers.splice(layerIndex, 1, layer)
  },
  UPDATE_layerProps(state: IEditorState, updateInfo: { pageIndex: number, layerIndex: number, props: { [key: string]: string | number | boolean | IParagraph | Array<string> | Array<IShape | IText | IImage | IGroup> | number[] } }) {
    /**
     * This Mutation is used to update the layer's properties excluding styles
     */
    Object.entries(updateInfo.props).forEach(([k, v]) => {
      if (state.pages[updateInfo.pageIndex].layers[updateInfo.layerIndex]) {
        state.pages[updateInfo.pageIndex].layers[updateInfo.layerIndex][k] = v
      }
    })
  },
  UPDATE_subLayerProps(state: IEditorState, updateInfo: { pageIndex: number, layerIndex: number, targetIndex: number, props: { [key: string]: string | number | boolean | IParagraph } }) {
    const groupLayer = state.pages[updateInfo.pageIndex].layers[updateInfo.layerIndex] as IGroup
    const targetLayer = groupLayer.layers[updateInfo.targetIndex]
    Object.entries(updateInfo.props).forEach(([k, v]) => {
      targetLayer[k] = v
    })
  },
  UPDATE_frameLayerProps(state: IEditorState, updateInfo: { pageIndex: number, layerIndex: number, targetIndex: number, props: { [key: string]: string | number | boolean | SrcObj } }) {
    const frame = state.pages[updateInfo.pageIndex].layers[updateInfo.layerIndex] as IFrame
    const targetLayer = frame.clips[updateInfo.targetIndex]
    Object.entries(updateInfo.props).forEach(([k, v]) => {
      targetLayer[k] = v
    })
  },
  UPDATE_groupLayerProps(state: IEditorState, updateInfo: { props: { [key: string]: string | number | boolean | number[] } }) {
    Object.entries(updateInfo.props).forEach(([k, v]) => {
      (state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index] as IGroup).layers.forEach((layer: IShape | IText | IImage | IGroup) => {
        layer[k] = v
      })
    })
  },
  UPDATE_selectedLayerProps(state: IEditorState, updateInfo: { pageIndex: number, layerIndex: number, props: { [key: string]: string | number | boolean | Array<string> } }) {
    Object.entries(updateInfo.props).forEach(([k, v]) => {
      (state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp).layers[updateInfo.layerIndex][k] = v
    })
  },
  UPDATE_textProps(state: IEditorState, updateInfo: {
    pageIndex: number, layerIndex: number,
    paragraphs: [IParagraph]
  }) {
    (state.pages[updateInfo.pageIndex].layers[updateInfo.layerIndex] as IText).paragraphs = updateInfo.paragraphs
  },
  UPDATE_paragraphStyles(state: IEditorState, updateInfo: {
    pageIndex: number, layerIndex: number, pIndex: number,
    styles: { [key: string]: string | number }
  }) {
    Object.entries(updateInfo.styles).forEach(([k, v]) => {
      (state.pages[updateInfo.pageIndex].layers[updateInfo.layerIndex] as IText).paragraphs[updateInfo.pIndex].styles[k] = v
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
  UPDATE_layerOrder(state: IEditorState, updateInfo: { type: string }): void {
    const layerIndex = state.currSelectedInfo.index
    const layerNum = state.pages[state.currSelectedInfo.pageIndex].layers.length
    switch (updateInfo.type) {
      case 'front': {
        const layer = state.pages[state.currSelectedInfo.pageIndex].layers.splice(layerIndex, 1)
        state.pages[state.currSelectedInfo.pageIndex].layers.push(layer[0])
        state.currSelectedInfo.index = layerNum - 1
        zindexUtils.reassignZindex(state.currSelectedInfo.pageIndex)
        break
      }
      case 'back': {
        const layer = state.pages[state.currSelectedInfo.pageIndex].layers.splice(layerIndex, 1)
        state.pages[state.currSelectedInfo.pageIndex].layers.unshift(layer[0])
        state.currSelectedInfo.index = 0
        zindexUtils.reassignZindex(state.currSelectedInfo.pageIndex)
        break
      }
      case 'forward': {
        if (layerIndex === layerNum - 1) {
          zindexUtils.reassignZindex(state.currSelectedInfo.pageIndex)
          break
        }
        const layer = state.pages[state.currSelectedInfo.pageIndex].layers.splice(layerIndex, 1)
        state.pages[state.currSelectedInfo.pageIndex].layers.splice(layerIndex + 1, 0, ...layer)
        state.currSelectedInfo.index = layerIndex + 1
        zindexUtils.reassignZindex(state.currSelectedInfo.pageIndex)
        break
      }
      case 'backward': {
        if (layerIndex === 0) {
          break
        }
        const layer = state.pages[state.currSelectedInfo.pageIndex].layers.splice(layerIndex, 1)
        state.pages[state.currSelectedInfo.pageIndex].layers.splice(layerIndex - 1, 0, ...layer)
        state.currSelectedInfo.index = layerIndex - 1
        zindexUtils.reassignZindex(state.currSelectedInfo.pageIndex)
        break
      }
    }
  },
  UPDATE_tmpLayerStyles(state: IEditorState, updateInfo: { pageIndex: number, styles: { [key: string]: string | number } }) {
    const layer = state.pages[updateInfo.pageIndex].layers[state.currSelectedInfo.index]
    if (layer) {
      Object.entries(updateInfo.styles).forEach(([k, v]) => {
        if (typeof v === 'number') {
          (layer.styles[k] as number) += v
        } else {
          layer.styles[k] = v
        }
      })
    }
  },
  UPDATE_groupLayerStyles(state: IEditorState, updateInfo: { styles: { [key: string]: string | number } }) {
    Object.entries(updateInfo.styles).forEach(([k, v]) => {
      (state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index] as IGroup).layers.forEach((layer: IShape | IText | IImage | IGroup) => {
        layer.styles[k] = v
      })
    })
    // state.currSelectedInfo.layers[0].layers = (state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index] as IGroup).layers
  },
  UPDATE_selectedLayersStyles(state: IEditorState, updateInfo: { styles: { [key: string]: string | number }, layerIndex?: number }) {
    Object.entries(updateInfo.styles).forEach(([k, v]) => {
      if (typeof updateInfo.layerIndex !== 'undefined') {
        (state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp).layers[updateInfo.layerIndex].styles[k] = v
      } else {
        (state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp).layers.forEach((layer: IShape | IText | IImage | IGroup) => {
          layer.styles[k] = v
        })
      }
    })
    if ((state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp).type === 'group') {
      state.currSelectedInfo.layers = [state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp]
    } else {
      state.currSelectedInfo.layers = (state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp).layers
    }
  },
  UPDATE_selectedTextParagraphs(state: IEditorState, updateInfo: { tmpLayerIndex: number, paragraphs: [IParagraph] }) {
    ((state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp).layers[updateInfo.tmpLayerIndex] as IText).paragraphs = updateInfo.paragraphs
    if ((state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp).type === 'group') {
      state.currSelectedInfo.layers = [state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp]
    } else {
      state.currSelectedInfo.layers = (state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp).layers
    }
  },
  UPDATE_selectedTextParagraphsProp(state: IEditorState, updateInfo: { tmpLayerIndex: number, props: { [key: string]: string | number } }) {
    const pLeng = ((state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index] as ITmp).layers[updateInfo.tmpLayerIndex] as IText).paragraphs.length
    Object.entries(updateInfo.props).forEach(([k, v]) => {
      for (let pIndex = 0; pIndex < pLeng; pIndex++) {
        const p = ((state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index] as ITmp).layers[updateInfo.tmpLayerIndex] as IText).paragraphs[pIndex]
        p.styles[k] = v
      }
    })
    state.currSelectedInfo.layers = (state.pages[state.lastSelectedPageIndex].layers[state.currSelectedInfo.index] as ITmp).layers
  },
  UPDATE_tmpLayersZindex(state: IEditorState) {
    (state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp).layers.forEach((layer: IShape | IText | IImage | IGroup) => {
      layer.styles.zindex = state.currSelectedInfo.index + 1
    })
    Object.assign(state.currSelectedInfo, {
      layers: (state.pages[state.currSelectedInfo.pageIndex].layers[state.currSelectedInfo.index] as ITmp).layers
    })
  },
  DELETE_selectedLayer(state: IEditorState) {
    const index = state.currSelectedInfo.index
    if (index < 0) {
      console.log('You didn\'t select any layer')
      return
    }
    state.pages[state.currSelectedInfo.pageIndex].layers.splice(index, 1)
  },
  SET_clipboard(state: IEditorState, tmpLayer: IShape | IText | IImage | IGroup) {
    state.clipboard = [JSON.parse(JSON.stringify(tmpLayer))]
  },
  CLEAR_clipboard(state: IEditorState) {
    state.clipboard = []
  },
  SET_currSelectedInfo(state: IEditorState, data: { index: number, layers: Array<IShape | IText | IImage | IGroup | ITmp | IFrame>, types: Set<string> }) {
    Object.assign(state.currSelectedInfo, data)
  },
  SET_currSubSelectedInfo(state: IEditorState, data: { index: number, type: string }) {
    Object.assign(state.currSubSelectedInfo, data)
  },
  SET_isColorPickerOpened(state: IEditorState, isOpened: boolean) {
    state.isColorPickerOpened = isOpened
    console.log(state.isColorPickerOpened)
  },
  SET_currSelectedPhotoInfo(state: IEditorState, data: { userName: string, userLink: string, vendor: string, tags: string[] }) {
    state.currSelectedPhotoInfo = data
  },
  SET_subLayerStyles(state: IEditorState, data: { pageIndex: number, primaryLayerIndex: number, subLayerIndex: number, styles: any }) {
    const { pageIndex, primaryLayerIndex, subLayerIndex, styles } = data
    const layers = state.pages[pageIndex].layers[primaryLayerIndex].layers as (IShape | IText | IImage)[]
    Object.assign(layers[subLayerIndex].styles, styles)
  },
  SET_frameLayerStyles(state: IEditorState, data: { pageIndex: number, primaryLayerIndex: number, subLayerIndex: number, styles: any }) {
    const { pageIndex, primaryLayerIndex, subLayerIndex, styles } = data
    const layers = state.pages[pageIndex].layers[primaryLayerIndex].clips as IImage[]
    Object.assign(layers[subLayerIndex].styles, styles)
  },
  SET_assetJson(state: IEditorState, json: { [key: string]: any }) {
    Object.keys(json)
      .forEach(id => {
        Object.assign(state.asset, { [id]: json[id] })
      })
  },
  SET_moving(state: IEditorState, isMoving: boolean) {
    state.isMoving = isMoving
  },
  UPDATE_specLayerData(state: IEditorState, data: ISpecLayerData) {
    const { pageIndex, layerIndex, subLayerIndex, props, styles, type } = data
    const targetLayer = state.pages[pageIndex].layers[layerIndex] as IGroup | ITmp
    if (!targetLayer) { return }
    if (targetLayer.layers) {
      targetLayer.layers.forEach((layer, idx) => {
        const matchType = type ? type.includes(layer.type) : true
        const matchSubLayerIndex = typeof subLayerIndex === 'undefined' || idx === subLayerIndex
        if (matchType && matchSubLayerIndex) {
          props && Object.assign(targetLayer.layers[idx], props)
          styles && Object.assign(targetLayer.layers[idx].styles, styles)
        }
      })
    } else {
      props && Object.assign(targetLayer, props)
      styles && Object.assign(targetLayer.styles, styles)
    }
  }
}

export default new Vuex.Store({
  state,
  getters,
  mutations,
  modules: {
    user,
    photos,
    text,
    font,
    color,
    objects,
    markers,
    templates,
    textStock,
    background,
    modal,
    popup,
    page
  }
})
