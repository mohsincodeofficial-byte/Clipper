import { describe, it, expect } from 'vitest'
import { isSensitiveContent, getDefaultSensitiveApps } from '../sensitiveFilter'

describe('isSensitiveContent', () => {
  it('returns false for normal text', () => {
    expect(isSensitiveContent('Hello world')).toBe(false)
    expect(isSensitiveContent('Meeting notes from today')).toBe(false)
    expect(isSensitiveContent('https://example.com/page')).toBe(false)
  })

  it('blocks content from password manager process names', () => {
    expect(isSensitiveContent('MyP@ssw0rd', 'Bitwarden.exe')).toBe(true)
    expect(isSensitiveContent('secret123', '1Password')).toBe(true)
    expect(isSensitiveContent('hunter2', 'keepassxc')).toBe(true)
    expect(isSensitiveContent('pa$$word', 'LastPass')).toBe(true)
  })

  it('blocks JWT tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    expect(isSensitiveContent(jwt)).toBe(true)
  })

  it('blocks AWS access keys', () => {
    expect(isSensitiveContent('AKIAIOSFODNN7EXAMPLE')).toBe(true)
  })

  it('blocks API key patterns', () => {
    expect(isSensitiveContent('sk-abcdefghijklmnopqrstuvwxyz123456')).toBe(true)
    expect(isSensitiveContent('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abcdefgh')).toBe(true)
  })

  it('blocks PEM private keys', () => {
    expect(isSensitiveContent('-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAA...')).toBe(true)
    expect(isSensitiveContent('-----BEGIN PRIVATE KEY-----\nbase64data')).toBe(true)
  })

  it('blocks connection strings with passwords', () => {
    expect(isSensitiveContent('postgres://user:secretpass@localhost:5432/mydb')).toBe(true)
    expect(isSensitiveContent('mongodb://admin:hunter2@cluster.mongodb.net/db')).toBe(true)
  })

  it('respects extra blocked apps from settings', () => {
    expect(isSensitiveContent('anything', 'MyCustomVault.exe', ['MyCustomVault'])).toBe(true)
    expect(isSensitiveContent('anything', 'NormalApp.exe', ['MyCustomVault'])).toBe(false)
  })

  it('is case-insensitive for process names', () => {
    expect(isSensitiveContent('secret', 'BITWARDEN.EXE')).toBe(true)
    expect(isSensitiveContent('secret', 'bitwarden')).toBe(true)
  })

  it('returns default sensitive apps list', () => {
    const apps = getDefaultSensitiveApps()
    expect(apps).toContain('bitwarden')
    expect(apps).toContain('1password')
    expect(apps.length).toBeGreaterThan(3)
  })
})
