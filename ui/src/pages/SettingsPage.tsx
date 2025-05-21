import React, { useEffect, useState } from 'react';
import { Radio, Input, Button, message, Modal } from 'antd';
import styles from './SettingsPage.module.css';

const API_BASE = 'http://localhost:3001';

const SettingsPage: React.FC = () => {
  const [form, setForm] = useState({
    DOMAIN: '',
    MAIL_TYPE: 'temp', // 'temp' or 'imap'
    TEMP_MAIL: '',
    TEMP_MAIL_EPIN: '',
    TEMP_MAIL_EXT: '',
    IMAP_SERVER: '',
    IMAP_PORT: '993',
    IMAP_USER: '',
    IMAP_PASS: '',
    IMAP_DIR: 'INBOX',
    BROWSER_PATH: '',
    BROWSER_USER_AGENT: '',
    BROWSER_HEADLESS: 'False', // 'True' or 'False'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI && window.electronAPI.getEnvContent) {
        const content = await window.electronAPI.getEnvContent();
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
          IMAP_SERVER: data.IMAP_SERVER || '',
          IMAP_PORT: data.IMAP_PORT || '993',
          IMAP_USER: data.IMAP_USER || '',
          IMAP_PASS: data.IMAP_PASS || '',
          IMAP_DIR: data.IMAP_DIR || 'INBOX',
          BROWSER_PATH: data.BROWSER_PATH || '',
          BROWSER_USER_AGENT: data.BROWSER_USER_AGENT || '',
          BROWSER_HEADLESS:
            (data.BROWSER_HEADLESS || 'False').toLowerCase() === 'true' ? 'True' : 'False',
        });
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      message.error(`加载设置失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // 验证设置
  const validateSettings = () => {
    if (!form.DOMAIN) {
      message.error('请填写域名(DOMAIN)');
      return false;
    }

    if (form.MAIL_TYPE === 'temp') {
      if (!form.TEMP_MAIL) {
        message.error('请填写临时邮箱地址');
        return false;
      }
      if (!form.TEMP_MAIL_EPIN) {
        message.error('请填写临时邮箱PIN码');
        return false;
      }
      if (!form.TEMP_MAIL_EXT && !form.TEMP_MAIL.includes('@')) {
        message.error('请填写临时邮箱后缀或确保邮箱地址包含@符号');
        return false;
      }
    } else if (form.MAIL_TYPE === 'imap') {
      if (!form.IMAP_SERVER) {
        message.error('请填写IMAP服务器地址');
        return false;
      }
      if (!form.IMAP_PORT) {
        message.error('请填写IMAP服务器端口');
        return false;
      }
      if (!form.IMAP_USER) {
        message.error('请填写IMAP用户名');
        return false;
      }
      if (!form.IMAP_PASS) {
        message.error('请填写IMAP密码');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    // 验证设置
    if (!validateSettings()) return;

    setLoading(true);
    if (window.electronAPI && window.electronAPI.getEnvContent && window.electronAPI.saveEnvContent) {
      try {
        // 从原始内容中读取当前配置
        const content = await window.electronAPI.getEnvContent();
        const lines = content.split('\n');
        let configLines: string[] = [];
        
        // 跟踪已处理过的键以便后面添加缺失的配置项
        const processedKeys = new Set<string>();
        
        // 保留注释和空行，并更新现有配置项
        lines.forEach(line => {
          if (line.trim().startsWith('#') || line.trim() === '') {
            configLines.push(line);
            return;
          }
          
          // 处理配置行
          const [key] = line.split('=');
          if (!key) return;
          
          const trimKey = key.trim();
          processedKeys.add(trimKey);
          
          if (trimKey === 'DOMAIN') {
            configLines.push(`DOMAIN="${form.DOMAIN}"`);
          } else if (trimKey === 'IMAP') {
            configLines.push(`IMAP="${form.MAIL_TYPE === 'imap' ? '1' : '0'}"`);
          } else if (trimKey === 'TEMP_MAIL') {
            configLines.push(`TEMP_MAIL="${form.TEMP_MAIL}"`);
          } else if (trimKey === 'TEMP_MAIL_EPIN') {
            configLines.push(`TEMP_MAIL_EPIN="${form.TEMP_MAIL_EPIN}"`);
          } else if (trimKey === 'TEMP_MAIL_EXT') {
            configLines.push(`TEMP_MAIL_EXT="${form.TEMP_MAIL_EXT}"`);
          } else if (trimKey === 'IMAP_SERVER') {
            configLines.push(`IMAP_SERVER="${form.IMAP_SERVER}"`);
          } else if (trimKey === 'IMAP_PORT') {
            configLines.push(`IMAP_PORT="${form.IMAP_PORT}"`);
          } else if (trimKey === 'IMAP_USER') {
            configLines.push(`IMAP_USER="${form.IMAP_USER}"`);
          } else if (trimKey === 'IMAP_PASS') {
            configLines.push(`IMAP_PASS="${form.IMAP_PASS}"`);
          } else if (trimKey === 'IMAP_DIR') {
            configLines.push(`IMAP_DIR="${form.IMAP_DIR}"`);
          } else if (trimKey === 'BROWSER_PATH') {
            configLines.push(`BROWSER_PATH="${form.BROWSER_PATH}"`);
          } else if (trimKey === 'BROWSER_USER_AGENT') {
            configLines.push(`BROWSER_USER_AGENT="${form.BROWSER_USER_AGENT}"`);
          } else if (trimKey === 'BROWSER_HEADLESS') {
            configLines.push(`BROWSER_HEADLESS="${form.BROWSER_HEADLESS}"`);
          } else {
            // 保留其他未知配置行
            configLines.push(line);
          }
        });
        
        // 检查并添加缺失的配置项
        const requiredKeys = [
          'DOMAIN', 'IMAP', 'TEMP_MAIL', 'TEMP_MAIL_EPIN', 'TEMP_MAIL_EXT',
          'IMAP_SERVER', 'IMAP_PORT', 'IMAP_USER', 'IMAP_PASS', 'IMAP_DIR',
          'BROWSER_PATH', 'BROWSER_USER_AGENT', 'BROWSER_HEADLESS'
        ];
        
        const missingKeys = requiredKeys.filter(key => !processedKeys.has(key));
        if (missingKeys.length > 0) {
          // 如果有缺失的配置项，添加一个分隔行
          if (!configLines[configLines.length - 1].trim()) {
            configLines.push('# 自动添加的配置项');
          } else {
            configLines.push('');
            configLines.push('# 自动添加的配置项');
          }
          
          // 添加缺失的配置项
          missingKeys.forEach(key => {
            if (key === 'DOMAIN') {
              configLines.push(`DOMAIN="${form.DOMAIN}"`);
            } else if (key === 'IMAP') {
              configLines.push(`IMAP="${form.MAIL_TYPE === 'imap' ? '1' : '0'}"`);
            } else if (key === 'TEMP_MAIL') {
              configLines.push(`TEMP_MAIL="${form.TEMP_MAIL}"`);
            } else if (key === 'TEMP_MAIL_EPIN') {
              configLines.push(`TEMP_MAIL_EPIN="${form.TEMP_MAIL_EPIN}"`);
            } else if (key === 'TEMP_MAIL_EXT') {
              configLines.push(`TEMP_MAIL_EXT="${form.TEMP_MAIL_EXT}"`);
            } else if (key === 'IMAP_SERVER') {
              configLines.push(`IMAP_SERVER="${form.IMAP_SERVER}"`);
            } else if (key === 'IMAP_PORT') {
              configLines.push(`IMAP_PORT="${form.IMAP_PORT}"`);
            } else if (key === 'IMAP_USER') {
              configLines.push(`IMAP_USER="${form.IMAP_USER}"`);
            } else if (key === 'IMAP_PASS') {
              configLines.push(`IMAP_PASS="${form.IMAP_PASS}"`);
            } else if (key === 'IMAP_DIR') {
              configLines.push(`IMAP_DIR="${form.IMAP_DIR}"`);
            } else if (key === 'BROWSER_PATH') {
              configLines.push(`BROWSER_PATH="${form.BROWSER_PATH}"`);
            } else if (key === 'BROWSER_USER_AGENT') {
              configLines.push(`BROWSER_USER_AGENT="${form.BROWSER_USER_AGENT}"`);
            } else if (key === 'BROWSER_HEADLESS') {
              configLines.push(`BROWSER_HEADLESS="${form.BROWSER_HEADLESS}"`);
            }
          });
        }
        
        // 使用新的API保存环境配置
        const result = await window.electronAPI.saveEnvContent(configLines.join('\n'));
        setLoading(false);
        
        if (result.success) {
          Modal.success({
            title: '保存成功',
            content: '设置已保存，部分设置项需要重启应用后生效。',
            okText: '知道了',
          });
        } else {
          Modal.error({
            title: '保存失败',
            content: result.error || '未知错误',
            okText: '确定',
          });
        }
      } catch (error) {
        setLoading(false);
        console.error('保存设置失败:', error);
        Modal.error({
          title: '保存失败',
          content: `${error instanceof Error ? error.message : String(error)}`,
          okText: '确定',
        });
      }
    } else {
      setLoading(false);
      message.info('当前版本仅支持本地读取.env，保存功能请联系开发者扩展。');
    }
  };

  const handleReset = () => {
    Modal.confirm({
      title: '确认恢复默认设置',
      content: '这将重置所有设置为默认值，是否继续？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        const defaultSettings = {
          DOMAIN: '',
          MAIL_TYPE: 'temp',
          TEMP_MAIL: '',
          TEMP_MAIL_EPIN: '',
          TEMP_MAIL_EXT: '',
          IMAP_SERVER: '',
          IMAP_PORT: '993',
          IMAP_USER: '',
          IMAP_PASS: '',
          IMAP_DIR: 'INBOX',
          BROWSER_PATH: '',
          BROWSER_USER_AGENT: '',
          BROWSER_HEADLESS: 'False',
        };
        setForm(defaultSettings);
        message.success('已恢复默认设置，请点击保存以应用更改');
      }
    });
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
      {form.MAIL_TYPE === 'temp' && (
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
      )}

      {/* IMAP邮箱配置 */}
      {form.MAIL_TYPE === 'imap' && (
        <div className={styles.settingsCard}>
          <div className={styles.settingsTitle}>IMAP邮箱配置</div>
          <div className={styles.settingsRow}>
            <label>IMAP_SERVER</label>
            <Input
              className={styles.settingsInput}
              value={form.IMAP_SERVER}
              onChange={e => handleChange('IMAP_SERVER', e.target.value)}
              placeholder="imap.gmail.com"
            />
          </div>
          <div className={styles.settingsDesc}>
            IMAP服务器地址，例如Gmail的IMAP服务器为imap.gmail.com
          </div>
          <div className={styles.settingsRow}>
            <label>IMAP_PORT</label>
            <Input
              className={styles.settingsInput}
              value={form.IMAP_PORT}
              onChange={e => handleChange('IMAP_PORT', e.target.value)}
              placeholder="993"
            />
          </div>
          <div className={styles.settingsDesc}>
            IMAP服务器端口，993为SSL加密连接（推荐）
          </div>
          <div className={styles.settingsRow}>
            <label>IMAP_USER</label>
            <Input
              className={styles.settingsInput}
              value={form.IMAP_USER}
              onChange={e => handleChange('IMAP_USER', e.target.value)}
              placeholder="your.email@gmail.com"
            />
          </div>
          <div className={styles.settingsDesc}>
            IMAP用户名，通常是完整邮箱地址
          </div>
          <div className={styles.settingsRow}>
            <label>IMAP_PASS</label>
            <Input.Password
              className={styles.settingsInput}
              value={form.IMAP_PASS}
              onChange={e => handleChange('IMAP_PASS', e.target.value)}
              visibilityToggle
            />
          </div>
          <div className={styles.settingsDesc}>
            IMAP密码，对于Gmail需要使用应用专用密码
          </div>
          <div className={styles.settingsRow}>
            <label>IMAP_DIR</label>
            <Input
              className={styles.settingsInput}
              value={form.IMAP_DIR}
              onChange={e => handleChange('IMAP_DIR', e.target.value)}
              placeholder="INBOX"
            />
          </div>
          <div className={styles.settingsDesc}>
            IMAP收件箱目录，Gmail使用INBOX作为收件箱目录
          </div>
        </div>
      )}

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
        <Button 
          type="primary" 
          onClick={handleSave} 
          className={styles.saveButton}
          loading={loading}
        >
          保存设置
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage; 