# 安装 dsh-vaspflow（DSH 0.2.x）

> 面向自动化 agent 的执行说明。按顺序执行，每步验证后再继续。

## 前置检查

```bash
dsh --version
```

- 输出必须以 `0.2.` 开头。不是则停止，本包不支持其他版本。
- 若提示 `dsh: command not found`，改用桌面应用自带的启动器（路径见下），后文所有 `dsh` 都用它替代。

**桌面版 launcher 路径**

| 平台 | 路径 |
|---|---|
| macOS | `/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh` |
| Windows | `%LOCALAPPDATA%\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd` |
| Linux | `/usr/lib/deepseek-harness/resources/runtime/cli/bin/dsh` |

确认 DSH 的 profile 名：桌面应用用 `desktop`，命令行 Web 用 `web`。

## 安装

二选一。

### A. 从本地目录（已拿到插件源码）

```bash
cd <插件目录>/plugins/dsh-vaspflow
node scripts/install-dsh.mjs install --profile desktop
```

脚本会：检查 DSH 版本 → 用 `dsh plugin add` 装进 profile → 打印完成信息。

### B. 手动等价命令

```bash
dsh plugin --profile desktop add <插件目录的绝对路径>
```

## 重启

必须**完全退出并重新打开** DSH 应用，仅刷新页面无效。

- macOS：`osascript -e 'tell application "DeepSeek Harness" to quit'`，再打开应用
- Windows：关闭窗口并确认托盘无残留进程

## 验收

逐项确认，任一失败即视为未装好。

1. 侧边栏底部出现 **VASP** 图标
2. 点开后能输入项目路径并扫描出任务
3. 新建会话的预设下拉里出现 **「VASP 计算助手」**，且无红字「加载失败」
4. 选中该预设后，工具列表含 `vasp_scan`、`vasp_inspect_tasks`、`vasp_convergence`

## 排错

| 现象 | 原因 | 处理 |
|---|---|---|
| `dsh: command not found` | 桌面版不写 PATH | 用上面的 launcher 绝对路径 |
| 侧边栏无 VASP | 装进了错误的 profile | 确认 `dsh plugin --profile <名> add` 的 profile 与运行平台一致；桌面应用是 `desktop` |
| 预设显示「加载失败」 | 预设声明错误 | 看红框内文字，常见为 `names no plugin`（`name` 非字符串）或 `invalid config`（字段名不符） |
| 面板能开但字号极小 | 样式作用域未生效 | 确认客户端 bundle 为最新构建：`node scripts/build-client.mjs` |
| 点「分析此任务」提示找不到输入框 | 旧版 bundle | 重新构建；新版会先切回会话视图再注入 |

## 卸载

```bash
dsh plugin --profile desktop remove dsh-vaspflow
```

然后在 profile 的 `package.json` 中确认 `dsh.profile.bundles` 已移除 `dsh-vaspflow`，重启应用。
