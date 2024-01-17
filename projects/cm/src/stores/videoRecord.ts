import { useEditorStore } from '@/stores/editor'
import PixiRecorder from '@/utils/pixiRecorder'
import generalUtils from '@nu/vivi-lib/utils/generalUtils'
import { defineStore } from 'pinia'

export interface IVideoRecordState {
  genVideoCb: null | (() => void)
  geningIdentifier: string
  isExportingVideo: boolean
}

const defaultState = {
  genVideoCb: null,
  geningIdentifier: '',
  isExportingVideo: false,
} as IVideoRecordState

const pixi = null as null | PixiRecorder

export const useVideoRcordStore = defineStore('videoRecord', {
  state: (): IVideoRecordState => ({ ...defaultState }),
  getters: {
    isGeningVideo: (state) => {
      return !!state.geningIdentifier
    },
  },
  actions: {
    addImage(img1: string, img2: string) {
      if (!pixi) {
        return (new PixiRecorder(img1, img2))
      }
      return pixi.addImage(img1, img2)
    },
    genVideo() {
      if (!pixi) throw new Error('pixi is undefined in genVideo')

      const currGeningId = generalUtils.generateRandomString(6)
      this.geningIdentifier = currGeningId
      const editorStore = useEditorStore()
      const { updateGenResult } = editorStore
      const { currGeneratedResult } = storeToRefs(editorStore)

      return pixi.genVideo().then((res) => {
        if (currGeningId !== this.geningIdentifier) return
        this.geningIdentifier = ''
        if (res) {
          if (currGeneratedResult.value && currGeneratedResult.value.id) {
            updateGenResult(currGeneratedResult.value.id, { video: { ...pixi.video } })
          }
          if (this.genVideoCb) {
            this.genVideoCb()
            this.genVideoCb = null
          }
        }
        return res
      })
    },
    saveToDevice(url?: string, path?: string) {
      if (!pixi) throw new Error('pixi is undefined in saveToDevice')

      return pixi.saveToDevice(url, path).finally(() => {
        this.setIsExportVideo(false)
      })
    },
    setGenVideoCb(cb: () => void) {
      this.genVideoCb = cb
    },
    setIsExportVideo(bool: boolean) {
      this.isExportingVideo = bool
    },
  },
})
