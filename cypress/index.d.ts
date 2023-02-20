// Doc: https://docs.cypress.io/guides/tooling/typescript-support#Types-for-Custom-Commands

interface ISidebarData {
  icon: string;
  panelName: string;
  componentName: string;
  apiUrl: string;
  apiType: string;
  testCategory: string;
}

declare namespace Cypress {
  interface Chainable<Subject> {
    // commands.ts
    isMobile(callback: () => void): Chainable<void>
    notMobile(callback: () => void): Chainable<void>
    login(): Chainable<void>
    deleteAllLayers(): Chainable<void>
    deselectAllLayers(): Chainable<void>
    importDesign(designName: string): Chainable<void>
    togglePanel(buttonText: string): Chainable<void>
    snapshotTest(testName: string, { toggleMobilePanel }?: { toggleMobilePanel: string }): Chainable<Subject>
    getAllCategoryName(panel: ISidebarData, categoryName?: string[], last?: boolean): Chainable<string[]>
    addAsset(panel: ISidebarData, categoryIndex: number, itemIndex: number): Chainable<void>
    // addAsset(panel: ISidebarData, categoryName: string, itemIndex: number): Chainable<void>

    // layerEdit.ts
    layerFlip(): Chainable<JQuery<HTMLElement>>
    layerAlign(): Chainable<JQuery<HTMLElement>>
    layerOrder(subjectBack: JQuery<HTMLElement>): Chainable<JQuery<HTMLElement>>
    layerCopy(): Chainable<JQuery<HTMLElement>>
    layerLock(): Chainable<JQuery<HTMLElement>>
    layerDelete(): Chainable<JQuery<HTMLElement>>
    layerCopyFormat(subjectBack: JQuery<HTMLElement>,
                  before: (subject: JQuery<HTMLElement>) => void,
                  after: (subject: JQuery<HTMLElement>) => void): Chainable<JQuery<HTMLElement>>
    layerRotate(): Chainable<JQuery<HTMLElement>>
    layerScale(): Chainable<JQuery<HTMLElement>>

    // imageEdit.ts
    imageAdjust(): Chainable<JQuery<HTMLElement>>
    imageCrop(enterCrop: 'button'|'dblclick'): Chainable<JQuery<HTMLElement>>
    imageShadow(): Chainable<JQuery<HTMLElement>>
    imageSetAsBg(): Chainable<JQuery<HTMLElement>>
    imageAutoBgRemove(): Chainable<JQuery<HTMLElement>>
    imageManuallyBgRemove(): Chainable<JQuery<HTMLElement>>

    // npm package type define
    compareSnapshot(
      name: string,
      testThreshold?: number,
      retryOptions?: Record<string, unknown>
    ): Chainable<Element>
  }
}
