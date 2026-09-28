// role: [工程师]+[AI]
// 议程文本编辑的纯数据处理：保持结构化事项的业务字段不被 UI 编辑覆盖。

export function createEditableAgenda(agenda = []) {
  return agenda.map((item) => ({
    ...item,
    item: item.item || '',
    host: item.host || '',
  }));
}

export function createNormalAgendaItem(id) {
  return { id, kind: 'normal', item: '', host: '' };
}

export function normalizeEditedAgenda(agenda = []) {
  return agenda
    .map((item) => ({
      ...item,
      item: item.item?.trim() || '',
      host: item.host?.trim() || '',
    }))
    .filter((item) => item.item);
}
