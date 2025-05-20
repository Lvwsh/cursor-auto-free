import React from 'react';
import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 菜单项定义
  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      key: '/about',
      icon: <InfoCircleOutlined />,
      label: '关于',
    },
  ];

  // 处理菜单项点击
  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    return [location.pathname];
  };

  return (
    <Sider 
      width={200} 
      theme="light"
      style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }}
    >
      <div style={{ 
        height: '64px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '16px',
        color: '#52c41a',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        Cursor Pro
      </div>
      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys()}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
        items={menuItems}
      />
    </Sider>
  );
};

export default Sidebar; 