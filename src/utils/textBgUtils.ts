import { isITextBox, isITextGooey, isITextLetterBg, isITextUnderline, ITextBgEffect, ITextGooey, ITextLetterBg } from '@/interfaces/format'
import { IParagraph, IParagraphStyle, ISpanStyle, IStyle, IText } from '@/interfaces/layer'
import store from '@/store'
import layerUtils from '@/utils/layerUtils'
import localStorageUtils from '@/utils/localStorageUtils'
import mathUtils from '@/utils/mathUtils'
import textEffectUtils from '@/utils/textEffectUtils'
import tiptapUtils from '@/utils/tiptapUtils'
import { Editor } from '@tiptap/vue-3'
import _, { cloneDeep, isEqual } from 'lodash'
import generalUtils from './generalUtils'
import textUtils from './textUtils'

export interface textBgSvg {
  attrs: Record<string, string | number>
  content: {
    tag: string
    attrs: Record<string, string | number>
  }[]
}

// For text effect gooey
export class Point {
  x: number
  y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  middle(p: Point): Point {
    return new Point(
      (this.x + p.x) / 2,
      (this.y + p.y) / 2
    )
  }

  add(p: { x: number, y: number }): Point {
    return new Point(
      this.x + p.x,
      this.y + p.y
    )
  }

  dist(p: Point): number {
    return Math.pow(Math.pow(this.x - p.x, 2) + Math.pow(this.y - p.y, 2), 0.5)
  }

  toString(): string {
    return `${this.x} ${this.y}`
  }
}
function obj2Point(p: { x: number, y: number }) {
  return new Point(p.x, p.y)
}

class Rect {
  bodyRect = new DOMRect()
  vertical = false
  width = 0
  height = 0
  transform = ''
  rows: {
    rect: DOMRect
    spanData: {
      x: number
      y: number
      width: number
      height: number
      text: string
      letterSpacing: number
    }[]
  }[] = []

  async waitForRender(div: HTMLElement): Promise<void> {
    const textId = generalUtils.generateRandomString(12)
    div.setAttribute('id', textId)
    return new Promise(resolve => {
      textUtils.observerCallbackMap[textId] = () => {
        textUtils.observer.unobserve(div)
        resolve()
      }
      document.body.appendChild(div)
      textUtils.observer.observe(div)
    })
  }

  async init(config: IText, { splitSpan } = { splitSpan: false }) {
    this.vertical = config.styles.writingMode === 'vertical-lr'
    const fixedWidth = isITextLetterBg(config.styles.textBg) && config.styles.textBg.fixedWidth

    let div = document.createElement('div')
    div.classList.add('nu-text__body')
    config.paragraphs.forEach(para => {
      const p = document.createElement('p')
      p.classList.add('nu-text__p')
      const pStyle = tiptapUtils.textStylesRaw(para.styles)
      Object.assign(p.style, pStyle, { margin: 0 })
      div.appendChild(p)

      para.spans.forEach(spanData => {
        if (!spanData.text) {
          const span = document.createElement('span')
          span.classList.add('nu-text__span')
          span.appendChild(document.createElement('br'))
          p.appendChild(span)
        } else {
          const textArray = splitSpan
            ? textUtils.splitter.splitGraphemes(spanData.text)
            : [spanData.text]
          textArray.forEach(t => {
            const isComposingText = textUtils.splitter.countGraphemes(spanData.text) > 1
            const fixedWidthStyle = fixedWidth && isComposingText ? {
              letterSpacing: 0,
              display: 'inline-block',
            } : fixedWidth ? textBgUtils.fixedWidthStyle(spanData.styles, para.styles, config) : {}

            const span = document.createElement('span')
            span.classList.add('nu-text__span')
            if (t === ' ') {
              span.innerHTML = '&nbsp;'
            } else {
              span.textContent = t
            }

            const spanStyleObject = tiptapUtils.textStylesRaw(spanData.styles)
            spanStyleObject.textIndent = spanStyleObject['letter-spacing'] || 'initial'

            Object.assign(span.style, spanStyleObject, fixedWidthStyle)

            p.appendChild(span)
          })
        }
      })
    })

    // const safariStyle = platform.name === 'Safari' ? { lineBreak: 'loose' } : {}
    const safariStyle = generalUtils.safariLike ? { lineBreak: 'normal' } : {}
    // const safariStyle = platform.name === 'Safari' ? { lineBreak: 'strict' } : {}
    Object.assign(div.style, safariStyle)
    div.style.writingMode = config.styles.writingMode
    let { widthLimit } = config
    const { scale, height } = config.styles
    if (this.vertical) {
      div.style.width = 'max-content'
      div.style.height = widthLimit === -1 ? 'max-content' : `${widthLimit / config.styles.scale}px`
    } else {
      div.style.width = widthLimit === -1 ? 'max-content' : `${widthLimit / config.styles.scale}px`
      div.style.height = 'max-content'
    }
    await this.waitForRender(div)

    // Add width limit to try to fit element height with config height.
    const heightLimit = height / scale
    const target = this.vertical ? 'height' : 'width'
    let resizeTimes = 1
    while (widthLimit !== -1 && resizeTimes < 100 &&
      Math.abs(div.clientHeight - heightLimit) > 5 * scale) {
      resizeTimes++
      if (div.clientHeight > heightLimit) {
        widthLimit += scale * resizeTimes
      } else {
        widthLimit -= scale * resizeTimes
      }
      div = div.cloneNode(true) as HTMLDivElement
      div.style[target] = `${widthLimit / scale}px`
      await this.waitForRender(div)
    }

    this.bodyRect = div.getClientRects()[0]
    this.width = this.bodyRect.width
    this.height = this.bodyRect.height
    this.transform = this.vertical ? 'rotate(90) scale(1,-1)' : ''
    this.rows = []

    for (const p of div.children) {
      const fontSize = parseFloat((p as HTMLElement).style.fontSize)
      const letterSpacingEm = parseFloat((p as HTMLElement).style.letterSpacing)
      const lineHeight = parseFloat((p as HTMLElement).style.lineHeight)
      const letterSpacing = fontSize * letterSpacingEm
      for (const span of p.children) {
        for (const cr of span.getClientRects()) {
          // If span is fixedWidth, its display will be inline-block
          // Height of inline-block span will grow with lineHeight
          // Here calc height and y without inline-block effect
          // For vertical text, modify width&x instead of height&y
          const isInlineBolck = (span as HTMLElement).style.display === 'inline-block'
          let { width, height, y, x } = cr
          if (isInlineBolck && this.vertical) {
            width = width / lineHeight * 1.4
            x = cr.x + (cr.width - width) / 2
          } else if (isInlineBolck) {
            height = height / lineHeight * 1.4
            y = cr.y + (cr.height - height) / 2
          }
          this.rows.push({
            rect: cr,
            spanData: [{
              x,
              y,
              width,
              height,
              text: span.textContent ?? '',
              letterSpacing
            }]
          })
        }
      }
    }
  }

  // Exchange x, y coordinate, used when text vertical.
  xyExchange() {
    const { rows, bodyRect } = this
    Object.assign(bodyRect, {
      x: bodyRect.y,
      y: bodyRect.x,
      width: bodyRect.height,
      height: bodyRect.width
    })
    rows.forEach((row) => {
      const { rect, spanData } = row
      Object.assign(rect, {
        x: rect.y,
        y: rect.x,
        width: rect.height,
        height: rect.width
      })
      spanData.forEach(data => {
        [data.x, data.y, data.height, data.width] = [data.y, data.x, data.width, data.height]
      })
    })
  }

  // Merge Rect if at the same line.
  mergeLine() {
    const { rows } = this
    rows.forEach((row, index) => {
      const nextIndex = index + 1
      while (nextIndex < rows.length) {
        const curr = row.rect
        const next = rows[nextIndex].rect
        const currTop = curr.y
        const currBottom = curr.y + curr.height
        const nextTop = next.y
        const nextBottom = next.y + next.height
        if (((nextTop <= currTop && currTop <= nextBottom &&
          nextTop <= currBottom && currBottom <= nextBottom) ||
          (currTop <= nextTop && nextTop <= currBottom &&
            currTop <= nextBottom && nextBottom <= currBottom))) {
          curr.y = Math.min(curr.y, next.y)
          curr.width += next.width
          curr.height = Math.max(curr.height, next.height)
          row.spanData = row.spanData.concat(rows[nextIndex].spanData)
          rows.splice(nextIndex, 1)
        } else break
      }
    })
  }

  // Expend empty line width as neibor.
  expandEmptyLine() {
    const { rows, bodyRect } = this
    const defaultLine = {
      rect: { x: bodyRect.x, width: bodyRect.width },
      spanData: []
    }
    rows.forEach((row, index) => {
      const { rect } = row
      if (rect.width < 1) {
        let nextIndex = index + 1
        while (nextIndex < rows.length && rows[nextIndex].rect.width < 1) nextIndex++
        const next = rows[nextIndex] ?? defaultLine
        const prev = rows[index - 1] ?? defaultLine
        const target = (prev.rect.width < next.rect.width) ? prev : next
        rect.x = target.rect.x
        rect.width = target.rect.width
        row.spanData = []
      }
    })
  }

  // Coordinate initial, use bodyRect as origin.
  coordinateInit() {
    const { rows, bodyRect } = this
    rows.forEach((row) => {
      const { rect } = row
      rect.x -= bodyRect.x
      rect.y -= bodyRect.y
      row.spanData.forEach((span) => {
        span.x -= bodyRect.x
        span.y -= bodyRect.y
      })
    })
  }

  preprocess() {
    const { vertical } = this
    if (vertical) this.xyExchange()
    this.mergeLine()
    this.expandEmptyLine()
    this.coordinateInit()
  }

  get() {
    const { vertical, width, height, transform, rows } = this
    return {
      vertical,
      width,
      height,
      transform,
      rows,
      rects: _.map(rows, 'rect')
    }
  }
}

// For text effect gooey
export class Path {
  pathArray = [] as string[]
  pointArray = [] as Point[]
  currPos: Point
  constructor(p: Point) {
    this.currPos = p
    this.pointArray.push(this.currPos)
    this.pathArray.push(`M${p}`)
  }

  L(end: Point): void {
    if (this.currPos.dist(end) < 0.1) return
    this.currPos = end
    this.pointArray.push(this.currPos)
    this.pathArray.push(`L${end}`)
  }

  C(c1: Point, c2: Point, end: Point): void {
    if (this.currPos.dist(end) < 0.1) return
    this.currPos = end
    this.pointArray.push(this.currPos)
    this.pathArray.push(`C${c1} ${c2} ${end}`)
  }

  v(dist: number): void {
    this.currPos = this.currPos.add(new Point(0, dist))
    this.pointArray.push(this.currPos)
    this.pathArray.push(`v${dist}`)
  }

  h(dist: number): void {
    this.currPos = this.currPos.add(new Point(dist, 0))
    this.pointArray.push(this.currPos)
    this.pathArray.push(`h${dist}`)
  }

  l(x: number, y: number): void {
    this.currPos = this.currPos.add(new Point(x, y))
    this.pointArray.push(this.currPos)
    this.pathArray.push(`l${x} ${y}`)
  }

  a(rx: number, ry: number, sweepFlag: number, x: number, y: number): void {
    this.currPos = this.currPos.add(new Point(x, y))
    this.pointArray.push(this.currPos)
    this.pathArray.push(`a${rx} ${ry} 0 0${sweepFlag}${x} ${y}`)
  }

  result(): string {
    return this.pathArray.join('') + 'z'
  }

  toCircle(): { tag: string, attrs: { cx: number, cy: number, r: string, fill: string } }[] {
    return this.pointArray.map(p => {
      return {
        tag: 'circle',
        attrs: {
          cx: p.x,
          cy: p.y,
          r: '5',
          fill: 'red'
        }
      }
    })
  }
}

class Gooey {
  controlPoints = [[], []] as { top: Point, bottom: Point, oldHeight: number }[][]
  bRadius: number
  constructor(textBg: ITextGooey, rects: DOMRect[]) {
    this.bRadius = textBg.bRadius
    const first = rects[0]
    this.controlPoints[0].push({
      top: new Point(first.x + first.width, first.y),
      bottom: new Point(first.x + first.width, first.y),
      oldHeight: first.height
    })
    this.controlPoints[1].push({
      top: new Point(first.x, first.y),
      bottom: new Point(first.x, first.y),
      oldHeight: first.height
    })
    rects.forEach((rect: DOMRect) => {
      this.controlPoints[0].push({
        top: new Point(rect.x, rect.y),
        bottom: new Point(rect.x, rect.y + rect.height),
        oldHeight: rect.height
      })
      this.controlPoints[1].push({
        top: new Point(rect.x + rect.width, rect.y),
        bottom: new Point(rect.x + rect.width, rect.y + rect.height),
        oldHeight: rect.height
      })
    })
    const last = (_.nth(rects, -1) as DOMRect)
    this.controlPoints[0].push({
      top: new Point(last.x + last.width, last.y + last.height),
      bottom: new Point(last.x + last.width, last.y + last.height),
      oldHeight: last.height
    })
    this.controlPoints[1].push({
      top: new Point(last.x, last.y + last.height),
      bottom: new Point(last.x, last.y + last.height),
      oldHeight: last.height
    })
  }

  // Merge the area that two Rects overlap.
  merge() {
    this.controlPoints[0].forEach((cps, index, arr) => {
      if (index === 0 || index === arr.length - 1 || index === arr.length - 2) return
      const cpsNext = this.controlPoints[0][index + 1]
      const newY = Math.abs(cps.bottom.x - cpsNext.top.x) < 10 ? (cps.bottom.y + cpsNext.top.y) / 2
        : cps.bottom.x < cpsNext.top.x ? cps.bottom.y : cpsNext.top.y
      cps.bottom.y = cpsNext.top.y = newY
    })
    this.controlPoints[1].forEach((cps, index, arr) => {
      if (index === 0 || index === arr.length - 1 || index === arr.length - 2) return
      const cpsNext = this.controlPoints[1][index + 1]
      const newY = Math.abs(cps.bottom.x - cpsNext.top.x) < 10 ? (cps.bottom.y + cpsNext.top.y) / 2
        : cps.bottom.x > cpsNext.top.x ? cps.bottom.y : cpsNext.top.y
      cps.bottom.y = cpsNext.top.y = newY
    })
  }

  // Delete Rect if its top below bottom after merge.
  delete() {
    let count = 0
    this.controlPoints.forEach(side => {
      for (let i = 1; i < side.length - 1;) {
        const cps = side[i]
        if (side.length > 3 && cps.bottom.y - cps.top.y < cps.oldHeight * 0.1) {
          side.splice(i, 1)
          count++
        } else i++
      }
    })
    return count
  }

  // Keep doing merge and delete until nothing to delete.
  preprocess() {
    do {
      this.merge()
    } while (this.delete())
  }

  // Return svg path
  process() {
    const bRadius = this.bRadius
    let path = null as unknown as Path
    let ps = this.controlPoints[0]
    for (let i = 1; i < ps.length - 1; i++) {
      const curr = ps[i]
      const prev = ps[i - 1]
      const prevMiddle = prev.bottom.middle(curr.top)
      const next = ps[i + 1]
      const nextMiddle = curr.bottom.middle(next.top)
      const radius = Math.min(curr.oldHeight * bRadius * 0.005, curr.top.dist(curr.bottom) / 2)
      const dirTop = (prev.bottom.x < curr.top.x ? -1 : 1)
      const radiusTop = Math.min(radius, curr.top.dist(prevMiddle)) * dirTop

      if (i === 1) {
        path = new Path(prevMiddle)
      }

      const curveTopStart = curr.top.add({ x: radiusTop, y: 0 })
      const curveTopEnd = curr.top.add({ x: 0, y: radius })
      let curveTopStartMiddle = curr.top.middle(curveTopStart)
      const curveTopEndMiddle = curr.top.middle(curveTopEnd)
      let angle = Math.abs(Math.atan(radiusTop / radius) * (180 / Math.PI))
      curveTopStartMiddle = obj2Point(mathUtils.getRotatedPoint(
        (angle * 2 - 90) * dirTop,
        curveTopStart, curveTopStartMiddle
      ))
      path.L(curveTopStart)
      path.C(curveTopStartMiddle, curveTopEndMiddle, curveTopEnd)

      const dirBottom = (curr.bottom.x < next.top.x ? 1 : -1)
      const radiusBottom = Math.min(radius, curr.bottom.dist(nextMiddle)) * dirBottom
      const curveBottomStart = curr.bottom.add({ x: 0, y: -radius })
      const curveBottomEnd = curr.bottom.add({ x: radiusBottom, y: 0 })
      const curveBottomStartMiddle = curr.bottom.middle(curveBottomStart)
      let curveBottomEndMiddle = curr.bottom.middle(curveBottomEnd)
      angle = Math.abs(Math.atan(radiusBottom / radius) * (180 / Math.PI))
      curveBottomEndMiddle = obj2Point(mathUtils.getRotatedPoint(
        (90 - angle * 2) * dirBottom,
        curveBottomEnd, curveBottomEndMiddle
      ))
      path.L(curveBottomStart)
      path.C(curveBottomStartMiddle, curveBottomEndMiddle, curveBottomEnd)
    }
    ps = this.controlPoints[1]
    for (let i = ps.length - 2; i > 0; i--) {
      const curr = ps[i]
      const prev = ps[i - 1]
      const prevMiddle = prev.bottom.middle(curr.top)
      const next = ps[i + 1]
      const nextMiddle = curr.bottom.middle(next.top)
      const radius = Math.min(curr.oldHeight * bRadius * 0.005, curr.top.dist(curr.bottom) / 2)
      const dirBottom = (curr.bottom.x < next.top.x ? 1 : -1)
      const radiusBottom = Math.min(radius, curr.bottom.dist(nextMiddle)) * dirBottom

      const curveBottomStart = curr.bottom.add({ x: radiusBottom, y: 0 })
      const curveBottomEnd = curr.bottom.add({ x: 0, y: -radius })
      let curveBottomStartMiddle = curr.bottom.middle(curveBottomStart)
      const curveBottomEndMiddle = curr.bottom.middle(curveBottomEnd)
      let angle = Math.abs(Math.atan(radiusBottom / radius) * (180 / Math.PI))
      curveBottomStartMiddle = obj2Point(mathUtils.getRotatedPoint(
        (90 - angle * 2) * dirBottom,
        curveBottomStart, curveBottomStartMiddle
      ))
      path.L(curveBottomStart)
      path.C(curveBottomStartMiddle, curveBottomEndMiddle, curveBottomEnd)

      const dirTop = (prev.bottom.x < curr.top.x ? -1 : 1)
      const radiusTop = Math.min(radius, curr.top.dist(prevMiddle)) * dirTop
      const curveTopStart = curr.top.add({ x: 0, y: radius })
      const curveTopEnd = curr.top.add({ x: radiusTop, y: 0 })
      const curveTopStartMiddle = curr.top.middle(curveTopStart)
      let curveTopEndMiddle = curr.top.middle(curveTopEnd)
      angle = Math.abs(Math.atan(radiusTop / radius) * (180 / Math.PI))
      curveTopEndMiddle = obj2Point(mathUtils.getRotatedPoint(
        (angle * 2 - 90) * dirTop,
        curveTopEnd, curveTopEndMiddle
      ))
      path.L(curveTopStart)
      path.C(curveTopStartMiddle, curveTopEndMiddle, curveTopEnd)
    }

    return path.result()
  }

  // For debug
  toCircle() {
    const circle = [] as Record<string, unknown>[]
    this.controlPoints.forEach(side => {
      side.forEach(cps => {
        circle.push({
          tag: 'circle',
          attrs: {
            cx: cps.top.x,
            cy: cps.top.y,
            r: '5',
            fill: 'red'
          }
        })
        circle.push({
          tag: 'circle',
          attrs: {
            cx: cps.bottom.x,
            cy: cps.bottom.y,
            r: '5',
            fill: 'blue'
          }
        })
      })
    })
    return circle
  }
}

function getLetterBgSetting(textBg: ITextLetterBg, index: number) {
  let [href, color] = [textBg.name as string, textBg.color]
  switch (textBg.name) {
    case 'rainbow':
      href = 'rainbow-circle'
      color = ['#FFA19B', '#FFC89F', '#F7DE97', '#C5DFAE', '#B5D0F9', '#EDD4F6'][index % 6]
      break
    case 'rainbow-dark':
      href = 'rainbow-circle'
      color = ['#D0B0B1', '#DCC9BF', '#EBDEBB', '#BECBBC', '#B0BCC5', '#D1CADF'][index % 6]
      break
    case 'circle':
      href = 'rainbow-circle'
      break
    case 'cloud':
      href = `cloud${index % 4}`
      break
    case 'penguin':
      href = `penguin${index % 5}`
      break
    case 'planet':
      href = `planet${index % 5}`
      break
    case 'heart':
      href = 'solid-heart'
      color = ['#BFE29A', '#ABDAED', '#FFBDC5', '#FFE299', '#CDBFDD', '#9BBCDD', '#F2C3AF'][index % 7]
      break
    case 'heart-warm':
      href = 'solid-heart'
      color = ['#9B5642', '#E48479', '#F7C3B0', '#D6805B', '#D45847', '#FAAE9F', '#F7C3B0'][index % 7]
      break
    case 'heart-custom':
      href = 'solid-heart'
      break
    case 'gummybear':
      href = `gummybear${index % 5}`
      break
    case 'leaf':
      href = `leaf${index % 5}`
      break
    case 'butter-flower':
      href = `butter-flower${index % 5}`
      break
    case 'flower-frame':
      href = `flower-frame${index % 5}`
      color = ['#F4D0E0', '#BDDBD0', '#D9CCED', '#C7DAEF', '#F4CAC1'][index % 5]
      break
    case 'flower-frame-custom':
      href = `flower-frame${index % 5}`
      break
    case 'vintage-flower':
      color = ['#E8A98E', '#EE8854', '#F3B132', '#94A084', '#B17357'][index % 5]
      break
    case 'cat-paw':
      href = `cat-paw${index % 5}`
      break
    case 'bread':
      href = `bread${index % 5}`
      break
    default: // text-book
  }
  return { href, color }
}

class TextBg {
  private currColorKey = ''
  effects = {} as Record<string, Record<string, string | number | boolean>>
  constructor() {
    this.effects = this.getDefaultEffects()
  }

  rgba = (color: string, opacity: number) =>
    textEffectUtils.convertColor2rgba(color, opacity)

  getDefaultEffects() {
    const letterBGDefault = {
      xOffset200: 0,
      yOffset200: 0,
      size: 100,
      opacity: 100,
      fixedWidth: true,
      color: '', // no effect
    } as const

    return {
      none: {},
      'square-borderless': {
        opacity: 100,
        bStroke: 0, // unadjustable
        bRadius: 0, // unadjustable
        bColor: 'transparent', // unadjustable
        pStrokeX: 20, // unadjustable in all effects in all effects
        pStrokeY: 20,
        pColor: 'fontColorL+-40/BC/00'
      },
      'rounded-borderless': {
        opacity: 100,
        bStroke: 0, // unadjustable
        bRadius: 35,
        bColor: 'transparent', // unadjustable
        pStrokeX: 20, // unadjustable in all effects
        pStrokeY: 20,
        pColor: 'fontColorL+-40/BC/00'
      },
      'square-hollow': {
        opacity: 100,
        bStroke: 8,
        bRadius: 0, // unadjustable
        bColor: 'fontColorL+-40/BC/00',
        pStrokeX: 20, // unadjustable in all effects
        pStrokeY: 10, // unadjustable
        pColor: 'transparent' // unadjustable
      },
      'rounded-hollow': {
        opacity: 100,
        bStroke: 8,
        bRadius: 35,
        bColor: 'fontColorL+-40/BC/00',
        pStrokeX: 20, // unadjustable in all effects
        pStrokeY: 10, // unadjustable
        pColor: 'transparent' // unadjustable
      },
      'square-both': {
        opacity: 100,
        bStroke: 8,
        bRadius: 0, // unadjustable
        bColor: 'fontColor',
        pStrokeX: 20, // unadjustable in all effects
        pStrokeY: 10,
        pColor: 'fontColorL+-40/BC/00'
      },
      'rounded-both': {
        opacity: 100,
        bStroke: 8,
        bRadius: 35,
        bColor: 'fontColor',
        pStrokeX: 20, // unadjustable in all effects
        pStrokeY: 10,
        pColor: 'fontColorL+-40/BC/00'
      },
      underline: {
        endpoint: 'rounded',
        height: 20,
        yOffset: 10,
        opacity: 100,
        color: 'fontColorL+-40/F1D289'
      },
      gooey: {
        distance: 20,
        bRadius: 40,
        opacity: 100,
        color: 'fontColorL+-40/BC/00'
      },
      // A part of additional default ITextLetterBg setting is in setExtraDefaultAttrs func.
      rainbow: letterBGDefault,
      'rainbow-dark': letterBGDefault,
      circle: {
        ...letterBGDefault,
        color: '#EEDFD1',
      },
      cloud: {
        ...letterBGDefault,
        size: 180,
        fixedWidth: false, //!
        color: '#D3E2E3',
      },
      'text-book': {
        ...letterBGDefault,
        size: 125,
        color: '#93BAA6',
      },
      penguin: {
        ...letterBGDefault,
        yOffset200: -1,
        size: 200,
      },
      planet: {
        ...letterBGDefault,
        size: 135,
      },
      heart: {
        ...letterBGDefault,
        yOffset200: -3,
        size: 135,
      },
      'heart-warm': {
        ...letterBGDefault,
        yOffset200: -3,
        size: 135,
      },
      'heart-custom': {
        ...letterBGDefault,
        yOffset200: -3,
        size: 135,
        color: '#FFB6C4',
      },
      gummybear: {
        ...letterBGDefault,
        yOffset200: -15,
        size: 150,
      },
      leaf: {
        ...letterBGDefault,
        yOffset200: -7,
        size: 165,
      },
      'butter-flower': {
        ...letterBGDefault,
        size: 140,
        color: '#F4E4BD'
      },
      'flower-frame': {
        ...letterBGDefault,
        size: 140,
      },
      'flower-frame-custom': {
        ...letterBGDefault,
        size: 140,
        color: '#BDDBD0'
      },
      'vintage-flower': {
        ...letterBGDefault,
        yOffset200: -3,
        size: 160,
      },
      'vintage-flower-custom': {
        ...letterBGDefault,
        yOffset200: -3,
        size: 130,
        color: '#E8A98E'
      },
      'cat-paw': {
        ...letterBGDefault,
        size: 135,
      },
      bread: {
        ...letterBGDefault,
        size: 155,
      },
    }
  }

  async setExtraDefaultAttrs(name: string) {
    const defaultAttrs = {
      rainbow: { lineHeight: 1.78, fontSpacing: 585 },
      'rainbow-dark': { lineHeight: 1.78, fontSpacing: 585 },
      circle: { lineHeight: 1.78, fontSpacing: 585 },
      cloud: { lineHeight: 1.54, fontSpacing: 186 },
      'text-book': { lineHeight: 1.96, fontSpacing: 665 },
      penguin: { lineHeight: 1.96, fontSpacing: 800 },
      planet: { lineHeight: 1.96, fontSpacing: 410 },
      heart: { lineHeight: 1.96, fontSpacing: 505 },
      'heart-warm': { lineHeight: 1.96, fontSpacing: 505 },
      'heart-custom': { lineHeight: 1.96, fontSpacing: 505 },
      gummybear: { lineHeight: 1.96, fontSpacing: 800 },
      leaf: { lineHeight: 1.96, fontSpacing: 800 },
      'butter-flower': { lineHeight: 1.96, fontSpacing: 900 },
      'flower-frame': { lineHeight: 1.96, fontSpacing: 950 },
      'flower-frame-custom': { lineHeight: 1.96, fontSpacing: 950 },
      'vintage-flower': { lineHeight: 1.96, fontSpacing: 1300 },
      'vintage-flower-custom': { lineHeight: 1.96, fontSpacing: 950 },
      'cat-paw': { lineHeight: 1.96, fontSpacing: 950 },
      bread: { lineHeight: 1.96, fontSpacing: 1200 },
    } as Record<string, Record<'lineHeight' | 'fontSpacing', number>>

    for (const [key, val] of Object.entries(defaultAttrs[name] ?? {})) {
      await textUtils.setParagraphProp(key as 'lineHeight' | 'fontSpacing', val)
    }
  }

  inlineSvg(svg: string) {
    return svg.replace(/\n[ ]*/g, '').replace(/#/g, '%23')
  }

  convertTextEffect(styles: IStyle) { // to-delete
    const effect = styles.textBg as ITextBgEffect
    if (!isITextBox(effect)) return {}
  }

  fixedWidthStyle(spanStyle: ISpanStyle, pStyle: IParagraphStyle, config: IText) {
    let [w, h] = ['min-width', 'min-height']
    if (config.styles.writingMode === 'vertical-lr') [w, h] = [h, w]
    // If tiptap attr have min-w/h, convertFontStyle() in cssConverter.ts will add some style to tiptap.
    return {
      [w]: `${spanStyle.size * 1.333333 * (pStyle.fontSpacing + 1)}px`,
      display: 'inline-block',
      letterSpacing: 0,
      textAlign: 'center',
    }
  }

  async drawSvgBg(config: IText): Promise<textBgSvg | null> {
    const textBg = config.styles.textBg
    if (textBg.name === 'none') return null

    const opacity = textBg.opacity * 0.01
    const fontSizeModifier = textEffectUtils.getLayerFontSize(config.paragraphs) / 60
    const myRect = new Rect()
    await myRect.init(config, { splitSpan: isITextLetterBg(textBg) })
    myRect.preprocess()
    const { vertical, width, height, transform, rects, rows } = myRect.get()

    if (isITextGooey(textBg)) {
      const padding = textBg.distance * fontSizeModifier
      const color = textEffectUtils.colorParser(textBg.color, config)
      const fill = this.rgba(color, opacity)

      // Add padding.
      rects.forEach((rect: DOMRect) => {
        rect.x -= padding
        rect.y -= padding
        rect.width += padding * 2
        rect.height += padding * 2
      })

      const cps = new Gooey(textBg, rects)
      cps.preprocess()
      const d = cps.process()

      return {
        attrs: { width, height, fill },
        content: [{
          tag: 'path',
          attrs: {
            d,
            transform
          }
        }]
        // .concat(cps.toCircle() as any) // Show control point
      }
    } else if (isITextUnderline(textBg)) {
      const color = textEffectUtils.colorParser(textBg.color, config)
      const fill = this.rgba(color, opacity)
      const paths = [] as textBgSvg['content']
      rects.forEach(rect => {
        const capWidth = rect.height * 0.005 * textBg.height
        const yOffset = (rect.height - capWidth * 2) * 0.01 * (100 - textBg.yOffset)
        const path = new Path(new Point(rect.x + capWidth, rect.y + yOffset))

        switch (textBg.endpoint) {
          case 'triangle':
            path.h(rect.width - capWidth)
            path.l(-capWidth, capWidth * 2)
            path.h(-(rect.width - capWidth))
            break
          case 'rounded':
            path.a(1, 1, 0, 0, capWidth * 2)
            path.h(rect.width - capWidth * 2)
            path.a(1, 1, 0, 0, -capWidth * 2)
            break
          case 'square':
            path.h(rect.width - capWidth)
            path.v(capWidth * 2)
            path.h(-rect.width)
            path.v(-capWidth * 2)
            break
        }

        paths.push({
          tag: 'path',
          attrs: {
            d: path.result(),
            transform
          }
        })
        // paths.push(...path.toCircle()) // Show control point
      })

      return {
        attrs: { width, height, fill },
        content: paths
      }
    } else if (isITextBox(textBg)) {
      const pColor = textEffectUtils.colorParser(textBg.pColor, config)
      const bColor = textEffectUtils.colorParser(textBg.bColor, config)
      const bStroke = textBg.bStroke * fontSizeModifier
      const pStrokeY = textBg.pStrokeY * fontSizeModifier
      const pStrokeX = textBg.pStrokeX * fontSizeModifier
      let boxWidth = (width + bStroke)
      let boxHeight = (height + bStroke)
      let top = -bStroke
      let left = -bStroke
      if (vertical) {
        boxWidth += pStrokeY * 2
        boxHeight += pStrokeX * 2
        top -= pStrokeX
        left -= pStrokeY
      } else {
        boxWidth += pStrokeX * 2
        boxHeight += pStrokeY * 2
        top -= pStrokeY
        left -= pStrokeX
      }
      const boxRadius = Math.min(boxWidth / 2, boxHeight / 2) * textBg.bRadius * 0.01

      const path = new Path(new Point(bStroke / 2, bStroke / 2 + boxRadius))
      path.a(boxRadius, boxRadius, 1, boxRadius, -boxRadius)
      path.h(boxWidth - boxRadius * 2)
      path.a(boxRadius, boxRadius, 1, boxRadius, boxRadius)
      path.v(boxHeight - boxRadius * 2)
      path.a(boxRadius, boxRadius, 1, -boxRadius, boxRadius)
      path.h(-(boxWidth - boxRadius * 2))
      path.a(boxRadius, boxRadius, 1, -boxRadius, -boxRadius)

      return {
        attrs: {
          width: boxWidth + bStroke,
          height: boxHeight + bStroke,
          style: `left: ${left}px;
            top: ${top}px;`
        },
        content: [{
          tag: 'path',
          attrs: {
            style: `fill:${pColor}; stroke:${bColor}; opacity:${opacity}`,
            'stroke-width': bStroke,
            d: path.result()
          }
        }]
        // .concat(path.toCircle() as any) // Show control point
      }
    } else if (isITextLetterBg(textBg)) {
      const scale = textBg.size / 100
      let { xOffset200: xOffset, yOffset200: yOffset } = textBg
      if (vertical) [xOffset, yOffset] = [yOffset, xOffset]

      const pos = [] as (Record<'x' | 'y' | 'width' | 'height', number> & Record<'color' | 'href', string>)[]
      let i = 0
      rows.forEach((row) => {
        row.spanData.forEach((span) => {
          const { x, y, width, height, text } = span
          if (text !== ' ') {
            pos.push({
              ...getLetterBgSetting(textBg, i),
              // 1. Because all letter svg width = height, so need to -(h-w)/2
              // 2. For non-fixedWidth text, since we put svg at center of letter, and a letter contain its letterSpacing.
              // We need to -letterSpacing/2 to put svg at center of letter not contain letterSpacing.
              x: x - (height - width) / 2 - (!textBg.fixedWidth ? span.letterSpacing / 2 : 0),
              y,
              width,
              height,
            })
            i += 1
          }
        })
      })

      return {
        attrs: { width, height, style: `opacity: ${opacity}` },
        content: pos.map(p => {
          let x = p.x - (scale - 1) * p.height / 2 + p.width * xOffset / 100
          let y = p.y - (scale - 1) * p.height / 2 + p.height * yOffset / 100
          if (vertical) [x, y] = [y, x]
          return {
            tag: 'use',
            attrs: {
              href: `#${p.href}`,
              width: p.height * scale,
              height: p.height * scale,
              // Scale will let width be (scale-1)*p.height times larger than before,
              // So -(scale-1)*p.height/2 to justify it to center.
              x,
              y,
              style: `color: ${p.color}`
            }
          }
        })
      }
    } else return null
  }

  setColorKey(key: string) {
    this.currColorKey = key
  }

  setColor(color: string) {
    const effectName = textEffectUtils.getCurrentLayer().styles.textBg.name
    this.setTextBg(effectName, { [this.currColorKey]: color })
  }

  get currColor(): string {
    return (textEffectUtils.getCurrentLayer().styles.textBg as Record<string, string>)[this.currColorKey]
  }

  getEffectMainColor(effect: ITextBgEffect) {
    if (isITextBox(effect) &&
      ['square-hollow', 'rounded-hollow'].includes(effect.name)) {
      return ['bColor', effect.bColor]
    } else if (isITextBox(effect)) { // Non-hollow text box
      return ['pColor', effect.pColor]
    } else if (isITextGooey(effect) || isITextUnderline(effect)) {
      return ['color', effect.color]
    } else {
      return ['color', (effect as unknown as { color: string }).color || '']
    }
  }

  // Read/write text effect setting from local storage
  syncShareAttrs(textBg: ITextBgEffect, effectName: string | null) {
    Object.assign(textBg, { name: textBg.name || effectName })
    if (textBg.name === 'none') return

    const shareAttrs = (localStorageUtils.get('textEffectSetting', 'textBgShare') ?? {}) as Record<string, string>
    const newShareAttrs = { opacity: textBg.opacity }
    const newEffect = { opacity: shareAttrs.opacity }
    if (isITextBox(textBg) &&
      ['square-hollow', 'rounded-hollow', 'square-both', 'rounded-both'].includes(textBg.name)) {
      Object.assign(newShareAttrs, { bStroke: textBg.bStroke })
      Object.assign(newEffect, { bStroke: shareAttrs.bStroke })
    }

    // If effectName is null, overwrite share attrs. Otherwise, read share attrs and set to effect.
    if (!effectName) {
      Object.assign(shareAttrs, newShareAttrs)
      localStorageUtils.set('textEffectSetting', 'textBgShare', shareAttrs)
    } else {
      let effect = (localStorageUtils.get('textEffectSetting', effectName) ?? {}) as Record<string, string>
      Object.assign(effect, newEffect)
      effect = _.omit(effect, ['color', 'pColor', 'bColor'])
      localStorageUtils.set('textEffectSetting', effectName, effect)
    }
  }

  async setTextBg(effect: string, attrs?: Record<string, string | number | boolean>): Promise<void> {
    const { index: layerIndex, pageIndex } = store.getters.getCurrSelectedInfo
    const targetLayer = store.getters.getLayer(pageIndex, layerIndex)
    const layers = targetLayer.layers ? targetLayer.layers : [targetLayer]
    const subLayerIndex = layerUtils.subLayerIdx
    const defaultAttrs = this.effects[effect]

    for (const idx in layers) {
      if (subLayerIndex !== -1 && +idx !== subLayerIndex) continue

      const { type, styles: { textBg: layerTextBg } } = layers[idx] as IText
      if (type === 'text') {
        const textBg = {} as ITextBgEffect

        // Set lineHeight and fontSpacing by call tiptap
        for (const [key, val] of Object.entries(attrs ?? {})) {
          if (['lineHeight', 'fontSpacing'].includes(key)) {
            await textUtils.setParagraphProp(key as 'lineHeight' | 'fontSpacing', val as number)
            return
          }
        }

        if (layerTextBg && layerTextBg.name === effect) { // Adjust effect option.
          Object.assign(textBg, layerTextBg, attrs)
          localStorageUtils.set('textEffectSetting', effect, textBg)
          this.syncShareAttrs(textBg, null)
        } else { // Switch to other effect.
          this.syncShareAttrs(textBg, effect)
          const localAttrs = localStorageUtils.get('textEffectSetting', effect)
          Object.assign(textBg, defaultAttrs, localAttrs, attrs, { name: effect })
          await this.setExtraDefaultAttrs(effect)

          // Sync setting between different name effect:
          // Bring original effect color to new effect.
          const oldColor = this.getEffectMainColor(layerTextBg)[1]
          const newColorKey = this.getEffectMainColor(textBg)[0]
          if (oldColor.startsWith('#') && !(isITextLetterBg(textBg) || isITextLetterBg(layerTextBg))) {
            Object.assign(textBg, { [newColorKey]: oldColor })
          }
          // Sync setting between TextLetterBg: rainbow, rainbow-dark, circle
          if (isITextLetterBg(textBg) && isITextLetterBg(layerTextBg) && textBg.name !== layerTextBg.name &&
            ['rainbow', 'rainbow-dark', 'circle'].includes(textBg.name) &&
            ['rainbow', 'rainbow-dark', 'circle'].includes(layerTextBg.name)) {
            Object.assign(textBg, layerTextBg, { name: textBg.name, color: textBg.color })
          }
        }

        store.commit('UPDATE_specLayerData', {
          pageIndex,
          layerIndex,
          subLayerIndex: +idx,
          styles: { textBg }
        })

        // If fixedWidth setting changed, force split/unsplit span text
        const oldFixedWidth = isITextLetterBg(layerTextBg) && layerTextBg.fixedWidth
        const newFixedWidth = isITextLetterBg(textBg) && textBg.fixedWidth
        if (oldFixedWidth !== newFixedWidth) {
          const paragraphs = cloneDeep(layers[idx].paragraphs as IParagraph[])
          if (newFixedWidth) { // Split span, another one in tiptapUtils.toIParagraph
            paragraphs.forEach(p => {
              const newSpans = p.spans.flatMap(span =>
                textUtils.splitter.splitGraphemes(span.text)
                  .map(t => ({ text: t, styles: cloneDeep(span.styles) }))
              )
              p.spans = newSpans.length !== 0 ? newSpans : p.spans
            })
          } else { // Merge span
            paragraphs.forEach(p => {
              for (let i = 0; i + 1 < p.spans.length;) {
                const curr = p.spans[i]
                const next = p.spans[i + 1]
                if (isEqual(curr.styles, next.styles)) {
                  curr.text += next.text
                  p.spans.splice(i + 1, 1)
                } else { i++ }
              }
            })
          }

          layerUtils.updateLayerProps(pageIndex, layerIndex, { paragraphs },
            targetLayer.layers ? +idx : subLayerIndex
          )
          tiptapUtils.updateHtml() // Vuex config => tiptap
          textUtils.updateTextLayerSizeByShape(pageIndex, layerIndex,
            targetLayer.layers ? +idx : subLayerIndex
          )

          // When fixedWith true => false, this can force tiptap merge span that have same attrs.
          if (document.querySelector('.ProseMirror') && !newFixedWidth) {
            tiptapUtils.agent((editor: Editor) => {
              editor.commands.selectAll()
              editor.chain().updateAttributes('textStyle', { randomId: -1 }).run()
            })
          }
        }

        // If user leave LetterBg, reset lineHeight and fontSpacing
        if (isITextLetterBg(layerTextBg) && !isITextLetterBg(textBg)) {
          await textUtils.setParagraphProp('lineHeight', 1.4)
          await textUtils.setParagraphProp('fontSpacing', 0)
        }
      }
    }
  }

  resetCurrTextEffect() {
    const effectName = textEffectUtils.getCurrentLayer().styles.textBg.name
    this.setTextBg(effectName, this.effects[effectName])
    this.setExtraDefaultAttrs(effectName)
  }
}

const textBgUtils = new TextBg()
export default textBgUtils
