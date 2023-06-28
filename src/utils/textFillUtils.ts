import textEffect, { IPutTextEffectResponse } from '@/apis/textEffect'
import i18n from '@/i18n'
import { IAssetPhoto, IPhotoItem, isIAssetPhoto } from '@/interfaces/api'
import { CustomElementConfig } from '@/interfaces/editor'
import { ITextFill, ITextFillConfig, isITextFillCustom } from '@/interfaces/format'
import { AllLayerTypes, IText } from '@/interfaces/layer'
import router from '@/router'
import store from '@/store'
import constantData, { IEffect, IEffectOptionSelect } from '@/utils/constantData'
import generalUtils from '@/utils/generalUtils'
import imageUtils from '@/utils/imageUtils'
import layerUtils from '@/utils/layerUtils'
import localStorageUtils from '@/utils/localStorageUtils'
import textBgUtils, { Rect } from '@/utils/textBgUtils'
import textEffectUtils from '@/utils/textEffectUtils'
import textUtils from '@/utils/textUtils'
import { notify } from '@kyvg/vue3-notification'
import { AxiosResponse } from 'axios'
import { find, max, omit, pick } from 'lodash'
import { InjectionKey } from 'vue'

interface ITextFillPresetRawImg {
  assetIndex: number
  teamId: string
  id: string
  width: number
  height: number
}

export interface ITextFIllPreset {
  id: string
  param: {
    img: ITextFillPresetRawImg
    opacity: number
    size: number
    xOffset200: number
    yOffset200: number
  }
}

export interface ITextFillCategory {
  id: number
  list: ITextFIllPreset[]
  plan: 0 | 1
  title_jp: string
  title_tw: string
  title_us: string
}

class TextFill {
  normalFills = [] as ITextFillCategory[]
  adminFills = [] as ITextFIllPreset[]

  get fillCategories(): IEffect[] { // TextFill that from appJSON
    const isAdmin = store.getters['user/isAdmin']
    const fills = [
      ...isAdmin ? [{
        id: 0,
        list: this.adminFills,
        plan: 1 as const,
        title_jp: '管理員測試用',
        title_tw: '管理員測試用',
        title_us: '管理員測試用',
      }] : [],
      ...this.normalFills,
    ]

    return fills.map(fill => {
      const firstImg = fill.list[0]?.param.img
      return {
        key: `${fill.id}`,
        label: fill[`title_${i18n.global.locale}`],
        plan: fill.plan,
        img: firstImg ? `https://template.vivipic.com/admin/${firstImg.teamId}/asset/image/${firstImg.id}/tiny`
          : require('@/assets/img/svg/image-preview.svg') as string,
        options: [{
          type: 'select' as const,
          key: 'img',
          label: i18n.global.t('NN0870'),
          select: fill.list.map(eff => ({
            key: eff.id,
            img: `https://template.vivipic.com/admin/${eff.param.img.teamId}/asset/image/${eff.param.img.id}/tiny`,
            label: '',
            attrs: {
              ...eff.param,
              img: {
                ...eff.param.img,
                preview: { width: eff.param.img.width, height: eff.param.img.height },
                urls: ['prev', 'tiny', 'smal', 'midd', 'full', 'larg', 'xtra'].reduce((acc, size) => ({
                  ...acc, [size]: `https://template.vivipic.com/admin/${eff.param.img.teamId}/asset/image/${eff.param.img.id}/${size}`
                }), {}),
                key: eff.id,
              },
            }
          }))
        }, ...constantData.toOptions(['xOffset200', 'yOffset200', 'size', 'opacity'])]
      }
    })
  }

  updateFillCategory(normalFills: ITextFillCategory[], adminFills: ITextFIllPreset[]) {
    this.normalFills = normalFills
    this.adminFills = adminFills
  }

  getDefaultEffects(effectName: string) {
    const defaultOptions = {
      xOffset200: 0,
      yOffset200: 0,
      size: 100,
      opacity: 100,
      focus: false,
    } as const

    if (effectName === 'custom-fill-img') return defaultOptions
    else return { customImg: null }
  }

  getImg(effect: { img?: IAssetPhoto, customImg?: IAssetPhoto | IPhotoItem | null }): IAssetPhoto | IPhotoItem | null {
    return effect.img ?? effect.customImg ?? null
  }

  getTextFillImg(config: IText, { ratio = 1, finalSize }: { ratio?: number, finalSize?: number }): string {
    const textFill = config.styles.textFill as ITextFillConfig
    const img = this.getImg(textFill)
    if (!img) return ''
    const pageScale = store.getters.getPageScaleRatio * 0.01
    // ratio = contentScaleRatio * dpiRatio
    const layerSize = finalSize ?? Math.max(config.styles.height, config.styles.width) *
      pageScale * ratio * (textFill.size * 0.01)

    const srcObj = isIAssetPhoto(img)
      ? img.id
        ? { type: 'public', userId: imageUtils.getUserId(img.urls.full, 'public'), assetId: img.id } // TextFill preset img
        : { type: 'private', userId: '', assetId: img.assetIndex as number } // non-admin myfile img
      : { type: 'unsplash', userId: '', assetId: img.id } // custom unsplash img
    let src = imageUtils.getSrc(srcObj, imageUtils.getSrcSize(srcObj, layerSize))
    if (router.currentRoute.value.name === 'Preview') src = imageUtils.appendCompQueryForVivipic(src)
    return src
  }

  calcTextFillVar(config: IText) {
    const textFill = config.styles.textFill as ITextFillConfig
    const img = this.getImg(textFill)
    if (!img) return {}
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

  async convertTextEffect(config: IText, ratio: number): Promise<Record<string, string | number>[][]> {
    const { textFill, textShape } = config.styles
    if (textFill.name === 'none') return []

    const imgSrc = this.getTextFillImg(config, { ratio })
    const { divHeight, divWidth, imgHeight, imgWidth, scaleByWidth } = this.calcTextFillVar(config)
    if (!imgSrc || !divHeight) return []

    const myRect = new Rect()
    await myRect.init(config)
    myRect.preprocess({ skipMergeLine: true })
    const { vertical, rows } = myRect.get()
    const isTextShape = textShape.name !== 'none'
    const isTextShapeFocus = isTextShape && textEffectUtils.focus === 'fill'

    // Because rows is a 1D-array, convert it to 2D-array as 'div' variable so that I can return 2D CSS.
    const div = [] as DOMRect[][]
    for (const [index, row] of rows.entries()) {
      if (row.spanData.length === 0) continue
      let { pIndex, sIndex } = row.spanData[0]
      if (isTextShape) {
        // TextShape only have one line, fix its p/sIndex
        [pIndex, sIndex] = [0, index]
        // Because TextShape has display： inline-block, its height is affected by the lineHeight.
        // To justify its position, multiply the height by the lineHeight.
        row.rect[vertical ? 'width' : 'height'] *= row.spanData[0].lineHeight
      }

      while (div.length - 1 < pIndex) div.push([])
      div[pIndex][sIndex] = row.rect
    }

    const spanExpandRatio = 1
    const isPositiveBend = +textShape.bend >= 0
    const isFixedWidth = textBgUtils.isFixedWidth(config.styles)
    // If not TextShape, need add maxFontSize to top/left to fix its position.
    const maxFontSize = max(config.paragraphs.flatMap(p => p.spans.map(s => s.styles.size))) as number
    const leftDir = imgWidth - divWidth < 0 ? -1 : 1
    const topDir = imgHeight - divHeight < 0 ? -1 : 1
    return div.map(p => p.map(span => {
      let { width: spanWidth, height: spanHeight, x, y } = span
      if (vertical) {
        [spanWidth, spanHeight] = [spanHeight, spanWidth];
        [x, y] = [y, x]
      }
      const bgSizeBy = textFill.size * (scaleByWidth ? divWidth / spanWidth : divHeight / spanHeight)
      return {
        ...textEffectUtils.focus === 'fill' ? {
          backgroundColor: 'transparent',
          webkitTextStrokeColor: 'black',
          '-webkit-text-stroke-width': '1px', // Use dash-case for overwrite textStylesRaw result.
        } : {
          // About span BG
          backgroundImage: `url("${imgSrc}")`,
          backgroundSize: scaleByWidth ? `${bgSizeBy}% auto` : `auto ${bgSizeBy}%`,
          // (img - div) * position%, calc like BG-pos %, but use div as container size and map -100~100 to 0~100%
          // https://developer.mozilla.org/en-US/docs/Web/CSS/background-position#regarding_percentages
          backgroundPosition: `
            ${(x + (imgWidth - divWidth) * (0.5 - textFill.xOffset200 * leftDir / 200)) * -1}px
            ${(y + (imgHeight - divHeight) * (0.5 + textFill.yOffset200 * topDir / 200)) * -1}px`,
          backgroundOrigin: 'content-box',
          backgroundRepeat: 'no-repeat',
          webkitBackgroundClip: 'text',
          // To fix a Safari bug that the element border of BG text clip will appear abnormally,
          // make border of element to be transparent.
          maskImage: `url(${require('@/assets/img/svg/text-fill-mask-image.svg')})`,
          maskSize: '100% 100%',
          // About span color
          opacity: textFill.opacity / 100,
          webkitTextStrokeColor: 'transparent',
        },
        webkitTextFillColor: 'transparent',
        textDecorationColor: 'transparent',
        // About span position
        position: 'absolute',
        padding: `${spanHeight * spanExpandRatio}px ${spanWidth * spanExpandRatio}px`,
        ...isTextShapeFocus ? {
          [isPositiveBend ? 'top' : 'bottom']: `${y * (isPositiveBend ? 1 : -1) - spanHeight * spanExpandRatio}px`,
          left: `${x - spanWidth * spanExpandRatio}px`,
          transform: 'none',
        } : isTextShape ? {
          [isPositiveBend ? 'top' : 'bottom']: `${-spanHeight * spanExpandRatio}px`,
          // Align center, this can prevent Safari lag when scaling TextFill layer with TextShape.
          left: `${(divWidth - spanWidth * (1 + spanExpandRatio * 2)) / 2}px`,
        } : {
          top: `${y - spanHeight * spanExpandRatio + maxFontSize}px`,
          left: `${x - spanWidth * spanExpandRatio + maxFontSize}px`,
          ...!isFixedWidth ? { 'line-height': 'initial' } : {},
        },
        // To fix Safari PDF reader bug: https://bit.ly/3IPcS8o
        ...store.getters['user/getUserId'] === 'backendRendering' ? { filter: 'opacity(1)' } : {},
      }
    }))
  }

  drawTextFill(config: IText, ratio: number): CustomElementConfig | null {
    const textFill = config.styles.textFill
    if (textFill.name === 'none' || !(textEffectUtils.focus === 'fill')) return null

    const imgSrc = this.getTextFillImg(config, { ratio })
    const { divHeight, divWidth, imgHeight, imgWidth, scaleByWidth } = this.calcTextFillVar(config)
    if (!imgSrc || !divHeight) return null

    const leftDir = imgWidth - divWidth < 0 ? -1 : 1
    const topDir = imgHeight - divHeight < 0 ? -1 : 1
    return {
      tag: 'img',
      attrs: { src: imgSrc },
      style: {
        [scaleByWidth ? 'width' : 'height']: `${textFill.size}%`,
        left: `${(imgWidth - divWidth) * (0.5 - textFill.xOffset200 * leftDir / 200) * -1}px`,
        top: `${(imgHeight - divHeight) * (0.5 + textFill.yOffset200 * topDir / 200) * -1}px`,
        opacity: textFill.opacity / 100,
      }
    }
  }

  async setTextFill(effect: string, attrs?: Record<string, unknown>, reset = false) {
    const { index: layerIndex, pageIndex } = store.getters.getCurrSelectedInfo
    const targetLayer = store.getters.getLayer(pageIndex, layerIndex)
    const layers = (targetLayer.layers ? targetLayer.layers : [targetLayer]) as AllLayerTypes[]
    const subLayerIndex = layerUtils.subLayerIdx
    const defaultAttrs = this.getDefaultEffects(effect)

    for (const idx in layers) {
      if (subLayerIndex !== -1 && +idx !== subLayerIndex) continue

      const layer = layers[idx]
      if (layer.type !== 'text') continue
      const currSubLayerIndex = targetLayer.layers ? +idx : subLayerIndex
      const oldTextFill = layer.styles.textFill
      const newTextFill = {} as ITextFill

      if (oldTextFill && oldTextFill.name === effect) { // Adjust effect option.
        const localAttrs = !reset && attrs && Object.keys(attrs).includes('img')
          ? localStorageUtils.get('textEffectSetting', `fill.${(attrs as { img: { key: string } }).img.key}`) : null
        Object.assign(newTextFill, oldTextFill, attrs, localAttrs)

        // Only TextFill from appJSON need to store to localstorage
        if (isITextFillCustom(newTextFill) && newTextFill.name !== '0' && newTextFill.img) {
          localStorageUtils.set('textEffectSetting', `fill.${newTextFill.img.key}`, omit(newTextFill, ['customImg', 'name']))
        }
      } else { // Switch to other effect.
        const targetEffect = find(this.fillCategories, ['key', effect])
        const effectDefaultPreset = (targetEffect?.options[0] as IEffectOptionSelect)?.select[0]?.attrs as { img: { key: string } } | undefined
        const localAttrs = effectDefaultPreset?.img?.key ? localStorageUtils.get('textEffectSetting', `fill.${effectDefaultPreset.img.key}`) : null
        Object.assign(newTextFill, defaultAttrs, effectDefaultPreset, localAttrs,
          { name: effect, customImg: oldTextFill.customImg }
        )
      }

      store.commit('UPDATE_specLayerData', {
        pageIndex,
        layerIndex,
        subLayerIndex: +idx,
        styles: { textFill: newTextFill },
        props: { contentEditable: false },
      })

      // If SplitSpan setting changed, force split/unsplit span text
      const oldSplitSpan = textBgUtils.isSplitSpan({ ...layer.styles, textFill: oldTextFill })
      const newSplitSpan = textBgUtils.isSplitSpan({ ...layer.styles, textFill: newTextFill })
      textBgUtils.splitOrMergeSpan(oldSplitSpan, newSplitSpan, layer,
        pageIndex, layerIndex, currSubLayerIndex)

      // Update widthLimit for widthLimit !== -1 layers. Steps to Reproduce the Issue:
      // 1. Multi-select a new text layer (widthLimit is -1) and other layers.
      // 2. Cancel multi-select.
      // 3. Apply TextFill to the text layer.
      // 4. Enter contentEditable mode, text will have additional line
      if (layer.widthLimit !== -1) {
        const widthLimit = await textUtils.autoResize(layer, { ...layer.styles, widthLimit: layer.widthLimit, spanDataList: layer.spanDataList })
        layerUtils.updateLayerProps(pageIndex, layerIndex, { widthLimit }, currSubLayerIndex)
      }

      // Update w/h for layer in tmp/group, which don't have tiptap. Steps to Reproduce the Issue:
      // 1. Multi-select a new text layer (widthLimit is -1) and other layers.
      // 2. Apply TextFill.
      // 3. Cancel multi-select, text will have additional line.
      if (oldSplitSpan !== newSplitSpan) {
        textUtils.updateTextLayerSizeByShape(pageIndex, layerIndex, currSubLayerIndex)
      }
    }
  }

  async resetCurrTextEffect() {
    const textFill = textEffectUtils.getCurrentLayer().styles.textFill
    const effectName = textFill.name
    if (effectName === 'none') return
    else if (effectName === 'custom-fill-img') {
      this.setTextFill(effectName, this.getDefaultEffects(effectName), true)
      return
    }
    const targetEffect = find(this.fillCategories, ['key', effectName])
    const targetFillImg = find((targetEffect?.options[0] as IEffectOptionSelect)?.select, ['key', textFill.img.key])
    const effectDefaultPreset = targetFillImg?.attrs
    this.setTextFill(effectName, effectDefaultPreset, true)
  }

  async uploadTextFill() {
    const currText = layerUtils.getCurrLayer
    if (currText.type !== 'text') {
      notify({ group: 'error', text: '當前layer並非text' })
      return
    }

    const fill = currText.styles.textFill
    if (fill.name === 'none') {
      notify({ group: 'error', text: '當前layer不含有文字填滿' })
      return
    }

    let res: AxiosResponse<IPutTextEffectResponse>
    const params = pick(fill, ['xOffset200', 'yOffset200', 'size', 'opacity']) as ITextFIllPreset['param']
    if (fill.name === 'custom-fill-img') {
      if (!isIAssetPhoto(fill.customImg) || !fill.customImg.assetIndex) {
        notify({ group: 'error', text: '當前文字填滿沒有圖片，或是圖片不是來自管理員上傳。' })
        return
      }
      params.img = {
        assetIndex: fill.customImg.assetIndex,
        teamId: store.getters['user/getUserId'],
        id: fill.customImg.id,
        width: fill.customImg.width,
        height: fill.customImg.height,
      }
      res = await textEffect.addTextFill(generalUtils.generateRandomString(20), params)
    } else {
      const targetEffect = find(this.fillCategories, ['key', fill.name])
      const targetFillImg = find((targetEffect?.options[0] as IEffectOptionSelect)?.select, ['key', fill.img.key])
      if (!targetFillImg) {
        notify({ group: 'error', text: '找不到文字填滿id' })
        return
      }
      params.img = pick(fill.img, ['assetIndex', 'teamId', 'id', 'width', 'height']) as ITextFillPresetRawImg
      res = await textEffect.updateTextFill(targetFillImg.key, params)
    }

    if (res.data.flag) notify({ group: 'error', text: res.data.msg })
    else if (res.data.flag === 0) notify({ group: 'copy', text: '文字填滿上傳/更新成功。' })
  }
}

export default new TextFill()
export const replaceImgInject: InjectionKey<(img: IPhotoItem | IAssetPhoto) => void> = Symbol('replaceImg')
