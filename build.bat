::===================================================================
:: Cursor Keep Alive 构建脚本
:: 作用：自动化构建过程，包括环境配置和依赖安装
::===================================================================

:: 关闭命令回显，使输出更清晰
@echo off

:: 设置Python警告过滤，忽略DrissionPage模块的语法警告
set PYTHONWARNINGS=ignore::SyntaxWarning:DrissionPage

:: 显示构建开始信息
echo Building Cursor Keep Alive...

:: 检查虚拟环境是否存在
:: 如果不存在，则创建新的虚拟环境
if not exist "venv" (
    :: 创建Python虚拟环境
    python -m venv venv
    :: 检查虚拟环境创建是否成功
    if errorlevel 1 (
        :: 如果创建失败，显示错误信息并退出
        echo Failed to create virtual environment!
        exit /b 1
    )
)

:: 激活虚拟环境并等待激活完成
:: 使用call命令确保批处理文件继续执行
call venv\Scripts\activate.bat
:: 等待2秒确保虚拟环境完全激活
timeout /t 2 /nobreak > nul

:: 安装项目依赖
:: 首先显示正在安装依赖的信息
echo Installing dependencies...
:: 更新pip到最新版本
python -m pip install --upgrade pip
:: 从requirements.txt安装所有依赖
pip install -r requirements.txt

:: 开始构建过程
:: 显示构建开始信息
echo Starting build process...
:: 运行Python构建脚本
python build.py

:: 退出虚拟环境
deactivate

:: 构建完成
:: 显示完成信息
echo Build completed!
:: 暂停窗口，等待用户确认
pause 