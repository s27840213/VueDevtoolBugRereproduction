/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-empty-interface */
import { IAdjustJsonProps } from './adjust'
import { IParagraphStyle, ISpanStyle } from './layer'

export interface ITextEffect {
  name: string
  ver?: string
  [key: string]: string | number | undefined
}

export interface ITextShape {
  bend: number | string,
  focus: boolean,
  name: string
}

export interface ITextBox {
  name: 'square-borderless'|'rounded-borderless'|'square-hollow'|
        'rounded-hollow'|'square-both'|'rounded-both'
  opacity: number
  bStroke: number
  bRadius: number
  bColor: string
  pStroke: number
  pColor: string
}

export interface ITextUnderline {
  name: 'underline-triangle'|'underline-circle'|'underline-square'
  opacity: number
  color: string
}

export function isITextBox(object: ITextBox|ITextUnderline): object is ITextBox {
  return ['square-borderless', 'rounded-borderless', 'square-hollow',
    'rounded-hollow', 'square-both', 'rounded-both'].includes(object.name)
}
export function isITextUnderline(object: ITextBox|ITextUnderline): object is ITextUnderline {
  return ['underline-triangle', 'underline-circle', 'underline-square'].includes(object.name)
}

export interface ITextFormat {
  textEffect: ITextEffect | {},
  textBox: ITextEffect | {},
  textShape: ITextShape | {},
  scale: number,
  paragraphStyle: IParagraphStyle,
  spanStyle: ISpanStyle
}

export interface IImageFormat extends IAdjustJsonProps { }

export interface IFormat {
  type: 'text' | 'image',
  content: ITextFormat | IImageFormat
}
