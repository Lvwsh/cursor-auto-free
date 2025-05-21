import React, { useEffect, useState } from 'react';
import { Radio, Input, Button, message } from 'antd';
import styles from './SettingsPage.module.css';

const API_BASE = 'http://localhost:3001';

const SettingsPage: React.FC = () => {
  const [form, setForm] = useState({
    DOMAIN: '',
    MAIL_TYPE: 'temp', // 'temp' or 'imap'
    TEMP_MAIL: '',
    TEMP_MAIL_EPIN: '',
    TEMP_MAIL_EXT: '',
    BROWSER_PATH: '',
    BROWSER_USER_AGENT: '',
    BROWSER_HEADLESS: 'False', // 'True' or 'False'
  });

  useEffect(() => {
    // @ts-ignore
    if (window.electronAPI && window.electronAPI.getEnvContent) {
      window.electronAPI.getEnvContent().then((content: string) => {
        const lines = content.split('\n');
        const data: any = {};
        lines.forEach(line => {
          if (line.trim() && !line.startsWith('#')) {
            // 只取#前面的内容
            const [kv] = line.split('#');
            if (kv) {
              const [key, ...rest] = kv.split('=');
              let value = rest.join('=').trim();
              value = value.replace(/^['"]|['"]$/g, '').trim(); // 去除首尾引号
              data[key.trim()] = value;
            }
          }
        });
        setForm({
          DOMAIN: data.DOMAIN || '',
          MAIL_TYPE: data.IMAP === '1' ? 'imap' : 'temp',
          TEMP_MAIL: data.TEMP_MAIL || '',
          TEMP_MAIL_EPIN: data.TEMP_MAIL_EPIN || '',
          TEMP_MAIL_EXT: data.TEMP_MAIL_EXT || '',
          BROWSER_PATH: data.BROWSER_PATH || '',
          BROWSER_USER_AGENT: data.BROWSER_USER_AGENT || '',
          BROWSER_HEADLESS:
            (data.BROWSER_HEADLESS || 'False').toLowerCase() === 'true' ? 'True' : 'False',
        });
      });
    }
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    message.info('当前版本仅支持本地读取.env，保存功能请联系开发者扩展。');
  };

  const handleReset = () => {
    message.info('恢复默认设置功能待实现');
  };

  return (
    <div className={styles.settingsContainer}>
      {/* 基础配置 */}
      <div className={styles.settingsCard}>
        <div className={styles.settingsTitle}>基础配置</div>
        <div className={styles.settingsRow}>
          <label>DOMAIN</label>
          <Input
            className={styles.settingsInput}
            value={form.DOMAIN}
            onChange={e => handleChange('DOMAIN', e.target.value)}
          />
        </div>
        <div className={styles.settingsDesc}>
          你的CF路由填写的域名，用于生成邮箱地址和访问服务
        </div>
      </div>

      {/* 邮箱配置 */}
      <div className={styles.settingsCard}>
        <div className={styles.settingsTitle}>邮箱配置</div>
        <Radio.Group
          value={form.MAIL_TYPE}
          onChange={e => handleChange('MAIL_TYPE', e.target.value)}
          className={styles.radioGroup}
        >
          <Radio value="temp" className={styles.radioGreen}>临时邮箱</Radio>
          <Radio value="imap" className={styles.radioGreen}>IMAP</Radio>
        </Radio.Group>
      </div>

      {/* 临时邮箱配置 */}
      <div className={styles.settingsCard}>
        <div className={styles.settingsTitle}>临时邮箱配置</div>
        <div className={styles.settingsRow}>
          <label>TEMP_MAIL</label>
          <Input
            className={styles.settingsInput}
            value={form.TEMP_MAIL}
            onChange={e => handleChange('TEMP_MAIL', e.target.value)}
          />
        </div>
        <div className={styles.settingsDesc}>
          临时邮箱完整地址（包括@后缀部分）
        </div>
        <div className={styles.settingsRow}>
          <label>TEMP_MAIL_EPIN</label>
          <Input.Password
            className={styles.settingsInput}
            value={form.TEMP_MAIL_EPIN}
            onChange={e => handleChange('TEMP_MAIL_EPIN', e.target.value)}
            visibilityToggle
          />
        </div>
        <div className={styles.settingsDesc}>
          临时邮箱PIN码，用于访问临时邮箱服务
        </div>
        <div className={styles.settingsRow}>
          <label>TEMP_MAIL_EXT</label>
          <Input
            className={styles.settingsInput}
            value={form.TEMP_MAIL_EXT}
            onChange={e => handleChange('TEMP_MAIL_EXT', e.target.value)}
          />
        </div>
        <div className={styles.settingsDesc}>
          临时邮箱后缀，包括@符号
        </div>
      </div>

      {/* 浏览器配置 */}
      <div className={styles.settingsCard}>
        <div className={styles.settingsTitle}>浏览器配置</div>
        <div className={styles.settingsRow}>
          <label>BROWSER_PATH</label>
          <Input
            className={styles.settingsInput}
            value={form.BROWSER_PATH}
            onChange={e => handleChange('BROWSER_PATH', e.target.value)}
          />
        </div>
        <div className={styles.settingsDesc}>
          谷歌浏览器可执行文件路径，留空则使用系统默认浏览器
        </div>
        <div className={styles.settingsRow}>
          <label>BROWSER_USER_AGENT</label>
          <Input.TextArea
            className={styles.settingsInput}
            value={form.BROWSER_USER_AGENT}
            onChange={e => handleChange('BROWSER_USER_AGENT', e.target.value)}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </div>
        <div className={styles.settingsDesc}>
          浏览器User-Agent，用于模拟特定浏览器
        </div>
        <div className={styles.settingsRow}>
          <label>BROWSER_HEADLESS</label>
          <Radio.Group
            value={form.BROWSER_HEADLESS}
            onChange={e => handleChange('BROWSER_HEADLESS', e.target.value)}
            className={styles.radioGroup}
          >
            <Radio value="True" className={styles.radioGreen}>True（不显示浏览器界面）</Radio>
            <Radio value="False" className={styles.radioGreen}>False（显示浏览器界面）</Radio>
          </Radio.Group>
        </div>
        <div className={styles.settingsDesc}>
          无头模式设置，True为浏览器在后台运行不显示界面
        </div>
      </div>

      {/* 按钮区 */}
      <div className={styles.buttonRow}>
        <Button onClick={handleReset} className={styles.resetButton}>
          恢复默认设置
        </Button>
        <Button type="primary" onClick={handleSave} className={styles.saveButton}>
          保存设置
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage; 