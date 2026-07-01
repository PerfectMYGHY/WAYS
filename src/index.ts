import bindAll from 'lodash.bindall';
import { waitForMS, pickRandomFromSet } from './utils';
import { Mutex } from 'async-mutex';

/**
 * WAYS公司的工人类
 */
class WWorker {
    /** 内部Worker对象 */
    private worker: Worker;
    /** 上一次回答时间 */
    private last_reply_time: Date;

    /**
     * 初始化函数，创建WAYS公司的工人
     * @param address 工人地址
     */
    constructor(address: string) {
        // 绑定方法
        bindAll(this, [
            'handleMessage',
        ]);
        // 初始化工人并监听他说话
        this.worker = new Worker(address);
        this.worker.addEventListener("message", this.handleMessage);
        // 初始化信息
        this.last_reply_time = new Date();
    }

    /**
     * 处理消息
     * @param msg 消息事件
     */
    private handleMessage(msg: MessageEvent) {
        this.last_reply_time = new Date();
    }

    /**
     * 辞退工人，告诉工人你被辞退了
     */
    public dismiss() {
        this.worker.postMessage("你被解雇啦！");
        this.worker.terminate();
    }

    /**
     * 获取工人是否睡着，超过200ms没回答就算睡着
     */
    public get sleeped(): boolean {
        return (new Date().valueOf() - this.last_reply_time.valueOf()) >= 200;
    }
}

/**
 * WAYS类，用于检测控制台是否开启
 */
export default class WAYS {
    /** 工人地址 */
    private workerAddress?: string;
    /** 工人集合 */
    private workers: Set<WWorker> = new Set();
    /** 是否继续监测 */
    private keep_detecting: boolean = false;
    /** 最大工人数量 */
    public max_workers: number = 10;
    /** 每次淘汰工人数量 */
    public dismissed_workers: number = 1;
    /** 上一个错误信息 */
    private last_error?: Error;
    /** 互斥锁 */
    private mutex = new Mutex();

    /**
     * 初始化WAYS类
     */
    constructor() {
        // 绑定方法
        bindAll(this, [
            'setWorkerAddress',
            'recruitWorker',
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
        this.workers.add(worker);
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
            await this.mutex.runExclusive(async () => {
                for (let i = 0; i < this.max_workers; i++) {
                    this.recruitWorker();
                }
            });
            // 再一直进行工人随机劝退和招募
            while (this.keep_detecting) {
                // 检查参数对不对
                if (this.dismissed_workers > this.max_workers) {
                    this.last_error = new Error("不是，咋能辞退的工人数比总共人数还多啊？");
                    throw this.last_error;
                }
                // 上锁执行
                await this.mutex.runExclusive(async () => {
                    // 随机劝退几个工人
                    const workers = pickRandomFromSet(this.workers, this.dismissed_workers);
                    for (const worker of workers) {
                        worker.dismiss();
                        this.workers.delete(worker);
                    }
                    // 再重新招募几个工人补回来
                    for (let i = 0; i < this.dismissed_workers; i++) {
                        this.recruitWorker();
                    }
                });
                // 让工人工作3s
                await waitForMS(3000);
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

    public async getIsOpenedDevTools(): Promise<boolean> {
        let result = false
        await this.mutex.runExclusive(() => {
            for (const worker of this.workers) {
                if (worker.sleeped) {
                    result = true;
                    break;
                }
            }
        });
        return result;
    }
}