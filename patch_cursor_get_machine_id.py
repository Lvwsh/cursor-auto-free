# 指定Python3作为解释器
#!/usr/bin/env python3
# 指定文件编码为UTF-8
# -*- coding: utf-8 -*-

# 导入所需的Python标准库
import json         # 用于处理JSON数据
import logging     # 用于日志记录
import os          # 用于操作系统相关功能
import platform    # 用于获取系统平台信息
import re          # 用于正则表达式操作
import shutil      # 用于文件操作
import sys         # 用于系统相关功能
import tempfile    # 用于创建临时文件
from typing import Tuple  # 用于类型注解


# 配置日志记录功能
def setup_logging() -> logging.Logger:
    """配置并返回logger实例"""
    # 创建logger实例
    logger = logging.getLogger(__name__)
    # 设置日志级别为INFO
    logger.setLevel(logging.INFO)
    # 创建控制台处理器
    handler = logging.StreamHandler()
    # 创建日志格式器，设置日志格式和时间格式
    formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )
    # 将格式器添加到处理器
    handler.setFormatter(formatter)
    # 将处理器添加到logger
    logger.addHandler(handler)
    return logger


# 创建全局logger实例
logger = setup_logging()


def get_cursor_paths() -> Tuple[str, str]:
    """
    根据不同操作系统获取 Cursor 相关路径

    Returns:
        Tuple[str, str]: (package.json路径, main.js路径)的元组

    Raises:
        OSError: 当找不到有效路径或系统不支持时抛出
    """
    # 获取当前操作系统类型
    system = platform.system()

    # 定义不同操作系统的路径映射
    paths_map = {
        # macOS系统路径配置
        "Darwin": {
            "base": "/Applications/Cursor.app/Contents/Resources/app",
            "package": "package.json",
            "main": "out/main.js",
        },
        # Windows系统路径配置
        "Windows": {
            "base": os.path.join(
                os.getenv("USERAPPPATH") or os.path.join(os.getenv("LOCALAPPDATA", ""), "Programs", "Cursor", "resources", "app")
            ),
            "package": "package.json",
            "main": "out/main.js",
        },
        # Linux系统路径配置
        "Linux": {
            "bases": ["/opt/Cursor/resources/app", "/usr/share/cursor/resources/app"],
            "package": "package.json",
            "main": "out/main.js",
        },
    }

    # 检查系统是否支持
    if system not in paths_map:
        raise OSError(f"不支持的操作系统: {system}")

    # 处理Linux系统的特殊情况
    if system == "Linux":
        # 遍历可能的安装路径
        for base in paths_map["Linux"]["bases"]:
            pkg_path = os.path.join(base, paths_map["Linux"]["package"])
            if os.path.exists(pkg_path):
                return (pkg_path, os.path.join(base, paths_map["Linux"]["main"]))
        raise OSError("在 Linux 系统上未找到 Cursor 安装路径")

    # 获取基础路径
    base_path = paths_map[system]["base"]
    # Windows系统特殊处理：检查安装路径
    if system  == "Windows":
        if not os.path.exists(base_path):
            # 提供创建软链接的指导信息
            logging.info('可能您的Cursor不是默认安装路径,请创建软连接,命令如下:')
            logging.info('cmd /c mklink /d "C:\\Users\\<username>\\AppData\\Local\\Programs\\Cursor" "默认安装路径"')
            logging.info('例如:')
            logging.info('cmd /c mklink /d "C:\\Users\\<username>\\AppData\\Local\\Programs\\Cursor" "D:\\SoftWare\\cursor"')
            input("\n程序执行完毕，按回车键退出...")
    
    # 返回完整的文件路径
    return (
        os.path.join(base_path, paths_map[system]["package"]),
        os.path.join(base_path, paths_map[system]["main"]),
    )


def check_system_requirements(pkg_path: str, main_path: str) -> bool:
    """
    检查系统要求

    Args:
        pkg_path: package.json 文件路径
        main_path: main.js 文件路径

    Returns:
        bool: 检查是否通过
    """
    # 检查每个文件的存在性和写权限
    for file_path in [pkg_path, main_path]:
        # 检查文件是否存在
        if not os.path.isfile(file_path):
            logger.error(f"文件不存在: {file_path}")
            return False

        # 检查文件是否有写权限
        if not os.access(file_path, os.W_OK):
            logger.error(f"没有文件写入权限: {file_path}")
            return False

    return True


def version_check(version: str, min_version: str = "", max_version: str = "") -> bool:
    """
    版本号检查

    Args:
        version: 当前版本号
        min_version: 最小版本号要求
        max_version: 最大版本号要求

    Returns:
        bool: 版本号是否符合要求
    """
    # 定义版本号格式正则表达式
    version_pattern = r"^\d+\.\d+\.\d+$"
    try:
        # 检查版本号格式是否正确
        if not re.match(version_pattern, version):
            logger.error(f"无效的版本号格式: {version}")
            return False

        # 定义版本号解析函数
        def parse_version(ver: str) -> Tuple[int, ...]:
            return tuple(map(int, ver.split(".")))

        # 解析当前版本号
        current = parse_version(version)

        # 检查最小版本要求
        if min_version and current < parse_version(min_version):
            logger.error(f"版本号 {version} 小于最小要求 {min_version}")
            return False

        # 检查最大版本要求
        if max_version and current > parse_version(max_version):
            logger.error(f"版本号 {version} 大于最大要求 {max_version}")
            return False

        return True

    except Exception as e:
        logger.error(f"版本检查失败: {str(e)}")
        return False


def modify_main_js(main_path: str) -> bool:
    """
    修改 main.js 文件

    Args:
        main_path: main.js 文件路径

    Returns:
        bool: 修改是否成功
    """
    try:
        # 获取原始文件的权限和所有者信息
        original_stat = os.stat(main_path)
        original_mode = original_stat.st_mode
        original_uid = original_stat.st_uid
        original_gid = original_stat.st_gid

        # 创建临时文件进行修改
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as tmp_file:
            # 读取原始文件内容
            with open(main_path, "r", encoding="utf-8") as main_file:
                content = main_file.read()

            # 定义需要替换的正则表达式模式
            patterns = {
                r"async getMachineId\(\)\{return [^??]+\?\?([^}]+)\}": r"async getMachineId(){return \1}",
                r"async getMacMachineId\(\)\{return [^??]+\?\?([^}]+)\}": r"async getMacMachineId(){return \1}",
            }

            # 执行替换操作
            for pattern, replacement in patterns.items():
                content = re.sub(pattern, replacement, content)

            # 将修改后的内容写入临时文件
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # 备份原文件并移动临时文件到目标位置
        shutil.copy2(main_path, main_path + ".old")
        shutil.move(tmp_path, main_path)

        # 恢复原始文件的权限和所有者
        os.chmod(main_path, original_mode)
        if os.name != "nt":  # 在非Windows系统上设置所有者
            os.chown(main_path, original_uid, original_gid)

        logger.info("文件修改成功")
        return True

    except Exception as e:
        logger.error(f"修改文件时发生错误: {str(e)}")
        if "tmp_path" in locals():
            os.unlink(tmp_path)
        return False


def backup_files(pkg_path: str, main_path: str) -> bool:
    """
    备份原始文件

    Args:
        pkg_path: package.json 文件路径（未使用）
        main_path: main.js 文件路径

    Returns:
        bool: 备份是否成功
    """
    try:
        # 只备份 main.js 文件
        if os.path.exists(main_path):
            backup_main = f"{main_path}.bak"
            shutil.copy2(main_path, backup_main)
            logger.info(f"已备份 main.js: {backup_main}")

        return True
    except Exception as e:
        logger.error(f"备份文件失败: {str(e)}")
        return False


def restore_backup_files(pkg_path: str, main_path: str) -> bool:
    """
    恢复备份文件

    Args:
        pkg_path: package.json 文件路径（未使用）
        main_path: main.js 文件路径

    Returns:
        bool: 恢复是否成功
    """
    try:
        # 检查并恢复main.js备份
        backup_main = f"{main_path}.bak"
        if os.path.exists(backup_main):
            shutil.copy2(backup_main, main_path)
            logger.info(f"已恢复 main.js")
            return True

        logger.error("未找到备份文件")
        return False
    except Exception as e:
        logger.error(f"恢复备份失败: {str(e)}")
        return False


def patch_cursor_get_machine_id(restore_mode=False) -> None:
    """
    主函数

    Args:
        restore_mode: 是否为恢复模式
    """
    # 开始执行脚本
    logger.info("开始执行脚本...")

    try:
        # 获取Cursor相关文件路径
        pkg_path, main_path = get_cursor_paths()

        # 检查系统要求
        if not check_system_requirements(pkg_path, main_path):
            sys.exit(1)

        # 如果是恢复模式，执行恢复操作
        if restore_mode:
            # 恢复备份文件
            if restore_backup_files(pkg_path, main_path):
                logger.info("备份恢复完成")
            else:
                logger.error("备份恢复失败")
            return

        # 读取并检查版本号
        try:
            with open(pkg_path, "r", encoding="utf-8") as f:
                version = json.load(f)["version"]
            logger.info(f"当前 Cursor 版本: {version}")
        except Exception as e:
            logger.error(f"无法读取版本号: {str(e)}")
            sys.exit(1)

        # 检查版本是否符合要求
        if not version_check(version, min_version="0.45.0"):
            logger.error("版本不符合要求（需 >= 0.45.x）")
            sys.exit(1)

        logger.info("版本检查通过，准备修改文件")

        # 备份原始文件
        if not backup_files(pkg_path, main_path):
            logger.error("文件备份失败，终止操作")
            sys.exit(1)

        # 修改main.js文件
        if not modify_main_js(main_path):
            sys.exit(1)

        logger.info("脚本执行完成")

    except Exception as e:
        logger.error(f"执行过程中发生错误: {str(e)}")
        sys.exit(1)


# 当直接运行此脚本时执行
if __name__ == "__main__":
    patch_cursor_get_machine_id()
