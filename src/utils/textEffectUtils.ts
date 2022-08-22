import TextUtils from '@/utils/textUtils'
import LayerUtils from '@/utils/layerUtils'
import { IParagraph, IText } from '@/interfaces/layer'
import CssConverter from './cssConverter'
import store from '@/store'
import generalUtils from './generalUtils'

class Controller {
  private shadowScale = 0.2
  private strokeScale = 0.1
  effects = {} as { [key: string]: any }
  constructor() {
    this.effects = this.getDefaultEffects()
  }

  getDefaultEffects() {
    return {
      none: {},
      shadow: {
        distance: 50,
        angle: 45,
        blur: 20,
        opacity: 60,
        color: ''
      }, // 陰影
      lift: {
        spread: 50
      }, // 模糊陰影
      hollow: {
        stroke: 17,
        color: ''
      }, // 空心
      splice: {
        distance: 50,
        angle: 45,
        stroke: 17,
        color: ''
      }, // 出竅
      echo: {
        distance: 50,
        angle: 45,
        color: ''
      }, // 雙重陰影
      'bold-underline': {
        height: 20,
        yOffset: -2,
        opacity: 100,
        color: ''
      }
    }
  }

  getCurrentLayer(): IText {
    const { index: layerIndex, pageIndex } = store.getters.getCurrSelectedInfo
    const subLayerIndex = LayerUtils.subLayerIdx
    const currLayer = store.getters.getLayer(pageIndex, layerIndex)
    const multiLayers = currLayer && currLayer.layers as any[]
    if (multiLayers) {
      if (subLayerIndex === -1) {
        for (const index in multiLayers) {
          if (multiLayers[index].type === 'text') {
            return multiLayers[index]
          }
        }
      } else {
        return multiLayers[subLayerIndex]
      }
    }
    return currLayer || {}
  }

  getSpecSubTextLayer(index: number): IText {
    const currLayer = LayerUtils.getCurrLayer
    const multiLayers = currLayer && currLayer.layers as any[]
    return multiLayers && multiLayers[index]
  }

  getLayerFontSize(paragraphs: IParagraph[]): number {
    let maxFontSize = 0
    for (let idx = 0; idx < paragraphs.length; idx++) {
      const spanFontSizeList = paragraphs[idx].spans.map(span => span.styles.size || 0)
      maxFontSize = Math.max(maxFontSize, ...spanFontSizeList)
    }
    return maxFontSize
  }

  getLayerMainColor(paragraphs: IParagraph[]): string {
    const colors = {} as { [key: string]: number }
    if (!paragraphs) return '#000000'
    for (const idx in paragraphs) {
      const spans = paragraphs[idx].spans
      for (const i in spans) {
        const { styles, text = '' } = spans[i]
        if (styles.color) {
          colors[styles.color] = colors[styles.color] || 0 + text.length
        }
      }
    }
    return Object
      .keys(colors)
      .reduce((prev, curr) => colors[prev] > colors[curr] ? prev : curr, '#000000')
  }

  convertColor2rgba(colorStr: string, alpha?: number) {
    if (colorStr === 'transparent') return 'transparent'
    if (colorStr.startsWith('#')) {
      return this.convertHex2rgba(colorStr, alpha)
    }
    if (colorStr.startsWith('rgb')) {
      const [r, g, b, a = 1] = colorStr.match(/[.\d]+/g) || []
      return `rgba(${r}, ${g}, ${b}, ${alpha || a})`
    }
    return this.convertHex2rgba('#000000', 0.6)
  }

  convertHex2rgba(hex: string, alpha?: number) {
    const hexList = hex.match(/\w\w/g) || ['0', '0', '0']
    const opacity = typeof alpha === 'number' ? alpha : 1
    return `rgba(${hexList.map(x => parseInt(x, 16)).join(',')}, ${opacity})`
  }

  convertTextEffect(effect: any) {
    const { name, distance, angle, opacity, color, blur, spread, stroke, fontSize, strokeColor, ver } = effect || {}
    const unit = this.shadowScale * fontSize
    let strokeWidth = this.strokeScale * fontSize
    if (ver && ver === 'v1') {
      strokeWidth = Math.ceil(Math.max(stroke, 0.1) / 9) * 0.5 * this.strokeScale * fontSize
    }
    const effectShadowOffset = distance * 0.01 * unit
    const effectBlur = blur * 0.01 * unit
    const effectSpread = spread * 0.6 * 0.01
    const effectSpreadBlur = spread * 1.6 * 0.01 * unit
    const effectOpacity = opacity * 0.01
    const effectStroke = Math.max(stroke, 0.1) * 0.01 + 0.1
    switch (name) {
      case 'shadow':
        return CssConverter.convertTextShadow(
          effectShadowOffset * Math.cos(angle * Math.PI / 180),
          effectShadowOffset * Math.sin(angle * Math.PI / 180),
          this.convertColor2rgba(color, effectOpacity),
          effectBlur
        )
      case 'lift':
        return CssConverter.convertTextShadow(
          0,
          0.3 * unit,
          this.convertColor2rgba('#000000', Math.max(0.05, effectSpread)),
          (0.3 * unit) + effectSpreadBlur
        )
      case 'hollow':
        return CssConverter.convertTextStorke(
          effectStroke * strokeWidth,
          this.convertColor2rgba(color, 1),
          'transparent'
        )
      case 'splice':
        return {
          ...CssConverter.convertTextShadow(
            effectShadowOffset * Math.cos(angle * Math.PI / 180),
            effectShadowOffset * Math.sin(angle * Math.PI / 180),
            this.convertColor2rgba(color, 1),
            effectBlur
          ),
          ...CssConverter.convertTextStorke(
            effectStroke * strokeWidth,
            this.convertColor2rgba(strokeColor, 1),
            'transparent'
          )
        }
      case 'echo':
        return {
          textShadow: [0.5, 0.2]
            .map((opacity, i) =>
              CssConverter.convertTextShadow(
                effectShadowOffset * Math.cos(angle * Math.PI / 180) * (i + 1),
                effectShadowOffset * Math.sin(angle * Math.PI / 180) * (i + 1),
                this.convertColor2rgba(color, opacity),
                effectBlur
              ).textShadow
            )
            .join(',')
        }
      default:
        return { textShadow: 'none' }
    }
  }

  converTextSpanEffect(effect: Record<string, string|number>): Record<string, string | never> {
    function triangleBG(direction: string, color: string) {
      // How to draw a triangle in BG, https://stackoverflow.com/a/39854065
      return `linear-gradient(to ${direction}, #fff 0%, #fff 50%, ${color} 50%, ${color} 100%)`
    }

    const underlineWidthScale = effect.height as number / 8
    const color = effect.color
      ? this.convertHex2rgba(effect.color as string, effect.opacity as number * 0.01)
      : ''
    switch (effect.name) {
      case 'bold-underline':
        return {
          boxDecorationBreak: 'clone',
          backgroundRepeat: 'no-repeat',
          backgroundImage: `
            linear-gradient(180deg, ${color}, ${color}),
            ${triangleBG('bottom right', color)},
            ${triangleBG('top left', color)}`,
          backgroundSize: `
            calc(100% - ${underlineWidthScale * 8}px) ${effect.height}px,
            ${effect.height as number / 2}px ${effect.height}px,
            ${effect.height as number / 2}px ${effect.height}px`,
          backgroundPositionX: `${underlineWidthScale * 4}px, 0, 100%`,
          backgroundPositionY: `calc(100% - ${effect.yOffset}%)`
        }
      default:
        return {}
    }
  }

  updateTextEffect(pageIndex: number, layerIndex: number, attrs = {}) {
    const targetLayer = store.getters.getLayer(pageIndex, layerIndex)
    const layers = targetLayer.layers ? targetLayer.layers : [targetLayer]
    for (const idx in layers) {
      const { type, styles: { textEffect }, paragraphs } = layers[idx] as IText
      if (type === 'text') {
        const mainColor = this.getLayerMainColor(paragraphs)
        const mainFontSize = this.getLayerFontSize(paragraphs)
        const effectName = (textEffect as any).name
        if (effectName && effectName !== 'none') {
          switch (effectName) {
            case 'hollow':
              Object.assign(textEffect, { color: mainColor })
              break
            case 'splice':
              Object.assign(textEffect, { strokeColor: mainColor })
              break
          }
          Object.assign(textEffect, { fontSize: mainFontSize })
          store.commit('UPDATE_specLayerData', {
            pageIndex,
            layerIndex,
            subLayerIndex: +idx,
            styles: { textEffect }
          })
        }
      }
    }
  }

  setTextEffect(effect: string, attrs = {} as any): void {
    const { index: layerIndex, pageIndex } = store.getters.getCurrSelectedInfo
    const targetLayer = store.getters.getLayer(pageIndex, layerIndex)
    const layers = targetLayer.layers ? targetLayer.layers : [targetLayer]
    const subLayerIndex = LayerUtils.subLayerIdx
    const defaultAttrs = this.effects[effect]

    for (const idx in layers) {
      if (subLayerIndex !== -1 && +idx !== subLayerIndex) continue
      const { type, styles: { textEffect: layerTextEffect }, paragraphs } = layers[idx] as IText
      if (type === 'text') {
        const textEffect = {} as any
        if (layerTextEffect && (layerTextEffect as any).name === effect) {
          Object.assign(textEffect, layerTextEffect, attrs)
        } else {
          Object.assign(textEffect, defaultAttrs, attrs, { name: effect })
        }
        const mainColor = this.getLayerMainColor(paragraphs)
        const mainFontSize = this.getLayerFontSize(paragraphs)
        Object.assign(textEffect, {
          color: textEffect.color || mainColor,
          strokeColor: textEffect.strokeColor || mainColor,
          fontSize: mainFontSize
        })
        store.commit('UPDATE_specLayerData', {
          pageIndex,
          layerIndex,
          subLayerIndex: +idx,
          styles: { textEffect }
        })
      }
    }
  }

  refreshColor() {
    const { index: layerIndex, pageIndex } = store.getters.getCurrSelectedInfo
    const targetLayer = store.getters.getLayer(pageIndex, layerIndex)
    const layers = targetLayer.layers ? targetLayer.layers : [targetLayer]

    for (const idx in layers) {
      const { type, styles: { textEffect: layerTextEffect }, paragraphs } = layers[idx] as IText
      const textEffect = generalUtils.deepCopy(layerTextEffect)
      if (type === 'text') {
        const mainColor = this.getLayerMainColor(paragraphs)
        const effectName = textEffect.name
        if (effectName && effectName !== 'none') {
          switch (effectName) {
            case 'hollow':
              Object.assign(textEffect, { color: mainColor })
              break
            case 'splice':
              Object.assign(textEffect, { strokeColor: mainColor })
              break
          }
          store.commit('UPDATE_specLayerData', {
            pageIndex,
            layerIndex,
            subLayerIndex: +idx,
            styles: { textEffect }
          })
        }
      }
    }
  }

  refreshSize() {
    const { index: layerIndex, pageIndex } = store.getters.getCurrSelectedInfo
    const targetLayer = store.getters.getLayer(pageIndex, layerIndex)
    const layers = targetLayer.layers ? targetLayer.layers : [targetLayer]

    for (const idx in layers) {
      const { type, styles: { textEffect: layerTextEffect }, paragraphs } = layers[idx] as IText
      const textEffect = layerTextEffect as any
      if (type === 'text') {
        const mainFontSize = this.getLayerFontSize(paragraphs)
        Object.assign(textEffect, {
          fontSize: mainFontSize
        })
        store.commit('UPDATE_specLayerData', {
          pageIndex,
          layerIndex,
          subLayerIndex: +idx,
          styles: { textEffect }
        })
      }
    }
  }
}

export default new Controller()
