#!/usr/bin/env python3
"""
Script to synchronize translations using en-US.json as reference.
Adds missing keys to other language files.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Set, List
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


def get_all_keys(data: Dict[str, Any], prefix: str = '') -> Set[str]:
    """Extract all keys from nested JSON recursively."""
    keys = set()
    
    for key, value in data.items():
        current_key = f"{prefix}.{key}" if prefix else key
        keys.add(current_key)
        
        if isinstance(value, dict):
            keys.update(get_all_keys(value, current_key))
    
    return keys


def get_nested_value(data: Dict[str, Any], key_path: str) -> Any:
    """Get a nested value using a key with dots as separator."""
    keys = key_path.split('.')
    current = data
    
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return None
    
    return current


def set_nested_value(data: Dict[str, Any], key_path: str, value: Any) -> None:
    """Set a nested value using a key with dots as separator."""
    keys = key_path.split('.')
    current = data
    
    # Navigate to the second-to-last level, creating dictionaries as needed
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        elif not isinstance(current[key], dict):
            current[key] = {}
        current = current[key]
    
    # Set the value at the last level
    current[keys[-1]] = value


def find_missing_keys(reference_data: Dict[str, Any], target_data: Dict[str, Any]) -> List[str]:
    """Find keys that are in reference but not in target."""
    reference_keys = get_all_keys(reference_data)
    target_keys = get_all_keys(target_data)
    
    missing_keys = reference_keys - target_keys
    return sorted(list(missing_keys))


def add_missing_keys(reference_data: Dict[str, Any], target_data: Dict[str, Any], 
                    missing_keys: List[str], mark_as_untranslated: bool = True) -> Dict[str, Any]:
    """Add missing keys to target_data using reference values."""
    updated_data = target_data.copy()
    
    for key_path in missing_keys:
        reference_value = get_nested_value(reference_data, key_path)
        
        if reference_value is not None:
            # Check if the key already exists in target with a [TO_TRANSLATE] prefix
            existing_value = get_nested_value(target_data, key_path)
            
            if mark_as_untranslated and isinstance(reference_value, str):
                # If the existing value already starts with [TO_TRANSLATE], don't add another prefix
                if existing_value and isinstance(existing_value, str) and existing_value.startswith("[TO_TRANSLATE]"):
                    translated_value = existing_value
                else:
                    translated_value = f"[TO_TRANSLATE] {reference_value}"
            else:
                translated_value = reference_value
            
            set_nested_value(updated_data, key_path, translated_value)
    
    return updated_data


def sync_translations(messages_dir: Path, reference_file: str = 'en-US.json', 
                     mark_as_untranslated: bool = True, dry_run: bool = False) -> None:
    """Synchronize all translations using a reference file."""
    
    # Load reference file
    reference_path = messages_dir / reference_file
    if not reference_path.exists():
        print(f"Reference file not found: {reference_path}")
        return
    
    print(f"Loading reference file: {reference_file}")
    reference_data = load_json_file(reference_path)
    if not reference_data:
        print("Error loading reference file")
        return
    
    # Find all JSON files in the folder
    json_files = [f for f in messages_dir.glob('*.json') if f.name != reference_file]
    
    if not json_files:
        print("No translation files found")
        return
    
    total_keys_reference = len(get_all_keys(reference_data))
    print(f"Reference file contains {total_keys_reference} keys")
    print(f"Processing {len(json_files)} translation files...\n")
    
    summary = []
    
    for json_file in sorted(json_files):
        print(f"Processing: {json_file.name}")
        
        # Load translation file
        translation_data = load_json_file(json_file)
        if not translation_data:
            print(f"  ❌ Error loading {json_file.name}")
            continue
        
        # Find missing keys
        missing_keys = find_missing_keys(reference_data, translation_data)
        current_keys = len(get_all_keys(translation_data))
        
        if not missing_keys:
            print(f"  ✅ Complete ({current_keys}/{total_keys_reference} keys)")
            summary.append({
                'file': json_file.name,
                'status': 'complete',
                'missing': 0,
                'total': current_keys
            })
            continue
        
        print(f"  🔍 Found {len(missing_keys)} missing keys")
        
        if dry_run:
            print(f"  📝 [DRY RUN] Keys that would be added:")
            for key in missing_keys[:5]:  # Show only first 5
                print(f"    - {key}")
            if len(missing_keys) > 5:
                print(f"    ... and {len(missing_keys) - 5} more")
        else:
            # Add missing keys
            updated_data = add_missing_keys(reference_data, translation_data, 
                                          missing_keys, mark_as_untranslated)
            
            # Save updated file
            if save_json_file(json_file, updated_data):
                print(f"  ✅ Updated successfully ({current_keys + len(missing_keys)}/{total_keys_reference} keys)")
                summary.append({
                    'file': json_file.name,
                    'status': 'updated',
                    'missing': len(missing_keys),
                    'total': current_keys + len(missing_keys)
                })
            else:
                print(f"  ❌ Error saving {json_file.name}")
                summary.append({
                    'file': json_file.name,
                    'status': 'error',
                    'missing': len(missing_keys),
                    'total': current_keys
                })
        
        print()
    
    # Show summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if dry_run:
        print("🔍 DRY RUN MODE - No changes were made\n")
    
    for item in summary:
        status_icon = {
            'complete': '✅',
            'updated': '🔄',
            'error': '❌'
        }.get(item['status'], '❓')
        
        print(f"{status_icon} {item['file']:<15} - {item['total']}/{total_keys_reference} keys", end='')
        
        if item['missing'] > 0:
            print(f" (+{item['missing']} added)" if item['status'] == 'updated' else f" ({item['missing']} missing)")
        else:
            print()


def main():
    parser = argparse.ArgumentParser(
        description='Synchronize translations using en-US.json as reference'
    )
    parser.add_argument(
        '--messages-dir', 
        type=Path,
        default=Path(__file__).parent.parent / 'messages',
        help='Directory containing message files (default: ../messages)'
    )
    parser.add_argument(
        '--reference', 
        default='en-US.json',
        help='Reference file (default: en-US.json)'
    )
    parser.add_argument(
        '--no-mark-untranslated', 
        action='store_true',
        help='Don\'t mark added keys as [TO_TRANSLATE]'
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
    print(f"Reference: {args.reference}")
    print(f"Mark untranslated: {not args.no_mark_untranslated}")
    print(f"Dry run: {args.dry_run}")
    print("-" * 60)
    
    sync_translations(
        messages_dir=args.messages_dir,
        reference_file=args.reference,
        mark_as_untranslated=not args.no_mark_untranslated,
        dry_run=args.dry_run
    )
    
    return 0


if __name__ == '__main__':
    exit(main()) 