/**
 * This file is used to convert properties of layers into CSS-readable properties
 */
import { IParagraphStyle, ISpanStyle, IStyle, ITextStyle } from '@/interfaces/layer'
import store from '@/store'

const fontProps = ['font', 'weight', 'align', 'lineHeight', 'fontSpacing',
  'size', 'writingMode', 'decoration', 'color', 'style', 'caretColor',
  'min-width', 'min-height', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
  'opacity', 'webkitTextFillColor', '-webkit-background-clip', 'filter', '--base-stroke',
  'webkitTextStrokeColor', 'textShadow',
] as const

type IStyleMap = Record<typeof fontProps[number], string>

const styleMap = Object.assign({}, ...fontProps.map(prop => // Transfer camelCase to dash-case by default
  ({ [prop]: prop.replace(/([A-Z]|webkit)/g, upper => `-${upper.toLowerCase()}`) })
), { // Overwrite special case
  x: 'translateX',
  y: 'translateY',
  scaleX: 'scaleX',
  scaleY: 'scaleY',
  font: 'font-family',
  weight: '-webkit-text-stroke-width',
  align: 'text-align',
  fontSpacing: 'letter-spacing',
  size: 'font-size',
  decoration: 'text-decoration-line',
  style: 'font-style',
} as Partial<IStyleMap>
) as IStyleMap

class CssConveter {
  convertTransformStyle(x: number, y: number, zindex: number, rotate: number, cancel3D = false, factor = 1): { transform: string } {
    //  The scale feature only applied on "layer-scale" as a child-container of the layer
    return {
      transform: cancel3D ? `translate(${x * factor}px, ${y * factor}px) rotate(${rotate}deg)` : `translate3d(${x * factor}px, ${y * factor}px, ${zindex}px) rotate(${rotate}deg)`
    }
  }

  convertFlipStyle(horizontalFlip: boolean, verticalFlip: boolean): { transform: string } {
    if (horizontalFlip && verticalFlip) {
      return {
        transform: 'scaleX(-1) scaleY(-1)'
      }
    } else if (horizontalFlip) {
      return {
        transform: 'scaleX(-1)'
      }
    } else if (verticalFlip) {
      return {
        transform: 'scaleY(-1)'
      }
    } else {
      return { transform: '' }
    }
  }

  convertFontStyle(sourceStyles: IStyle | ITextStyle | IParagraphStyle | ISpanStyle | { [key: string]: string | number }): { [key: string]: string } {
    const result: { [key: string]: string } = {}
    fontProps.forEach(prop => {
      if (sourceStyles[prop] === undefined) return

      if (prop === 'size') {
        result[styleMap[prop]] = `${(sourceStyles[prop] as number) * 1.333333}px`
      } else if (prop === 'weight') {
        result[styleMap[prop]] = sourceStyles[prop] === 'bold' ? `calc(var(--base-stroke) + ${(sourceStyles.size as number) / 32}px)` : 'calc(var(--base-stroke))'
      } else if (prop === 'fontSpacing') {
        result[styleMap[prop]] = typeof sourceStyles[prop] === 'number' ? `${sourceStyles[prop]}em` : `${sourceStyles[prop]}`
      } else if (prop === 'font') {
        result[styleMap[prop]] = this.getFontFamily(sourceStyles[prop] as string)
      } else if (prop === 'color') { // For color
        result[styleMap[prop]] = `${sourceStyles[prop]}`
        result['text-decoration-color'] = `${sourceStyles[prop]}`
      } else if (['min-width', 'min-height'].includes(prop)) { // For fixedWidth LetterBg
        result[prop] = `${sourceStyles[prop]}`
        result.display = 'inline-block'
        result['letter-spacing'] = '0'
        result['text-align'] = 'center'
      } else if (['lineHeight', 'opacity'].includes(prop)) { // Use sorce style value directly
        result[styleMap[prop]] = `${sourceStyles[prop]}`
      } else { // Defulat: number add px unit, other treat as string
        result[styleMap[prop]] = typeof sourceStyles[prop] === 'number' ? `${sourceStyles[prop]}px` : `${sourceStyles[prop]}`
      }
    })
    return result
  }

  getFontFamily(font: string): string {
    return (font + ',').concat(store.getters['text/getDefaultFonts'])
  }

  convertDefaultStyle(sourceStyles: IStyle | ITextStyle, cancel3D = false, factor = 1): { [key: string]: string } {
    const result: { [key: string]: string } = {}
    Object.assign(result, {
      width: typeof sourceStyles.width === 'number' ? `${sourceStyles.width * factor}px` : 'initial',
      height: typeof sourceStyles.height === 'number' ? `${sourceStyles.height * factor}px` : 'initial',
      ...(sourceStyles.opacity !== 100 && { opacity: `${sourceStyles.opacity / 100}` }),
      ...this.convertTransformStyle(sourceStyles.x, sourceStyles.y, sourceStyles.zindex, sourceStyles.rotate, cancel3D, factor)
    })
    return result
  }
}

export default new CssConveter()
