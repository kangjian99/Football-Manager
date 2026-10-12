/**
 * 球队与球员数据库总入口
 * 
 * - 英格兰联赛（英超 20 队 + 英冠 24 队）：全部球员与俱乐部定义在 ./constants_e.ts
 * - 意大利联赛（意甲 20 队 + 意乙 20 队）：完整数据归档在 ./constants_i.ts
 * - 意乙 24 队扩充演示版：位于 ./constants_b24.ts
 * 
 * 提示：手动修改球员名单、评分、年龄或俱乐部属性，请直接修改 ./constants_e.ts 即可！
 */

export * from './constants_e';

// 向后兼容意甲/意乙导出
export { SERIE_A_TEAMS, SERIE_B_TEAMS } from './constants_i';
