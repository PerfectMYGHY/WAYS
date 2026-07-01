/**
 * 从指定集合中随机选取指定个数个元素
 * @param set 指定的集合
 * @param count 要选取的个数
 * @returns 随机选取的元素
 */
export function pickRandomFromSet<T>(set: Set<T>, count: number): T[] {
    // 1. 将 Set 转换为数组
    const items = Array.from(set);
    const selected: T[] = [];
    const total = items.length;
    
    // 2. 从数组中随机选 count 个（使用 Fisher-Yates 采样思想）
    for (let i = 0; i < count; i++) {
        // 从剩余未选元素中随机选一个索引
        const randomIndex = Math.floor(Math.random() * (total - i));
        // 将选中的元素与当前末尾元素交换（避免重复选）
        [items[total - 1 - i], items[randomIndex]] = [items[randomIndex], items[total - 1 - i]];
        // 将选中的元素加入结果
        selected.push(items[total - 1 - i]);
    }
    
    return selected;
}

/**
 * 协程地等待指定毫秒
 * @param millisecond 毫秒数
 * @returns 协程
 */
export async function waitForMS(millisecond: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, millisecond);
    });
}