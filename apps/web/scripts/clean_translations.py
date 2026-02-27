#!/usr/bin/env python3
"""
Script to clean up translation files that have multiple [TO_TRANSLATE] prefixes.
This fixes the issue where sync_translations.py added multiple prefixes.
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, Any
import argparse


def load_json_file(file_path: Path) -> Dict[str, Any]:
    """Load a JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return {}


def save_json_file(file_path: Path, data: Dict[str, Any], indent: int = 2) -> bool:
    """Save a JSON file with consistent formatting."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=indent, separators=(',', ': '))
            f.write('\n')  # Add newline at the end
        return True
    except Exception as e:
        print(f"Error saving {file_path}: {e}")
        return False


def clean_translate_prefixes(value: Any) -> Any:
    """Clean multiple [TO_TRANSLATE] prefixes from a value."""
    if isinstance(value, str):
        # Remove multiple [TO_TRANSLATE] prefixes, keeping only one
        # Pattern matches multiple [TO_TRANSLATE] followed by optional spaces
        pattern = r'(\[TO_TRANSLATE\]\s*)+'
        cleaned = re.sub(pattern, '[TO_TRANSLATE] ', value)
        
        # If the original value had [TO_TRANSLATE] prefixes, ensure it starts with exactly one
        if '[TO_TRANSLATE]' in value:
            # Remove any leading [TO_TRANSLATE] first
            without_prefix = re.sub(r'^\[TO_TRANSLATE\]\s*', '', cleaned)
            # Add exactly one prefix
            cleaned = f'[TO_TRANSLATE] {without_prefix}'
        
        return cleaned
    elif isinstance(value, dict):
        return {k: clean_translate_prefixes(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [clean_translate_prefixes(item) for item in value]
    else:
        return value


def clean_translation_file(file_path: Path, dry_run: bool = False) -> Dict[str, int]:
    """Clean a single translation file and return statistics."""
    print(f"Processing: {file_path.name}")
    
    # Load the file
    data = load_json_file(file_path)
    if not data:
        print(f"  ❌ Error loading file")
        return {'errors': 1, 'cleaned': 0, 'unchanged': 0}
    
    # Clean the data
    cleaned_data = clean_translate_prefixes(data)
    
    # Count changes by comparing JSON strings
    original_str = json.dumps(data, sort_keys=True)
    cleaned_str = json.dumps(cleaned_data, sort_keys=True)
    
    if original_str == cleaned_str:
        print(f"  ✅ No changes needed")
        return {'errors': 0, 'cleaned': 0, 'unchanged': 1}
    
    # Count how many strings were affected
    def count_translate_strings(obj, prefix_count=0):
        if isinstance(obj, str):
            return prefix_count + (1 if '[TO_TRANSLATE]' in obj else 0)
        elif isinstance(obj, dict):
            return sum(count_translate_strings(v, prefix_count) for v in obj.values())
        elif isinstance(obj, list):
            return sum(count_translate_strings(item, prefix_count) for item in obj)
        return prefix_count
    
    original_count = count_translate_strings(data)
    cleaned_count = count_translate_strings(cleaned_data)
    
    if dry_run:
        print(f"  📝 [DRY RUN] Would clean {original_count - cleaned_count} strings with multiple prefixes")
        return {'errors': 0, 'cleaned': 1, 'unchanged': 0}
    else:
        # Save the cleaned data
        if save_json_file(file_path, cleaned_data):
            print(f"  🔄 Cleaned {original_count - cleaned_count} strings with multiple prefixes")
            return {'errors': 0, 'cleaned': 1, 'unchanged': 0}
        else:
            print(f"  ❌ Error saving file")
            return {'errors': 1, 'cleaned': 0, 'unchanged': 0}


def clean_translations(messages_dir: Path, exclude_reference: str = 'en-US.json', 
                      dry_run: bool = False) -> None:
    """Clean all translation files in the directory."""
    
    # Find all JSON files except the reference file
    json_files = [f for f in messages_dir.glob('*.json') if f.name != exclude_reference]
    
    if not json_files:
        print("No translation files found")
        return
    
    print(f"Found {len(json_files)} translation files to process\n")
    
    stats = {'errors': 0, 'cleaned': 0, 'unchanged': 0}
    
    for json_file in sorted(json_files):
        file_stats = clean_translation_file(json_file, dry_run)
        for key in stats:
            stats[key] += file_stats[key]
        print()
    
    # Show summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if dry_run:
        print("🔍 DRY RUN MODE - No changes were made\n")
    
    print(f"✅ Files unchanged: {stats['unchanged']}")
    print(f"🔄 Files cleaned: {stats['cleaned']}")
    print(f"❌ Files with errors: {stats['errors']}")
    
    if stats['cleaned'] > 0 and not dry_run:
        print(f"\n🎉 Successfully cleaned {stats['cleaned']} files!")


def main():
    parser = argparse.ArgumentParser(
        description='Clean up translation files with multiple [TO_TRANSLATE] prefixes'
    )
    parser.add_argument(
        '--messages-dir', 
        type=Path,
        default=Path(__file__).parent.parent / 'messages',
        help='Directory containing message files (default: ../messages)'
    )
    parser.add_argument(
        '--exclude-reference', 
        default='en-US.json',
        help='Reference file to exclude from cleaning (default: en-US.json)'
    )
    parser.add_argument(
        '--dry-run', 
        action='store_true',
        help='Only show what would be changed without making modifications'
    )
    
    args = parser.parse_args()
    
    if not args.messages_dir.exists():
        print(f"Directory not found: {args.messages_dir}")
        return 1
    
    print(f"Directory: {args.messages_dir}")
    print(f"Exclude: {args.exclude_reference}")
    print(f"Dry run: {args.dry_run}")
    print("-" * 60)
    
    clean_translations(
        messages_dir=args.messages_dir,
        exclude_reference=args.exclude_reference,
        dry_run=args.dry_run
    )
    
    return 0


if __name__ == '__main__':
    exit(main()) 