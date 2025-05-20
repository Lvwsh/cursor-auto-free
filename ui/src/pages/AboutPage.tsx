import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

const AboutPage: React.FC = () => {
  return (
    <div>
      <Title level={4}>关于</Title>
      <Paragraph>
        Cursor Pro 是一款强大的桌面应用程序，用于管理Cursor应用的配置和操作。
      </Paragraph>
      <Paragraph>
        版本：3.0.0
      </Paragraph>
    </div>
  );
};

export default AboutPage; 