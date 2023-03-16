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
  name: 'square-borderless' | 'rounded-borderless' | 'square-hollow' |
  'rounded-hollow' | 'square-both' | 'rounded-both'
  opacity: number
  bStroke: number
  bRadius: number
  bColor: string
  pStrokeX: number
  pStrokeY: number
  pColor: string
}

export interface ITextUnderline {
  name: 'underline'
  endpoint: string
  height: number
  yOffset: number
  opacity: number
  color: string
}

export interface ITextGooey {
  name: 'gooey'
  distance: number
  bRadius: number
  opacity: number
  color: string
}

export interface ITextLetterBg {
  name: 'rainbow' | 'rainbow-dark' | 'circle' | 'cloud' | 'text-book'
  xOffset200: number
  yOffset200: number
  opacity: number
  size: number
  fixedWidth: boolean
  color: string
}

export interface ITextFillImg {
  name: 'text-fill-img'
  xOffset200: number
  yOffset200: number
  size: number
  opacity: number
  focus: boolean
}

export type ITextBgEffect = ITextBox | ITextUnderline | ITextGooey | ITextLetterBg | ITextFillImg | { name: 'none' }

export function isITextBox(object: ITextBgEffect): object is ITextBox {
  return object && object.name &&
    ['square-borderless', 'rounded-borderless', 'square-hollow',
      'rounded-hollow', 'square-both', 'rounded-both'].includes(object.name)
}
export function isITextUnderline(object: ITextBgEffect): object is ITextUnderline {
  return object && object.name && object.name === 'underline'
}
export function isITextGooey(object: ITextBgEffect): object is ITextGooey {
  return object && object.name && ['gooey'].includes(object.name)
}
export function isITextLetterBg(object: ITextBgEffect): object is ITextLetterBg {
  return object && object.name &&
    ['rainbow', 'rainbow-dark', 'circle', 'cloud', 'text-book'].includes(object.name)
}
export function isITextFillImg(object: ITextBgEffect): object is ITextFillImg {
  return object && object.name && ['text-fill-img'].includes(object.name)
}

export interface ITextFormat {
  textEffect: ITextEffect | {},
  textBg: ITextBgEffect,
  textShape: ITextShape | {},
  scale: number,
  paragraphStyle: IParagraphStyle,
  spanStyle: ISpanStyle,
  writingMode: string
}

export interface IImageFormat extends IAdjustJsonProps { }

export interface IFormat {
  type: 'text' | 'image',
  content: ITextFormat | IImageFormat
}
