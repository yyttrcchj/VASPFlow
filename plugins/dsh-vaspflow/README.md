# dsh-vaspflow

面向 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) **0.2.x** 的 VASP 科研助手插件：右侧任务面板（任务扫描、收敛曲线、3D 结构、文件浏览）+ 一套共享的 Node 数据服务。其 `vasp_*` 工具仅向随附的 **VASP 计算助手** Agent 预设暴露。

> 本包已适配 DSH `0.2.1-rc.2`，使用 0.2 的槽位挂载体系与 `dsh.bundle.patch` 预设声明机制。0.1.x 的旧宿主请使用 `dsh-vaspflow@0.2.x`。

---

## 功能一览

| 能力 | 说明 |
|---|---|
| **VASP 任务扫描** | 给定项目根目录，严格识别同时含 `POSCAR`、`INCAR`、`KPOINTS`、`POTCAR` 的 VASP 输入目录；NEB 父目录按专门规则识别 |
| **收敛曲线** | 每个离子步的能量与最大力，图表可视化 |
| **3D 结构查看** | 可切换 `POSCAR` / `CONTCAR` / `*.vasp`；旋转、周期边界成键、原子/键/晶胞渲染、点选测距；按 a/b/c 扩胞、沿晶轴观察并导出 PNG |
| **文件浏览** | 查看任务目录结构与文件内容（`INCAR` / `OUTCAR` / `CONTCAR` 等，500KB 截断预览） |
| **VASP Agent 工具** | 仅在选择「VASP 计算助手」后可用：`vasp_scan`、`vasp_inspect_tasks`、`vasp_convergence`、`vasp_structure_scene`、`vasp_discover_inputs`、`vasp_build_inputs`、`vasp_check_inputs`，加 `vasp_say`、`vasp_done` |
| **一键分析** | 选中任务后「分析此任务」，把任务上下文预填进对话输入框 |

---

## 安装

### 兼容版本

| 项目 | 要求 |
|---|---|
| DSH | `0.2.x`（在 `0.2.1-rc.2` 上验证） |
| Node.js | ≥ 18 |
| pnpm | 由 DSH 自带，或 `corepack enable` |

安装器会先检查 DSH 版本，只接受 `0.2.*`，不匹配即停止且不会留下半安装状态。

### 从仓库安装

在 DSH 的 profile 目录执行：

```bash
node scripts/install-dsh.mjs install --profile desktop --package .
```

`desktop` 是 DSH 桌面应用使用的 profile；CLI 启动请用 profile 实际名称（`web` / `headless` / …）。

脚本等价于两步：

```bash
dsh plugin --profile <name> add <this package>
```

安装后 **重启 DSH 应用**（不是刷新页面）。

### 发布到 npm 后

```bash
npx --yes dsh-vaspflow install --profile desktop
```

---

## 关于 VASP Agent 预设

**安装插件即安装预设，不需要独立步骤。**

DSH 0.2 把 Agent 预设声明为普通 cordis 条目：一个 `@deepseek-ai/dsh-agent-preset` 条目，列在某个 bundle patch 里。本包把预设发布为 [`preset/vasp.patch.yml`](preset/vasp.patch.yml)，并登记在 `package.json` 的 `dsh.bundle.patch`：

```json
"dsh": {
  "bundle": {
    "patch": ["./cordis.patch.yml", "./preset/vasp.patch.yml"]
  }
}
```

> **注意**：DSH 0.2 **不会扫描** `$DSH_HOME/.agent-presets` 目录。向该目录复制预设文件在 0.2 上不会产生任何效果——这是 0.1.x 的旧机制。

重启后在新建会话时选择 **「VASP 计算助手」**；只有该预设会注册全部 `vasp_*` 工具。

---

## 使用

1. 打开右侧 **VASP** 面板；
2. 输入 **项目根目录路径** 并点「打开」；
3. 面板自动扫描并列出任务、目录与状态统计；
4. 点击顶部状态标签（未输出 / 完成 / 运行中 / 错误 / 待检查）可按状态筛选，选中后有高亮，再点一次取消；
5. 点「**分析此任务**」把上下文送入对话输入框。

### 键盘操作（3D 结构）

- 左键拖拽：旋转（VESTA 式，旋转轴保持在屏幕平面）
- 右键 / `Shift` + 左键：平移
- 滚轮：缩放（点击画布后启用）
- 方向键：旋转；`Shift` + 方向键：微调
- 点击原子查看元素与坐标；连续点选两个原子可测距
- 齿轮按钮：球棍/空间填充、化学键、晶胞、背景、原子大小、键粗细、a/b/c 扩胞、沿晶轴观察、导出 PNG

---

## 开发

```bash
pnpm install --no-frozen-lockfile
npm run build     # 构建浏览器 bundle → lib/client.js
npm test          # 宿主单元测试
npm run verify    # 发布产物校验
```

`npm run verify` 会检查：exports/bin 目标、客户端 bundle 的模块头与槽位注册、bundle patch 完整性、预设声明、预设引用的宿主包可解析性、本地工具行存在性、宿主入口可加载。

定位宿主包时可用环境变量指定：

```bash
DSH_HOST_NODE_MODULES=/path/to/dsh/node_modules npm run verify
```

### 目录结构

```
plugins/dsh-vaspflow/
├── package.json          # 元信息、exports、dsh.bundle.patch、dsh.client
├── cordis.patch.yml      # 宿主插件挂载
├── preset/
│   ├── vasp.patch.yml    # Agent 预设声明（DSH 0.2 机制）
│   └── vasp/             # 预设自带的 skills 与工具桥
├── lib/
│   ├── index.js          # 宿主：HTTP 路由 + vasp_* 工具服务
│   ├── client.js         # 浏览器 bundle（构建产物）
│   └── host/             # 数据层：scanner / parser / structure / task-files
├── src/client/           # 前端源码（React + three.js + antd）
└── scripts/              # 构建 / 校验 / 安装
```

### 相对 0.2.x 之前的适配要点

| 层面 | 0.1.x | 0.2.x |
|---|---|---|
| 客户端挂载 | `[data-dsh-frame]` 网格轨道 + DOM 自愈插入 | `sidebar.panellist` + `main` 槽位 |
| 客户端依赖声明 | `dsh-client-runtime` / `dsh-client-connection` | `dsh-client-locale` / `dsh-client-ui-layout` / `dsh-client-ui-sidebar` |
| 对话输入框 | `<textarea>` | Lexical `div[data-composer-input]`，通过合成 paste 注入；面板占用 `main` 槽位时先切回会话再等编辑器挂载 |
| Agent 预设 | 复制到 `.agent-presets/` | `@deepseek-ai/dsh-agent-preset` 条目 + `dsh.bundle.patch` |
| 预设 `persona` 字段 | `text` | `prefix`（必填）/ `suffix` |
| 预设本地模块 | `name: ./tools/x.mjs` | `name: '包名/子路径'`（`name` 必须是字面量，相对路径按 profile 目录解析会失效） |
| workflow 引擎 | `dsh-workflow-worker-thread` | `dsh-workflow-ptc` |
| 样式作用域 | 容器带 `data-dsh-vaspflow-panel` | 槽位容器需自行补该属性，否则全部 scoped CSS 失效 |

### 字号

面板字号由 `ConfigProvider` 的 antd token 统一驱动（`fontSize: 16`，`Tree.titleHeight: 30`）。**不要给 `Tree` 或节点标题写内联 `fontSize`**：内联样式优先级高于任何 scoped 规则，连 `!important` 也覆盖不了，曾导致任务树长期无法看清。

---

## License

MIT
