import requests
from bs4 import BeautifulSoup
import json
import os
import re
from datetime import datetime, timedelta

class GitHubActionsLogger:
    """GitHub Actions 日誌輸出類"""
    
    @staticmethod
    def info(message):
        print(f"::notice::{message}")
    
    @staticmethod
    def success(message):
        print(f"::notice title=成功::{message}")
    
    @staticmethod
    def warning(message):
        print(f"::warning::{message}")
    
    @staticmethod
    def error(message):
        print(f"::error::{message}")
    
    @staticmethod
    def group(title):
        print(f"::group::{title}")
    
    @staticmethod
    def endgroup():
        print("::endgroup::")

def get_credentials():
    """從環境變數取得登入憑證"""
    username = os.getenv('PORTAL_USERNAME')
    password = os.getenv('PORTAL_PASSWORD')
    
    if not username or not password:
        GitHubActionsLogger.error("無法從環境變數取得登入憑證")
        GitHubActionsLogger.error("請設定 PORTAL_USERNAME 和 PORTAL_PASSWORD 環境變數")
        return None, None
    
    GitHubActionsLogger.info("成功從環境變數取得登入憑證")
    return username, password

def login_to_portal(username, password):
    """登入入口門戶取得session"""
    login_url = "https://portal.frcss.edu.hk/user.php?op=login"
    session = requests.Session()
    
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    })
    
    try:
        GitHubActionsLogger.info("正在登入...")
        login_data = {
            'uname': username,
            'pass': password,
            'op': 'login',
            'xoops_redirect': '',
            'from': 'profile'
        }
        
        response = session.post(login_url, data=login_data)
        
        if '登入' in response.text and '帳號' in response.text:
            GitHubActionsLogger.error("登入失敗：用戶名稱或密碼錯誤")
            return None
        else:
            GitHubActionsLogger.success("登入成功！")
            return session
            
    except Exception as e:
        GitHubActionsLogger.error(f"登入過程中出現錯誤: {e}")
        return None

def clean_subject_name(subject_text):
    """清理科目名稱"""
    pattern = r'(.+?) -- ([A-Z]+)'
    match = re.match(pattern, subject_text)
    
    if match:
        chinese_name = match.group(1).strip()
        english_code = match.group(2).strip()
        
        # 處理重複的英文代碼
        if len(english_code) % 2 == 0:
            half_length = len(english_code) // 2
            if english_code[:half_length] == english_code[half_length:]:
                english_code = english_code[:half_length]
        
        return f"{chinese_name} -- {english_code}"
    return subject_text

def get_homework_by_date(session, date_str):
    """取得指定日期的家課資料"""
    ajax_url = "https://portal.frcss.edu.hk/modules/clsrm/clsrm_hw_oper.php"
    
    data = {
        'oper': 'hw_tbl',
        'slt_term': '1',
        'slt_subj': '',
        'slt_date': date_str,
        'slt_tide': 'create'
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://portal.frcss.edu.hk/modules/clsrm/?md=hw',
        'X-Requested-With': 'XMLHttpRequest',
    }
    
    try:
        GitHubActionsLogger.info(f"正在取得 {date_str} 的家課資料...")
        response = session.post(ajax_url, data=data, headers=headers)
        
        if response.status_code != 200:
            GitHubActionsLogger.error(f"請求失敗，狀態碼: {response.status_code}")
            return None
            
        try:
            result = response.json()
            html_content = result.get('html')
            if html_content:
                GitHubActionsLogger.success(f"成功取得 {date_str} 的家課資料")
            else:
                GitHubActionsLogger.info(f"{date_str} 沒有家課資料")
            return html_content
        except ValueError as e:
            GitHubActionsLogger.error(f"JSON解析失敗: {e}")
            return None
            
    except Exception as e:
        GitHubActionsLogger.error(f"取得 {date_str} 家課資料失敗: {e}")
        return None

def parse_homework_data(html_content):
    """解析家課表HTML內容"""
    if not html_content:
        return []
        
    soup = BeautifulSoup(html_content, 'html.parser')
    homework_data = []
    homework_table = soup.find('table', {'id': 'hw_table'})
    
    if homework_table:
        rows = homework_table.find_all('tr')[1:]
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 7:
                homework_data.append({
                    'id': cells[0].get_text(strip=True),
                    'issue_date': cells[1].get_text(strip=True),
                    'due_date': cells[2].get_text(strip=True),
                    'class_group': cells[3].get_text(strip=True),
                    'subject': clean_subject_name(cells[4].get_text(strip=True)),
                    'homework_name': cells[5].get_text(strip=True),
                    'remarks': cells[6].get_text(strip=True),
                })
        GitHubActionsLogger.success(f"取得 {len(homework_data)} 條家課記錄")
    else:
        GitHubActionsLogger.warning("未找到家課表格")
    
    return homework_data

def get_date_range():
    """取得從9月1日到今日的日期範圍"""
    current_year = datetime.now().year
    start_date = datetime(current_year, 9, 1)
    end_date = datetime.now()
    
    date_list = []
    current_date = start_date
    while current_date <= end_date:
        date_list.append(current_date.strftime('%Y-%m-%d'))
        current_date += timedelta(days=1)
    
    return date_list

def save_data_to_json(homework_data, filename='homework_data.json'):
    """儲存家課資料到JSON檔案"""
    if not homework_data:
        GitHubActionsLogger.warning("沒有資料可儲存")
        return False
    
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(homework_data, f, ensure_ascii=False, indent=2)
        
        GitHubActionsLogger.success(f"資料已儲存到 {filename}: {len(homework_data)} 條記錄")
        return True
    except Exception as e:
        GitHubActionsLogger.error(f"儲存資料失敗: {e}")
        return False

def main():
    """主函數"""
    GitHubActionsLogger.group("家課資料爬蟲開始執行")
    
    # 取得登入憑證
    username, password = get_credentials()
    if not username or not password:
        return []
    
    # 登入入口門戶
    session = login_to_portal(username, password)
    if not session:
        return []
    
    # 檢查是否需要強制完整更新
    force_full_update = os.getenv('FORCE_FULL_UPDATE', 'false').lower() == 'true'
    
    if force_full_update:
        GitHubActionsLogger.info("強制完整更新模式已啟用")
    
    # 取得今日日期
    today = datetime.now().strftime('%Y-%m-%d')
    
    # 判斷是否為首次運行或需要完整更新
    if force_full_update or not os.path.exists('homework_data.json'):
        GitHubActionsLogger.info("取得從9月1日至現時的所有家課資料...")
        date_list = get_date_range()
        GitHubActionsLogger.info(f"將查詢 {len(date_list)} 天的家課資料")
        
        homework_data = []
        for i, date_str in enumerate(date_list):
            if i % 10 == 0:  # 每10天輸出一次進度
                GitHubActionsLogger.info(f"查詢進度: {i+1}/{len(date_list)} - {date_str}")
            
            homework_html = get_homework_by_date(session, date_str)
            if homework_html:
                daily_homework = parse_homework_data(homework_html)
                homework_data.extend(daily_homework)
        
        GitHubActionsLogger.success(f"完整更新完成，共取得 {len(homework_data)} 條記錄")
    
    else:
        GitHubActionsLogger.info("增量更新模式")
        
        # 讀取現有資料
        try:
            with open('homework_data.json', 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            existing_ids = {item['id'] for item in existing_data if 'id' in item}
        except Exception as e:
            GitHubActionsLogger.error(f"讀取現有資料失敗: {e}")
            existing_data = []
            existing_ids = set()
        
        # 取得今日家課資料
        homework_html = get_homework_by_date(session, today)
        new_homework = parse_homework_data(homework_html) if homework_html else []
        
        # 過濾掉已存在的資料
        new_count = 0
        for item in new_homework:
            if item['id'] not in existing_ids:
                existing_data.append(item)
                new_count += 1
        
        homework_data = existing_data
        GitHubActionsLogger.success(f"新增 {new_count} 條記錄，總計 {len(homework_data)} 條記錄")
    
    # 儲存資料
    if homework_data:
        save_data_to_json(homework_data)
        # 輸出摘要資訊
        GitHubActionsLogger.info(f"資料摘要:")
        GitHubActionsLogger.info(f"  - 總記錄數: {len(homework_data)}")
        
        # 按科目統計
        subject_counts = {}
        for item in homework_data:
            subject = item.get('subject', '未知')
            subject_counts[subject] = subject_counts.get(subject, 0) + 1
        
        GitHubActionsLogger.info(f"  - 科目統計:")
        for subject, count in subject_counts.items():
            GitHubActionsLogger.info(f"    - {subject}: {count} 項")
        
        # 檢查是否有即將到期的作業
        today_dt = datetime.now()
        upcoming_count = 0
        for item in homework_data:
            due_date_str = item.get('due_date', '')
            try:
                due_date = datetime.strptime(due_date_str, '%Y-%m-%d')
                if 0 <= (due_date - today_dt).days <= 3:
                    upcoming_count += 1
            except:
                pass
        
        if upcoming_count > 0:
            GitHubActionsLogger.warning(f"有 {upcoming_count} 項作業在未來3天內到期")
    else:
        GitHubActionsLogger.warning("沒有取得家課資料")
    
    GitHubActionsLogger.endgroup()
    return homework_data

if __name__ == "__main__":
    start_time = datetime.now()
    homework_data = main()
    end_time = datetime.now()
    
    GitHubActionsLogger.info(f"執行時間: {end_time - start_time}")
    GitHubActionsLogger.info(f"完成狀態: {'成功' if homework_data else '失敗'}")
    
    # 輸出環境資訊
    GitHubActionsLogger.group("環境資訊")
    GitHubActionsLogger.info(f"執行時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    GitHubActionsLogger.info(f"Python版本: {sys.version}")
    GitHubActionsLogger.endgroup()