import { IGroup, IImage, IImageStyle } from '@/interfaces/layer'
import { LayerType } from '@/store/types'
import generalUtils from './generalUtils'
import layerUtils from './layerUtils'
import mathUtils from './mathUtils'
import { IBlurEffect, IFrameEffect, IHaloEffect, IProjectionEffect, IShadowEffect, IShadowEffects, IShadowProps, ShadowEffectType } from '@/interfaces/imgShadow'
import imageUtils from './imageUtils'
import * as StackBlur from 'stackblur-canvas'
import color from '@/store/module/color'

type ShadowEffects = IBlurEffect | IShadowEffect | IFrameEffect | IHaloEffect | IProjectionEffect

const HALO_Y_OFFSET = 70 as const
export const HALO_SPREAD_LIMIT = 80
export const CANVAS_SCALE = 1.5
class ImageShadowUtils {
  _draw = undefined as number | undefined

  setEffect (effect: ShadowEffectType, attrs = {}): void {
    const { pageIndex, layerIndex, subLayerIdx, getCurrConfig: currLayer } = layerUtils
    if (subLayerIdx !== -1 || currLayer.type === LayerType.image) {
      const { shadow } = (currLayer as IImage).styles
      const { effects, filterId } = shadow
      layerUtils.updateLayerStyles(pageIndex, layerIndex, {
        shadow: {
          currentEffect: effect,
          filterId,
          effects: {
            ...effects,
            ...attrs
          }
        }
      }, subLayerIdx)
    }
  }

  /** Only used for blur and projection effects */
  convertShadowEffect(config: IImage): { [key: string]: string | number } {
    const { shadow, scale } = config.styles
    const { color = '#000000' } = shadow.effects
    const effect = shadow.currentEffect !== ShadowEffectType.none
      ? shadow.effects[shadow.currentEffect] : {}

    switch (shadow.currentEffect) {
      case ShadowEffectType.halo: {
        const { radius, distance, angle, size, opacity } = effect as ShadowEffects
        const x = distance * mathUtils.cos(angle)
        const y = distance * mathUtils.sin(angle)
        return {
          backgroundImage: `url(${imageUtils.getSrc(config)})`,
          backgroundColor: `rgba(255, 255, 255, ${1 - opacity / 100})`,
          backgroundBlendMode: 'overlay',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          zIndex: -1,
          width: `${size}%`,
          height: `${size}%`,
          bottom: `${-y}%`,
          left: `${x - (size - 100) / 2}%`,
          filter: `blur(${radius * scale}px)`
        }
      }
      case ShadowEffectType.projection: {
        const { radius, spread, opacity, x, y, size } = mathUtils
          .multipy(scale, effect as ShadowEffects, ['opacity', 'size']) as ShadowEffects
        return {
          width: `${size}%`,
          left: `${x * fieldRange.projection.x.weighting + (100 - size) / 2}%`,
          bottom: `${-y * fieldRange.projection.y.weighting}%`,
          zIndex: -1,
          boxShadow:
          `0px ${HALO_Y_OFFSET * scale}px ` +
          `${(radius + 30) * fieldRange.projection.radius.weighting}px ` +
          `${spread}px ` +
          `${color + this.convertToAlpha(opacity)}`
        }
      }
      case ShadowEffectType.none:
      case ShadowEffectType.blur:
      case ShadowEffectType.shadow:
      case ShadowEffectType.frame:
        return {}
      default:
        return generalUtils.assertUnreachable(shadow.currentEffect)
    }
  }

  readonly SPREAD_RADIUS = 1
  draw(canvas: HTMLCanvasElement, img: HTMLImageElement, config: IImage) {
    if (this._draw) {
      clearTimeout(this._draw)
    }
    const ctx = canvas.getContext('2d')
    const { styles } = config
    const { width, height, shadow, imgX, imgY } = styles
    const { effects, currentEffect } = shadow
    const { distance, angle, blur, radius, spread, opacity } = (effects as any)[currentEffect] as IShadowEffect | IBlurEffect | IFrameEffect
    if ((currentEffect === ShadowEffectType.none || currentEffect === ShadowEffectType.halo ||
      currentEffect === ShadowEffectType.projection)) return
    if (!ctx) return
    let offsetX = 0
    let offsetY = 0
    if (distance && distance > 0) {
      offsetX = distance * mathUtils.cos(angle)
      offsetY = distance * mathUtils.sin(angle)
    }
    const x = (CANVAS_SCALE - 1) / 2 * width + imgX
    const y = (CANVAS_SCALE - 1) / 2 * height + imgY

    this._draw = setTimeout(() => {
      console.log('drawing')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alphaVal = 0
      for (let i = -spread; i <= spread; i++) {
        for (let j = -spread; j <= spread; j++) {
          const r = Math.sqrt(i * i + j * j)
          if (r >= spread + this.SPREAD_RADIUS) {
            alphaVal = 0
          } else if (r >= spread) {
            alphaVal = (1 - (r - spread) * this.SPREAD_RADIUS)
          } else {
            alphaVal = 1
          }
          if (alphaVal) {
            ctx.globalAlpha = alphaVal
            ctx.drawImage(img, x + offsetX + i, y + offsetY + j, width, height)
          }
        }
      }
      ctx.globalCompositeOperation = 'source-in'
      ctx.globalAlpha = opacity / 100
      ctx.fillStyle = effects.color
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-over'

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      StackBlur.imageDataRGBA(imageData, 0, 0, canvas.width, canvas.height, radius + 1)
      ctx.putImageData(imageData, 0, 0)
      ctx.globalAlpha = 1
      ctx.drawImage(img, x, y, width, height)
    }, 100)
  }

  convertToAlpha(percent: number): string {
    return Math.floor(percent / 100 * 255).toString(16).toUpperCase()
  }

  getDefaultEffect(effectName: ShadowEffectType): Partial<IShadowEffects> {
    let effect = {} as unknown
    switch (effectName) {
      case ShadowEffectType.shadow:
        (effect as IShadowEffect) = {
          distance: 0,
          angle: 0,
          radius: 9,
          spread: 3,
          opacity: 55
        }
        break
      case ShadowEffectType.projection: {
        (effect as IProjectionEffect) = {
          x: 0,
          y: 0,
          radius: 57,
          spread: 23,
          size: 79,
          opacity: 100
        }
        break
      }
      case ShadowEffectType.blur:
        (effect as IBlurEffect) = {
          radius: 9,
          spread: 0,
          opacity: 55
        }
        break
      case ShadowEffectType.frame:
        (effect as IFrameEffect) = {
          radius: 0,
          spread: 20,
          opacity: 100
        }
        break
      case ShadowEffectType.halo:
        (effect as IHaloEffect) = {
          distance: 9,
          angle: 30,
          radius: 14,
          size: 100,
          opacity: 55
        }
        break
      case ShadowEffectType.none:
        return {}
      default:
        return generalUtils.assertUnreachable(effectName)
    }
    const { getCurrLayer: currLayer } = layerUtils
    const color = currLayer.type === LayerType.image
      ? (currLayer as IImage).styles.shadow.effects.color || '#000000' : '#000000'
    return {
      [effectName]: effect,
      color
    } as IShadowEffects
  }

  getKeysOf(effect: ShadowEffectType): Array<string> {
    return [
      ...Object.keys(
        effect === ShadowEffectType.none ? {} : this.getDefaultEffect(effect)[effect] as ShadowEffects)
    ]
  }
}

export const shadowPropI18nMap = {
  none: {
    _effectName: 'NN0428'
  },
  shadow: {
    distance: 'NN0431',
    angle: 'NN0432',
    radius: 'NN0426',
    spread: 'NN0421',
    opacity: 'NN0427',
    _effectName: 'NN0429'
  },
  blur: {
    radius: 'NN0426',
    spread: 'NN0421',
    opacity: 'NN0427',
    _effectName: 'NN0418'
  },
  halo: {
    distance: 'NN0431',
    angle: 'NN0432',
    size: 'NN0422',
    radius: 'NN0426',
    opacity: 'NN0427',
    _effectName: 'NN0419'
  },
  frame: {
    radius: 'NN0426',
    spread: 'NN0423',
    opacity: 'NN0427',
    _effectName: 'NN0430'
  },
  projection: {
    x: 'NN0425',
    y: 'NN0424',
    radius: 'NN0426',
    spread: 'NN0421',
    opacity: 'NN0427',
    size: 'NN0422',
    _effectName: 'NN0420'
  }
}

export const fieldRange = {
  shadow: {
    distance: { max: 100, min: 0, weighting: 1 },
    angle: { max: 180, min: -180, weighting: 1 },
    radius: { max: 30, min: 0, weighting: 1 },
    opacity: { max: 100, min: 0, weighting: 1 },
    spread: { max: 25, min: 0, weighting: 1 }
  },
  blur: {
    radius: { max: 70, min: 0, weighting: 2 },
    spread: { max: 100, min: 0, weighting: 0.72 },
    opacity: { max: 100, min: 0, weighting: 0.01 }
  },
  halo: {
    distance: { max: 100, min: 0, weighting: 2 },
    angle: { max: 180, min: -180, weighting: 2 },
    size: { max: 200, min: 50, weighting: 0.01 },
    radius: { max: 100, min: 0, weighting: 2 },
    opacity: { max: 100, min: 0, weighting: 0.01 }
  },
  frame: {
    spread: { max: 100, min: 0, weighting: 0.72 },
    opacity: { max: 100, min: 0, weighting: 0.01 },
    radius: { max: 100, min: 0, weighting: 2 }
  },
  projection: {
    spread: { max: 100, min: 0, weighting: 0.5 },
    opacity: { max: 100, min: 0, weighting: 0.01 },
    radius: { max: 100, min: 0, weighting: 1.2 },
    size: { max: 200, min: 50 },
    x: { max: 100, min: -100, weighting: 0.5 },
    y: { max: 100, min: -100, weighting: 0.5 }
  }
} as any

export default new ImageShadowUtils()
