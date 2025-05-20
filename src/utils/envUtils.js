const fs = require('fs');
const path = require('path');

/**
 * 解析.env文件，提取变量、注释、分组
 * @param {string} filePath - .env文件路径
 * @returns {Array} 分组后的变量、注释、值结构体
 */
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const groups = [];
  let currentGroup = { group: '未分组', items: [] };
  let lastComments = [];

  // 分组关键字映射
  const groupKeywords = [
    { key: 'DOMAIN', group: '基础配置' },
    { key: 'IMAP', group: '邮箱配置' },
    { key: 'TEMP_MAIL', group: '临时邮箱配置' },
    { key: 'BROWSER_', group: '浏览器配置' }
  ];

  function getGroupName(key) {
    for (const g of groupKeywords) {
      if (key.startsWith(g.key)) return g.group;
    }
    return '其他配置';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#')) {
      lastComments.push(line.replace(/^#\s?/, ''));
    } else if (/^[A-Z0-9_]+=/.test(line)) {
      const [key, ...rest] = line.split('=');
      const value = rest.join('=');
      const comment = lastComments.join(' ');
      lastComments = [];
      const groupName = getGroupName(key);
      let group = groups.find(g => g.group === groupName);
      if (!group) {
        group = { group: groupName, items: [] };
        groups.push(group);
      }
      group.items.push({ key, value, comment });
    } else {
      lastComments = [];
    }
  }
  return groups;
}

/**
 * 将结构体转回.env文本，保留注释
 * @param {Array} config - 分组结构体
 * @returns {string} .env文本
 */
function stringifyEnvConfig(config) {
  let lines = [];
  for (const group of config) {
    lines.push(`# === ${group.group} ===`);
    for (const item of group.items) {
      if (item.comment) lines.push(`# ${item.comment}`);
      lines.push(`${item.key}=${item.value}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * 获取默认.env内容（可根据实际情况修改）
 */
function getDefaultEnvConfig() {
  // 可根据实际项目需求返回默认.env内容
  return '';
}

module.exports = {
  parseEnvFile,
  stringifyEnvConfig,
  getDefaultEnvConfig
}; 