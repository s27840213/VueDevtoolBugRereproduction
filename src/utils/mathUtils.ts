import { IGroup, IStyle, ITextStyle, ITmp, ILayer } from '@/interfaces/layer'
import { IBounding } from '@/interfaces/math'
import store from '@/store'

class MathUtils {
  cos(angle: number) {
    const angleInRad = angle * Math.PI / 180
    return Math.cos(angleInRad)
  }

  sin(angle: number) {
    const angleInRad = angle * Math.PI / 180
    return Math.sin(angleInRad)
  }

  getCenter(styles: IStyle | ITextStyle) {
    return {
      x: styles.x + ((styles.width as number) / 2),
      y: styles.y + ((styles.height as number) / 2)
    }
  }

  getRotatedPoint(angle: number, origin: { x: number, y: number }, initPos: { x: number, y: number }) {
    const tempX = initPos.x - origin.x
    const tempY = initPos.y - origin.y
    return {
      x: origin.x + tempX * this.cos(angle) - tempY * this.sin(angle),
      y: origin.y + tempX * this.sin(angle) + tempY * this.cos(angle)
    }
  }

  getBounding(layer: ILayer | IGroup | ITmp): IBounding {
    const angle = layer.styles.rotate
    const origin = this.getCenter(layer.styles)
    const initStyles = { x: layer.styles.x, y: layer.styles.y, width: layer.styles.width, height: layer.styles.height }
    const points = [
      [initStyles.x, initStyles.y],
      [initStyles.x + initStyles.width, initStyles.y],
      [initStyles.x, initStyles.y + initStyles.height],
      [initStyles.x + initStyles.width, initStyles.y + initStyles.height]
    ]
    let minX = Number.MAX_SAFE_INTEGER
    let minY = Number.MAX_SAFE_INTEGER
    let maxX = Number.MIN_SAFE_INTEGER
    let maxY = Number.MIN_SAFE_INTEGER

    points.forEach((point: number[]) => {
      const tmp = this.getRotatedPoint(angle, origin, { x: point[0], y: point[1] })
      minX = Math.min(minX, tmp.x)
      minY = Math.min(minY, tmp.y)
      maxX = Math.max(maxX, tmp.x)
      maxY = Math.max(maxY, tmp.y)
    })

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  getActualMoveOffset(x: number, y: number) {
    const scaleRatio = store.getters.getPageScaleRatio
    return {
      offsetX: x * (100 / scaleRatio),
      offsetY: y * (100 / scaleRatio)
    }
  }

  multipy(multiplier: number, ...params: [string, number][] | number[]) {
    if (!params.length) return []

    try {
      const result = (params as any).map((el: number | [string, number]) => {
        if (typeof el === 'number') {
          return el * multiplier
        } else {
          const k = el[0] as string
          const v = el[1] as number
          return [k, v * multiplier]
        }
      })
      return Array.isArray(result[0]) ? Object.fromEntries(result as [string, number][]) : result
    } catch {
      console.error('input params with wrong types')
    }
  }
}

const mathUtils = new MathUtils()
export default mathUtils
