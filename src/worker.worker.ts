// 我是被招收进WAYS公司的命苦工人，不知道会不会有一天被解雇。为了不被解雇，我必须每隔50ms对CEO报告：我醒着呢！
postMessage("我醒着呢！"); // 赶快向CEO报告
const interval = setInterval(() => {
    debugger; // 如果控制台打开了，我就打个盹
    postMessage("我醒着呢！"); // 赶快向CEO报告
}, 50); // 每隔50ms执行一下
self.addEventListener('message', () => {
    clearInterval(interval);
});