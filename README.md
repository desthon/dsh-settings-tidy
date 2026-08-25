# dsh-settings-tidy

在 DSH 中安装了大量插件后，设置侧边栏会变得又长又乱。**dsh-settings-tidy** 帮你把设置面板保持整洁：

- 一键切换**紧凑模式**，让侧边栏一屏显示更多分区；
- **手动分区整理**：把设置侧边栏的各个分区归入可折叠分组，并按需**隐藏**不常用的分区；
- 全部偏好本地持久化，不依赖服务器、不影响其他插件。

---

## 功能

### 1. 紧凑模式 (Compact Mode)

缩小设置侧边栏导航的间距、cell 高度与标题字号，并把导航区域变为可滚动，让更多分区一屏放下。

切换入口：设置面板 →「整理」分区 → **紧凑模式** 开关。

### 2. 侧边栏分区整理 (Sidebar Section Grouping & Hiding)

把设置面板左侧导航栏中的分区（通用设置、模型、插件、Agent 预设等）归入可折叠的分组，并可**隐藏**不常用的分区。

- 开启「侧边栏分区整理」开关后，导航栏中的分区会自动按预定义规则分组（通用、插件与扩展、模型与连接、Agent 与预设、整理等）。
- 每个分组的标题可点击展开/收起。
- 在 **整理 → 分区显示设置** 面板中，可对每个分区单独设置：
  - **显示/隐藏**：隐藏的分区不会在导航栏中显示（但内容仍然可通过其他方式访问）。
  - **分组归属**：手动指定该分区属于哪个分组（支持「不分组 / 通用 / 插件与扩展 / 模型与连接 / Agent 与预设 / 整理」）。
- 隐藏和分组配置通过 label 文字匹配，支持**大小写不敏感**。

### 3. 独立的「整理」设置分区

在设置侧边栏末尾新增一个 **整理** 分区（id: `tidy`），集中管理所有整理功能，并提供每个功能的说明。

---

## 安装

```bash
dsh plugin --profile web add github:desthon/dsh-settings-tidy
```

安装后**重启 DSH** 即可生效。

---

## 使用

1. 点击 dsh 侧边栏底部的 **设置齿轮** 图标，打开设置面板；
2. 在侧边栏列表末尾找到 **整理** 分区；
3. 开启「紧凑模式」和/或「侧边栏分区整理」；
4. 在「分区显示设置」里可为每个分区调整显示/隐藏与分组归属；
5. 设置会自动保存（`localStorage`），下次打开仍然有效。

---

## 目录结构

```
dsh-settings-tidy/
├── LICENSE            # MIT 许可证
├── README.md          # 本文件
├── package.json       # DSH 插件清单（name / exports / dsh.client 配置）
└── dsh/
    ├── index.js       # Host 端入口（空壳，本插件无 Host 逻辑）
    └── client.js      # 浏览器端实现（核心）
```

---

## 技术原理

- **设置分区**：通过 DSH 的 slot 系统向 `settings.section` 注册一个 `id: "tidy"`、`order: 900` 的条目，并注入一个 React 组件作为分区内容。
- **紧凑模式**：把偏好写入 `<html data-dsh-tidy="compact">`，再用 CSS 选择器 `[data-dsh-tidy="compact"] .VOzbGW_*` 覆盖纳米组件的默认间距/尺寸。DSH 的 CSS 采用 hashed class 命名，选择器直接匹配原生设置外壳的已知类名。
- **侧边栏分区整理**：`MutationObserver` 监听设置外壳的导航栏 `<nav.VOzbGW_nav .VOzbGW_navList>`，按分区标签文字匹配用户配置，用 `display:contents` 折叠容器对相邻分区分组、用类名隐藏指定分区。因为 DSH 没有在 DOM 暴露分区内部 id，这里以**可见标签**作为匹配键，并对大小写不敏感。
- **偏好持久化**：全部读写 `localStorage` 的 `dsh-settings-tidy` 键，无任何服务端/网络依赖。

---

## 兼容性

- 纯客户端插件，**无需 Host 端支持**，`dsh/index.js` 为空壳。
- **不影响其他插件**正常注册设置项；不 shadow `sidebar.settings` 或 `settings.section` 已有条目。
- **不侵入 React 渲染树**，分组仅做 DOM 重排，与其他插件无直接耦合。
- 仅依赖 `react`（由 DSH 客户端运行时提供），通过 `window.__ModuleLoader__.load` 以懒惰 CJS 方式加载，无需构建步骤。

> 说明：DSH 的 slot 系统会拒绝重复声明同一 slot 的 children，因此无法在保持所有分区内容不变的前提下整体替换设置外壳。本插件采用**增量式**方案——保留原生设置面板的完整性，通过 CSS 与 DOM 操作达到整理效果，这是当前架构下最安全、兼容性最好的优化路径。

---

## 已知限制

- 侧边栏分区整理以**分区可见标签**作为匹配键（DSH 未暴露分区内部 id）；若同一系统提示下有重名分区，个别条目可能匹配到命名相同的分区。
- 紧凑模式与侧边栏分区整理针对当前 DSH 原生设置外壳的 hashed class 编写（`VOzbGW_*`）；若未来 DSH 调整这些类名，需要同步更新 `dsh/client.js` 中的 CSS 选择器与 DOM 选择器。

---

## 开发

本插件无构建步骤，改完即用：

```bash
# 校验语法
node --check dsh/client.js
node --check dsh/index.js
```

主要改动点都在 `dsh/client.js`：

- 分组规则：分区自动分组映射 `NAV_GROUPS`
- 侧边栏分区整理：`arrangeNav()`、`syncNavHidden()`
- 分区显示设置：`SectionSettings` 组件
- CSS 覆盖：`CSS` 字符串
- 分区组件：`SettingsTidySection`
- 入口：`apply(ctx)`

---

## License

[MIT](LICENSE)
