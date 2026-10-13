# Electron 与 macOS 原生玻璃

只在目标是 macOS Electron 桌面窗口、并且用户希望透出桌面或其他窗口时使用本参考。单个网页组件通常只需要作用域内的 CSS 玻璃；这里的适配器影响整个 BrowserWindow，不能直接用作任意单组件效果。保留现有导航、文档产出、对话、持久化和项目工作流，只替换已授权的外观。

## 源码与构建

把 [native-glass.mm](../assets/electron-macos/native-glass.mm)、[build-native.mjs](../assets/electron-macos/build-native.mjs) 和 [appearance-adapter.mjs](../assets/electron-macos/appearance-adapter.mjs) 复制到目标项目适合的原生资源目录。Skill 只分发源码，不分发某台机器的 `.node`。需要 macOS、clang++、macOS 26+ SDK 中的 `NSGlassEffectView.h`、Node N-API 头文件。液态玻璃运行需要 macOS 26+；禁用液态层的 `setGlass(handle, false)` 在可用性判断之外清理并返回 false，因此旧系统可继续使用 `frosted` / `system`，前提是支持目标 Electron 和此桥的最低运行版本 macOS 12。旧系统启用 `liquid` 会明确报不支持，不会假装已启用原生 Liquid Glass。

构建脚本优先使用 `NODE_HEADERS_DIR`，否则查找运行该脚本的 Node 可执行文件旁的 `../include/node`，不查找用户私有安装路径、不下载依赖。Node 架构须与目标 Electron 一致。N-API 8 减少 Node/Electron ABI 耦合，但不能消除 CPU 架构、系统和链接兼容要求。示例路径相对目标项目：

```sh
node native/build-native.mjs --outdir app/assets/native
```

头文件不在默认位置时：

```sh
NODE_HEADERS_DIR=/path/to/node/include/node node native/build-native.mjs --outdir app/assets/native
```

省略 `--outdir` 会写入当前工作目录的 `build/native-glass`。脚本用临时文件编译、开发用 ad-hoc 签名后原子替换输出；发布时沿用目标项目现有签名与打包流程。非 macOS 会明确报错；不要让原生构建成为其他平台必须成功的步骤。

## 主进程接入

窗口创建时设 `transparent: true` 和 `backgroundColor: '#00000000'`，保留现有窗口按钮、尺寸、preload、contextIsolation 和安全配置。适配器不会重建窗口或修改业务状态，也不会自动创建 IPC、设置面板或偏好文件。它会清空窗口、contentView 及直接子 View 的背景，接入前确认这些背景正属于授权替换的整窗外观。

```js
import { createRequire } from 'node:module'
import { applyNativeGlass } from './native/appearance-adapter.mjs'

const addon = createRequire(import.meta.url)('./assets/native/native-glass.node')
// Keep nativeTheme.themeSource = 'system' so the application can observe real OS changes.
// One theme and one transparency value apply across all materials.
const appearance = {
  mode: 'frosted',
  theme: 'dark',
  transparency: 70,
}
applyNativeGlass(browserWindow, addon, appearance)
```

`liquid` 关闭旧 vibrancy，并在内容视图底层插入 `NSGlassEffectViewStyleClear`，背景层不接收鼠标事件。`frosted` 移除液态层、启用 `sidebar` 的 behind-window vibrancy，再只调节没有内容子视图的独立效果层。`system` 表示实色材质，移除两种玻璃效果；这里的材质名不代表必须跟随系统，浅深外观由统一的 `theme` 决定。

材质切换由 Electron 宿主显式协调原生层与 renderer 的准备、ready 确认和提交。液态或毛玻璃切到实色时，先准备并确认页面已呈现不透明底色，再移除原生效果，避免两层都透明的空帧。实色切到玻璃时，保留页面实色底，先准备并确认原生背景层就绪，再降低网页底色。任一层失败，都恢复到上一次原生层和 renderer 共同成功的状态。

网页 controller 提供的是 Web 乐观预览队列，不承诺整窗切换无闪烁。一次 `onNativeChange` 调用完成不能当成两层视觉的原子事务；整窗宿主须安排上述交接并确认两层提交，不能直接套用网页预览的更新顺序。

设置面板只有一组选项，应用于全部三种材质并统一保存：

| 选项 | `theme` | `NSWindow.appearance` | 渲染层浅深方案 |
| --- | --- | --- | --- |
| 跟随系统 | `system` | `nil`，恢复继承 | 根据真实系统浅深色选择 |
| 浅色 | `light` | `Aqua` | 浅色界面对应的文字、控件和中性填充 |
| 深色 | `dark` | `DarkAqua` | 深色界面对应的文字、控件和中性填充 |

适配器在全部模式使用同一个 `theme`，默认值为 `system`，切换材质不改变主题。返回值保留传入的 `theme`，跟随系统时返回 `system`，不会把当时有效的浅色或深色写成手动偏好。页面的背景、文字和控件颜色仍由原项目渲染层设置；实色模式使用完全不透明的背景，玻璃模式按同一透明度值调中性填充，不能只改变原生窗口外观。

新 API 为 `applyNativeGlass(window, addon, { mode, theme = 'system', transparency })`，透明度是 0–100 的单个有限数值，在玻璃模式之间共用；实色模式保持不透明，但保留该值以便切回玻璃。旧的 `tone`、`solidTheme` 和 `transparency.liquid / transparency.frosted` 不属于新 API。宿主须按产品的升级规则，把旧选择一次性归一化为一个 `theme` 和一个透明度值，再传入适配器并原子保存；适配器不猜测旧值优先级、不读取或迁移偏好文件，也不接受透明度对象。仅省略新参数 `theme` 时才使用默认系统继承。

主进程保留 `nativeTheme.themeSource = 'system'`，手动浅深色只设置目标窗口的 `NSWindow.appearance`。不要在切换时把全局 `nativeTheme.themeSource` 改成 `light` 或 `dark`，否则会丢失真实系统外观变化的语义。渲染层的最终浅深色为 `theme === 'system' ? 系统浅深色 : theme`；跟随系统时，全部材质响应系统外观变化，手动浅深色时保留选择。

原生导出为 `setGlass(handle, boolean)`、`setAppearance(handle, 'light'|'dark'|'system')`、`setFrostedOpacity(handle, finite0to1)` 和 `inspect(handle)`。只能在 Electron 主进程 UI 线程传入当前仍存活的 BrowserWindow 的 `getNativeWindowHandle()` Buffer；macOS 上其中是 NSView 指针。不要从 renderer 暴露原生模块，不接收用户传来的指针，不缓存到窗口关闭之后，也不要把任意 Buffer 当合法句柄。桥的检查不能使任意地址的解引用变安全。

## 可选的窗口按钮位置维护

只有宿主明确使用 macOS 主进程的无框窗口或 `titleBarStyle: 'hiddenInset'`，并需要维护既有窗口按钮位置时，才复制并接入 [window-controls.mjs](../assets/electron-macos/window-controls.mjs)。不要自动启用、写死按钮坐标、用于任意组件，或用于默认 `titleBarStyle`；`applyNativeGlass` 的 API 保持不变。

宿主在第一次材质改动前读取 getWindowButtonPosition 的既有自定义 Point，也可直接复用创建窗口时已有的 trafficLightPosition。只有确认已有 Point 才默认接入。getter 返回 null 只说明没有显式自定义值，不暴露 hiddenInset 的实际内部边距；把这个 null 传给 setter 会恢复系统默认位置，未必保持原 hiddenInset 布局，因此不能自动这样做。只有宿主明确要求系统 default/reset 时才给 helper 传 null，也不将 null 换成 `{ x:0, y:0 }`。每个窗口由宿主管理自己的维护实例，在已有 onNativeChange 交接末尾恢复；失败时先等待原生和 renderer 回滚完成。

```js
import { maintainWindowButtonPosition } from './native/window-controls.mjs'

// windowOptions is the host's existing BrowserWindow constructor configuration.
const eligibleWindow = process.platform === 'darwin'
  && (windowOptions.frame === false || windowOptions.titleBarStyle === 'hiddenInset')
const savedButtonPosition = eligibleWindow
  ? (windowOptions.trafficLightPosition ?? browserWindow.getWindowButtonPosition())
  : null
const buttonOwner = savedButtonPosition !== null
  ? maintainWindowButtonPosition(browserWindow, savedButtonPosition)
  : null

async function onNativeChange(nextAppearance) {
  try {
    // Existing host transaction: coordinate both layers, including awaited rollback on failure.
    await hostApplyAppearance(nextAppearance)
  } finally {
    if (!browserWindow.isDestroyed()) {
      try { buttonOwner?.restore() }
      catch (error) { console.error('Could not restore native window buttons', error.message) }
    }
  }
}
```

`restore()` 同步重申位置，并合并一次 `setImmediate` 再恢复。helper 在 `resize`、`maximize`、`unmaximize`、`restore`、`show`、`leave-full-screen` 后恢复，在 `enter-full-screen` 取消已排队任务，窗口 `closed` 时自动 `dispose()`。替换维护实例或提前结束维护时，由宿主调用 `dispose()` 清除监听和待办。

helper 只会根据已检测到的普通或 simple fullscreen 状态跳过恢复，并在已收到的进入全屏事件取消已知待办，不能保证所有 macOS 异步窗口过渡都已就绪。宿主掌握过渡时，应避免重申；需要取消维护时先 `dispose()`，过渡完成后用原先捕获的位置重建实例。验收比较实际按钮 frame 几何与可见位置，包括切材质、回滚、缩放和全屏往返；getter 仍返回相同 Point 或 `null`，不能证明按钮没有移动。

## 模糊、透明度与主题

CSS `backdrop-filter` 只能处理页面合成范围内的背景，透出并模糊桌面需要原生效果与透明 web 背景一起成立。不要用固定彩色渐变冒充桌面透光。文字、图标和业务内容保持完全不透明，只调中性白色或烟灰背景填充。

磨砂起点采用 `sidebar`，原生 alpha 为 `0.95 - transparency × 0.001`，滑杆范围 0–100 对应原生 0.95–0.85；主要透明度变化交给渲染层中性填充。这个数值是在一台机器上的视觉起点，需要其他项目用真实背景实测调整，并非通用保证。把原生 alpha 大幅降到 0.2 会混入大量未模糊背景，磨砂会接近清透玻璃。公开 `NSVisualEffectView` 没有独立的模糊半径与内置染色透明度控制；不要用私有 `CABackdropLayer` 或抓取桌面绕过该限制。

材质随系统版本、窗口外观和辅助功能设置变化。Apple 没有公开固定的少染色材质排名；`header` 可作为实测候选，`under-window` 是明确面向 behind-window 的基准。`titlebar` 官方要求 `withinWindow`，不要把它默认用于整窗桌面磨砂。降低中性填充前，先保证 blur 明显、白字或深色字可读，再验证深浅色与两种玻璃之间仍有清晰区别。

## 验收与诊断

关闭 DevTools 后验收透明窗口。浏览器 DOM 截图、webContents 截图或单窗截图未必包含实际窗口后的桌面合成，不能单独证明原生效果；同时观察真实窗口，把另一个含高对比图案的本地窗口放在后面，移动位置验证透光与模糊是否响应，并用原生诊断交叉检查。若用户实际看到灰底，继续排查，不能只归因于截图。

`inspect` 提供窗口 opaque、背景 alpha、显式/有效 appearance、辅助功能 reduceTransparency，以及视图树中的 alpha、class、layer、visualEffect 与 glassEffect。正常透明窗口应 `windowOpaque=false`、`windowBackgroundAlpha=0`，背景效果在 web 内容层以下，文字所在容器 alpha=1。磨砂 setter 返回调整数量；若为 0，查看是否找不到独立效果层，必要时改为单独插入背景 `NSVisualEffectView`，不要降低包含 WebContents 的父容器 alpha。显式零动画时长避免系统 vibrancy 渐入覆盖自设 alpha；实际切换后隔数帧再查数值。

关闭窗口前停止相关回调。实时滑杆和统一主题若持久化，沿用原项目存储方式，并确保并发更新合并最新完整偏好、原子写入、失败回滚和退出等待；这些业务机制由目标应用承担，不从示例产品复制主进程或项目状态。测试三种材质和三种主题的组合、透明度 0 / 中间值 / 100、系统实时浅深色变化和重启恢复，确认切换材质不会另存或恢复另一组主题、透明度。

## 原始来源

- [Electron 透明窗口与限制](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles)
- [Electron BaseWindow 背景与 vibrancy API](https://www.electronjs.org/docs/latest/api/base-window)
- [Apple NSVisualEffectView](https://developer.apple.com/documentation/appkit/nsvisualeffectview)
- [Apple blendingMode 与 titlebar 限制](https://developer.apple.com/documentation/appkit/nsvisualeffectview/blendingmode-swift.property)
- [Apple NSGlassEffectView](https://developer.apple.com/documentation/appkit/nsglasseffectview)
- [Electron PR 50415 的原生插入方案](https://github.com/electron/electron/pull/50415) 是实现参考，该 PR 未合并；不是已发布的 Electron 内置 API。Apple 推荐将内容放入 glass 的 `contentView`；本示例底层 sibling 的 Electron 适配需实测，不能视为任意 AppKit 视图通用保证。
