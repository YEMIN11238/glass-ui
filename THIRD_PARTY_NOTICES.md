# Third-party sources and notices

This file records implementation references and optional dependencies. The repository's original instructions and templates are available under the [MIT License](LICENSE), Copyright (c) 2026 YEMIN11238. That grant applies only to material the maintainer is entitled to license; it does not relicense third-party material, platform software, trademarks or reference screenshots. See [provenance and reuse scope](references/provenance-and-license.md).

## Optional dependency: liquid-glass-react

- Source: [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react).
- Checked package: `1.1.1`; MIT; `Copyright 2025 MAX ROVENSKY`.
- License: [upstream LICENSE](https://github.com/rdev/liquid-glass-react/blob/master/LICENSE).
- Inclusion: not bundled in this repository. It is an optional choice for a consuming React project; the Web demo does not use it.
- Downstream distribution: keep the complete copyright and MIT permission notice from the actual version you distribute, along with notices for its bundled dependencies.

## Implementation reference: Electron

- Source: [electron/electron](https://github.com/electron/electron).
- License: [MIT, Electron contributors / GitHub Inc.](https://github.com/electron/electron/blob/main/LICENSE).
- Reference: [PR #50415](https://github.com/electron/electron/pull/50415), native Liquid Glass insertion approach; closed, not merged.
- Inclusion: no Electron source tree or binary is shipped here. The native template uses the consuming application's Electron runtime. Shipping that runtime has its own license and third-party notice obligations.

## Original development host: DeepSeek Harness

- Source: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).
- License: [MIT, Copyright (c) 2026 DeepSeek](https://github.com/deepseek-ai/deepseek-harness/blob/master/LICENSE).
- Inclusion: no DeepSeek Harness runtime, SDK, application data or upstream source is shipped here. The skill was extracted from the maintainer's custom UI work in that environment; the host's MIT license does not automatically license the skill's own files.

## Platform APIs and visual resources

Apple AppKit, Node N-API and browser CSS APIs are named as integration interfaces. Their SDKs, headers and runtimes are supplied by the consuming project's environment and are not included in this repository. Apple, Electron and other project names remain the names of their respective owners; this project claims no endorsement.

The bundled noise texture is SVG-generated. Reference images of third-party products, icons, fonts, stock images and screenshots from unrelated applications are not licensed or shipped as reusable assets by this file.
