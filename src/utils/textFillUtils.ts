import { IAssetPhoto } from '@/interfaces/api'
import { CustomElementConfig } from '@/interfaces/editor'
import { ITextFill, ITextFillConfig } from '@/interfaces/format'
import { AllLayerTypes, IText } from '@/interfaces/layer'
import store from '@/store'
import layerUtils from '@/utils/layerUtils'
import localStorageUtils from '@/utils/localStorageUtils'
import textBgUtils, { Rect } from '@/utils/textBgUtils'
import textEffectUtils from '@/utils/textEffectUtils'
import _ from 'lodash'

class TextFill {
  effects = {} as Record<string, Record<string, string | number | boolean>>
  constructor() {
    this.effects = this.getDefaultEffects()
  }

  getDefaultEffects() {
    return {
      none: {},
      'fill-img': {
        xOffset200: 0,
        yOffset200: 0,
        size: 100,
        opacity: 100,
        focus: false,
      }
    }
  }

  calcTextFillVar(config: IText) {
    const textFill = config.styles.textFill as ITextFillConfig
    const img = store.getters['file/getImages'][0] as IAssetPhoto
    const layerScale = config.styles.scale
    const divWidth = config.styles.width / layerScale
    const divHeight = config.styles.height / layerScale
    const widthRatio = img.width / divWidth
    const heightRatio = img.height / divHeight
    // If true and textFill.size is 100, that mean img width === layer width
    const scaleByWidth = widthRatio < heightRatio
    const imgRatio = textFill.size / 100 / (scaleByWidth ? widthRatio : heightRatio)
    const imgWidth = img.width * imgRatio
    const imgHeight = img.height * imgRatio
    return { divHeight, divWidth, imgHeight, imgWidth, scaleByWidth }
  }

  async convertTextEffect(config: IText): Promise<Record<string, string | number>[][]> {
    const { textFill } = config.styles
    if (textFill.name === 'none') return []

    const img = store.getters['file/getImages'][0] as IAssetPhoto
    const { divHeight, divWidth, imgHeight, imgWidth, scaleByWidth } = this.calcTextFillVar(config)

    const myRect = new Rect()
    await myRect.init(config)
    myRect.preprocess({ skipMergeLine: true })
    const { vertical, rows } = myRect.get()
    const div = [] as DOMRect[][][]
    for (const row of rows) {
      if (row.spanData.length === 0) continue
      const { pIndex, sIndex } = row.spanData[0]
      while (div.length - 1 < pIndex) div.push([])
      while (div[pIndex].length - 1 < sIndex) div[pIndex].push([])
      div[pIndex][sIndex].push(row.rect)
    }

    const spanExpandRatio = 1
    const isTextShape = config.styles.textShape.name !== 'none'
    const isTextShapeFocus = isTextShape && textFill.focus
    const isFixedWidth = textBgUtils.isFixedWidth(config.styles)
    return div.map(p => p.map(span => {
      const rect = span[0]
      let { width: spanWidth, height: spanHeight, x, y } = rect
      if (vertical) {
        [spanWidth, spanHeight] = [spanHeight, spanWidth];
        [x, y] = [y, x]
      }
      const bgSizeBy = textFill.size * (scaleByWidth ? divWidth / spanWidth : divHeight / spanHeight)
      return {
        // About span BG
        backgroundImage: `url("${img.urls.original}")`,
        backgroundSize: scaleByWidth ? `${bgSizeBy}% auto` : `auto ${bgSizeBy}%`,
        // (img - div) * position%, calc like BG-pos %, but use div as container size and map -100~100 to 0~100%
        // https://developer.mozilla.org/en-US/docs/Web/CSS/background-position#regarding_percentages
        backgroundPosition: `
          ${(x + (imgWidth - divWidth) * (0.5 - textFill.xOffset200 / 200)) * -1}px
          ${(y + (imgHeight - divHeight) * (0.5 + textFill.yOffset200 / 200)) * -1}px`,
        backgroundOrigin: 'content-box',
        backgroundRepeat: 'no-repeat',
        opacity: textFill.opacity / 100,
        webkitTextFillColor: 'transparent',
        webkitTextStrokeColor: 'transparent',
        webkitBackgroundClip: 'text',
        // About span position
        position: 'absolute',
        padding: `${spanHeight * spanExpandRatio}px ${spanWidth * spanExpandRatio}px`,
        ...isTextShapeFocus ? {
          top: `${y - spanHeight * spanExpandRatio}px`,
          left: `${x - spanWidth * spanExpandRatio}px`,
          transform: 'none',
          lineHeight: 'initial',
        } : isTextShape ? {
          top: `${-spanHeight * spanExpandRatio}px`,
          lineHeight: 'initial',
        } : {
          top: `${y - spanHeight * spanExpandRatio}px`,
          left: `${x - spanWidth * spanExpandRatio}px`,
          ...!isFixedWidth ? { lineHeight: 'initial' } : {},
        }
      }
    }))
  }

  drawTextFill(config: IText): CustomElementConfig | null {
    const textFill = config.styles.textFill
    if (textFill.name === 'none') return null

    const img = store.getters['file/getImages'][0] as IAssetPhoto
    const { divHeight, divWidth, imgHeight, imgWidth, scaleByWidth } = this.calcTextFillVar(config)

    return textFill.focus ? {
      tag: 'img',
      attrs: { src: img.urls.original },
      style: {
        [scaleByWidth ? 'width' : 'height']: `${textFill.size}%`,
        left: `${(imgWidth - divWidth) * (0.5 - textFill.xOffset200 / 200) * -1}px`,
        top: `${(imgHeight - divHeight) * (0.5 + textFill.yOffset200 / 200) * -1}px`,
        opacity: textFill.opacity / 200,
        // opacity: textFill.opacity / 100,
      }
    } : null
  }

  // Read/write text effect setting from local storage
  syncShareAttrs(textFill: ITextFill, effectName: string | null) {
    Object.assign(textFill, { name: textFill.name || effectName })
    if (textFill.name === 'none') return

    const shareAttrs = (localStorageUtils.get('textEffectSetting', 'textFillShare') ?? {}) as Record<string, string>
    const newShareAttrs = { opacity: textFill.opacity }
    const newEffect = { opacity: shareAttrs.opacity }

    // If effectName is null, overwrite share attrs. Otherwise, read share attrs and set to effect.
    if (!effectName) {
      Object.assign(shareAttrs, newShareAttrs)
      localStorageUtils.set('textEffectSetting', 'textFillShare', shareAttrs)
    } else {
      let effect = (localStorageUtils.get('textEffectSetting', effectName) ?? {}) as Record<string, string>
      Object.assign(effect, newEffect)
      effect = _.omit(effect, ['color', 'pColor', 'bColor'])
      localStorageUtils.set('textEffectSetting', effectName, effect)
    }
  }

  setTextFill(effect: string, attrs?: Record<string, string | number | boolean>) {
    const { index: layerIndex, pageIndex } = store.getters.getCurrSelectedInfo
    const targetLayer = store.getters.getLayer(pageIndex, layerIndex)
    const layers = (targetLayer.layers ? targetLayer.layers : [targetLayer]) as AllLayerTypes[]
    const subLayerIndex = layerUtils.subLayerIdx
    const defaultAttrs = this.effects[effect]

    for (const idx in layers) {
      if (subLayerIndex !== -1 && +idx !== subLayerIndex) continue

      const layer = layers[idx]
      if (layer.type !== 'text') continue
      const oldTextFill = layer.styles.textFill
      const newTextFill = {} as ITextFill

      if (oldTextFill && oldTextFill.name === effect) { // Adjust effect option.
        Object.assign(newTextFill, oldTextFill, attrs)
        localStorageUtils.set('textEffectSetting', effect, newTextFill)
        // this.syncShareAttrs(textFill, null)
      } else { // Switch to other effect.
        // this.syncShareAttrs(textFill, effect)
        const localAttrs = localStorageUtils.get('textEffectSetting', effect)
        Object.assign(newTextFill, defaultAttrs, localAttrs, attrs, { name: effect })
      }

      store.commit('UPDATE_specLayerData', {
        pageIndex,
        layerIndex,
        subLayerIndex: +idx,
        styles: { textFill: newTextFill }
      })

      // If SplitedSpan setting changed, force split/unsplit span text
      const oldSplitedSpan = textBgUtils.isSplitedSpan({ ...layer.styles, textFill: oldTextFill })
      const newSplitedSpan = textBgUtils.isSplitedSpan({ ...layer.styles, textFill: newTextFill })
      textBgUtils.splitOrMergeSpan(oldSplitedSpan, newSplitedSpan, layer,
        pageIndex, layerIndex, targetLayer.layers ? +idx : subLayerIndex)
    }
  }

  async resetCurrTextEffect() {
    const effectName = textEffectUtils.getCurrentLayer().styles.textFill.name
    this.setTextFill(effectName, this.effects[effectName])
  }
}

export default new TextFill()
