#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Downloads 文件夹自动整理脚本
功能：按文件类型分类整理，处理重复文件名，输出整理报告
"""

import os
import shutil
from pathlib import Path
from datetime import datetime
from collections import defaultdict


# 文件类型分类规则
FILE_CATEGORIES = {
    '图片': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.raw', '.psd'],
    '文档': ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.md'],
    '压缩包': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz'],
    '视频': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg'],
    '音频': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
    '程序': ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.appimage'],
    '代码': ['.py', '.js', '.html', '.css', '.java', '.cpp', '.c', '.h', '.php', '.go', '.rs', '.ts', '.json', '.xml', '.sql'],
}


def get_file_category(filename):
    """根据文件名判断文件类型分类"""
    ext = Path(filename).suffix.lower()
    for category, extensions in FILE_CATEGORIES.items():
        if ext in extensions:
            return category
    return '其他'


def get_unique_filename(dest_path, filename):
    """
    生成唯一的文件名（处理重复文件）
    如果目标文件已存在，自动添加序号后缀
    """
    dest_file = dest_path / filename
    if not dest_file.exists():
        return dest_file
    
    # 分离文件名和扩展名
    stem = Path(filename).stem
    suffix = Path(filename).suffix
    
    # 添加序号
    counter = 1
    while True:
        new_filename = f"{stem}_{counter:03d}{suffix}"
        dest_file = dest_path / new_filename
        if not dest_file.exists():
            return dest_file
        counter += 1


def organize_downloads(downloads_path=None):
    """
    整理 Downloads 文件夹
    
    Args:
        downloads_path: Downloads 路径，默认自动检测
    
    Returns:
        整理报告字典
    """
    # 自动检测 Downloads 路径
    if downloads_path is None:
        downloads_path = Path.home() / 'Downloads'
    else:
        downloads_path = Path(downloads_path)
    
    if not downloads_path.exists():
        print(f"错误: 路径不存在 {downloads_path}")
        return None
    
    print(f"开始整理: {downloads_path}")
    print("-" * 50)
    
    # 统计信息
    stats = {
        'processed': 0,
        'skipped': 0,
        'errors': [],
        'by_category': defaultdict(list),
        'renamed': []
    }
    
    # 获取所有文件（不包括子目录中的文件，不包括隐藏文件）
    files = [f for f in downloads_path.iterdir() 
             if f.is_file() and not f.name.startswith('.')]
    
    total = len(files)
    print(f"找到 {total} 个待整理文件\n")
    
    for i, file_path in enumerate(files, 1):
        try:
            # 跳过脚本本身
            if file_path.name == os.path.basename(__file__):
                stats['skipped'] += 1
                continue
            
            # 判断文件类型
            category = get_file_category(file_path.name)
            
            # 创建目标文件夹
            dest_folder = downloads_path / category
            dest_folder.mkdir(exist_ok=True)
            
            # 处理重复文件名
            dest_file = get_unique_filename(dest_folder, file_path.name)
            
            # 记录是否重命名
            if dest_file.name != file_path.name:
                stats['renamed'].append({
                    'original': file_path.name,
                    'new': dest_file.name,
                    'category': category
                })
            
            # 移动文件
            shutil.move(str(file_path), str(dest_file))
            
            # 更新统计
            stats['processed'] += 1
            stats['by_category'][category].append(dest_file.name)
            
            print(f"[{i}/{total}] ✓ {file_path.name} → {category}/{dest_file.name}")
            
        except Exception as e:
            stats['errors'].append({'file': file_path.name, 'error': str(e)})
            print(f"[{i}/{total}] ✗ {file_path.name} (错误: {e})")
    
    print("\n" + "=" * 50)
    return stats


def print_report(stats):
    """打印整理报告"""
    if stats is None:
        return
    
    print("\n📊 整理报告")
    print("=" * 50)
    print(f"处理时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"成功整理: {stats['processed']} 个文件")
    print(f"跳过文件: {stats['skipped']} 个")
    
    if stats['renamed']:
        print(f"\n📁 重命名文件: {len(stats['renamed'])} 个")
        for item in stats['renamed']:
            print(f"  • {item['original']} → {item['new']}")
    
    print("\n📂 分类统计:")
    for category in sorted(stats['by_category'].keys()):
        files = stats['by_category'][category]
        print(f"  {category}: {len(files)} 个文件")
    
    if stats['errors']:
        print(f"\n⚠️  错误 ({len(stats['errors'])} 个):")
        for err in stats['errors']:
            print(f"  • {err['file']}: {err['error']}")
    
    print("\n" + "=" * 50)
    print("整理完成! ✨")


def main():
    """主函数"""
    import sys
    
    # 检查命令行参数
    if len(sys.argv) > 1:
        downloads_path = sys.argv[1]
    else:
        downloads_path = None
    
    # 执行整理
    stats = organize_downloads(downloads_path)
    
    # 打印报告
    print_report(stats)


if __name__ == '__main__':
    main()
