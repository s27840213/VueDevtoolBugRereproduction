
import store from '@/store'
import { IShape, IText, IImage, IGroup, ITmp, IStyle, ILayer } from '@/interfaces/layer'
import GroupUtils from '@/utils/groupUtils'
import mathUtils from './mathUtils'

function updateLayerStyles(pageIndex: number, layerIndex: number, styles: { [key: string]: number }) {
  store.commit('UPDATE_layerStyles', {
    pageIndex,
    layerIndex,
    styles
  })
}

function getTmpStyles() {
  return store.getters.getLayer(store.getters.getLastSelectedPageIndex, store.getters.getCurrSelectedIndex).styles
}
class AlignUtils {
  leftAlign(): void {
    const currSelectedInfo = store.getters.getCurrSelectedInfo
    const lastSelectedPageIndex = store.getters.getLastSelectedPageIndex
    if (currSelectedInfo.layers.length === 1) {
      const layer = currSelectedInfo.layers[0] as ILayer
      const bouding = mathUtils.getBounding(layer)
      const offset = layer.styles.rotate === 0 ? 0 : layer.styles.x - bouding.x
      updateLayerStyles(lastSelectedPageIndex, currSelectedInfo.index, {
        x: 0 + offset
      })
    } else {
      const tmpStyles = getTmpStyles()
      const currSelectedInfo = store.getters.getCurrSelectedInfo

      currSelectedInfo.layers.forEach((layer: IShape | IText | IImage | IGroup | ITmp) => {
        Object.assign(layer.styles, this.getAlignPos(tmpStyles, layer.styles, 'left'))
      })
      GroupUtils.recalcTmpStyle(currSelectedInfo.layers)
    }
  }

  centerHrAlign(): void {
    const currSelectedInfo = store.getters.getCurrSelectedInfo
    const lastSelectedPageIndex = store.getters.getLastSelectedPageIndex
    if (currSelectedInfo.layers.length === 1) {
      const pageWidth = store.getters.getPage(lastSelectedPageIndex).width
      const layerWidth = currSelectedInfo.layers[0].styles.width
      updateLayerStyles(lastSelectedPageIndex, currSelectedInfo.index, {
        x: (pageWidth / 2) - (layerWidth / 2)
      })
    } else {
      const tmpStyles = getTmpStyles()
      const currSelectedInfo = store.getters.getCurrSelectedInfo

      currSelectedInfo.layers.forEach((layer: IShape | IText | IImage | IGroup | ITmp) => {
        Object.assign(layer.styles, this.getAlignPos(tmpStyles, layer.styles, 'centerHr'))
      })
      GroupUtils.recalcTmpStyle(currSelectedInfo.layers)
    }
  }

  rightAlign(): void {
    const currSelectedInfo = store.getters.getCurrSelectedInfo
    const lastSelectedPageIndex = store.getters.getLastSelectedPageIndex
    if (currSelectedInfo.layers.length === 1) {
      const layer = currSelectedInfo.layers[0] as ILayer
      const bouding = mathUtils.getBounding(layer)
      const offset = layer.styles.rotate === 0 ? 0 : layer.styles.x - bouding.x
      const pageWidth = store.getters.getPage(lastSelectedPageIndex).width
      updateLayerStyles(lastSelectedPageIndex, currSelectedInfo.index, {
        x: pageWidth - bouding.width + offset
      })
    } else {
      const tmpStyles = getTmpStyles()
      const currSelectedInfo = store.getters.getCurrSelectedInfo

      currSelectedInfo.layers.forEach((layer: IShape | IText | IImage | IGroup | ITmp) => {
        Object.assign(layer.styles, this.getAlignPos(tmpStyles, layer.styles, 'right'))
      })
      GroupUtils.recalcTmpStyle(currSelectedInfo.layers)
    }
  }

  topAlign(): void {
    const currSelectedInfo = store.getters.getCurrSelectedInfo
    const lastSelectedPageIndex = store.getters.getLastSelectedPageIndex
    if (currSelectedInfo.layers.length === 1) {
      const layer = currSelectedInfo.layers[0] as ILayer
      const bouding = mathUtils.getBounding(layer)
      const offset = layer.styles.rotate === 0 ? 0 : layer.styles.y - bouding.y
      updateLayerStyles(lastSelectedPageIndex, currSelectedInfo.index, {
        y: 0 + offset
      })
    } else {
      const tmpStyles = getTmpStyles()
      const currSelectedInfo = store.getters.getCurrSelectedInfo

      currSelectedInfo.layers.forEach((layer: IShape | IText | IImage | IGroup | ITmp) => {
        Object.assign(layer.styles, this.getAlignPos(tmpStyles, layer.styles, 'top'))
      })

      GroupUtils.recalcTmpStyle(currSelectedInfo.layers)
    }
  }

  centerVrAlign(): void {
    const currSelectedInfo = store.getters.getCurrSelectedInfo
    const lastSelectedPageIndex = store.getters.getLastSelectedPageIndex
    if (currSelectedInfo.layers.length === 1) {
      const pageHeight = store.getters.getPage(lastSelectedPageIndex).height
      const layerHeight = currSelectedInfo.layers[0].styles.height
      console.log(pageHeight, layerHeight)
      updateLayerStyles(lastSelectedPageIndex, currSelectedInfo.index, {
        y: (pageHeight / 2) - (layerHeight / 2)
      })
    } else {
      const tmpStyles = getTmpStyles()
      const currSelectedInfo = store.getters.getCurrSelectedInfo

      currSelectedInfo.layers.forEach((layer: IShape | IText | IImage | IGroup | ITmp) => {
        Object.assign(layer.styles, this.getAlignPos(tmpStyles, layer.styles, 'centerVr'))
      })
      GroupUtils.recalcTmpStyle(currSelectedInfo.layers)
    }
  }

  bottomAlign(): void {
    const currSelectedInfo = store.getters.getCurrSelectedInfo
    const lastSelectedPageIndex = store.getters.getLastSelectedPageIndex
    if (currSelectedInfo.layers.length === 1) {
      const layer = currSelectedInfo.layers[0] as ILayer
      const bouding = mathUtils.getBounding(layer)
      const offset = layer.styles.rotate === 0 ? 0 : layer.styles.y - bouding.y
      const pageHeight = store.getters.getPage(lastSelectedPageIndex).height
      updateLayerStyles(lastSelectedPageIndex, currSelectedInfo.index, {
        y: pageHeight - bouding.height + offset
      })
    } else {
      const tmpStyles = getTmpStyles()
      const currSelectedInfo = store.getters.getCurrSelectedInfo

      currSelectedInfo.layers.forEach((layer: IShape | IText | IImage | IGroup | ITmp) => {
        Object.assign(layer.styles, this.getAlignPos(tmpStyles, layer.styles, 'bottom'))
      })
      GroupUtils.recalcTmpStyle(currSelectedInfo.layers)
    }
  }

  getAlignPos(tmpStyles: IStyle, layerStyle: IStyle, type: string): { [key: string]: number } {
    switch (type) {
      case 'left': {
        return {
          x: 0
        }
      }
      case 'centerHr': {
        return {
          x: (tmpStyles.width / 2) - (layerStyle.width / 2)
        }
      }
      case 'right': {
        return {
          x: tmpStyles.width - layerStyle.width
        }
      }
      case 'top': {
        return {
          y: 0
        }
      }
      case 'centerVr': {
        return {
          y: (tmpStyles.height / 2) - (layerStyle.height / 2)
        }
      }
      case 'bottom': {
        return {
          y: tmpStyles.height - layerStyle.height
        }
      }
      default: {
        return {}
      }
    }
  }
}

const alignUtils = new AlignUtils()
export default alignUtils
