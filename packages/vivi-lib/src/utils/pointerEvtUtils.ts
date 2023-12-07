import store from '@/store'

class PointerEventUtils {
  // this utils used for tracing pinters for pointerdown event
  private _pointers: Array<PointerEvent> = []

  get pointers(): Array<PointerEvent> {
    return this._pointers
  }

  get pointerIds(): Array<number> {
    return this._pointers.map(p => p.pointerId)
  }

  addPointer(pointer: PointerEvent) {
    if (!this.pointerIds.includes(pointer.pointerId)) {
      if (pointer.isPrimary && this._pointers.length >= 1) {
        this._pointers = []
      }
      this._pointers.push(pointer)
      // console.warn('record Pointer', this.pointers)
    }
  }

  removePointer(pointerId: number) {
    const i = this._pointers.findIndex(p => p.pointerId === pointerId)
    if (i !== -1) {
      this._pointers.splice(i, 1)
      // console.error('remvoe Pointer', pointerId, this.pointerIds)
      // if the there is no pointers stay on the screen,
      // reset the control state
      if (this._pointers.length === 0) {
        store.commit('SET_STATE', { controlState: { type: '' } })
      }
    }
  }
}
export default new PointerEventUtils()
