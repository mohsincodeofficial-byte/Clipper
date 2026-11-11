import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'

let electronApp: ElectronApplication
let window: Page
let tmpUserData: string
let tmpDocFile: string

test.describe('Clipper Electron E2E', () => {
  test.beforeAll(async () => {
    tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'clipper-e2e-'))
    tmpDocFile = path.join(tmpUserData, 'e2e-notes.txt')
    fs.writeFileSync(tmpDocFile, 'Clipper E2E test document')

    electronApp = await electron.launch({
      args: [path.resolve(__dirname, '../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        CLIPPER_USER_DATA: tmpUserData,
        CLIPPER_E2E: '1',
      },
    })

    window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
  })

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close()
    }
    if (tmpUserData && fs.existsSync(tmpUserData)) {
      fs.rmSync(tmpUserData, { recursive: true, force: true })
    }
  })

  test('renders dock with filter toolbar and empty state or captured items', async () => {
    await expect(window.getByRole('button', { name: 'All' })).toBeVisible()
    await expect(window.getByPlaceholder('Search…')).toBeVisible()
  })

  test('captures clipboard text, filters it, and restores on click', async () => {
    const uniqueText = `Clipper-E2E-${Date.now()}`

    // Simulate user copying text to the Windows clipboard
    await electronApp.evaluate(({ clipboard }, text) => {
      clipboard.writeText(text)
    }, uniqueText)

    // Clipboard poller runs every 500ms; card and its text should be visible without clipping
    const card = window.getByTitle(uniqueText)
    await expect(card).toBeVisible({ timeout: 5000 })
    const previewText = card.locator('p')
    await expect(previewText).toBeVisible()
    const textBox = await previewText.boundingBox()
    expect(textBox).not.toBeNull()
    expect(textBox!.height).toBeGreaterThan(10)

    const innerHeight = await window.evaluate(() => window.innerHeight)
    const cardBox = await card.boundingBox()
    expect(cardBox).not.toBeNull()
    expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(innerHeight)

    // Filter using the search input
    const searchInput = window.getByPlaceholder('Search…')
    await searchInput.fill(uniqueText)
    await expect(card).toBeVisible()

    // Click card to re-copy and verify toast
    await card.click()
    await expect(window.getByText('Copied!')).toBeVisible({ timeout: 3000 })

    // Clear search
    await searchInput.fill('')
  })

  test('pins a document via IPC and unpins it from the dock', async () => {
    const pinned = await window.evaluate((filePath) => window.clipper.pinFile(filePath), tmpDocFile)
    expect(pinned).toBe(true)

    const docCard = window.getByText('e2e-notes.txt')
    await expect(docCard).toBeVisible({ timeout: 5000 })

    // Unpin via the card's Unpin button
    const unpinBtn = window.getByTitle('Unpin').first()
    await unpinBtn.click({ force: true })
    await expect(docCard).toBeHidden({ timeout: 5000 })
  })

  test('hides and re-shows dock via IPC events', async () => {
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('dock:hide')
    })

    await expect(window.getByPlaceholder('Search…')).toBeHidden({ timeout: 3000 })

    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('dock:show')
    })

    await expect(window.getByPlaceholder('Search…')).toBeVisible({ timeout: 3000 })
  })
})
