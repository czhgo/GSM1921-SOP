// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  domain.js — 领域层 (Domain Layer)
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//  单向依赖链的最底层：不依赖任何其他模块
// ════════════════════════════════════════════════════════════════

/** 当前数据库 Schema 版本（持久化防御用） */
export const SCHEMA_VERSION = 1;

/**
 * @typedef {Object} Activity
 * @property {string}  id          - 唯一标识符（由 id.js 生成）
 * @property {string}  title       - 活动标题
 * @property {string}  type        - 活动类型（如 '组织生活会'、'主题党日'）
 * @property {'draft'|'published'|'ongoing'|'completed'|'cancelled'} status - 活动状态 - Source: knowledge/SOP/常见工作场景快速指南.md#我要组织一次党小组活动
 * @property {'branch'|'group'} visibility - 可见范围：全支部 or 党小组 - Source: knowledge/SOP/支委与党小组定人定责定岗说明.md#一、人员结构与双重身份体系
 * @property {string}  date        - 活动日期 ISO 字符串（YYYY-MM-DD）
 * @property {string}  executor    - 执行角色 - Source: knowledge/SOP/组织委员工作流程指南.md#一、工作职责总览
 * @property {string|null} supervisor - 督办角色（可为 null） - Source: knowledge/SOP/常见工作场景快速指南.md#我要组织一次党小组活动
 * @property {string}  createdBy   - 创建者用户 ID
 * @property {string}  createdAt   - 创建时间 ISO 字符串
 * @property {'normal'|'urgent'} [priority] - 优先级（工作流引擎用） - Source: knowledge/SOP/常见工作场景快速指南.md#我要组织一次党小组活动
 * @property {string}  [dueDate]   - 截止日期 ISO 字符串（自动化提醒锚点）
 * @property {boolean} [archived]  - 软删除标记（true 表示已归档）
 * @property {string}  [domain]    - 领域：'activity' | 'organization' - Source: knowledge/SOP/支委与党小组定人定责定岗说明.md#二、"条条"与"块块"双线管理体系
 * @property {string}  [scenarioId] - 关联的场景 ID（对应 sopDatabase）* - Source: knowledge/SOP/常见工作场景快速指南.md#目录
 * @property {string}  [description] - 活动描述
 * @property {string}  [targetDate]  - 目标日期 ISO 字符串（T-0，兼容旧字段）
 * @property {'leader'|'disc-commissioner'} [attendanceQROwner] - 考勤二维码发布方（组织生活会专用：现场组织的党小组组长） - Source: content/02_institution/sop/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
 * @property {boolean} [isBrand]  - 品牌属性标签（由书记认定，不影响工作流选择） - Source: content/04_web_design/DATA_ARCHITECTURE.md
 */

/**
 * @typedef {Object} AttendanceRecord
 * @property {string}  id          - 唯一标识符（由 id.js 生成）
 * @property {string}  activityId  - 所属活动 ID
 * @property {string}  personId    - 参会成员人员 ID
 * @property {'present'|'absent'|'leave'} status - 出勤状态
 * @property {string}  recordedBy  - 记录人用户 ID（纪检委员）
 * @property {string}  recordedAt  - 记录时间 ISO 字符串
 * @property {string}  [studentId] - 学号 - Source: content/02_institution/sop/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
 * @property {'入党申请人'|'积极分子'|'发展对象'|'预备党员'|'正式党员'} [developStage] - 发展阶段（中文枚举，D-239 统一） - Source: content/02_institution/sop/纪检委员工作流程指南.md#二考勤管理三会一课 + content/04_web_design/DATA_ARCHITECTURE.md §2.5
 * @property {string}  [partyGroup] - 所属党小组 - Source: content/02_institution/sop/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
 */

/**
 * @typedef {Object} Task
 * @property {string}  id          - 唯一标识符（由 id.js 生成）
 * @property {string}  activityId  - 所属活动 ID
 * @property {string}  title       - 任务标题
 * @property {'pending'|'in_progress'|'completed'} status - 任务状态 - Source: knowledge/SOP/组织委员工作流程指南.md#四大工作场景
 * @property {string}  createdAt   - 创建时间 ISO 字符串（审计字段）
 */

/**
 * 参与层级枚举 — Source: content/design/MANAGEMENT_MODE.md §5.3
 * organize = 组织者，deep = 深度参与者，attend = 出勤
 */
export const ParticipationLevel = {
  ORGANIZE: 'organize',
  DEEP_PARTICIPATE: 'deep',
  ATTEND: 'attend',
};

/** 参与层级中文标签 */
export const PARTICIPATION_LEVEL_LABELS = {
  [ParticipationLevel.ORGANIZE]: '组织',
  [ParticipationLevel.DEEP_PARTICIPATE]: '深度参与',
  [ParticipationLevel.ATTEND]: '出勤',
};

/**
 * 考勤状态枚举 — Source: domain.js AttendanceRecord.status
 */
export const AttendanceStatus = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LEAVE: 'leave',
  MADE_UP: 'made_up',
};

/** 考勤状态中文标签 */
export const ATTENDANCE_STATUS_LABELS = {
  [AttendanceStatus.PRESENT]: '出勤',
  [AttendanceStatus.ABSENT]: '缺勤',
  [AttendanceStatus.LEAVE]: '请假',
  [AttendanceStatus.MADE_UP]: '已补',
};

/**
 * 考察来源类型枚举 — Source: D-198
 */
export const SourceType = {
  ACTIVITY: 'activity',
  TASKFORCE: 'taskforce',
};

/** 考察来源类型中文标签 */
export const SOURCE_TYPE_LABELS = {
  [SourceType.ACTIVITY]: '活动',
  [SourceType.TASKFORCE]: '专班',
};

/**
 * 复盘状态枚举 — Source: D-242（本轮补建）
 * 支持复盘三态流转：未提交→已上传→批注中→确认/打回
 */
export const ReviewStatus = {
  NOT_SUBMITTED: '未提交',
  UPLOADED: '已上传',
  ANNOTATING: '批注中',
  CONFIRMED: '已确认',
  REJECTED: '已打回',
};

/** 复盘状态中文标签（与枚举值一致，保持中文显示） */
export const REVIEW_STATUS_LABELS = {
  [ReviewStatus.NOT_SUBMITTED]: '未提交',
  [ReviewStatus.UPLOADED]: '已上传',
  [ReviewStatus.ANNOTATING]: '批注中',
  [ReviewStatus.CONFIRMED]: '已确认',
  [ReviewStatus.REJECTED]: '已打回',
};

/**
 * 复盘记录 — Source: content/04_web_design/DATA_ARCHITECTURE.md §3.1.2 数据流第⑧步 + D-242
 * 活动或专班完成后，组织者提交复盘报告，纪检委员批注/打回/确认
 * @typedef {Object} ReviewRecord
 * @property {string}  id            - 唯一标识符
 * @property {string}  activityId    - 关联活动 ID（活动复盘时必填）
 * @property {string}  [sourceType]  - 来源类型：'activity' | 'taskforce'（专班复盘时为 'taskforce'）
 * @property {string}  [sourceName]  - 来源名称（专班复盘时为专班名称）
 * @property {string}  organizerId   - 组织者人员 ID（须为活动/专班的实际 organizer）
 * @property {string}  progress      - 进度状态（如 '已完成'/'进行中'/'超时'）
 * @property {boolean} overdue       - 是否超时
 * @property {ReviewStatus} reviewStatus - 复盘状态（D-242 枚举）
 * @property {string}  reviewContent - 复盘内容
 * @property {string}  [annotation]  - 批注内容（reviewStatus='批注中'/'已打回'时填写）
 * @property {string}  [annotatedBy] - 批注人 personId（纪检委员）
 * @property {string}  [annotatedAt] - 批注时间 ISO 字符串
 * @property {string}  [submittedAt] - 提交时间 ISO 字符串（reviewStatus 非'未提交'时填写）
 * @property {string}  [confirmedAt] - 确认时间 ISO 字符串（reviewStatus='已确认'时填写）
 */

/**
 * @typedef {Object} InspectionRecord
 * @property {string}  id            - 唯一标识符（由 id.js 生成）
 * @property {'activity'|'taskforce'} sourceType - 考察来源类型（活动 or 专班）— Source: D-198
 * @property {string}  activityId    - 关联活动 ID（sourceType='activity'时必填）
 * @property {string}  sourceName    - 来源名称（sourceType='taskforce'时为专班名称）
 * @property {string}  personId      - 人员 ID（引用 people.js）
 * @property {'organize'|'deep'} level - 考察层级（仅组织者和深度参与者有考察记录） - Source: content/design/MANAGEMENT_MODE.md §5.1
 * @property {string}  role          - 分工角色+描述（如：策划+全流程统筹、视频制作、PPT设计）
 * @property {string}  recordedBy    - 记录人 personId
 * @property {string}  recordedAt    - 记录时间 ISO 字符串
 * @property {'pending'|'confirmed'} [status] - 考察确认状态（纪检委员确认后录入考察总表）
 */

/**
 * 文件空间记录 — Source: CLAUDE.md 乙部 P2-1
 * 纯前端无法真正上传文件，以"文件记录"模式管理文件元数据
 * @typedef {Object} FileSpaceRecord
 * @property {string}  id            - 唯一标识符 `fs_{timestamp}`
 * @property {string}  fileName      - 文件名
 * @property {'experience'|'raw'|'publicity'} category - 文件分类：经验沉淀/原始文件/宣传素材
 * @property {string}  description   - 文件描述
 * @property {string}  sourceType    - 关联来源类型：'activity' | 'taskforce' | 'standalone'
 * @property {string}  sourceId      - 关联来源 ID（standalone 时为空）
 * @property {string}  sourceName    - 关联来源名称（冗余字段，方便展示）
 * @property {string}  uploadedBy    - 上传人 personId
 * @property {string}  uploadedAt    - 上传时间 ISO 字符串
 * @property {string}  [tags]        - 标签（逗号分隔）
 * @property {number}  [fileSize]    - 文件大小（字节，可选）
 */

/**
 * 图片记录 — Source: content/02_institution/sop/宣传委员工作流程指南.md#图片管理规则
 * 宣传委员上传的活动图片，含标注信息与 Base64 编码
 * @typedef {Object} ImageRecord
 * @property {string}  id            - 唯一标识符 `img_{timestamp}`
 * @property {string}  date          - 拍摄日期 YYYY-MM-DD
 * @property {string}  title         - 图片标题
 * @property {string}  subject       - 拍摄主体（如人物/场景/物件）
 * @property {string}  [activityId]  - 关联活动 ID（可选）
 * @property {string}  base64        - Base64 编码图片数据
 * @property {string}  uploadedBy    - 上传人
 * @property {string}  uploadedAt    - 上传时间 ISO 字符串
 */

/**
 * 内存数据库（Mock 层写入此处）
 * 使用 Immutable 原则：所有更新必须用展开符替换整个数组，禁止 push/splice
 */
export const mockDB = {
  _schema: SCHEMA_VERSION,
  users: [
    { id: 'u_sec',  role: 'secretary',         name: '支部书记' },
    { id: 'u_dep',  role: 'deputy-secretary',  name: '支部副书记' },
    { id: 'u_org',  role: 'org-commissioner',  name: '组织委员' },
    { id: 'u_prop', role: 'prop-commissioner', name: '宣传委员' },
    { id: 'u_disc', role: 'disc-commissioner', name: '纪检委员' },
    { id: 'u_exec', role: 'leader',            name: '党小组组长' },
    { id: 'u_orgz', role: 'organizer',         name: '组织者' },
    { id: 'u_deep', role: 'deep',              name: '深度参与者' },
  ],
  /** @type {Activity[]} */
  activities: [],
  /** @type {Task[]} */
  tasks: [],
  /** @type {AttendanceRecord[]} */
  // Fields: studentId（学号）, developStage（发展阶段）, partyGroup（所属党小组）are required for 组织生活会 attendance summary
  // Source: content/02_institution/sop/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
  attendances: [],
  /** @type {InspectionRecord[]} */
  // 考察记录（仅组织者和深度参与者的工作量记录）— Source: content/design/MANAGEMENT_MODE.md §5.1
  inspections: [],
  // ── 以下为存储层统一后从独立键归并的业务数据 ──
  /** @type {Object[]} 分工记录 */
  assignments: [],
  /** @type {Object[]} 交接记录 */
  handovers: [],
  /** @type {Object[]} 补课任务 */
  makeupTasks: [],
  /** @type {Object} 活动子记录（actId → subRecords） */
  actSubRecords: {},
  /** @type {Object} 专班子记录（tfId → subRecords） */
  tfSubRecords: {},
  /** @type {Object[]} 合规引用 */
  complianceReferences: [],
  /** @type {Object[]} 文件空间记录 */
  fileSpaceRecords: [],
  /** @type {Object[]} 经验沉淀 */
  experienceDeposits: [],
  /** @type {Object[]} 专班数据 */
  taskforces: [],
  /** @type {Object[]} 赋权记录（数据同源：AuthStore 统一读写 mockDB.authorizations） */
  authorizations: [],
  /** @type {Object[]} 通知数据 */
  notices: [],
  /** @type {Object[]} 待办任务数据 — Source: content/04_web_design/DATA_ARCHITECTURE.md §2.18 */
  todos: [],
  /** @type {ImageRecord[]} 图片记录 — Source: content/02_institution/sop/宣传委员工作流程指南.md#图片管理规则 */
  imageRecords: [],
};
