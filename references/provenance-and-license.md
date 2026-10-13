# 来源、许可与复用范围

核查日期：2026-10-13。这里区分技能自身的资源、实现参考和使用者自行安装的第三方依赖。

## 本仓库包含什么

| 文件 / 资源 | 来源与范围 |
| --- | --- |
| `SKILL.md`、`agents/openai.yaml`、`references/` | 从维护者自己的 Glass UI 技能整理而来，保留跨项目接入规则。 |
| `assets/web/glass.css`、`controller.mjs`、`demo.html` | 为该技能整理的独立 Web 资源；无前端第三方运行依赖。演示布局和背景用于展示，不要求目标软件复制。 |
| `assets/web/frost-noise.svg` | 仓库自带的 SVG `feTurbulence` 细颗粒纹理，无外部图片、字体或付费素材。 |
| `assets/electron-macos/` | 从维护者定制应用中的玻璃实现提取并泛化的源码与适配器。没有包含应用的业务代码、品牌、个人配置、项目资料或编译后的 `.node` 模块。 |
| 演示截图与动图 | 从本仓库演示或维护者实际运行的应用录制。展示范围与运行环境见 [演示素材说明](../assets/readme/README.md)。不能将 Web 截图当成原生桌面透底的证据。 |

原始定制应用所在的 DeepSeek Harness 使用 MIT，但该宿主许可不能自动替代本技能自己的许可。审查时，本技能所提取的定制桌面目录不属于 DeepSeek Harness 上游已提交的源码；本仓库也没有打包 DeepSeek Harness 的 SDK 或运行时。

## 技能自身的许可状态

作者已将本仓库的原创说明和模板以 [MIT License](../LICENSE) 发布，版权为 `Copyright (c) 2026 YEMIN11238`。可在保留版权与完整许可声明的条件下使用、复制、修改、集成、再分发或用于商业项目；软件按许可中的“AS IS”条款提供。完整条款以 `LICENSE` 为准。

本许可仅覆盖维护者有权授权的原创内容。第三方内容继续遵从各自上游许可，不因进入此仓库或出现在演示中而被重新授权；依赖、平台软件、商标及参考截图的权利不包含在技能自身的 MIT 授权内。

## 实现参考与可选依赖

### liquid-glass-react

上游是 [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react)，其 [LICENSE](https://github.com/rdev/liquid-glass-react/blob/master/LICENSE) 是 MIT，版权声明为 `Copyright 2025 MAX ROVENSKY`。本次同时检查了实际安装的 `1.1.1` 包：MIT，`react` 与 `react-dom` 的 peer dependency 均为 `>=19`。

本仓库只在接入参考中链接该库，没有复制其源代码、构建包、示例图片或字体，也没有自动安装它。基础 CSS 演示因此只展示网页内的高光和模糊，不宣称已启用该库的位移折射。上游说明 Safari 和 Firefox 对位移效果支持不完整；实际接入须按所选版本和目标浏览器重新验证。

如果目标项目安装或打包该库，应保留该版本完整的版权与 MIT 许可声明，并同时处理 React 等被打包依赖的许可。不能只复制演示应用中由构建器生成的简短注释来替代全部依赖的许可文件。

### Electron 与 AppKit

原生桥接使用 AppKit 的公开 `NSGlassEffectView`、`NSVisualEffectView` API，以及 Electron 的窗口句柄和背景能力。资源没有包含 Electron 二进制、Node 头文件或 Apple SDK；这些由目标项目自己的开发与发布环境提供。

整窗玻璃的底层插入方法参考了 [Electron PR #50415](https://github.com/electron/electron/pull/50415)。该 PR 已关闭且未合并，不能将其中提议的 API 写成已经发布的 Electron 功能。本仓库提供的是自己的 N-API 桥接适配，接口和代码组织不同于该 PR；保留此链接用于说明方案来源。Electron 的 [MIT 许可](https://github.com/electron/electron/blob/main/LICENSE) 适用于其自身源码；若另外复制或分发 Electron 源码/运行时，仍须保留对应版权、许可及随版本附带的第三方声明。

Apple 的 API 名称和官方文档链接用于说明平台能力，没有复制 Apple SDK 的头文件、实现或系统资源。使用 Apple SDK、签名和发布遵从目标项目已有的开发环境与协议；这里的文档不授予 Apple 软件或商标权。

## 复用时检查

- 保留完整目录，使 `SKILL.md` 中的相对资源引用继续有效。
- 只带入所需的材质、控制器或原生适配；目标产品的品牌、业务布局和用户数据仍由目标产品负责。
- 检查目标项目自行选择的依赖、版本、许可证与可访问性降级。基础 Web 资源无需 `liquid-glass-react`、React 或 Electron。
- 宣传截图和第三方界面参考图不属于可随意再分发的组件资源。不要把用户提供的第三方软件截图、应用图标或图片追加为“MIT 素材”。
- 第三方来源清单见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)，平台与显示边界见 [原生接入](electron-macos.md) 和 [Web 组件](web-components.md)。
