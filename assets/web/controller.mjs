/** Framework-independent preferences and DOM presentation for scoped web glass. */
const defaults = Object.freeze({ mode: 'system', theme: 'system', transparency: 85 })
const modes = new Set(['liquid', 'frosted', 'system'])
const tones = new Set(['light', 'dark'])
const themes = new Set(['system', 'light', 'dark'])
const copy = state => ({ mode: state.mode, theme: state.theme, transparency: state.transparency })

function percentage(value) {
  if (!Number.isInteger(value) || value < 0 || value > 100) throw new RangeError('Transparency must be an integer from 0 to 100')
  return value
}
function normalize(value, fallback = defaults) {
  if (value == null) return copy(fallback)
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Glass preferences must be an object')
  const result = { mode: value.mode === undefined ? fallback.mode : value.mode, theme: fallback.theme, transparency: fallback.transparency }
  if (!modes.has(result.mode)) throw new RangeError('Mode must be liquid, frosted, or system')
  // Validate legacy values even when the active material does not use them.
  if (value.tone !== undefined && !tones.has(value.tone)) throw new RangeError('Legacy tone must be light or dark')
  if (value.solidTheme !== undefined && !themes.has(value.solidTheme)) throw new RangeError('Legacy solid theme must be system, light, or dark')
  const legacyTransparency = value.transparency !== null && typeof value.transparency === 'object'
  const legacy = value.tone !== undefined || value.solidTheme !== undefined || legacyTransparency
  if (value.theme !== undefined) result.theme = value.theme
  else if (legacy) result.theme = result.mode === 'system' ? (value.solidTheme ?? 'system') : (value.tone ?? 'light')
  if (!themes.has(result.theme)) throw new RangeError('Theme must be system, light, or dark')
  if (legacyTransparency) {
    if (Array.isArray(value.transparency)) throw new TypeError('Legacy transparency must contain per-mode percentages')
    for (const mode of ['liquid', 'frosted']) if (value.transparency[mode] !== undefined) percentage(value.transparency[mode])
    const migrated = result.mode === 'system'
      ? value.transparency.liquid ?? value.transparency.frosted
      : value.transparency[result.mode]
    if (migrated !== undefined) result.transparency = migrated
  } else if (value.transparency !== undefined) {
    result.transparency = percentage(value.transparency)
  }
  return result
}

/**
 * @param {{element: HTMLElement, initialState?: object, storage?: {read?: Function, write?: Function},
 * onNativeChange?: Function, onChange?: Function, onError?: Function, matchMedia?: Function}} options
 * Storage receives preference objects, never DOM references. Native callbacks receive a copy
 * of preferences plus derived systemTheme/resolvedTheme. There is no automatic localStorage or Electron use.
 * @returns {Promise<{setMode: Function, setTheme: Function, setTransparency: Function, getState: Function, destroy: Function}>}
 */
export async function createGlassController(options = {}) {
  const { element, storage, onNativeChange, onChange, onError, initialState } = options
  if (!element?.classList || !element?.style || typeof element.setAttribute !== 'function') throw new TypeError('A glass scope element is required')
  for (const [name, callback] of Object.entries({ onNativeChange, onChange, onError })) if (callback !== undefined && typeof callback !== 'function') throw new TypeError(`${name} must be a function`)
  if (storage !== undefined) {
    if (!storage || typeof storage !== 'object') throw new TypeError('Storage must be an object with optional read/write methods')
    for (const name of ['read', 'write']) if (storage[name] !== undefined && typeof storage[name] !== 'function') throw new TypeError(`storage.${name} must be a function`)
  }
  const base = normalize(initialState)
  let preferences = normalize(await storage?.read?.(), base)
  let committed = copy(preferences), queue = Promise.resolve(), pendingChange = null, revision = 0, destroyed = false
  const mediaFactory = options.matchMedia ?? (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? query => window.matchMedia(query) : null)
  if (mediaFactory !== null && typeof mediaFactory !== 'function') throw new TypeError('matchMedia must be a function')
  const media = mediaFactory?.('(prefers-color-scheme: dark)')
  let systemTheme = media?.matches ? 'dark' : 'light'
  const attributes = ['data-glass-mode', 'data-glass-tone', 'data-system-theme', 'data-solid-theme']
  const previousAttributes = attributes.map(name => element.getAttribute(name))
  const previousStyle = element.style.getPropertyValue('--glass-transparency')
  const previousPriority = element.style.getPropertyPriority('--glass-transparency')
  const hadScope = element.classList.contains('glass-scope')
  const resolveTheme = value => value.theme === 'system' ? systemTheme : value.theme
  const nativeState = value => ({ ...copy(value), systemTheme, resolvedTheme: resolveTheme(value) })
  const getState = () => nativeState(preferences)
  const report = error => {
    try { if (onError) onError(error); else console.error('Glass controller callback failed', error) }
    catch (callbackError) { console.error('Glass error handler failed', callbackError) }
  }
  const notify = reason => { if (!destroyed && onChange) { try { onChange(getState(), { reason }) } catch (error) { report(error) } } }
  const paint = () => {
    if (destroyed) return
    element.classList.add('glass-scope')
    element.setAttribute('data-glass-mode', preferences.mode)
    element.setAttribute('data-glass-tone', resolveTheme(preferences))
    element.setAttribute('data-system-theme', systemTheme)
    element.setAttribute('data-solid-theme', resolveTheme(preferences))
    element.style.setProperty('--glass-transparency', String(preferences.transparency / 100))
  }
  const restoreDOM = () => {
    attributes.forEach((name, index) => { const value = previousAttributes[index]; if (value === null) element.removeAttribute(name); else element.setAttribute(name, value) })
    if (previousStyle) element.style.setProperty('--glass-transparency', previousStyle, previousPriority)
    else element.style.removeProperty('--glass-transparency')
    if (!hadScope) element.classList.remove('glass-scope')
  }
  const themeChanged = () => {
    if (destroyed) return
    systemTheme = media.matches ? 'dark' : 'light'
    // System appearance is derived; it is never persisted as a user preference.
    const update = queue.then(() => { if (!destroyed) return onNativeChange?.(nativeState(committed)) })
    queue = update.catch(report)
    paint(); notify('system')
  }
  const unlisten = () => {
    if (typeof media?.removeEventListener === 'function') media.removeEventListener('change', themeChanged)
    else media?.removeListener?.(themeChanged)
  }
  function change(next) {
    if (destroyed) throw new Error('Glass controller has been destroyed')
    next = normalize(next)
    if (JSON.stringify(next) === JSON.stringify(preferences)) return (pendingChange ?? queue).then(getState)
    const requestRevision = ++revision
    preferences = copy(next)
    const update = queue.then(async () => {
      try {
        await onNativeChange?.(nativeState(next))
        await storage?.write?.(copy(next))
        committed = copy(next)
        return getState()
      } catch (error) {
        // Restore native material before processing newer requests, without rolling back
        // a newer DOM preview. A rejected atomic storage write leaves committed intact.
        let failure = error
        if (onNativeChange) {
          try { await onNativeChange(nativeState(committed)) }
          catch (rollbackError) { failure = new AggregateError([error, rollbackError], 'Glass update and native rollback failed') }
        }
        if (revision === requestRevision) { preferences = copy(committed); paint(); notify('rollback') }
        throw failure
      }
    })
    queue = update.catch(() => {})
    pendingChange = update
    const release = () => { if (pendingChange === update) pendingChange = null }
    update.then(release, release)
    // Queue before notifying: callbacks may call another setter synchronously.
    paint(); notify('change')
    return update
  }
  const controller = {
    setMode(mode) { if (!modes.has(mode)) throw new RangeError('Mode must be liquid, frosted, or system'); return change({ ...copy(preferences), mode }) },
    setTheme(theme) { if (!themes.has(theme)) throw new RangeError('Theme must be system, light, or dark'); return change({ ...copy(preferences), theme }) },
    setTransparency(value) { return change({ ...copy(preferences), transparency: percentage(value) }) },
    getState,
    destroy() { if (!destroyed) { destroyed = true; unlisten(); restoreDOM() } return queue },
  }
  paint(); notify('init')
  const initial = queue.then(() => onNativeChange?.(nativeState(committed)))
  queue = initial.catch(() => {})
  if (typeof media?.addEventListener === 'function') media.addEventListener('change', themeChanged)
  else media?.addListener?.(themeChanged)
  try { await initial }
  catch (error) { destroyed = true; unlisten(); restoreDOM(); throw error }
  return controller
}
