/** Preserve an opt-in macOS window-button position after native background layout. */

/**
 * @param {object} browserWindow Live macOS BrowserWindow with native window buttons.
 * @param {{x: number, y: number}|null} position The host's existing button position, or null for its default.
 * @returns {{restore: Function, dispose: Function}} Layout restoration and listener cleanup, also disposed on close.
 */
export function maintainWindowButtonPosition(browserWindow, position) {
  const savedPosition = position === null ? null : { ...position }
  let disposed = false, pending = null
  const canRestore = () => !disposed && !browserWindow.isDestroyed() && !browserWindow.isFullScreen() && !browserWindow.isSimpleFullScreen()
  const apply = () => { if (canRestore()) browserWindow.setWindowButtonPosition(savedPosition) }
  const cancelPending = () => { if (pending !== null) { clearImmediate(pending); pending = null } }
  const restore = () => {
    if (!canRestore()) return
    apply()
    // AppKit may lay out the titlebar again after the synchronous material change.
    if (pending === null) pending = setImmediate(() => {
      pending = null
      if (!canRestore()) return
      try { apply() }
      catch (error) { console.error('Could not restore native window buttons', error.message) }
    })
  }
  const restoreFromEvent = () => {
    try { restore() }
    catch (error) { console.error('Could not restore native window buttons', error.message) }
  }
  const events = ['resize', 'maximize', 'unmaximize', 'restore', 'show', 'leave-full-screen']
  const dispose = () => {
    if (disposed) return
    disposed = true
    cancelPending()
    for (const event of events) browserWindow.removeListener(event, restoreFromEvent)
    browserWindow.removeListener('enter-full-screen', cancelPending)
    browserWindow.removeListener('closed', dispose)
  }
  for (const event of events) browserWindow.on(event, restoreFromEvent)
  browserWindow.on('enter-full-screen', cancelPending)
  browserWindow.once('closed', dispose)
  return { restore, dispose }
}
