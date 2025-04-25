# -*- mode: python ; coding: utf-8 -*-
# ↑ 指定文件的编码方式为UTF-8，确保正确处理中文等特殊字符

# 导入操作系统相关的功能模块
import os

# Analysis对象：定义程序的主要构建配置
a = Analysis(
    # 主程序入口文件
    ['cursor_pro_keep_alive.py'],
    
    # 额外的导入路径，这里为空列表
    pathex=[],
    
    # 需要包含的二进制文件，这里为空列表
    binaries=[],
    
    # 需要包含的数据文件和目录
    datas=[
        # (源文件/目录, 目标位置)
        ('turnstilePatch', 'turnstilePatch'),  # turnstilePatch目录及其内容
        ('cursor_auth_manager.py', '.'),        # 认证管理器模块
        ('names-dataset.txt', '.'),             # 名称数据集文件
    ],
    
    # 需要显式导入的模块（PyInstaller可能无法自动检测到的）
    hiddenimports=[
        'cursor_auth_manager'  # 确保认证管理器模块被包含
    ],
    
    # 自定义钩子脚本的路径，这里为空
    hookspath=[],
    
    # 钩子的配置选项，这里为空
    hooksconfig={},
    
    # 运行时钩子，这里为空
    runtime_hooks=[],
    
    # 要排除的模块，这里为空
    excludes=[],
    
    # 是否不创建archive，设为False表示创建archive
    noarchive=False,
)

# PYZ对象：将Python模块打包成ZIP格式
pyz = PYZ(a.pure)

# 获取目标架构环境变量，用于跨平台构建
target_arch = os.environ.get('TARGET_ARCH', None)

# EXE对象：定义最终可执行文件的配置
exe = EXE(
    pyz,                    # 打包的Python模块
    a.scripts,              # 脚本文件
    a.binaries,            # 二进制文件
    a.datas,               # 数据文件
    [],                    # 额外的选项，这里为空
    
    name='CursorPro',      # 生成的可执行文件名
    
    debug=False,           # 是否包含调试信息
    
    bootloader_ignore_signals=False,  # 是否忽略引导加载器信号
    
    strip=False,           # 是否移除符号表（减小文件大小）
    
    upx=True,             # 是否使用UPX压缩
    upx_exclude=[],        # 不进行UPX压缩的文件
    
    runtime_tmpdir=None,   # 运行时临时目录
    
    console=True,          # 是否显示控制台窗口
    
    disable_windowed_traceback=False,  # 是否禁用窗口化错误回溯
    
    argv_emulation=True,   # 是否模拟命令行参数（对非Mac平台无影响）
    
    target_arch=target_arch,  # 目标架构（通过环境变量指定）
    
    codesign_identity=None,   # 代码签名身份（仅用于macOS）
    
    entitlements_file=None,   # 授权文件路径（仅用于macOS）
    
    icon=None              # 应用程序图标路径
)