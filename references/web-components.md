# 网页组件资产

在现有 Web 项目里实现玻璃面板或局部组件时读取本页。复制 `assets/web/glass.css`、`controller.mjs` 和 `frost-noise.svg` 到项目自身的资源目录，保留 CSS 与 SVG 的相对位置；可以只用 CSS，不必引入控制器。不要复制演示页的布局或彩色背景进产品。

## 表面与作用域

所有样式限制在 `.glass-scope` 元素及明确使用 `.glass-*` 类名的后代。资产不修改 `body`、`:root`、全局字体或宿主导航。可将该类放在一个卡片、弹窗外壳或页面容器上；组件内部继续沿用项目原布局与图标。

```html
<link rel="stylesheet" href="/ui/glass/glass.css">
<section class="glass-scope" data-glass-mode="frosted"
  data-glass-tone="dark" style="--glass-transparency:.75; padding:24px">
  <h2>现有页面标题</h2>
  <p class="glass-muted">说明文字保持可读。</p>
  <button class="glass-button" data-primary>原有操作</button>
</section>
```

`data-glass-mode` 支持 `liquid`、`frosted`、`system`。前两种读取 `data-glass-tone="light|dark"`；`system` 代表实色界面，读取 `data-solid-theme="light|dark"`。控制器将同一个用户 theme 解析为浅色或深色并同步到这两个属性；属性本身不存用户的跟随/手动选择。`data-system-theme="light|dark"` 始终保留真实 OS 状态。静态 markup 尚未提供 `data-solid-theme` 时，CSS 兼容从 `data-system-theme` 取色；两者均缺失时实色默认浅色。只用 CSS 时，宿主自行同步解析色。`.glass-surface` 和 `.glass-field` 是可选卡片与表单样式，不会自动替换项目现有控件。

```html
<!-- 手动浅色实色界面；真实 OS 为深色，两个状态不混用。 -->
<section class="glass-scope" data-glass-mode="system"
  data-system-theme="dark" data-solid-theme="light">保留宿主内容</section>
```

此 Web 基础版本的液态模式是渐进高光效果与较低模糊，不能声称有真实桌面折射。磨砂使用明显的 `backdrop-filter` 模糊与轻颗粒，即使提高透明度也保留模糊强度。两者只能处理当前网页背后的绘制像素；祖先的背景、滤镜、裁切和合成层会影响结果。纯色背景上没有可折射或扩散的细节。原生桌面玻璃需要宿主原生视图，读取对应原生参考。

可选接入 [liquid-glass-react](https://github.com/rdev/liquid-glass-react) 增强网页内折射。本次已核验本地安装包 `1.1.1` 的 metadata：MIT 许可，`react` 与 `react-dom` peer dependency 均为 `>=19`。目标项目接入时仍应检查实际选用版本、许可证与浏览器限制，并保留 MIT 要求的版权和许可声明。这里不自动安装或包含第三方库；不要把这个 CSS 高光方案描述成已安装该库。

## 可配置 Token

在目标 `.glass-scope` 上覆写 token。颜色使用中性基础，不固定紫色；颜色可以来自页面内容或原生背景。

| Token | 默认值 / 含义 |
| --- | --- |
| `--glass-transparency` | 0–1，控制中性表面填充；不调整文字或整个组件的 opacity |
| `--glass-light-rgb` / `--glass-dark-rgb` | `255 255 255` / `24 26 30`，空格分隔的 RGB 通道 |
| `--glass-light-min-fill` / `--glass-dark-min-fill` | `.24` / `.68`，透明度最高时仍保留的背景填充；烟灰深色保留更多填充以支持白字 |
| `--glass-light-ink` / `--glass-dark-ink` | 深字 / 浅字主色 |
| `--glass-light-muted` / `--glass-dark-muted` | `#414752` / `#dde1e8`，次要文字色 |
| `--glass-liquid-blur` / `--glass-frosted-blur` | `4px` / `28px`，分别调整两种模糊强度 |
| `--glass-saturation` | `110%` |
| `--glass-radius` / `--glass-inner-radius` / `--glass-control-radius` | `20px` / `12px` / `10px` |
| `--glass-system-light-rgb` / `--glass-system-dark-rgb` | 实色模式表面颜色 |
| `--glass-shadow` | 自定义外侧阴影 |
| `--glass-focus-ring` | 对组件表面可见的键盘焦点圈；独立于主要按钮文字颜色 |

在实际浅深背景、文字、输入框、下拉框和禁用状态下检查可读性。默认透明参数保留玻璃质感，并不保证所有图片背景的文字对比；例如浅色低填充放在全黑背景会降低深字对比。有实际高对比需求时，可按组件背景提高 `--glass-light-min-fill`（例如 `.70`）或增加内容背板；降低深色最小填充也可能导致白字在明亮背景上对比不足。浏览器不支持 backdrop-filter 或用户要求降低透明度时，CSS 退回不透明表面。

## 控制器

`createGlassController` 是异步工厂，使用浏览器 DOM 和 `matchMedia`，没有框架、Electron 或本地存储依赖。

```js
import { createGlassController } from './ui/glass/controller.mjs'

const glass = await createGlassController({
  element: document.querySelector('#existing-panel'),
  initialState: { mode: 'frosted', theme: 'dark', transparency: 75 },
  storage: {
    // 可选：使用项目已有的偏好机制。也可完全省略 storage。
    read: () => appPreferences.read('panel-glass'),
    write: state => appPreferences.write('panel-glass', state),
  },
  onNativeChange: state => nativeBridge?.setGlassAppearance(state),
  onChange: (state, { reason }) => updateExistingControls(state, reason),
  onError: error => showExistingError(error),
})

await glass.setMode('liquid')
await glass.setTheme('light')
await glass.setTransparency(90)
await glass.setMode('system')
await glass.setTheme('dark')
await glass.setTheme('system')
const state = glass.getState()
await glass.destroy()
```

统一偏好 schema 是 `{mode, theme, transparency}`。默认 `{mode:'system', theme:'system', transparency:85}`；`initialState` 可部分指定，存储中读取的偏好覆盖初始值。theme 跨全部材质共用，system 时按当前 OS 解析，手动浅深色在系统变化和材质切换后保持固定。transparency 是两种玻璃共用的 0–100 整数，实色不使用但保留该值。

- `setMode(mode)` 只修改材质，不改变 theme 或 transparency。`setTheme(theme)` 接受 `system|light|dark`；`setTransparency(value)` 只改一个数值，当前是实色也可保存，表面仍不透明。三个 setter 验证输入并返回可等待的 Promise；重复设置当前值会等待正在提交的操作。
- `getState()` 返回独立副本，并带有真实 OS 的 `systemTheme` 和当前解析色 `resolvedTheme`。全部材质使用同一个解析色。修改返回对象不会改变控制器。OS 浅深色由 `matchMedia` 实时更新，不写入用户偏好。
- 切换与拖动立即预览；原生回调与可选存储写入按请求顺序执行。较早失败不会覆盖较新的预览；最后一次失败恢复已提交偏好。应等待并处理 setter Promise，storage.write 应原子保存并在失败时拒绝。
- `onNativeChange` 接收偏好、真实 `systemTheme` 与派生 `resolvedTheme`，可连接项目已有原生桥接。它不等于读取桌面像素，也不会自动执行 Electron API。原生应用时若失败，控制器会尝试将桥接恢复为已提交偏好。
- 这个控制器立即绘制 Web 预览，不能保证原生整窗无闪烁。Electron 的两层交接由宿主安排：转实色先确认不透明页面已绘制，转玻璃先准备原生背景，再降低网页填充；失败协调恢复两层。读取 [原生参考](electron-macos.md) 的交接规则，不将一次 onNativeChange 当成原子显示事务。
- `onChange` 的 reason 是 `init`、`change`、`system` 或 `rollback`。`onError` 用于系统事件或 UI 回调异常；setter 错误通过返回的 Promise 暴露。
- `destroy()` 移除自身的系统监听，恢复它修改前的属性、CSS 变量与作用域类，并等待已排队操作结束；之后不能再次设置。其他事件监听和宿主样式不受影响。宿主主动卸载组件时，可先等待它再销毁依赖的资源；浏览器或操作系统直接终止页面时不保证执行完这个 Promise。

### 旧数据与调用升级

预发布旧 schema `{mode, tone, solidTheme, transparency:{liquid,frosted}}` 可在 `initialState` 或 storage.read 中读取。迁移按当前材质确定；没有旧字段的新对象使用统一默认值。

| 当前 mode | 迁移 theme | 迁移 transparency |
| --- | --- | --- |
| liquid | tone，缺失时 light | 旧 liquid 值，缺失时默认/初始值 |
| frosted | tone，缺失时 light | 旧 frosted 值，缺失时默认/初始值 |
| system | solidTheme，缺失时 system | 优先旧 liquid，其次 frosted，再默认/初始值 |

新 theme 字段若提供则优先；数字 transparency 直接保留。旧 tone、solidTheme 和两种旧透明度都验证，包括当前不使用的值；非法枚举、字符串百分比、越界和小数不静默接受。后续写入只有统一 schema。其他宿主字段名的迁移由 storage adapter 处理。

旧调用需要同步升级：`setTone(x)` 和 `setSolidTheme(x)` 改为 `setTheme(x)`；`setTransparency(mode, x)` 改为 `setTransparency(x)`。旧 setter 不保留别名，以免让调用方继续维持两套设置。旧数据兼容不等于旧 API 兼容。

### 一个颜色入口，随当前材质切换

界面只保留一组当前材质的颜色控件。液态/磨砂显示浅色和深色，实色显示跟随系统、浅色和深色。玻璃处于 theme=system 时，选中按钮显示 resolvedTheme，仍保留跟随偏好；点浅/深按钮后才改为全局手动值。透明度只用一个滑杆，实色时 visibility:hidden 保留区域尺寸，并设置 inert、输入 disabled 和 aria-hidden；切回玻璃恢复同一个值。

```js
function renderColorChoice(state) {
  const isSolid = state.mode === 'system'
  renderExistingColorSelector({
    label: '颜色',
    choices: isSolid ? ['system', 'light', 'dark'] : ['light', 'dark'],
    value: isSolid ? state.theme : state.resolvedTheme,
  })
  updateExistingTransparencySlider({
    visibility: isSolid ? 'hidden' : 'visible',
    reserveLayout: true, inert: isSolid, disabled: isSolid, ariaHidden: isSolid,
    value: state.transparency,
  })
}
function chooseCurrentColor(value) {
  return glass.setTheme(value)
}
```

在 onChange 中调用已有控件的渲染函数，并在材质切换时重新读取选中值。这里的示意函数由宿主实现，不建立新的设置页或业务布局。不要把 reserveLayout 的不可见状态实现为 hidden 属性、display:none 或卸载节点；若隐藏时焦点仍在滑杆上，先移到材质选择控件。

外观面板保持稳定尺寸和位置，颜色组为三项预留宽度，两个或三个按钮高度一致。避免切换后重新按内容居中弹窗或用 transition:all 动画布局；仅响应真实视口变化。取消滑杆下方的冗余说明与可见状态行；需要的实时反馈可放进 visually-hidden 的 role=status / aria-live 元素，原生范围控件仍保留标签和当前数值。外观预览的弹窗避免全屏染灰/模糊遮罩，保留宿主其他弹窗的原行为。

宿主若在应用中暂时禁用外观控件，保持 disabled / inert 阻止交互，选框视觉不整体淡出。只在该外观控件作用域覆盖全局 disabled opacity 和 opacity 过渡，例如示例的 `.demo-controls :is(button,select,input):disabled { opacity:1 }` 与 `transition:none`；不改变其他业务按钮的禁用样式，也不通过遮罩掩盖原生交接闪烁。

### 持久化与页面生命周期

这个资源是 Web 异步队列。滑杆事件立即更新 DOM，但 `storage.write` 和 `onNativeChange` 在队列轮到它们时才调用。连续拖动后立即关闭、刷新或终止 renderer，最后几个预览值可能尚未提交；只在 `pagehide` 调用异步 `destroy()` 并不能保证保存。

宿主应按自己的生命周期和存储机制补齐退出保存。例如，纯网页选择同步 `localStorage` 时，可在页面生命周期钩子中同步保存 `getState()` 的最新偏好快照，并处理存储不可用或配额错误。只保存 mode、theme 和一个数字 transparency；不要将派生的 `systemTheme` 或 `resolvedTheme` 存为用户选择。需要远程异步保存的 Web 应用应以实际写入确认显示保存状态，不能把排队当成已保存。

Electron 应把每次偏好请求直接交给主进程，由主进程立即接收、排队原子保存，并在应用退出时等待自己的队列。不要把可靠退出保存寄托在 renderer 的 `destroy()`、`pagehide` 或这个资源的异步队列。一个分层适配入口可以使用同步触发的 `onChange`；项目自己的 IPC 方法需自行定义和校验。

```js
const glass = await createGlassController({
  element: document.querySelector('#existing-panel'),
  initialState: await window.appAppearance.read(),
  // 不把关键 IPC 放进本资源的 storage/onNativeChange 队列。
  onChange(state, { reason }) {
    if (reason !== 'change') return
    const preference = { mode: state.mode, theme: state.theme, transparency: state.transparency }
    // 立即调用宿主的受限 IPC；主进程负责原生材质、保存和退出等待。
    void window.appAppearance.set(preference).catch(showExistingSaveError)
  },
})
```

这个适配的保存确认、失败恢复及原生系统外观事件由宿主处理；控制器不保证 `onChange` 外部发起的存储事务。纯网页控制器和原生桌面退出队列是两个不同的层次，按项目需要选择，避免同时持有互相覆盖的偏好来源。

## 演示与验证

演示采用 ESM。某些浏览器禁止从 `file://` 导入模块，因此在 `assets/web` 目录启动一个仅监听本机的静态服务即可，无需安装全局依赖。

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8765/demo.html`，完成后停止该临时服务。演示只有一个组件，切换三种材质；颜色组预留三项空间并保持按钮高度，实色的透明度区域保留布局但隐藏、禁用且移出辅助技术树。状态反馈不占可见行。彩色背景与背景文字只用于让差异可见；演示不持久化、不读取桌面。开发时可注入 matchMedia 和 fake DOM/storage，验证统一偏好、旧数据迁移、系统事件、不可见区域禁用及焦点转移、失败回退和销毁；实际位置与无闪烁仍须由目标宿主视觉验收，不把 Node 检查等同于视觉结果。不要把临时测试产物打包进 skill。
