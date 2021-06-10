/**
 */
import store from '@/store'
import { IImage, ILayer, IShape, IStyle, IText, ITmp } from '@/interfaces/layer'
import { SidebarPanelType } from '@/store/types'
import LayerFactary from '@/utils/layerFactary'
import { ICoordinate } from '@/interfaces/frame'
import LayerUtils from '@/utils/layerUtils'
import StepsUtils from '@/utils/stepsUtils'

class MouseUtils {
  getMouseAbsPoint(e: MouseEvent) {
    return { x: e.clientX, y: e.clientY }
  }

  getMouseRelPoint(e: MouseEvent, target: HTMLElement | { x: number, y: number }) {
    let x: number
    let y: number
    if (target instanceof HTMLElement) {
      const rect = target.getBoundingClientRect()
      x = e.clientX + target.scrollLeft - rect.left
      y = e.clientY + target.scrollTop - rect.top
    } else {
      x = e.clientX - target.x
      y = e.clientY - target.y
    }
    return { x, y }
  }

  onDropClipper(e: DragEvent, pageIndex: number, layerIndex: number, targetOffset: ICoordinate = { x: 0, y: 0 },
    clipPath = '', clipperStyles: IStyle | null = null) {
    let layer = this.onDropHandler(e, pageIndex, targetOffset)
    if (layer && clipperStyles && layer.type === 'image') {
      layer = this.clipperHandler(layer, clipPath, clipperStyles) as IImage
      if (layer) {
        store.commit('DELETE_layer', {
          pageIndex, layerIndex
        })
        console.log(layer)
        LayerUtils.addLayers(pageIndex, layer)
        StepsUtils.record()
      }
    }
  }

  onDrop(e: DragEvent, pageIndex: number, targetOffset: ICoordinate = { x: 0, y: 0 }) {
    const layer = this.onDropHandler(e, pageIndex, targetOffset)
    if (layer) {
      LayerUtils.addLayers(pageIndex, layer)
      StepsUtils.record()
    }
  }

  onDropHandler(e: DragEvent, pageIndex: number, targetOffset: ICoordinate = { x: 0, y: 0 }): IShape | IText | IImage | ITmp | undefined {
    if (e.dataTransfer === null) return

    const data = JSON.parse(e.dataTransfer.getData('data'))
    const target = e.target as HTMLElement
    const targetPos = {
      x: target.getBoundingClientRect().x,
      y: target.getBoundingClientRect().y
    }

    const x = (e.clientX - targetPos.x + targetOffset.x - data.styles.x) * (100 / store.state.pageScaleRatio)
    const y = (e.clientY - targetPos.y + targetOffset.y - data.styles.y) * (100 / store.state.pageScaleRatio)
    const layerConfig: ILayer = {
      type: data.type,
      pageIndex: pageIndex,
      active: false,
      shown: false,
      locked: false,
      styles: {
        x: x,
        y: y,
        scale: 1,
        scaleX: 0,
        scaleY: 0,
        rotate: 0,
        width: data.styles.width,
        height: data.styles.height,
        initWidth: data.styles.initWidth ? data.styles.initWidth : data.styles.width,
        initHeight: data.styles.initHeight ? data.styles.initHeight : data.styles.height,
        zindex: -1,
        opacity: 100
      }
    }

    let layer
    if (data.type === 'image') {
      const imgStyles = {
        imgX: 0,
        imgY: 0,
        imgWidth: layerConfig.styles.initWidth,
        imgHeight: layerConfig.styles.initHeight
      }
      Object.assign(layerConfig.styles, imgStyles)
      Object.assign(layerConfig, { src: data.src, imgControl: false })
      if (store.getters.getCurrSidebarPanelType === SidebarPanelType.bg) {
        this.backgroundHandler(pageIndex, layerConfig)
        return
      } else {
        layer = LayerFactary.newImage(layerConfig as IImage)
      }
    } else if (data.type === 'text') {
      const tmpPos = { x: layerConfig.styles.x, y: layerConfig.styles.y }
      Object.assign(layerConfig.styles, data.styles)
      layerConfig.styles.x = tmpPos.x
      layerConfig.styles.y = tmpPos.y
      layer = LayerFactary.newText(Object.assign(layerConfig, { text: data.text }) as IText)
    } else if (data.type === 'shape') {
      const tmpPos = { x: layerConfig.styles.x, y: layerConfig.styles.y }
      Object.assign(layerConfig.styles, data.styles)
      layerConfig.styles.x = tmpPos.x
      layerConfig.styles.y = tmpPos.y
      delete data.styles
      layer = LayerFactary.newShape(Object.assign(layerConfig, data))
    }
    return layer
  }

  backgroundHandler(pageIndex: number, config: ILayer) {
    store.commit('SET_backgroundImage', {
      pageIndex: pageIndex,
      config: config
    })
  }

  clipperHandler(layer: ILayer, clipPath: string, clipperStyles: IStyle): ILayer {
    /**
     * If the drop-in target is a clipped-Image, setting the initial size as the layer size.
     */
    if (typeof clipperStyles.imgX !== 'undefined') {
      clipperStyles.initWidth = clipperStyles.width / clipperStyles.scale
      clipperStyles.initHeight = clipperStyles.height / clipperStyles.scale
    }
    const img = {
      width: layer.styles.width,
      height: layer.styles.height
    }
    const ratio = {
      width: clipperStyles.initWidth / img.width,
      height: clipperStyles.initHeight / img.height
    }

    /**
     * Here's to determine the img's initial width/height
     */
    let scaleRatio: number
    const scaleImg = (scaleRatio: number) => {
      img.width *= scaleRatio
      img.height *= scaleRatio
    }
    if (img.width > img.height) {
      scaleRatio = ratio.height
      scaleImg(scaleRatio)
    } else {
      scaleRatio = ratio.width
      scaleImg(scaleRatio)
    }

    if (img.width < clipperStyles.initWidth || img.height < clipperStyles.initHeight) {
      const scaleRatio = img.height < clipperStyles.initHeight ? clipperStyles.initHeight / img.height
        : clipperStyles.initWidth / img.width
      scaleImg(scaleRatio)
    }
    const newStyles = {
      width: clipperStyles.width,
      height: clipperStyles.height,
      initWidth: img.width,
      initHeight: img.height,
      imgWidth: img.width,
      imgHeight: img.height,
      scale: clipperStyles.scale,
      rotate: clipperStyles.rotate,
      imgX: -img.width / 2 + clipperStyles.initWidth / 2,
      imgY: -img.height / 2 + clipperStyles.initHeight / 2,
      x: clipperStyles.x,
      y: clipperStyles.y
    }
    Object.assign(layer.styles, newStyles)
    layer.clipPath = clipPath.substring(0, 4) === 'path' ? clipPath : `path('${clipPath}')`
    layer.isClipped = true
    return layer
  }
}

const mouseUtils = new MouseUtils()
export default mouseUtils
