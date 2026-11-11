/**
 * Sensitive data filter — prevents passwords and secrets from being saved
 * to the clipboard history.
 *
 * Detection strategies:
 * 1. Process name blocklist (password managers)
 * 2. Content pattern matching (API keys, JWTs, etc.)
 */

// Known password manager process names (case-insensitive match)
const SENSITIVE_PROCESS_NAMES = [
  'bitwarden',
  '1password',
  'keepass',
  'keepassxc',
  'lastpass',
  'dashlane',
  'keeper',
  'roboform',
  'enpass',
  'nordpass',
  'sticky password',
]

// Regex patterns that indicate sensitive content
const SENSITIVE_PATTERNS: RegExp[] = [
  // JWT tokens
  /^ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/,
  // Generic API keys (long alphanumeric strings prefixed with common patterns)
  /^(sk-|pk-|api_|Bearer |token_|secret_)[A-Za-z0-9_-]{16,}$/i,
  // AWS access keys
  /^AKIA[0-9A-Z]{16}$/,
  // Private keys (PEM format start)
  /^-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY/,
  // Connection strings with passwords
  /^(mongodb|postgres|mysql|redis|amqp):\/\/[^:]+:[^@]+@/i,
  // Password: prefix (common from password managers copy)
  /^Password:\s*.+$/im,
]

/**
 * Returns true if the content should be blocked from clipboard history.
 * @param content - The text content to evaluate
 * @param sourceProcess - Optional process name that owns the clipboard (from OS)
 * @param extraBlockedApps - Additional app names from user settings
 */
export function isSensitiveContent(
  content: string,
  sourceProcess?: string,
  extraBlockedApps: string[] = []
): boolean {
  // 1. Check process blocklist
  if (sourceProcess) {
    const procLower = sourceProcess.toLowerCase()
    const allBlocked = [...SENSITIVE_PROCESS_NAMES, ...extraBlockedApps.map(a => a.toLowerCase())]
    if (allBlocked.some(name => procLower.includes(name))) {
      return true
    }
  }

  // 2. Check content patterns
  const trimmed = content.trim()
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true
    }
  }

  return false
}

/**
 * Returns the default list of sensitive app names for display in settings.
 */
export function getDefaultSensitiveApps(): string[] {
  return [...SENSITIVE_PROCESS_NAMES]
}
