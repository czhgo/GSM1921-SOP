# Checklist

## 一、守卫
- [x] 自建浮层扫描能报出 12 处（改造前证据：7 文件）
- [x] 白名单只含非对话框固定层，且每条写理由
- [x] `ui-modal-form-guard` 全绿（7/7）

## 二、写入口
- [x] 7 处写入口全部走 `openModal`
- [x] 提交 / 取消固定在 footer，不随 body 滚动
- [x] Esc / 遮罩 / × 三条路径均触发 `onCancel`，无残留 objectURL / 未提交选择
- [x] 失败留在浮窗内，已填内容不丢

## 三、只读/确认
- [x] 5 处只读/确认全部走 `openModal`
- [x] 每窗有纯文本标题、焦点移入、关闭后焦点回还
- [x] 背景 inert 生效

## 四、复盘表单
- [x] 页面内联仍显示提交按钮
- [x] 代提交复盘浮窗的提交按钮在 footer
- [x] 代填留痕与提交语义不变

## 五、文档与读数
- [x] §4.27 M-4 与代码一致
- [x] a11y-tree 5/5 / page-sweep 16/16 / module-load 4/4 / form-loop 台账 S0–S6 / prop 四条流程全绿
- [x] `test:daily` 0 断言失败
