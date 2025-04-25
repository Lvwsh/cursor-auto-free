# 导入日志模块，用于记录程序运行日志
import logging
# 导入操作系统功能模块，用于文件和目录操作
import os
# 导入datetime模块，用于获取当前日期时间
from datetime import datetime
try:
    # 尝试导入多语言支持模块的翻译函数
    from language import get_translation
except ImportError:
    # 如果language模块尚未导入（防止循环导入），定义一个简单的替代函数
    def get_translation(key, **kwargs):
        """
        简单的翻译函数替代品，用于防止循环导入
        
        Args:
            key (str): 翻译键
            **kwargs: 格式化参数
            
        Returns:
            str: 翻译后的文本
        """
        # 为特定的键提供默认翻译
        if key == "open_source_prefix":
            return "[Open source project: https://github.com/chengazhen/cursor-auto-free] {msg}"
        elif key == "logger_initialized":
            return "Logger initialized, log directory: {dir}"
        # 对于其他键，直接返回键名
        return key

# 定义日志目录
log_dir = "logs"
# 如果日志目录不存在，则创建它
if not os.path.exists(log_dir):
    os.makedirs(log_dir)


class PrefixFormatter(logging.Formatter):
    """
    自定义日志格式化器，为DEBUG级别的日志添加开源项目前缀
    
    继承自logging.Formatter，重写format方法
    """

    def format(self, record):
        """
        格式化日志记录
        
        Args:
            record: 日志记录对象
            
        Returns:
            str: 格式化后的日志字符串
        """
        # 只为DEBUG级别的日志添加前缀
        if record.levelno == logging.DEBUG:  # Only add prefix to DEBUG level
            # 使用翻译函数添加开源项目前缀
            record.msg = get_translation("open_source_prefix", msg=record.msg)
        # 调用父类的format方法完成基本格式化
        return super().format(record)


# 配置基本日志设置
logging.basicConfig(
    level=logging.DEBUG,  # 设置日志级别为DEBUG（记录所有级别的日志）
    format="%(asctime)s - %(levelname)s - %(message)s",  # 设置日志格式：时间 - 级别 - 消息
    handlers=[
        # 添加文件处理器，将日志写入到以当前日期命名的文件中
        logging.FileHandler(
            os.path.join(log_dir, f"{datetime.now().strftime('%Y-%m-%d')}.log"),  # 日志文件路径
            encoding="utf-8",  # 使用UTF-8编码
        ),
    ],
)

# 为所有文件处理器设置自定义格式化器
for handler in logging.getLogger().handlers:
    # 检查处理器是否为FileHandler类型
    if isinstance(handler, logging.FileHandler):
        # 设置自定义前缀格式化器
        handler.setFormatter(
            PrefixFormatter("%(asctime)s - %(levelname)s - %(message)s")  # 使用时间-级别-消息格式
        )


# 创建控制台处理器，用于在控制台显示日志
console_handler = logging.StreamHandler()
# 设置控制台处理器的日志级别为INFO（只显示INFO及以上级别的日志）
console_handler.setLevel(logging.INFO)
# 设置控制台处理器的格式化器，只显示消息部分
console_handler.setFormatter(PrefixFormatter("%(message)s"))

# 将控制台处理器添加到根日志记录器
logging.getLogger().addHandler(console_handler)

# 记录日志初始化信息，包括日志目录的绝对路径
logging.info(get_translation("logger_initialized", dir=os.path.abspath(log_dir)))


def main_task():
    """
    主任务执行函数。模拟工作流程并处理错误。
    
    这是一个示例函数，展示如何在实际应用中使用日志记录器。
    """
    try:
        # 记录任务开始的信息
        logging.info("Starting the main task...")

        # 模拟任务和错误条件
        if some_condition():
            # 如果条件满足，抛出ValueError异常
            raise ValueError("Simulated error occurred.")

        # 如果没有错误，记录任务成功完成的信息
        logging.info("Main task completed successfully.")

    except ValueError as ve:
        # 捕获并记录ValueError异常，包括异常堆栈信息
        logging.error(f"ValueError occurred: {ve}", exc_info=True)
    except Exception as e:
        # 捕获并记录其他所有异常，包括异常堆栈信息
        logging.error(f"Unexpected error occurred: {e}", exc_info=True)
    finally:
        # 无论是否有异常，都记录任务执行结束信息
        logging.info("Task execution finished.")


def some_condition():
    """
    模拟错误条件。返回True触发错误。
    
    在实际应用中，应该用真实的任务条件逻辑替换此函数。
    
    Returns:
        bool: 是否满足错误条件
    """
    # 始终返回True，用于触发示例中的错误情况
    return True


# 如果直接运行此脚本（而非作为模块导入），则执行示例流程
if __name__ == "__main__":
    # 应用程序工作流
    # 记录应用程序启动信息
    logging.info("Application started.")
    # 执行主任务
    main_task()
    # 记录应用程序退出信息
    logging.info("Application exited.")
