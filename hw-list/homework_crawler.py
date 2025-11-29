import requests  # type: ignore
from bs4 import BeautifulSoup  # type: ignore
import pandas as pd # type: ignore
import os
import re
import time
import json
import getpass
import sys
from datetime import datetime, timedelta
from colorama import init, Fore, Style  # type: ignore

# 初始化colorama（用於彩色終端輸出）
init(autoreset=True)

class ColorLogger:
    """彩色日誌輸出類 - 用於在控制台顯示不同顏色的日誌資訊"""
    
    @staticmethod
    def info(message):
        print(f"{Fore.CYAN}[摘要]{Style.RESET_ALL} {message}")
    
    @staticmethod
    def success(message):
        print(f"{Fore.GREEN}[成功]{Style.RESET_ALL} {message}")
    
    @staticmethod
    def warning(message):
        print(f"{Fore.YELLOW}[警告]{Style.RESET_ALL} {message}")
    
    @staticmethod
    def error(message):
        print(f"{Fore.RED}[錯誤]{Style.RESET_ALL} {message}")
    
    @staticmethod
    def debug(message):
        print(f"{Fore.BLUE}[偵錯]{Style.RESET_ALL} {message}")
    
    @staticmethod
    def progress(message, current, total):
        """顯示進度資訊"""
        percent = (current / total) * 100
        print(f"{Fore.MAGENTA}[進行中]{Style.RESET_ALL} {message} ({current}/{total} {percent:.1f}%)")

class ConfigManager:
    """設定管理員 - 處理用戶憑證的儲存和讀取"""

    CONFIG_FILE = os.path.join(os.path.dirname(__file__), "portal_config.json")
    
    @classmethod
    def load_config(cls):
        """載入設定檔"""
        if os.path.exists(cls.CONFIG_FILE):
            try:
                with open(cls.CONFIG_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                ColorLogger.warning(f"設定檔損毀: {e}")
        return {}
    
    @classmethod
    def save_config(cls, config):
        """儲存設定檔"""
        try:
            with open(cls.CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            ColorLogger.success("設定已儲存")
        except Exception as e:
            ColorLogger.error(f"儲存設定失敗: {e}")
    
    @classmethod
    def get_credentials(cls):
        """取得登入憑證 - 優先級：環境變數 > 設定檔 > 用戶輸入"""
        config = cls.load_config()
        
        # 首先嘗試環境變數
        env_username = os.getenv('PORTAL_USERNAME')
        env_password = os.getenv('PORTAL_PASSWORD')
        
        if env_username and env_password:
            ColorLogger.info("使用環境變數中的憑證")
            return env_username, env_password
        
        # 然後嘗試設定檔
        if config.get('username') and config.get('password'):
            ColorLogger.info("使用設定檔中的憑證")
            return config['username'], config['password']
        
        # 最後提示用戶輸入
        ColorLogger.warning("未找到儲存的登入憑證")
        return cls.prompt_for_credentials()
    
    @classmethod
    def prompt_for_credentials(cls):
        """提示用戶輸入憑證"""
        ColorLogger.info("請輸入入口門戶登入資料")
        
        username = input(f"{Fore.CYAN}用戶名稱: {Style.RESET_ALL}").strip()
        password = getpass.getpass(f"{Fore.CYAN}密碼: {Style.RESET_ALL}").strip()  # 使用getpass隱藏密碼輸入
        
        if not username or not password:
            ColorLogger.error("用戶名稱和密碼不可為空")
            return None, None
        
        # 詢問是否儲存憑證到本地
        save = input(f"{Fore.YELLOW}是否儲存憑證到本地設定檔? (y/N): {Style.RESET_ALL}").strip().lower()
        if save in ['y', 'yes']:
            config = cls.load_config()
            config.update({
                'username': username,
                'password': password,
                'last_updated': datetime.now().isoformat()
            })
            cls.save_config(config)
        
        return username, password
    
    @classmethod
    def clear_credentials(cls):
        """清除儲存的憑證"""
        if os.path.exists(cls.CONFIG_FILE):
            os.remove(cls.CONFIG_FILE)
            ColorLogger.success("已清除儲存的憑證")
        else:
            ColorLogger.warning("沒有找到儲存的憑證")

def login_to_portal(username, password):
    """登入入口門戶取得session"""
    login_url = "https://portal.frcss.edu.hk/user.php?op=login"
    session = requests.Session()  # 建立會話物件，保持登入狀態
    
    # 設定請求頭，模擬瀏覽器行為
    session.headers.update({
        'Accept-encoding': 'gzip, deflate, br, zstd',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',  # 還原為zh-TW優先
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://portal.frcss.edu.hk',
        'Referer': 'https://portal.frcss.edu.hk/modules/my/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Connection': 'keep-alive'
    })
    
    try:
        ColorLogger.info("正在取得登入頁面...")
        response = session.get(login_url)
        
        # 建構登入表單資料
        login_data = {
            'uname': username,
            'pass': password,
            'op': 'login',
            'xoops_redirect': '',
            'from': 'profile'
        }
        
        ColorLogger.info(f"使用帳號: {Fore.WHITE}{username}{Style.RESET_ALL} 登入...")
        ColorLogger.info("正在提交登入表單...")
        
        # 提交登入請求
        login_response = session.post(
            login_url, 
            data=login_data, 
            allow_redirects=True,
            headers={
                'Referer': login_url,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        )
        
        ColorLogger.debug(f"登入回應狀態碼: {login_response.status_code}")
        
        response_text = login_response.text
        
        # 檢查登入是否成功（透過頁面內容判斷）
        if '登入' in response_text and '帳號' in response_text:
            ColorLogger.error("登入失敗：用戶名稱或密碼錯誤")
            return None
        else:
            ColorLogger.success("登入成功！")
            
            # 測試存取家課頁面確認登入狀態
            test_url = "https://portal.frcss.edu.hk/modules/clsrm/?md=hw"
            test_response = session.get(test_url)
            if test_response.status_code == 200:
                ColorLogger.success("成功存取家課頁面，登入狀態確認")
            else:
                ColorLogger.warning(f"存取家課頁面失敗，狀態碼: {test_response.status_code}")
            
            return session  # 回傳保持登入狀態的session物件
            
    except Exception as e:
        ColorLogger.error(f"登入過程中出現錯誤: {e}")
        return None

def clean_subject_name(subject_text):
    """清理科目名稱 - 處理重複的英文代碼"""
    pattern = r'(.+?) -- ([A-Z]+)'
    match = re.match(pattern, subject_text)
    
    if match:
        chinese_name = match.group(1).strip()
        english_code = match.group(2).strip()
        
        # 處理重複的英文代碼（如：CHINCHIN -> CHIN）
        if len(english_code) % 2 == 0:
            half_length = len(english_code) // 2
            if english_code[:half_length] == english_code[half_length:]:
                english_code = english_code[:half_length]
        
        return f"{chinese_name} -- {english_code}"
    return subject_text

def get_homework_by_date(session, date_str):
    """取得指定日期的家課資料"""
    ajax_url = "https://portal.frcss.edu.hk/modules/clsrm/clsrm_hw_oper.php"
    
    # 建構AJAX請求資料
    data = {
        'oper': 'hw_tbl',
        'slt_term': '1',  # 學期
        'slt_subj': '',   # 科目（空表示所有科目）
        'slt_date': date_str,  # 查詢日期
        'slt_tide': 'create'   # 查詢類型
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://portal.frcss.edu.hk/modules/clsrm/?md=hw',
        'X-Requested-With': 'XMLHttpRequest',  # 標識為AJAX請求
        'Origin': 'https://portal.frcss.edu.hk'
    }
    
    try:
        ColorLogger.info(f"正在取得 {Fore.WHITE}{date_str}{Style.RESET_ALL} 的家課資料...")
        response = session.post(ajax_url, data=data, headers=headers)
        
        if response.status_code != 200:
            ColorLogger.error(f"請求失敗，狀態碼: {response.status_code}")
            return None
            
        try:
            result = response.json()  # 解析JSON回應
            html_content = result.get('html')
            if html_content:
                ColorLogger.success(f"成功取得 {Fore.WHITE}{date_str}{Style.RESET_ALL} 的家課資料")
            else:
                ColorLogger.info(f"{Fore.WHITE}{date_str}{Style.RESET_ALL} 沒有家課資料")
            return html_content
        except ValueError as e:
            ColorLogger.error(f"JSON解析失敗: {e}")
            return None
            
    except Exception as e:
        ColorLogger.error(f"取得 {date_str} 家課資料失敗: {e}")
        return None

def parse_homework_data(html_content):
    """解析家課表HTML內容，提取結構化資料"""
    if not html_content:
        return []
        
    soup = BeautifulSoup(html_content, 'html.parser')
    homework_data = []
    homework_table = soup.find('table', {'id': 'hw_table'})  # 查找家課表格
    
    if homework_table:
        rows = homework_table.find_all('tr')[1:]  # 跳過表頭行
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 7:  # 確保有足夠的列
                homework_data.append({
                    'id': cells[0].get_text(strip=True),  # 家課ID
                    'issue_date': cells[1].get_text(strip=True),  # 發布日期
                    'due_date': cells[2].get_text(strip=True),  # 截止日期
                    'class_group': cells[3].get_text(strip=True),  # 班級/組別
                    'subject': clean_subject_name(cells[4].get_text(strip=True)),  # 科目（清理後）
                    'homework_name': cells[5].get_text(strip=True),  # 家課名稱
                    'remarks': cells[6].get_text(strip=True),  # 備註
                })
        ColorLogger.success(f"取得 {Fore.WHITE}{len(homework_data)}{Style.RESET_ALL} 條家課記錄")
    else:
        ColorLogger.warning("未找到家課表格")
    
    return homework_data

def get_date_range():
    """取得從9月1日到今日的日期範圍（學年通常從9月開始）"""
    current_year = datetime.now().year
    start_date = datetime(current_year, 9, 1)  # 9月1日
    end_date = datetime.now()
    
    date_list = []
    current_date = start_date
    while current_date <= end_date:
        date_list.append(current_date.strftime('%Y-%m-%d'))
        current_date += timedelta(days=1)
    
    return date_list

def save_data(homework_data: list) -> None:
    """
    儲存家課資料到JSON和Excel檔案

    Args:
        homework_data: 家課資料列表，每個元素為包含家課資訊的字典
    """
    if not homework_data:
        ColorLogger.warning("沒有資料可儲存")
        return
    
    # 儲存為JSON檔案（便於程式讀取）
    with open('homework_data.json', 'w', encoding='utf-8') as f:
        json.dump(homework_data, f, ensure_ascii=False, indent=2)
    
    # 儲存為Excel檔案（便於用戶查看）
    df = pd.DataFrame(homework_data)
    if 'due_date' in df.columns:
        df['due_date'] = pd.to_datetime(df['due_date'], errors='coerce')  # 轉換日期格式
        df = df.sort_values('due_date')  # 按截止日期排序
    df.to_excel('homework_data.xlsx', index=False, engine='openpyxl')
    
    ColorLogger.success(f"資料已儲存: {Fore.WHITE}{len(homework_data)}{Style.RESET_ALL} 條記錄")

def main(force_full_update=False):
    """主函數
    Args:
        force_full_update: 是否強制完整更新所有資料
    """
    # 取得憑證
    username, password = ConfigManager.get_credentials()
    
    if not username or not password:
        ColorLogger.error("無法取得登入憑證，程式退出")
        return []
    
    # 登入入口門戶
    session = login_to_portal(username, password)
    if not session:
        ColorLogger.error("登入失敗，無法繼續取得資料")
        return []
    
    # 檢查是否需要強制完整更新
    if force_full_update:
        ColorLogger.info(f"{Fore.YELLOW}強制完整更新模式已啟用{Style.RESET_ALL}")
        ColorLogger.info("將重新取得從9月1日至現時的所有家課資料...")
        date_list = get_date_range()
        ColorLogger.info(f"將查詢 {Fore.WHITE}{len(date_list)}{Style.RESET_ALL} 天的家課資料")
        
        homework_data = []
        for i, date_str in enumerate(date_list):
            ColorLogger.progress(f"查詢 {Fore.WHITE}{date_str}{Style.RESET_ALL} 的家課資料", i + 1, len(date_list))
            
            homework_html = get_homework_by_date(session, date_str)
            if homework_html:
                daily_homework = parse_homework_data(homework_html)
                homework_data.extend(daily_homework)
            
            time.sleep(1)  # 加入延遲避免請求過快
    
    # 增量更新模式（預設）
    elif os.path.exists('homework_data.json'):
        ColorLogger.info("偵測到已存在資料，更新今日的資料...")
        try:
            with open('homework_data.json', 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            existing_ids = {item['id'] for item in existing_data if 'id' in item}  # 取得現有資料的ID集合
        except Exception as e:
            ColorLogger.error(f"讀取現有資料失敗: {e}")
            existing_data = []
            existing_ids = set()
        
        # 只取得今日的資料
        today = datetime.now().strftime('%Y-%m-%d')
        homework_html = get_homework_by_date(session, today)
        new_homework = parse_homework_data(homework_html) if homework_html else []
        
        # 過濾掉已存在的資料
        new_count = 0
        for item in new_homework:
            if item['id'] not in existing_ids:
                existing_data.append(item)
                new_count += 1
        
        homework_data = existing_data
        ColorLogger.success(f"新增 {Fore.WHITE}{new_count}{Style.RESET_ALL} 條記錄")
    
    # 首次執行模式
    else:
        ColorLogger.info("首次執行，取得從9月1日至現時的所有家課資料...")
        date_list = get_date_range()
        ColorLogger.info(f"將查詢 {Fore.WHITE}{len(date_list)}{Style.RESET_ALL} 天的家課資料")
        
        homework_data = []
        for i, date_str in enumerate(date_list):
            ColorLogger.progress(f"查詢 {Fore.WHITE}{date_str}{Style.RESET_ALL} 的家課資料", i + 1, len(date_list))
            
            homework_html = get_homework_by_date(session, date_str)
            if homework_html:
                daily_homework = parse_homework_data(homework_html)
                homework_data.extend(daily_homework)
            
            time.sleep(1)  # 加入延遲避免請求過快
    
    # 儲存資料
    if homework_data:
        save_data(homework_data)
    else:
        ColorLogger.warning("沒有取得家課資料")
    
    return homework_data

def show_help():
    """顯示爬蟲工具的使用說明資訊"""
    print(f"""
{Fore.YELLOW}家課資料爬蟲使用說明{Style.RESET_ALL}

{Fore.CYAN}使用方法:{Style.RESET_ALL}
  python homework_crawler.py                           # 正常執行爬蟲（增量更新）
  python homework_crawler.py --force-full-update/-ffu  # 強制完整更新所有資料
  python homework_crawler.py --clear                   # 清除儲存的憑證
  python homework_crawler.py --help/-h                 # 顯示此說明資訊

{Fore.CYAN}GitHub Actions 參數:{Style.RESET_ALL}
  在GitHub Actions中，可透過設定 inputs.force_full_update 為 true 觸發強制完整更新

{Fore.CYAN}憑證取得優先級:{Style.RESET_ALL}
  1. 環境變數 (PORTAL_USERNAME, PORTAL_PASSWORD)
  2. 本地設定檔 (portal_config.json)
  3. 用戶互動輸入

{Fore.CYAN}環境變數設定方法:{Style.RESET_ALL}

{Fore.GREEN}Windows (命令提示字元):{Style.RESET_ALL}
  set PORTAL_USERNAME=your_username
  set PORTAL_PASSWORD=your_password
  
{Fore.GREEN}Windows (PowerShell):{Style.RESET_ALL}
  $env:PORTAL_USERNAME="your_username"
  $env:PORTAL_PASSWORD="your_password"
  
{Fore.GREEN}Linux/macOS (bash/zsh):{Style.RESET_ALL}
  export PORTAL_USERNAME="your_username"
  export PORTAL_PASSWORD="your_password"
  
{Fore.GREEN}永久設定 (Linux/macOS):{Style.RESET_ALL}
  將以下內容加入 ~/.bashrc 或 ~/.zshrc 檔案中：
  export PORTAL_USERNAME="your_username"
  export PORTAL_PASSWORD="your_password"
  然後執行: source ~/.bashrc 或 source ~/.zshrc
  
{Fore.GREEN}永久設定 (Windows):{Style.RESET_ALL}
  1. 右鍵「此電腦」→「內容」→「進階系統設定」
  2. 點擊「環境變數」按鈕
  3. 在「用戶變數」或「系統變數」中新增變數：
     - 變數名: PORTAL_USERNAME, 變數值: your_username
     - 變數名: PORTAL_PASSWORD, 變數值: your_password
  
{Fore.GREEN}在Python指令碼中臨時設定:{Style.RESET_ALL}
  import os
  os.environ['PORTAL_USERNAME'] = 'your_username'
  os.environ['PORTAL_PASSWORD'] = 'your_password'
  
{Fore.YELLOW}安全提示:{Style.RESET_ALL}
  - 切勿在公眾場合或共用電腦上儲存密碼
  - 定期更換密碼
  - 使用強密碼（包含字母、數字及特殊字元）
""")

if __name__ == "__main__":
    import sys
    
    # 處理命令列參數
    force_full_update = False
    
    if len(sys.argv) > 1:
        # 清除憑證
        if sys.argv[1] == '--clear':
            ConfigManager.clear_credentials()
            sys.exit(0)
        # 全量更新
        elif sys.argv[1] in ['--force-full-update', '-ffu']:
            force_full_update = True
            ColorLogger.info(f"{Fore.YELLOW}強制完整更新模式已啟用{Style.RESET_ALL}")
        # 說明資訊
        elif sys.argv[1] in ['--help', '-h']:
            show_help()
            sys.exit(0)
    
    ColorLogger.info("=" * 50)
    ColorLogger.info(f"{Fore.YELLOW}家課資料爬蟲開始執行{Style.RESET_ALL}")
    ColorLogger.info("=" * 50)
    
    # 記錄執行時間
    start_time = datetime.now()
    homework_data = main(force_full_update=force_full_update)
    end_time = datetime.now()
    
    ColorLogger.info("=" * 50)
    if homework_data:
        ColorLogger.success(f"爬蟲執行完成！共處理 {Fore.WHITE}{len(homework_data)}{Style.RESET_ALL} 條家課記錄")
    else:
        ColorLogger.warning("爬蟲執行完成，但沒有取得任何家課記錄")
    
    duration = end_time - start_time
    ColorLogger.info(f"執行時間: {Fore.WHITE}{duration}{Style.RESET_ALL}")
    ColorLogger.info("=" * 50)