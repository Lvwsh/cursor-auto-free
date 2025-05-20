import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const SettingsPage: React.FC = () => {
  return (
    <div>
      <Title level={4}>设置页面</Title>
      <p>该页面用于配置应用程序的各项设置。</p>
    </div>
  );
};

export default SettingsPage; 