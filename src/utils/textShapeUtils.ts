import TextEffectUtils from '@/utils/textEffectUtils'
import TextUtils from '@/utils/textUtils'
import { ILayer, IText } from '@/interfaces/layer'
import store from '@/store'
import generalUtils from './generalUtils'
import layerUtils from './layerUtils'
import asyncUtils from './asyncUtils'

class Controller {
  shapes = {} as { [key: string]: any }
  constructor () {
    this.shapes = this.getDefaultShapes()
  }

  getDefaultShapes () {
    return {
      none: {},
      curve: {
        bend: 4,
        focus: false
      }
    }
  }

  getSpecSubTextLayer (index: number): IText {
    return TextEffectUtils.getSpecSubTextLayer(index)
  }

  getRadiusByBend (bend: number) {
    return bend === 0 ? 10000 : 1000 / Math.pow(Math.abs(bend), 0.6)
  }

  getTextShapeStyles (layer: IText, shape: string, attrs?: any) {
    const {
      textShape: styleTextShape,
      width,
      height,
      x,
      y
    } = layer.styles
    const props = {} as { [key: string]: any }
    const defaultAttrs = this.shapes[shape]
    const styles = {
      textShape: {},
      writingMode: 'horizontal-tb'
    } as { [key: string]: any }
    if (styleTextShape && (styleTextShape as any).name === shape) {
      Object.assign(styles.textShape, styleTextShape, attrs)
    } else {
      Object.assign(styles.textShape, defaultAttrs, attrs, { name: shape })
    }
    if (shape === 'none') {
      const { bend } = styleTextShape as any
      const textHW = TextUtils.getTextHW(layer, -1)
      Object.assign(styles, {
        ...textHW,
        textShape: {},
        x: x + ((width - textHW.width) / 2),
        y: +bend < 0 ? y + height - textHW.height : y
      })
      props.widthLimit = -1
    }
    return { styles, props }
  }

  setTextShape (shape: string, attrs?: any): void {
    const { index: layerIndex, pageIndex } = store.getters.getCurrSelectedInfo
    const targetLayer = store.getters.getLayer(pageIndex, layerIndex)
    const layers = targetLayer.layers ? targetLayer.layers : [targetLayer]
    const subLayerIndex = layerUtils.subLayerIdx
    let needObserver = false
    let observerId = ''
    let observerIndex = 0

    const isCurvedText = (styles: any) => styles.textShape?.name === 'curve'
    const checkWillChange = shape === 'none' ? isCurvedText : (styles: any) => !isCurvedText(styles)

    if (subLayerIndex === -1 || targetLayer.type === 'text') {
      if (targetLayer.type !== 'text') {
        needObserver = true
        const changeCount = (layers as ILayer[]).reduce((count, l) => {
          if (l.type === 'text' && checkWillChange(l.styles)) {
            return count + 1
          }
          return count
        }, 0)
        observerId = asyncUtils.createObserver(changeCount, () => {
          TextUtils.fixGroupXcoordinates(pageIndex, layerIndex)
        })
      }
      for (const idx in layers) {
        const { type, styles: layerStyles } = layers[idx] as IText
        if (type === 'text') {
          if (needObserver && checkWillChange(layerStyles)) {
            asyncUtils.registerByIndexes(pageIndex, layerIndex, +idx, observerId, observerIndex)
            observerIndex++
          }
          const { styles, props } = this.getTextShapeStyles(
            layers[idx],
            shape,
            attrs
          )
          store.commit('UPDATE_specLayerData', {
            pageIndex,
            layerIndex,
            subLayerIndex: +idx,
            styles,
            props
          })
        }
      }
      // if (targetLayer.type !== 'text') {
      //   TextUtils.updateGroupLayerSize(pageIndex, layerIndex)
      // }
    } else {
      const subLayerStyles = layers[subLayerIndex].styles
      needObserver = checkWillChange(subLayerStyles)
      if (needObserver) {
        observerId = asyncUtils.createObserver(1, () => {
          TextUtils.fixGroupXcoordinates(pageIndex, layerIndex)
        })
        asyncUtils.registerByIndexes(pageIndex, layerIndex, subLayerIndex, observerId, 0)
      }
      const { styles, props } = this.getTextShapeStyles(
        layers[subLayerIndex],
        shape,
        attrs
      )
      store.commit('UPDATE_specLayerData', {
        pageIndex,
        layerIndex,
        subLayerIndex,
        styles,
        props
      })
    }
  }

  convertTextShape (textWidth: number[], bend: number): string[] {
    const angleOffset = bend >= 0 ? 90 : 270
    const ratioFix = bend >= 0 ? 1 : -1
    const radius = this.getRadiusByBend(bend)
    // 每一段文字寬度對應角度
    const textAngles = textWidth.map(w => (360 * w) / (radius * 2 * Math.PI))
    // 總角度
    const totalAngle = textAngles.reduce((prev, angle) => prev + angle)
    const midY = radius * Math.sin(angleOffset * (Math.PI / 180))
    return textAngles.map((angle: number, idx: number) => {
      // 從90 or 270度開始偏移
      const init = angleOffset + ratioFix * ((totalAngle / 2) - (textAngles.slice(0, idx).reduce((p, c) => p + c, 0)) - (angle / 2))
      const x = radius * Math.cos(init * (Math.PI / 180))
      const y = radius * Math.sin(init * (Math.PI / 180))
      return `translate(${x}px, ${Math.abs(y - midY) * ratioFix}px) rotate(${angleOffset - init}deg)`
    })
  }
}

export default new Controller()
