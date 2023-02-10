// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import './imageEdit'
import './layerEdit'
require('cypress-terminal-report/src/installLogsCollector')()
require('cypress-image-diff-js/dist/command')()

after(() => {
  // Generate cypress-image-diff report after testing
  cy.task('generateReport')
})

// Alternatively you can use CommonJS syntax:
// require('./commands')
