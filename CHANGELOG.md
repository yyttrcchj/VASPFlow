# 更新日志

本文件记录 VASPFlow（DSH 插件 `dsh-vaspflow`）的版本变更。

版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`主版本.次版本.修订号`。
本项目处于 `0.x`，次版本号提升表示可能包含不兼容变更。

---

## [0.4.1] — 2026-10-24

修掉两个会让插件「看起来完全不能用」的问题：预设每轮崩溃，以及回复的显示不正常。

### 修复

- **`vasp` 预设无法在 DSH 0.2.x 启动**
  预设 persona 里引用了 `{{cwd}}`，但 DSH 0.2.x 的提示词注册表只注册 `provider` 和 `model`，工作目录改为通过必需的 runtime context 注入。模板对未注册变量是严格校验的，于是系统提示词渲染阶段直接抛错，每一轮都在发出请求前失败：

  ```
  unknown prompt variable "{{cwd}}" in section "deployment:persona-prefix";
  registered variables: provider, model
  ```

  这个写法在 DSH 0.1.x 上是对的（当时的 agent loop 注册 `model` 和 `cwd`），属于 0.2 升级带来的破坏性变更。现已从 `preset/vasp.patch.yml` 和 `preset/vasp/agent.cordis.yml` 中移除该引用。工作目录信息不会丢失——它本来就会以 `Current working directory: "..."` 出现在 runtime context 里。

  已同步反馈上游：[`21271122/VASPFlow#1`](https://github.com/21271122/VASPFlow/issues/1)。

- **`vasp_say` 的 Markdown 不渲染**
  回复容器带有 `white-space: pre-wrap`，把 `**粗体**`、列表标记、行内代码全部压成字面量。现改为复用宿主自己的 Markdown 渲染器（`MarkdownText`），排版与正常 assistant 回复一致；`pre-wrap` 只保留给纯文本降级分支。

  Markdown 渲染器按惰性方式解析并带降级：宿主版本缺少该模块时回退为纯文本，而不是让组件抛错——组件抛错会让整个槽位条目变成空白。

- **`vasp_say` 回复整段突然出现，没有流式观感**
  输出校验网关必须先收完整候选才能决定放行还是丢弃（被拒绝的候选一个 chunk 都不能发布），所以模型的 token 流到不了客户端。现在在校验通过后按长度渐进显现（约 0.9–2.4 秒）。动画只对「本次挂载内刚结算」的块生效，因此向上滚动查看历史或重新打开会话时，文本直接完整显示，不会重播。

### 文档

- README 补充两个故障条目及对应说明章节，适配对照表新增「persona 模板变量」一行。

---

## [0.4.0] — 2026-10-23

### 新增

- **批量结果收集** `vasp_collect_results`：按父目录深度或精确任务路径批量读取弛豫 / 频率 ZPE 数值；每项带单位、来源文件、字段和缺失原因。
- **NEB 结构查看**：结构目录不再要求是完整 VASP 任务，NEB image 文件夹（只有 `POSCAR`/`CONTCAR`）也能渲染；批量上限从 12 提升到 20。
- **WebGL 容错**：图形上下文创建失败或被中断时给出重试提示，而不是空白画布。

### 变更

- 合并上游 `codex/dsh-0.2-compat` 分支中可用的能力，并修正到能在 DSH 0.2 上运行。

---

## [0.3.0] — 2026-10-23

### 变更

- 完成 DSH 0.2 适配：客户端挂载从 `[data-dsh-frame]` 网格轨道改为槽位注册；客户端依赖从已删除的 `dsh-client-runtime` 换成 locale / layout / sidebar 三个真实包；Agent 预设从「复制文件到 `.agent-presets/`」改为 `@deepseek-ai/dsh-agent-preset` 条目 + `dsh.bundle.patch` 声明。
- README 重写为面向 DSH 0.2 终端用户的版本。

### 说明

- DSH 0.2 **不再扫描** `.agent-presets` 目录，往那里复制文件不会生效。

---

## 版本对照

| 版本 | 支持的 DSH | 说明 |
|---|---|---|
| `0.4.x` | `0.2.x` | 当前主线 |
| `0.3.x` | `0.2.x` | 首个 0.2 适配版 |
| `0.2.x` 及更早 | `0.1.0-rc.6` | 上游版本，不支持 0.2 |
