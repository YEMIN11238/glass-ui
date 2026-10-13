# Glass UI

一个可复用的 Codex Skill，为现有软件、网页和独立组件加入液态玻璃、毛玻璃与实色界面。保留宿主原有功能和布局，通过统一的颜色与透明度状态适配不同产品。

## 包含的能力

- 液态玻璃、带扩散模糊与细颗粒的毛玻璃、实色三种材质。
- 跟随系统或手动浅色、深色；切换材质保留颜色。
- 两种玻璃共用一个透明度值，实色隐藏滑杆并保留设置区域尺寸。
- 有作用域的网页样式和控制器，可适配 React、Vue、Svelte 或普通 HTML。
- Electron macOS 原生玻璃桥接源码、构建脚本、外观适配器与窗口按钮维护 helper。
- 即时预览、设置恢复、旧状态迁移，以及透明层交接和故障验收方法。

## 安装与使用

把整个仓库保存为 `~/.codex/skills/glass-ui/`，保持 `SKILL.md`、`references/`、`assets/` 和 `agents/` 的相对位置。已有同名技能时，先保留旧版本再替换。

也可以在目标目录尚不存在时运行：

```bash
git clone https://github.com/YEMIN11238/glass-ui.git ~/.codex/skills/glass-ui
```

在 Codex 中发出请求，例如：

```text
使用 $glass-ui，把当前应用的侧栏和设置弹窗改成玻璃效果。
保持业务功能和页面布局，加入材质、浅深色和统一透明度设置。
```

具体接入规则见 [SKILL.md](SKILL.md)。这份技能也可以仅用于一个卡片、侧栏或弹窗，无需更换应用框架。

## 网页演示

在仓库根目录启动本地服务器：

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

浏览器打开 `http://127.0.0.1:8765/assets/web/demo.html`。演示无需安装前端依赖，不读取桌面，也不写入浏览器存储。

## 平台范围

网页版本的 `backdrop-filter` 处理当前网页内的背景。基础 CSS 提供高光和模糊效果；真实光学折射应通过宿主支持的原生能力或可选的 `liquid-glass-react` 接入。

Electron macOS 模板包含原生桌面透底实现。原生桥接构建需要 macOS 26 或更新版本的 SDK；实际运行按系统能力选择材质或降级。Windows、Linux、Tauri 和其他宿主应使用各自的平台接口，不能直接复制 Electron 的窗口句柄或 IPC。

## 文件结构

```text
SKILL.md
agents/openai.yaml
references/
  web-components.md
  electron-macos.md
  verification.md
assets/
  web/
    demo.html
    glass.css
    controller.mjs
    frost-noise.svg
  electron-macos/
    native-glass.mm
    build-native.mjs
    appearance-adapter.mjs
    window-controls.mjs
```

模板中的参数是视觉起点，接入时需按宿主与真实背景验收；没有包含某个工作台的品牌、项目数据或个人配置。
