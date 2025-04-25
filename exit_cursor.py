# 导入进程管理模块，用于查找和操作系统进程
import psutil
# 导入自定义日志模块
from logger import logging  
# 导入时间模块，用于实现超时等待功能
import time

def ExitCursor(timeout=5):
    """
    温和地关闭 Cursor 进程
    
    Args:
        timeout (int): 等待进程自然终止的超时时间（秒）
    Returns:
        bool: 是否成功关闭所有进程
    """
    try:
        # 记录开始退出Cursor的日志
        logging.info("开始退出Cursor...")
        # 创建空列表用于存储Cursor相关进程
        cursor_processes = []
        # 遍历系统中的所有进程，寻找Cursor进程
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                # 检查进程名称是否为Cursor（不区分大小写）
                if proc.info['name'].lower() in ['cursor.exe', 'cursor']:
                    # 将找到的Cursor进程添加到列表中
                    cursor_processes.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                # 忽略无法访问的进程或已经不存在的进程
                continue

        # 如果没有找到任何Cursor进程，记录日志并返回成功
        if not cursor_processes:
            logging.info("未发现运行中的 Cursor 进程")
            return True

        # 对所有找到的Cursor进程发送温和的终止信号
        for proc in cursor_processes:
            try:
                # 确认进程仍在运行
                if proc.is_running():
                    # 发送终止信号，请求进程优雅地关闭
                    proc.terminate()  # 发送终止信号
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                # 忽略无法访问的进程或已经不存在的进程
                continue

        # 记录开始等待的时间
        start_time = time.time()
        # 等待进程自然终止，最多等待timeout秒
        while time.time() - start_time < timeout:
            # 创建空列表用于存储仍在运行的进程
            still_running = []
            # 检查每个进程的运行状态
            for proc in cursor_processes:
                try:
                    # 如果进程仍在运行，添加到still_running列表
                    if proc.is_running():
                        still_running.append(proc)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    # 忽略无法访问的进程或已经不存在的进程
                    continue
            
            # 如果没有进程仍在运行，记录日志并返回成功
            if not still_running:
                logging.info("所有 Cursor 进程已正常关闭")
                return True
                
            # 等待一小段时间再检查，减少CPU占用
            time.sleep(0.5)
            
        # 如果超时后仍有进程在运行
        if still_running:
            # 生成仍在运行的进程PID列表
            process_list = ", ".join([str(p.pid) for p in still_running])
            # 记录警告日志，列出未能关闭的进程
            logging.warning(f"以下进程未能在规定时间内关闭: {process_list}")
            # 返回失败，表示未能完全关闭所有进程
            return False
            
        # 所有进程已关闭，返回成功
        return True

    except Exception as e:
        # 捕获并记录任何发生的异常
        logging.error(f"关闭 Cursor 进程时发生错误: {str(e)}")
        # 发生异常，返回失败
        return False

# 如果直接运行此脚本（而非作为模块导入），则执行ExitCursor函数
if __name__ == "__main__":
    # 调用ExitCursor函数关闭Cursor进程
    ExitCursor()
