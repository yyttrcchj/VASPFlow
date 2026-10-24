# VASPFlow · DSH 0.2 适配版

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 用的 **VASP 科研助手插件**：右侧任务面板负责扫描、看收敛曲线、看 3D 结构、翻文件；配套的「VASP 计算助手」预设让 AI 直接读取任务状态并分析。

一句话：**装上它，DSH 里就多了一个能看懂 VASP 计算目录的科研助手。**

> 这是 [`21271122/VASPFlow`](https://github.com/21271122/VASPFlow) 的 fork，把它适配到了 **DSH 0.2.x**。上游版只支持 DSH `0.1.0-rc.6`。原项目版权归其贡献者，按 MIT 分发；本 fork 的修改同样以 MIT 发布，详见 [`NOTICE`](NOTICE)。

---

## 我该用哪个版本？

| 你的 DSH | 用这个 |
|---|---|
| **0.2.x**（当前主线） | **本仓库** |
| 0.1.0-rc.6 | [上游原版](https://github.com/21271122/VASPFlow) |

不确定版本就在终端跑 `dsh --version`，输出以 `0.2.` 开头就是 0.2.x。

---

## 安装

全程约 3 分钟。

### 第 1 步：确认 DSH 版本

```bash
dsh --version
```

必须输出 `0.2.x`。

> **如果提示 `dsh: command not found`**：DSH 桌面版不会把 `dsh` 写进 PATH，这是正常现象。改用桌面应用自带的启动器（下文用 `$DSH` 代指）：
>
> | 平台 | 路径 |
> |---|---|
> | macOS | `/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh` |
> | Windows | `%LOCALAPPDATA%\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd` |
> | Linux | `/usr/lib/deepseek-harness/resources/runtime/cli/bin/dsh` |

### 第 2 步：克隆并安装

```bash
git clone https://github.com/yyttrcchj/VASPFlow.git
cd VASPFlow/plugins/dsh-vaspflow
node scripts/install-dsh.mjs install --profile desktop
```

`--profile` 要填**你实际在用的 profile**：

| 你怎么用 DSH | profile |
|---|---|
| 桌面应用（双击图标打开） | `desktop` |
| 命令行 `dsh web` | `web` |

> **这一步最容易错。** 装错 profile 的典型表现是：命令显示成功，但侧边栏就是没有 VASP。

手动等价命令（脚本报错时用）：

```bash
$DSH plugin --profile desktop add "$(pwd)"
```

### 第 3 步：重启 DSH

**完全退出应用再打开**，不是刷新页面。

- macOS：`osascript -e 'tell application "DeepSeek Harness" to quit'`，然后重新打开
- Windows：关闭窗口，确认托盘没有残留进程后再启动

### 第 4 步：验收

按顺序检查，全部通过才算装好：

1. 侧边栏底部出现 **VASP** 图标
2. 点开面板，填入一个 VASP 项目根目录，能扫描出任务
3. **新建会话**时，预设下拉里出现「**VASP 计算助手**」，且**没有红字「加载失败」**
4. 选中该预设后，工具列表里能看到 `vasp_scan`、`vasp_convergence`

第 3 条最关键：预设没加载成功，`vasp_*` 工具就一个都用不了。

---

## 怎么用

1. 打开右侧 **VASP** 面板
2. 填入**项目根目录**（包含多个 VASP 计算目录的上一层文件夹），点「打开」
3. 面板自动扫描，列出任务、目录和状态统计
4. 点顶部状态标签（未输出 / 完成 / 运行中 / 错误 / 待检查）可以筛选，选中的标签会高亮，再点一次取消
5. 选中任务后：
   - **收敛图表** —— 能量与最大力随离子步的变化
   - **3D 结构** —— 查看 `POSCAR` / `CONTCAR` / `*.vasp`
   - **文件** —— 浏览任务目录和文件内容
6. 点「**分析此任务**」，任务上下文会自动填进对话输入框，交给 AI 分析

### 3D 结构操作

| 操作 | 效果 |
|---|---|
| 左键拖拽 | 旋转（VESTA 式） |
| 右键 / `Shift` + 左键 | 平移 |
| 滚轮 | 缩放（先点一下画布） |
| 方向键 | 旋转；`Shift` + 方向键微调 |
| 点击原子 | 查看元素与坐标；连续点两个可测距 |

齿轮按钮里可切换球棍/空间填充、化学键、晶胞、背景、原子大小、a/b/c 扩胞、沿晶轴观察、导出 PNG。

---

## 和上游的区别

上游只支持 DSH `0.1.0-rc.6`。DSH 0.2 改动很大，本 fork 做了以下适配：

### 相对上游新增的功能

除了版本适配，本 fork 还从上游 `codex/dsh-0.2-compat` 分支移植了这些能力，并修正到能在 0.2 上运行：

| 功能 | 说明 |
|---|---|
| **批量结果收集** `vasp_collect_results` | 按父目录深度或精确任务路径批量读取弛豫 / 频率 ZPE 数值；每项带单位、来源文件、字段和缺失原因 |
| **NEB 结构查看** | 结构目录不再要求是完整 VASP 任务，NEB image 文件夹（只有 POSCAR/CONTCAR）也能渲染；批量上限 12 → 20 |
| **WebGL 容错** | 图形上下文创建失败或被中断时给出重试提示，而不是空白画布 |

### 适配对照

| 层面 | 上游（0.1.x） | 本 fork（0.2.x） |
|---|---|---|
| 客户端挂载 | `[data-dsh-frame]` 网格轨道 + DOM 自愈插入 | 槽位注册（`sidebar.panellist` + `main`） |
| 客户端依赖 | `dsh-client-runtime`（0.2 已删除） | locale / layout / sidebar 三个真实包 |
| Agent 预设 | 复制文件到 `.agent-presets/` | `@deepseek-ai/dsh-agent-preset` 条目 + `dsh.bundle.patch` 声明 |
| 预设 `persona` | `text` 字段 | `prefix` 字段（0.2 schema 要求） |
| persona 模板变量 | `{{model}}` / `{{cwd}}` 都可用 | 只有 `{{provider}}` / `{{model}}`；工作目录改走 runtime context |
| 本地工具引用 | `./tools/x.mjs` 相对路径 | 包子路径（`name` 必须是字面量） |
| 对话输入框 | `<textarea>` | Lexical 富文本，合成 paste 注入 |
| workflow 引擎 | `dsh-workflow-worker-thread` | `dsh-workflow-ptc` |

> DSH 0.2 **不再扫描** `.agent-presets` 目录，往那里复制文件不会生效——这是从 0.1 迁移时最容易踩的坑。

---

## 出了点问题

| 现象 | 原因 | 怎么办 |
|---|---|---|
| `dsh: command not found` | 桌面版不写 PATH | 用第 1 步表格里的完整路径 |
| 装完侧边栏没有 VASP | profile 装错了 | 确认 `--profile` 是 `desktop`（桌面版）还是 `web`（命令行） |
| 预设显示「加载失败」 | 预设声明有问题 | 看红框里的文字，对照下表 |
| 每条消息都报 `unknown prompt variable "{{cwd}}"` | persona 用了 0.2 已移除的变量 | 见下方[「`{{cwd}}` 报错」](#cwd-报错已修复) |
| 回复内容不渲染 Markdown，`**粗体**` 原样显示 | 旧版 bundle | 重新构建：`node scripts/build-client.mjs` |
| 面板能开但字很小 | 样式没生效 | 重新构建：`node scripts/build-client.mjs` |
| 点「分析此任务」提示找不到输入框 | 旧版 bundle | 重新构建；新版会先切回会话再注入 |
| 面板空白、无任务 | 路径填的是单个计算目录 | 填**上一层**的项目根目录 |

### 预设「加载失败」的具体报错

| 红框文字 | 含义 | 处理 |
|---|---|---|
| `names no plugin` | 某行 `name` 不是字符串 | 预设文件被改坏了，恢复 `preset/vasp.patch.yml` |
| `invalid config: $.prefix missing` | `persona` 缺 `prefix` | 同上，`persona` 必须用 `prefix` 而不是 `text` |
| `never started` | 本地工具模块没找到 | 工具必须以包子路径引用，不能用相对路径 |
| `waiting for service: agentPresets` | 该 profile 没有预设注册表 | 换用 `desktop` 或 `web` 这类完整 profile |

所有报错都能在 `~/Library/Logs/DeepSeek Harness/`（macOS）或应用日志里找到完整堆栈。

### `{{cwd}}` 报错（已修复）

如果你用的是 0.4.1 之前的版本，选中「VASP 计算助手」后**每条消息都会立刻失败**，一个 token 都收不到：

```
unknown prompt variable "{{cwd}}" in section "deployment:persona-prefix";
registered variables: provider, model
```

**原因**：DSH 0.1.x 的 agent loop 注册 `model` 和 `cwd` 两个模板变量，所以上游写法在 0.1 上是对的。0.2.x 把契约改了——只注册 `provider` 和 `model`，工作目录改为通过**必需的 runtime context** 注入。而提示词注册表对 `{{...}}` 是严格校验的，遇到未注册变量直接抛错。

**修复**：从 persona 里删掉 `{{cwd}}` 引用。工作目录信息不会丢，它本来就会以 `Current working directory: "..."` 出现在 runtime context 里。

```diff
  prefix: >-
    你是一名由 {{model}} 模型驱动的 VASP 计算化学编码 Agent。
-   你的工作目录是 {{cwd}}。
```

这个修复已包含在当前版本中（`92faacd`）。已同步反馈给上游：[`21271122/VASPFlow#1`](https://github.com/21271122/VASPFlow/issues/1)。

> 如果自己改过 `preset/vasp.patch.yml`，注意别再写回 `{{cwd}}`。

### `vasp_say` 回复的显示效果（0.4.1 起）

`vasp` 预设不让模型输出 assistant 正文，所有回答都通过 `vasp_say` 工具交付，所以**工具行就是回复本身**。0.4.1 修了两个显示问题：

| 问题 | 原因 | 现在的行为 |
|---|---|---|
| Markdown 不渲染，`**粗体**`、反引号原样显示 | 容器带了 `white-space: pre-wrap`，把排版压平 | 复用宿主自己的 Markdown 渲染器，排版与正常回复一致 |
| 回复整段突然出现 | 输出校验必须先收完整候选才能决定是否放行，token 流到不了客户端 | 校验通过后按长度渐进显现（约 0.9–2.4 秒）；历史消息和重新打开会话不重播动画 |

如果这两项没生效，多半是 bundle 还是旧的——重新构建即可：

```bash
cd plugins/dsh-vaspflow && node scripts/build-client.mjs
```

---

## 卸载

```bash
$DSH plugin --profile desktop remove dsh-vaspflow
```

然后打开 `~/.dsh/profiles/desktop/package.json`，确认 `dsh.profile.bundles` 里已经没有 `dsh-vaspflow`，重启应用。

---

## 开发者

```bash
cd plugins/dsh-vaspflow
pnpm install --no-frozen-lockfile
npm run build     # 构建浏览器 bundle → lib/client.js
npm test          # 宿主单元测试
npm run verify    # 发布前校验
```

`verify` 会检查：exports/bin 目标、客户端 bundle 的槽位注册、bundle patch 完整性、预设声明、预设引用的宿主包能否解析、行 `name` 是否为字面量、宿主入口能否加载。

定位宿主包时可指定：

```bash
DSH_HOST_NODE_MODULES=/path/to/dsh/node_modules npm run verify
```

### 目录结构

```
plugins/dsh-vaspflow/
├── package.json            # exports、dsh.bundle.patch、dsh.client
├── cordis.patch.yml        # 宿主插件挂载
├── preset/
│   ├── vasp.patch.yml      # Agent 预设声明（DSH 0.2 机制）
│   └── vasp/               # 预设自带 skills 与工具桥
├── lib/
│   ├── index.js            # 宿主：HTTP 路由 + vasp_* 工具服务
│   ├── client.js           # 浏览器 bundle（构建产物）
│   └── host/               # 数据层：scanner / parser / structure
├── src/client/             # 前端源码（React + three.js + antd）
└── scripts/                # 构建 / 校验 / 安装
```

---

## License

MIT。分发时请保留 [`LICENSE`](LICENSE) 与 [`NOTICE`](NOTICE)。
