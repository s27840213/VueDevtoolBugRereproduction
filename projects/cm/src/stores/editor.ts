import useSteps from '@/composable/useSteps'
import type { EditorFeature, EditorStates, EditorType, PowerfulfillStates } from '@/types/editor'
import type { IStep } from '@nu/vivi-lib/interfaces/steps'
import assetUtils from '@nu/vivi-lib/utils/assetUtils'
import groupUtils from '@nu/vivi-lib/utils/groupUtils'
import pageUtils from '@nu/vivi-lib/utils/pageUtils'
import stepsUtils from '@nu/vivi-lib/utils/stepsUtils'
import { defineStore } from 'pinia'
import { useCanvasStore } from './canvas'

const editorStatesMap = {
  'powerful-fill': ['aspectRatio', 'editing', 'genResult', 'saving'] as PowerfulfillStates[],
}

export interface IGenResult {
  id: string
  url: string
  video?: string
}

interface IEditorStore {
  imgAspectRatio: number
  editorStates: EditorStates
  currStateIndex: number
  currActiveFeature: EditorFeature
  editorType: EditorType
  maskDataUrl: string
  isGenerating: boolean
  generatedResults: Array<IGenResult>
  currGenResultIndex: number
  stepsTypesArr: Array<'canvas' | 'editor'>
  currStepTypeIndex: number
  initImgSrc: string
  useTmpSteps: boolean
}

export const useEditorStore = defineStore('editor', {
  state: (): IEditorStore => ({
    imgAspectRatio: 9 / 16,
    editorType: 'powerful-fill',
    editorStates: editorStatesMap['powerful-fill'],
    currStateIndex: 0,
    currActiveFeature: 'none',
    maskDataUrl: '',
    isGenerating: false,
    generatedResults: [],
    currGenResultIndex: 0,
    stepsTypesArr: [],
    currStepTypeIndex: -1,
    initImgSrc: '',
    useTmpSteps: false,
  }),
  getters: {
    pageSize(): { width: number; height: number } {
      return pageUtils.getPageSize(0)
    },
    pageAspectRatio(): number {
      return this.pageSize.width / this.pageSize.height
    },
    pageScaleRatio(): number {
      return pageUtils.scaleRatio / 100
    },
    contentScaleRatio(): number {
      return pageUtils.contentScaleRatio
    },
    showBrushOptions(): boolean {
      return this.currActiveFeature === 'brush'
    },
    showSelectionOptions(): boolean {
      return this.currActiveFeature === 'selection'
    },
    inAspectRatioState(): boolean {
      return this.editorStates[this.currStateIndex] === 'aspectRatio'
    },
    inEditingState(): boolean {
      return this.editorStates[this.currStateIndex] === 'editing'
    },
    inGenResultState(): boolean {
      return this.editorStates[this.currStateIndex] === 'genResult'
    },
    inSavingState(): boolean {
      return this.editorStates[this.currStateIndex] === 'saving'
    },
    editorSteps(): Array<IStep> {
      return stepsUtils.steps
    },
    editorCurrStep(): number {
      return stepsUtils.currStep
    },
    isInEditorFirstStep(): boolean {
      return stepsUtils.isInFirstStep
    },
    isInEditorLastStep(): boolean {
      return stepsUtils.isInLastStep
    },
    currGeneratedResults(): { id: string; url: string; video?: string } {
      return this.generatedResults[this.currGenResultIndex]
    },
  },
  actions: {
    setPageSize(width: number, height: number) {
      useCanvasStore().setCanvasStoreState({
        canvasWidth: width,
        canvasHeight: height,
      })

      pageUtils.setPageSize(0, width, height)
    },
    createNewPage(width: number, height: number) {
      pageUtils.setPages([pageUtils.newPage({ width, height })])
    },
    setImgAspectRatio(ratio: number) {
      this.imgAspectRatio = ratio
    },
    changeEditorState(dir: 'next' | 'prev') {
      const statesLen = this.editorStates.length
      const toNext = dir === 'next'
      if (toNext && this.currStateIndex < statesLen - 1) {
        this.currStateIndex++
      } else if (!toNext && this.currStateIndex > 0) {
        this.currStateIndex--
      }
    },
    setCurrActiveFeature(feature: EditorFeature) {
      this.currActiveFeature = feature
    },
    setEditorType(type: EditorType) {
      this.editorType = type
    },
    setIsGenerating(isGenerating: boolean) {
      this.isGenerating = isGenerating
    },
    unshiftGenResults(url: string, id: string) {
      this.generatedResults.unshift({
        url,
        id,
      })
    },
    updateGenResult(id: string, data: { url?: string; video?: string }) {
      const index = this.generatedResults.findIndex((item) => item.id === id)
      const { url, video } = data
      if (url) {
        this.generatedResults[index].url = url
      }
      if (video) {
        this.generatedResults[index].video = video
      }
    },
    clearGeneratedResults() {
      this.generatedResults = []
    },
    setGenResultIndex(index: number) {
      this.currGenResultIndex = index
    },
    undo() {
      stepsUtils.undo()
    },
    redo() {
      stepsUtils.redo()
    },
    delayedRecord() {
      stepsUtils.delayedRecord()
    },
    stepsReset() {
      stepsUtils.reset()
    },
    pageReset(width = 900, height = 1600) {
      this.createNewPage(width, height)
    },
    pushStepType(type: 'canvas' | 'editor') {
      this.stepsTypesArr.push(type)
    },
    setCurrStepTypeIndex(index: number) {
      if (index < 0 || index >= this.stepsTypesArr.length) return
      this.currStepTypeIndex = index
    },
    resetStepsTypesArr() {
      this.stepsTypesArr = []
      this.currGenResultIndex = -1
    },
    setInitImgSrc(src: string) {
      this.initImgSrc = src
    },
    keepEditingInit() {
      this.changeEditorState('prev')
      this.createNewPage(this.pageSize.width, this.pageSize.height)

      assetUtils.addImage(
        this.currGenResultIndex === -1
          ? this.initImgSrc
          : this.generatedResults[this.currGenResultIndex].url,
        this.pageAspectRatio,
        {
          fit: 1,
        },
      )
      groupUtils.deselect()

      useSteps().reset()
    },
  },
})
