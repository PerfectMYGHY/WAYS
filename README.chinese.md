# WAYS

**W**orker, **A**re **Y**ou **S**leeping?

一个跨平台的 JavaScript 库，用于检测浏览器开发者工具是否打开，基于多 Worker 心跳机制与随机自愈对抗策略。

**GitHub**: [https://github.com/PerfectMYGHY/WAYS](https://github.com/PerfectMYGHY/WAYS)  
**npm**: [https://www.npmjs.com/package/@perfectghy/ways](https://www.npmjs.com/package/@perfectghy/ways)

## 目录

[英文版](./README.md)

- [概述](#概述)
- [工作原理](#工作原理)
- [安装](#安装)
- [使用指南](#使用指南)
- [API 参考](#api-参考)
- [防御机制](#防御机制)
- [已知限制](#已知限制)
- [许可证](#许可证)

## 概述

WAYS 是一个 TypeScript 库，用于检测浏览器开发者工具是否被打开。与传统的基于单点 debugger 语句或时间差攻击的检测方法不同，WAYS 采用分布式、自愈的 Worker 池，使得普通用户极难绕过检测。

该库在所有主流浏览器和平台上均稳定运行，因为它仅使用标准 Web API。无 hack，无非标准特性，无浏览器特定漏洞利用。

## 工作原理

WAYS 基于一个简单而有效的原理：Worker 定期向主线程发送心跳消息。如果 Worker 被 debugger 语句挂起，其心跳停止，主线程随即检测到中断。

### 架构

1. Worker 池管理
   - 库维护一个动态的 Web Worker 集合。
   - 每个 Worker 运行一个紧凑循环：`setInterval(() => { debugger; postMessage("alive"); }, 100)`。
   - 正常情况下，每个 Worker 每 100 毫秒发送一次心跳。

2. 心跳监控
   - 主线程记录每个 Worker 的最后心跳时间。
   - 如果某个 Worker 的最后心跳时间距今超过 200 毫秒，则视为“睡着”。
   - `getIsOpenedDevTools()` 方法在任一 Worker 睡着时返回 `true`。

3. 自愈与随机化
   - 每 3 秒，库随机辞退一部分 Worker，并招募等量的新 Worker 进行替换。
   - 该过程由互斥锁保护，确保辞退与招募操作的一致性。
   - 随机化机制使得攻击者难以建立稳定的调试环境。

4. 优雅终止
   - 调用 `stopDetecting()` 时，检测循环退出。
   - 所有剩余的 Worker 会被正确辞退并终止，防止资源泄漏。

5. 互斥锁保护
   - Worker 池的修改操作（辞退与招募）和检测读取操作均由互斥锁保护。
   - 确保 Worker 池在读操作期间不会被修改，避免状态不一致。

## 安装

使用 npm：

```bash
npm install @perfectghy/ways
```

使用 yarn：

```bash
yarn add @perfectghy/ways
```

## 使用指南

### 基础示例

```typescript
import WAYS from '@perfectghy/ways';

// 创建实例
const detector = new WAYS();

// 设置 Worker 脚本地址（库提供了 ways.worker.js）
await detector.setWorkerAddress('/path/to/ways.worker.js');

// 启动检测
detector.startDetecting();

// 检查开发者工具是否打开
const isOpen = await detector.getIsOpenedDevTools();
console.log('开发者工具打开状态:', isOpen);

// 停止检测
detector.stopDetecting();
```

### HTML 示例（独立页面）

以下是一个完整的 HTML 测试页面示例，演示如何通过 script 标签引入库并实时检测开发者工具。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>WAYS 测试页面</title>
</head>
<body>
    <script src="dist/ways.js"></script>
    <p>我可察觉你是否开启了控制台，延迟不超过 200ms。</p>
    <p id="result">检测中...</p>
    <script>
        const ways = new WAYS();
        ways.setWorkerAddress("dist/ways.worker.js")
            .then(() => {
                ways.startDetecting();
                const displayer = document.getElementById("result");
                setInterval(async () => {
                    const opened = await ways.getIsOpenedDevTools();
                    if (opened) {
                        displayer.innerHTML = "被发现了吧！你打开了开发者工具！";
                    } else {
                        displayer.innerHTML = "你居然还没有打开开发者工具，快打开！";
                    }
                }, 50);
            });
    </script>
</body>
</html>
```

**示例说明：**

| 行 | 说明 |
|----|------|
| `<script src="dist/ways.js"></script>` | 从分发目录加载编译后的 WAYS 库。 |
| `const ways = new WAYS();` | 创建一个新的检测器实例。 |
| `ways.setWorkerAddress("dist/ways.worker.js")` | 配置 Worker 脚本位置（库提供了此文件）并验证其可访问性。 |
| `ways.startDetecting()` | 启动 Worker 池和检测循环。 |
| `setInterval(async () => { ... }, 50)` | 每 50 毫秒轮询检测状态。 |
| `await ways.getIsOpenedDevTools()` | 若有 Worker 睡着则返回 `true`，表示开发者工具已打开。 |
| `displayer.innerHTML = ...` | 更新页面以显示当前检测状态。 |

该示例每 50 毫秒检测一次，提供近乎实时的反馈。当开发者工具被打开时，由于 Worker 的心跳间隔为 100 毫秒，检测将在至多 200 毫秒内触发。

### Worker 脚本

库在分发包中提供了 Worker 脚本（`ways.worker.js`）。你只需通过 `setWorkerAddress()` 引用它即可。Worker 脚本实现了心跳机制：

```javascript
// ways.worker.js（由库提供）
setInterval(() => {
    debugger;
    postMessage("alive");
}, 100);
```

你不需要自己创建此文件；它已经包含在 npm 包中。

## API 参考

### 类：WAYS

#### 属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `max_workers` | `number` | `10` | Worker 池中的最大 Worker 数量 |
| `dismissed_workers` | `number` | `1` | 每个重置周期辞退并招募的 Worker 数量 |

#### 方法

##### `setWorkerAddress(workerAddress: string): Promise<void>`

设置 Worker 脚本的 URL。该方法在解析前会验证脚本是否可访问。

- `workerAddress`：Worker JavaScript 文件的绝对或相对 URL（通常为 `ways.worker.js`）。
- 返回：当 Worker 脚本成功获取时 resolve，若脚本无法加载则 reject。

##### `startDetecting(): void`

启动检测循环。该方法初始化 Worker 池并开始周期性的重置循环。

- 立即生成 `max_workers` 个 Worker。
- 每 3 秒随机辞退 `dismissed_workers` 个 Worker，并招募相同数量的新 Worker。
- 检测循环持续运行直到调用 `stopDetecting()`。

##### `stopDetecting(): void`

停止检测循环并辞退所有剩余的 Worker。

- 检测循环优雅退出。
- 池中所有 Worker 通过 `dismiss()` 被终止。
- 防止资源泄漏，确保正确清理。

##### `getIsOpenedDevTools(): Promise<boolean>`

检查是否有 Worker 当前处于睡着状态。

- 返回：若有 Worker 超过 200 毫秒未发送心跳则返回 `true`，否则返回 `false`。
- 该方法受互斥锁保护，若重置操作正在进行则会等待。

##### `get lastError(): Error | undefined`

返回检测过程中遇到的最后一个错误（若有）。

### 类：WWorker

内部类，代表单个 Worker。不供直接使用。

#### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `sleeped` | `boolean` | 若 Worker 的最后心跳距今超过 200 毫秒则为 `true` |

#### 方法

##### `dismiss(): void`

终止 Worker 并发送辞退消息。

## 防御机制

WAYS 采用多层防御，使得绕过检测对大多数用户而言不切实际。

### 多 Worker 心跳

库使用最多 10 个并发 Worker，每个独立发送心跳。禁用或杀死单个 Worker 无法停止检测；其余 Worker 将继续报告。

### 随机自愈

每 3 秒，Worker 池会进行部分重置。Worker 被随机选中辞退并替换为新 Worker。这带来多重效果：

- 攻击者无法简单识别并禁用所有 Worker，因为新 Worker 在不断被创建。
- 随机化使得检测模式非确定性，阻碍对行为的逆向工程尝试。
- 每个新 Worker 启动独立的心跳周期，引入新的 debugger 断点。

### Debugger 增殖

每个 Worker 在其心跳循环中包含一个 `debugger` 语句。当开发者工具打开且断点启用时：

- 每 100 毫秒，每个活跃 Worker 都会命中一个 `debugger` 语句。
- 用户必须手动恢复每个 Worker 的执行，反复进行。
- 由于 Worker 每 3 秒重置一次，新 Worker 会引入额外的 `debugger` 断点。

即使断点被禁用，用户也必须反复点击“继续”以允许 Worker 继续执行，而重置周期会持续引入新的断点。

### 优雅终止

调用 `stopDetecting()` 时：

- 检测循环立即退出。
- 所有 Worker 被正确辞退并终止。
- 确保不会泄漏资源，应用可以干净清理而不会留下孤儿 Worker。

### 互斥锁保护

代码的关键部分受互斥锁保护，确保：

- Worker 池的修改（辞退与招募）是原子性的。
- 检测读取操作与正在进行的修改隔离。
- 不存在可被利用来读取不一致状态的竞态条件。

## 已知限制

### 断点禁用

如果用户手动禁用开发者工具中的断点，Worker 中的 `debugger` 语句将不会暂停执行。但是：

- 用户必须保持开发者工具打开并反复手动恢复执行。
- 重置周期每 3 秒引入带有新 `debugger` 断点的新 Worker。
- 大多数用户会因感到足够挫败而放弃调试尝试。

### JavaScript 禁用

如果 JavaScript 被完全禁用，库无法执行。但在该场景下，开发者工具对于调试应用也基本无用，因为页面本身也不会运行。

### 性能影响

库会生成最多 10 个 Worker，每个运行 100ms 间隔的循环。在正常情况下，性能开销极小。但当开发者工具打开且断点启用时，用户反复点击“继续”可能导致明显的 UI 卡顿。

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。
