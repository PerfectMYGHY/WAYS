import bindAll from 'lodash.bindall';
import { waitForMS, pickRandomFromSet } from './utils';
import EventEmitter from 'eventemitter3';

/**
 * WAYS公司的工人类
 */
class WWorker extends EventEmitter {
    /** 内部Worker对象 */
    private worker: Worker;

    /**
     * 初始化函数，创建WAYS公司的工人
     * @param address 工人地址
     */
    constructor(address: string) {
        super();
        // 绑定方法
        bindAll(this, [
            'handleMessage',
        ]);
        // 初始化工人并监听他说话
        this.worker = new Worker(address);
        this.worker.addEventListener("message", this.handleMessage);
    }

    /**
     * 处理消息
     * @param msg 消息事件
     */
    private handleMessage(msg: MessageEvent) {
        this.emit('received');
    }

    /**
     * 辞退工人，告诉工人你被辞退了
     */
    public dismiss() {
        this.worker.postMessage("你被解雇啦！");
        this.worker.terminate();
    }
}

/**
 * WAYS类，用于检测控制台是否开启
 */
export default class WAYS extends EventEmitter {
    /** 工人地址 */
    private workerAddress?: string;
    /** 工人集合 */
    private workers: Set<WWorker> = new Set();
    /** 是否继续监测 */
    private keep_detecting: boolean = false;
    /** 最大工人数量 */
    public max_workers: number = 5;
    /** 每次淘汰工人数量 */
    public dismissed_workers: number = 0;
    /** 上一个错误信息 */
    private last_error?: Error;
    /** 计时器 */
    private timer?: number;
    /** 超时时长 */
    public internalTimeout: number = 200;

    /**
     * 初始化WAYS类
     */
    constructor() {
        super();
        // 绑定方法
        bindAll(this, [
            'setWorkerAddress',
            'recruitWorker',
            'handleReceive'
        ]);
    }

    /**
     * 设置工人地址
     * @param workerAddress 工人地址（Worker文件所在网址）
     * @returns 一个协程，表示等待验证
     */
    public setWorkerAddress(workerAddress: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // 检查路径是否可访问
            fetch(workerAddress).then(() => {
                // 这个工人确实存在，记录下来位置
                this.workerAddress = workerAddress;
                resolve();
            }).catch(err => {
                // 查找失败
                console.error("你给的这个位置没有我要的工人啊，这是我找工人的信息:", err);
                reject(err);
            });
        })
    }

    /**
     * 招募工人，即创建一个新的工人
     */
    private recruitWorker() {
        if (!this.workerAddress)
            throw new Error("还没有设置工人地址，你就招募工人啊");
        const worker = new WWorker(this.workerAddress);
        worker.on('received', this.handleReceive);
        this.workers.add(worker);
    }

    private handleReceive() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.emit('devToolsClosed');
        this.timer = setTimeout(() => {
            this.emit('devToolsOpened');
        }, this.internalTimeout);
    }

    /**
     * 获取上一个错误内容
     */
    public get lastError(): Error | undefined {
        return this.last_error;
    }

    /**
     * 启动检测程序
     */
    public startDetecting() {
        this.keep_detecting = true;
        new Promise(async () => {
            // 先招募几个工人
            for (let i = 0; i < this.max_workers; i++) {
                this.recruitWorker();
            }
            // 再一直进行工人随机劝退和招募
            while (this.keep_detecting) {
                // 检查参数对不对
                if (this.dismissed_workers > this.max_workers) {
                    this.last_error = new Error("不是，咋能辞退的工人数比总共人数还多啊？");
                    throw this.last_error;
                }
                // 随机劝退几个工人
                const workers = pickRandomFromSet(this.workers, this.dismissed_workers);
                for (const worker of workers) {
                    this.workers.delete(worker);
                    worker.dismiss();
                }
                // 再重新招募几个工人补回来
                for (let i = 0; i < this.dismissed_workers; i++) {
                    this.recruitWorker();
                }
                // 让工人工作5s
                await waitForMS(5000);
            }
            // 停止后辞退所有工人
            for (const worker of this.workers) {
                worker.dismiss();
            }
        });
    }

    public stopDetecting() {
        this.keep_detecting = false;
    }
}