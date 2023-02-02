import { defineConfig } from 'cypress'

export default defineConfig({
  projectId: 'dg4gqg',
  defaultCommandTimeout: 10000,
  scrollBehavior: false,
  e2e: {
    baseUrl: 'http://localhost:8080/',
    experimentalRunAllSpecs: true,
    experimentalWebKitSupport: true,
    setupNodeEvents(on, config) {
      require('cypress-terminal-report/src/installLogsPrinter')(on)
    },
  },
})
