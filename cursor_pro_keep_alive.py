# -*- coding: utf-8 -*-
import os  # 导入操作系统模块，用于文件和路径操作
import platform  # 导入平台模块，用于获取系统信息
import json  # 导入JSON模块，用于处理JSON数据
import sys  # 导入系统模块，用于系统级功能和退出程序
from colorama import Fore, Style  # 导入彩色输出模块，用于命令行彩色文本
from enum import Enum  # 导入枚举类型，用于创建枚举
from typing import Optional  # 导入Optional类型，用于类型标注

from exit_cursor import ExitCursor  # 导入ExitCursor类，用于退出Cursor程序
import go_cursor_help  # 导入cursor帮助模块
import patch_cursor_get_machine_id  # 导入补丁模块，用于修改machine_id
from reset_machine import MachineIDResetter  # 导入MachineIDResetter类，用于重置machine_id
from language import language, get_translation  # 导入语言模块和翻译函数

os.environ["PYTHONVERBOSE"] = "0"  # 设置Python环境变量，禁用详细输出
os.environ["PYINSTALLER_VERBOSE"] = "0"  # 设置PyInstaller环境变量，禁用详细输出

import time  # 导入时间模块，用于延时和获取时间戳
import random  # 导入随机模块，用于生成随机数和随机选择
from cursor_auth_manager import CursorAuthManager  # 导入CursorAuthManager类，管理Cursor认证
import os  # 重复导入os模块（代码中的重复导入）
from logger import logging  # 导入日志模块
from browser_utils import BrowserManager  # 导入浏览器管理模块
from get_email_code import EmailVerificationHandler  # 导入邮件验证码处理模块
from logo import print_logo  # 导入打印LOGO的模块
from config import Config  # 导入配置模块
from datetime import datetime  # 导入日期时间模块

import io
if os.name == 'nt':
    import ctypes
    ctypes.windll.kernel32.SetConsoleOutputCP(65001)

# Define EMOJI dictionary
EMOJI = {"ERROR": get_translation("error"), "WARNING": get_translation("warning"), "INFO": get_translation("info")}  # 定义表情符号字典，用于日志输出


class VerificationStatus(Enum):  # 定义验证状态枚举类
    """Verification status enum"""  # 验证状态枚举的文档字符串

    PASSWORD_PAGE = "@name=password"  # 密码页面的元素标识
    CAPTCHA_PAGE = "@data-index=0"  # 验证码页面的元素标识
    ACCOUNT_SETTINGS = "Account Settings"  # 账户设置页面的元素标识


class TurnstileError(Exception):  # 定义Turnstile验证错误异常类
    """Turnstile verification related exception"""  # Turnstile验证相关异常的文档字符串

    pass  # 不需要额外的方法或属性


def save_screenshot(tab, stage: str, timestamp: bool = True) -> None:  # 定义保存截图函数
    """
    Save a screenshot of the page

    Args:
        tab: Browser tab object
        stage: Stage identifier for the screenshot
        timestamp: Whether to add a timestamp
    """
    try:  # 尝试执行以下代码块
        # Create screenshots directory
        screenshot_dir = "screenshots"  # 设置截图目录名
        if not os.path.exists(screenshot_dir):  # 如果目录不存在
            os.makedirs(screenshot_dir)  # 创建截图目录

        # Generate filename
        if timestamp:  # 如果需要添加时间戳
            filename = f"turnstile_{stage}_{int(time.time())}.png"  # 生成带时间戳的文件名
        else:  # 否则
            filename = f"turnstile_{stage}.png"  # 生成不带时间戳的文件名

        filepath = os.path.join(screenshot_dir, filename)  # 生成完整文件路径

        # Save screenshot
        tab.get_screenshot(filepath)  # 保存截图到指定路径
        logging.debug(f"Screenshot saved: {filepath}")  # 记录截图保存成功的日志
    except Exception as e:  # 捕获可能的异常
        logging.warning(f"Failed to save screenshot: {str(e)}")  # 记录截图保存失败的警告日志


def check_verification_success(tab) -> Optional[VerificationStatus]:  # 定义检查验证成功函数
    """
    Check if verification was successful

    Returns:
        VerificationStatus: The corresponding status if successful, None if failed
    """
    for status in VerificationStatus:  # 遍历所有验证状态
        if tab.ele(status.value):  # 如果页面中存在对应状态的元素
            logging.info(get_translation("verification_success", status=status.name))  # 记录验证成功的日志
            return status  # 返回成功的状态
    return None  # 如果没有找到任何状态对应的元素，返回None


def handle_turnstile(tab, max_retries: int = 2, retry_interval: tuple = (1, 2)) -> bool:  # 定义处理Turnstile验证的函数
    """
    Handle Turnstile verification

    Args:
        tab: Browser tab object
        max_retries: Maximum number of retries
        retry_interval: Retry interval range (min, max)

    Returns:
        bool: Whether verification was successful

    Raises:
        TurnstileError: Exception during verification process
    """
    logging.info(get_translation("detecting_turnstile"))  # 记录开始检测Turnstile的日志
    save_screenshot(tab, "start")  # 保存开始时的截图

    retry_count = 0  # 初始化重试计数器

    try:  # 尝试执行以下代码块
        while retry_count < max_retries:  # 当重试次数小于最大重试次数时循环
            retry_count += 1  # 重试计数器加1
            logging.debug(get_translation("retry_verification", count=retry_count))  # 记录重试验证的日志

            try:  # 尝试执行以下代码块
                # Locate verification frame element
                challenge_check = (  # 查找验证框架元素
                    tab.ele("@id=cf-turnstile", timeout=2)  # 查找id为cf-turnstile的元素，超时2秒
                    .child()  # 获取子元素
                    .shadow_root.ele("tag:iframe")  # 获取shadow root中的iframe标签
                    .ele("tag:body")  # 获取body标签
                    .sr("tag:input")  # 获取input标签
                )

                if challenge_check:  # 如果找到验证元素
                    logging.info(get_translation("detected_turnstile"))  # 记录检测到Turnstile的日志
                    # Random delay before clicking verification
                    time.sleep(random.uniform(1, 3))  # 随机延时1-3秒
                    challenge_check.click()  # 点击验证元素
                    time.sleep(2)  # 延时2秒

                    # Save screenshot after verification
                    save_screenshot(tab, "clicked")  # 保存点击后的截图

                    # Check verification result
                    if check_verification_success(tab):  # 检查验证是否成功
                        logging.info(get_translation("turnstile_verification_passed"))  # 记录验证通过的日志
                        save_screenshot(tab, "success")  # 保存成功的截图
                        return True  # 返回True表示验证成功

            except Exception as e:  # 捕获可能的异常
                logging.debug(f"Current attempt unsuccessful: {str(e)}")  # 记录当前尝试不成功的日志

            # Check if already verified
            if check_verification_success(tab):  # 检查是否已经验证成功
                return True  # 返回True表示验证成功

            # Random delay before next attempt
            time.sleep(random.uniform(*retry_interval))  # 在下一次尝试前随机延时

        # Exceeded maximum retries
        logging.error(get_translation("verification_failed_max_retries", max_retries=max_retries))  # 记录达到最大重试次数验证失败的错误日志
        logging.error(
            ""
        )  # 记录项目信息
        save_screenshot(tab, "failed")  # 保存失败的截图
        return False  # 返回False表示验证失败

    except Exception as e:  # 捕获可能的异常
        error_msg = get_translation("turnstile_exception", error=str(e))  # 生成错误消息
        logging.error(error_msg)  # 记录错误日志
        save_screenshot(tab, "error")  # 保存错误的截图
        raise TurnstileError(error_msg)  # 抛出TurnstileError异常


def get_cursor_session_token(tab, max_attempts=3, retry_interval=2):  # 定义获取Cursor会话令牌的函数
    """
    Get Cursor session token with retry mechanism
    :param tab: Browser tab
    :param max_attempts: Maximum number of attempts
    :param retry_interval: Retry interval (seconds)
    :return: Session token or None
    """
    logging.info(get_translation("getting_cookie"))  # 记录正在获取Cookie的日志
    attempts = 0  # 初始化尝试次数

    while attempts < max_attempts:  # 当尝试次数小于最大尝试次数时循环
        try:  # 尝试执行以下代码块
            cookies = tab.cookies()  # 获取页面的所有Cookie
            for cookie in cookies:  # 遍历所有Cookie
                if cookie.get("name") == "WorkosCursorSessionToken":  # 如果找到Cursor会话令牌Cookie
                    return cookie["value"].split("%3A%3A")[1]  # 返回处理后的令牌值

            attempts += 1  # 尝试次数加1
            if attempts < max_attempts:  # 如果尝试次数小于最大尝试次数
                logging.warning(
                    get_translation("cookie_attempt_failed", attempts=attempts, retry_interval=retry_interval)
                )  # 记录Cookie获取失败的警告日志
                time.sleep(retry_interval)  # 等待指定的重试间隔时间
            else:  # 如果达到最大尝试次数
                logging.error(
                    get_translation("cookie_max_attempts", max_attempts=max_attempts)
                )  # 记录达到最大尝试次数的错误日志

        except Exception as e:  # 捕获可能的异常
            logging.error(get_translation("cookie_failure", error=str(e)))  # 记录Cookie获取失败的错误日志
            attempts += 1  # 尝试次数加1
            if attempts < max_attempts:  # 如果尝试次数小于最大尝试次数
                logging.info(get_translation("retry_in_seconds", seconds=retry_interval))  # 记录将在几秒后重试的信息日志
                time.sleep(retry_interval)  # 等待指定的重试间隔时间

    return None  # 如果所有尝试都失败，返回None


def update_cursor_auth(email=None, access_token=None, refresh_token=None):  # 定义更新Cursor认证信息的函数
    """
    Update Cursor authentication information
    """
    auth_manager = CursorAuthManager()  # 创建CursorAuthManager实例
    return auth_manager.update_auth(email, access_token, refresh_token)  # 更新认证信息并返回结果


def sign_up_account(browser, tab):  # 定义注册账户的函数
    logging.info(get_translation("start_account_registration"))  # 记录开始账户注册的日志
    logging.info(get_translation("visiting_registration_page", url=sign_up_url))  # 记录访问注册页面的日志
    tab.get(sign_up_url)  # 访问注册页面

    try:  # 尝试执行以下代码块
        if tab.ele("@name=first_name"):  # 如果页面包含名字输入框
            logging.info(get_translation("filling_personal_info"))  # 记录填写个人信息的日志
            tab.actions.click("@name=first_name").input(first_name)  # 点击名字输入框并输入名字
            logging.info(get_translation("input_first_name", name=first_name))  # 记录输入名字的日志
            time.sleep(random.uniform(1, 3))  # 随机延时1-3秒

            tab.actions.click("@name=last_name").input(last_name)  # 点击姓氏输入框并输入姓氏
            logging.info(get_translation("input_last_name", name=last_name))  # 记录输入姓氏的日志
            time.sleep(random.uniform(1, 3))  # 随机延时1-3秒

            tab.actions.click("@name=email").input(account)  # 点击邮箱输入框并输入邮箱
            logging.info(get_translation("input_email", email=account))  # 记录输入邮箱的日志
            time.sleep(random.uniform(1, 3))  # 随机延时1-3秒

            logging.info(get_translation("submitting_personal_info"))  # 记录提交个人信息的日志
            tab.actions.click("@type=submit")  # 点击提交按钮

    except Exception as e:  # 捕获可能的异常
        logging.error(get_translation("registration_page_access_failed", error=str(e)))  # 记录访问注册页面失败的错误日志
        return False  # 返回False表示注册失败

    handle_turnstile(tab)  # 处理Turnstile验证

    try:  # 尝试执行以下代码块
        if tab.ele("@name=password"):  # 如果页面包含密码输入框
            logging.info(get_translation("setting_password"))  # 记录设置密码的日志
            tab.ele("@name=password").input(password)  # 输入密码
            time.sleep(random.uniform(1, 3))  # 随机延时1-3秒

            logging.info(get_translation("submitting_password"))  # 记录提交密码的日志
            tab.ele("@type=submit").click()  # 点击提交按钮
            logging.info(get_translation("password_setup_complete"))  # 记录密码设置完成的日志

    except Exception as e:  # 捕获可能的异常
        logging.error(get_translation("password_setup_failed", error=str(e)))  # 记录密码设置失败的错误日志
        return False  # 返回False表示注册失败

    if tab.ele("This email is not available."):  # 如果页面显示邮箱不可用
        logging.error(get_translation("registration_failed_email_used"))  # 记录注册失败，邮箱已被使用的错误日志
        return False  # 返回False表示注册失败

    handle_turnstile(tab)  # 处理Turnstile验证

    while True:  # 无限循环，直到满足条件后break
        try:  # 尝试执行以下代码块
            if tab.ele("Account Settings"):  # 如果页面包含"Account Settings"文本
                logging.info(get_translation("registration_success"))  # 记录注册成功的日志
                break  # 退出循环
            if tab.ele("@data-index=0"):  # 如果页面包含验证码输入框
                logging.info(get_translation("getting_email_verification"))  # 记录获取邮箱验证码的日志
                code = email_handler.get_verification_code()  # 获取验证码
                if not code:  # 如果获取验证码失败
                    logging.error(get_translation("verification_code_failure"))  # 记录验证码获取失败的错误日志
                    return False  # 返回False表示注册失败

                logging.info(get_translation("verification_code_success", code=code))  # 记录成功获取验证码的日志
                logging.info(get_translation("inputting_verification_code"))  # 记录输入验证码的日志
                i = 0  # 初始化索引
                for digit in code:  # 遍历验证码的每一位数字
                    tab.ele(f"@data-index={i}").input(digit)  # 在对应输入框输入数字
                    time.sleep(random.uniform(0.1, 0.3))  # 随机延时0.1-0.3秒
                    i += 1  # 索引加1
                logging.info(get_translation("verification_code_input_complete"))  # 记录验证码输入完成的日志
                break  # 退出循环
        except Exception as e:  # 捕获可能的异常
            logging.error(get_translation("verification_code_process_error", error=str(e)))  # 记录验证码处理错误的日志

    handle_turnstile(tab)  # 处理Turnstile验证
    wait_time = random.randint(3, 6)  # 生成3-6之间的随机等待时间
    for i in range(wait_time):  # 循环等待指定秒数
        logging.info(get_translation("waiting_system_processing", seconds=wait_time-i))  # 记录等待系统处理的日志
        time.sleep(1)  # 等待1秒

    logging.info(get_translation("getting_account_info"))  # 记录获取账户信息的日志
    tab.get(settings_url)  # 访问设置页面
    try:  # 尝试执行以下代码块
        usage_selector = (  # 定义使用量选择器
            "css:div.col-span-2 > div > div > div > div > "
            "div:nth-child(1) > div.flex.items-center.justify-between.gap-2 > "
            "span.font-mono.text-sm\\/\\[0\\.875rem\\]"
        )
        usage_ele = tab.ele(usage_selector)  # 获取使用量元素
        if usage_ele:  # 如果找到使用量元素
            usage_info = usage_ele.text  # 获取使用量信息文本
            total_usage = usage_info.split("/")[-1].strip()  # 解析总使用量
            logging.info(get_translation("account_usage_limit", limit=total_usage))  # 记录账户使用限制的日志
            logging.info(
                ""
            )  # 记录项目信息
    except Exception as e:  # 捕获可能的异常
        logging.error(get_translation("account_usage_info_failure", error=str(e)))  # 记录获取账户使用信息失败的错误日志

    logging.info(get_translation("registration_complete"))  # 记录注册完成的日志
    account_info = get_translation("cursor_account_info", email=account, password=password)  # 生成账户信息文本
    logging.info(account_info)  # 记录账户信息
    time.sleep(5)  # 等待5秒
    return True  # 返回True表示注册成功


class EmailGenerator:  # 定义邮箱生成器类
    def __init__(
        self,
        password="".join(
            random.choices(
                "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*",
                k=12,
            )
        ),  # 生成默认12位随机密码，包含字母、数字和特殊字符
    ):
        configInstance = Config()  # 创建配置实例
        configInstance.print_config()  # 打印配置信息
        self.domain = configInstance.get_domain()  # 获取邮箱域名
        self.names = self.load_names()  # 加载姓名列表
        self.default_password = password  # 设置默认密码
        self.default_first_name = self.generate_random_name()  # 生成随机名字
        self.default_last_name = self.generate_random_name()  # 生成随机姓氏

    def load_names(self):  # 定义加载姓名列表的方法
        try:  # 尝试执行以下代码块
            with open("names-dataset.txt", "r") as file:  # 打开姓名数据集文件
                return file.read().split()  # 读取文件内容并按空格分割为列表
        except FileNotFoundError:  # 捕获文件不存在异常
            logging.warning(get_translation("names_file_not_found"))  # 记录文件不存在的警告日志
            # Fallback to a small set of default names if the file is not found
            return ["John", "Jane", "Alex", "Emma", "Michael", "Olivia", "William", "Sophia", 
                    "James", "Isabella", "Robert", "Mia", "David", "Charlotte", "Joseph", "Amelia"]  # 返回默认姓名列表

    def generate_random_name(self):  # 定义生成随机用户名的方法
        """Generate a random username"""
        return random.choice(self.names)  # 从姓名列表中随机选择一个返回

    def generate_email(self, length=4):  # 定义生成随机邮箱地址的方法
        """Generate a random email address"""
        length = random.randint(0, length)  # 生成0到length之间的随机整数
        timestamp = str(int(time.time()))[-length:]  # 使用时间戳的最后length位
        return f"{self.default_first_name}{timestamp}@{self.domain}"  # 组合成邮箱地址并返回

    def get_account_info(self):  # 定义获取完整账户信息的方法
        """Get complete account information"""
        return {  # 返回包含账户信息的字典
            "email": self.generate_email(),  # 生成的邮箱地址
            "password": self.default_password,  # 默认密码
            "first_name": self.default_first_name,  # 默认名字
            "last_name": self.default_last_name,  # 默认姓氏
        }


def get_user_agent():  # 定义获取用户代理的函数
    """Get user_agent"""
    try:  # 尝试执行以下代码块
        # Use JavaScript to get user agent
        browser_manager = BrowserManager()  # 创建浏览器管理器实例
        browser = browser_manager.init_browser()  # 初始化浏览器
        user_agent = browser.latest_tab.run_js("return navigator.userAgent")  # 执行JavaScript获取用户代理
        browser_manager.quit()  # 退出浏览器
        return user_agent  # 返回用户代理字符串
    except Exception as e:  # 捕获可能的异常
        logging.error(f"Failed to get user agent: {str(e)}")  # 记录获取用户代理失败的错误日志
        return None  # 返回None


def check_cursor_version():  # 定义检查Cursor版本的函数
    """Check cursor version"""
    pkg_path, main_path = patch_cursor_get_machine_id.get_cursor_paths()  # 获取Cursor路径
    with open(pkg_path, "r", encoding="utf-8") as f:  # 打开Cursor包文件
        version = json.load(f)["version"]  # 读取版本信息
    return patch_cursor_get_machine_id.version_check(version, min_version="0.45.0")  # 检查版本是否大于等于0.45.0


def reset_machine_id(greater_than_0_45):  # 定义重置机器ID的函数
    if greater_than_0_45:  # 如果版本大于0.45.0
        # Prompt to manually execute script patch_cursor_get_machine_id.py
        go_cursor_help.go_cursor_help()  # 使用cursor帮助功能
    else:  # 否则
        MachineIDResetter().reset_machine_ids()  # 使用MachineIDResetter重置机器ID


def print_end_message():  # 定义打印结束消息的函数
    logging.info("\n\n\n\n\n")  # 打印多个空行
    logging.info("=" * 30)  # 打印分隔线
    logging.info(get_translation("all_operations_completed"))  # 记录所有操作已完成的日志
    logging.info("\n=== Get More Information ===")  # 打印获取更多信息的标题
    logging.info("📺 Bilibili UP: 想回家的前端")  # 打印Bilibili UP主信息
    logging.info("🔥 WeChat Official Account: code 未来")  # 打印微信公众号信息
    logging.info("=" * 30)  # 打印分隔线
    logging.info(
        ""
    )  # 记录项目信息


if __name__ == "__main__":  # 如果是直接运行此脚本
    # 选择语言部分自动选择中文
    choice = 2  # 直接选择完整注册流程
    print('自动进入完整注册流程...')
    
    greater_than_0_45 = check_cursor_version()  # 检查Cursor版本是否大于0.45.0版本
    browser_manager = None  # 初始化浏览器管理器变量
    try:  # 尝试执行以下代码块
        logging.info(get_translation("initializing_program"))  # 记录程序初始化的日志
        ExitCursor()  # 退出可能正在运行的Cursor程序

        # 直接进入完整注册流程，不再提示选择
        # print(get_translation("select_operation_mode"))  # 打印选择操作模式的提示
        # print(get_translation("reset_machine_code_only"))  # 打印仅重置机器码的选项
        # print(get_translation("complete_registration"))  # 打印完成注册的选项

        # while True:  # 无限循环，直到得到有效输入
        #     try:  # 尝试执行以下代码块
        #         choice = int(input(get_translation("enter_option")).strip())  # 获取用户输入并转换为整数
        #         if choice in [1, 2]:  # 如果选择是1或2
        #             break  # 退出循环
        #         else:  # 否则
        #             print(get_translation("invalid_option"))  # 打印无效选项提示
        #     except ValueError:  # 捕获数值错误异常
        #         print(get_translation("enter_valid_number"))  # 提示用户输入有效数字

        # if choice == 1:  # 如果选择是1（仅重置机器码）
        #     # Only reset machine code
        #     reset_machine_id(greater_than_0_45)  # 重置机器ID
        #     logging.info(get_translation("machine_code_reset_complete"))  # 记录机器码重置完成的日志
        #     print_end_message()  # 打印结束消息
        #     sys.exit(0)  # 退出程序，返回状态码0（正常退出）

        logging.info(get_translation("initializing_browser"))  # 记录初始化浏览器的日志

        # Get user_agent
        user_agent = get_user_agent()  # 获取用户代理
        if not user_agent:  # 如果获取失败
            logging.error(get_translation("get_user_agent_failed"))  # 记录获取用户代理失败的错误日志
            user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"  # 使用默认的用户代理

        # Remove "HeadlessChrome" from user_agent
        user_agent = user_agent.replace("HeadlessChrome", "Chrome")  # 从用户代理中移除"HeadlessChrome"，避免被检测为自动化程序

        browser_manager = BrowserManager()  # 创建浏览器管理器实例
        browser = browser_manager.init_browser(user_agent)  # 使用指定的用户代理初始化浏览器

        # Get and print browser's user-agent
        user_agent = browser.latest_tab.run_js("return navigator.userAgent")  # 获取并打印浏览器的用户代理

        logging.info(
            ""
        )  # 记录项目信息
        logging.info(get_translation("configuration_info"))  # 记录配置信息
        login_url = "https://authenticator.cursor.sh"  # 设置登录URL
        sign_up_url = "https://authenticator.cursor.sh/sign-up"  # 设置注册URL
        settings_url = "https://www.cursor.com/settings"  # 设置设置页面URL
        mail_url = "https://tempmail.plus"  # 设置临时邮箱URL

        logging.info(get_translation("generating_random_account"))  # 记录生成随机账户的日志

        email_generator = EmailGenerator()  # 创建邮箱生成器实例
        first_name = email_generator.default_first_name  # 获取默认名字
        last_name = email_generator.default_last_name  # 获取默认姓氏
        account = email_generator.generate_email()  # 生成邮箱地址
        password = email_generator.default_password  # 获取默认密码

        logging.info(get_translation("generated_email_account", email=account))  # 记录已生成的邮箱账户

        logging.info(get_translation("initializing_email_verification"))  # 记录初始化邮箱验证的日志
        email_handler = EmailVerificationHandler(account)  # 创建邮箱验证处理器实例

        auto_update_cursor_auth = True  # 设置自动更新Cursor认证为True

        tab = browser.latest_tab  # 获取最新的浏览器标签页

        tab.run_js("try { turnstile.reset() } catch(e) { }")  # 尝试重置Turnstile验证

        logging.info(get_translation("starting_registration"))  # 记录开始注册的日志
        logging.info(get_translation("visiting_login_page", url=login_url))  # 记录访问登录页面的日志
        tab.get(login_url)  # 访问登录页面

        if sign_up_account(browser, tab):  # 如果账户注册成功
            logging.info(get_translation("getting_session_token"))  # 记录获取会话令牌的日志
            token = get_cursor_session_token(tab)  # 获取Cursor会话令牌
            if token:  # 如果获取令牌成功
                logging.info(get_translation("updating_auth_info"))  # 记录更新认证信息的日志
                update_cursor_auth(
                    email=account, access_token=token, refresh_token=token
                )  # 更新Cursor认证信息
                logging.info(
                    ""
                )  # 记录项目信息
                logging.info(get_translation("resetting_machine_code"))  # 记录重置机器码的日志
                reset_machine_id(greater_than_0_45)  # 重置机器ID
                logging.info(get_translation("all_operations_completed"))  # 记录所有操作已完成的日志
                print_end_message()  # 打印结束消息
            else:  # 如果获取令牌失败
                logging.error(get_translation("session_token_failed"))  # 记录会话令牌获取失败的错误日志

    except Exception as e:  # 捕获可能的异常
        logging.error(get_translation("program_error", error=str(e)))  # 记录程序错误的日志
    finally:  # 无论是否发生异常，都执行以下代码
        if browser_manager:  # 如果浏览器管理器存在
            browser_manager.quit()  # 退出浏览器
        input(get_translation("program_exit_message"))  # 提示用户按任意键退出程序
