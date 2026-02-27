#!/usr/bin/env python3
"""
Script to check translation status and identify strings that need translation.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Tuple
import argparse


def load_json_file(file_path: Path) -> Dict[str, Any]:
    """Load a JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return {}


def get_all_string_values(data: Dict[str, Any], prefix: str = '') -> List[Tuple[str, str]]:
    """Extract all strings from nested JSON with their keys."""
    strings = []
    
    for key, value in data.items():
        current_key = f"{prefix}.{key}" if prefix else key
        
        if isinstance(value, str):
            strings.append((current_key, value))
        elif isinstance(value, dict):
            strings.extend(get_all_string_values(value, current_key))
    
    return strings


def check_untranslated_strings(file_path: Path) -> Tuple[int, int, List[str]]:
    """Check for untranslated strings in a file."""
    data = load_json_file(file_path)
    if not data:
        return 0, 0, []
    
    all_strings = get_all_string_values(data)
    untranslated = []
    
    for key, value in all_strings:
        if value.startswith('[TO_TRANSLATE]'):
            untranslated.append(key)
    
    return len(all_strings), len(untranslated), untranslated


def compare_languages(reference_file: Path, target_file: Path) -> Dict[str, Any]:
    """Compare two language files."""
    reference_data = load_json_file(reference_file)
    target_data = load_json_file(target_file)
    
    if not reference_data or not target_data:
        return {}
    
    reference_strings = dict(get_all_string_values(reference_data))
    target_strings = dict(get_all_string_values(target_data))
    
    # Find common keys
    common_keys = set(reference_strings.keys()) & set(target_strings.keys())
    
    # Check identical strings (possibly untranslated)
    identical_strings = []
    for key in common_keys:
        if reference_strings[key] == target_strings[key] and len(reference_strings[key]) > 3:
            identical_strings.append(key)
    
    return {
        'total_reference': len(reference_strings),
        'total_target': len(target_strings),
        'common_keys': len(common_keys),
        'identical_strings': identical_strings
    }


def generate_translation_report(messages_dir: Path, reference_file: str = 'en-US.json'):
    """Generate complete translation report."""
    reference_path = messages_dir / reference_file
    if not reference_path.exists():
        print(f"Reference file not found: {reference_path}")
        return
    
    # Load reference data
    reference_data = load_json_file(reference_path)
    reference_strings = dict(get_all_string_values(reference_data))
    total_reference_strings = len(reference_strings)
    
    print(f"📊 TRANSLATION REPORT")
    print(f"Reference: {reference_file} ({total_reference_strings} strings)")
    print("=" * 80)
    
    # Find all JSON files
    json_files = [f for f in messages_dir.glob('*.json') if f.name != reference_file]
    
    if not json_files:
        print("No translation files found")
        return
    
    reports = []
    
    for json_file in sorted(json_files):
        total_strings, untranslated_count, untranslated_keys = check_untranslated_strings(json_file)
        comparison = compare_languages(reference_path, json_file)
        
        # Calculate percentages
        completion_percentage = (total_strings / total_reference_strings) * 100 if total_reference_strings > 0 else 0
        untranslated_percentage = (untranslated_count / total_strings) * 100 if total_strings > 0 else 0
        
        reports.append({
            'file': json_file.name,
            'total_strings': total_strings,
            'untranslated_count': untranslated_count,
            'untranslated_keys': untranslated_keys,
            'completion_percentage': completion_percentage,
            'untranslated_percentage': untranslated_percentage,
            'identical_strings': comparison.get('identical_strings', [])
        })
    
    # Sort by completion percentage
    reports.sort(key=lambda x: x['completion_percentage'], reverse=True)
    
    print(f"{'LANGUAGE':<15} {'COMPLETENESS':<12} {'STRINGS':<15} {'UNTRANSLATED':<15} {'POSSIBLE MATCHES'}")
    print("-" * 80)
    
    for report in reports:
        language = report['file'].replace('.json', '')
        completion = f"{report['completion_percentage']:.1f}%"
        strings_info = f"{report['total_strings']}/{total_reference_strings}"
        untranslated_info = f"{report['untranslated_count']} ({report['untranslated_percentage']:.1f}%)"
        identical_count = len(report['identical_strings'])
        
        # Choose icon based on completeness
        if report['completion_percentage'] >= 100:
            icon = "✅" if report['untranslated_count'] == 0 else "⚠️"
        elif report['completion_percentage'] >= 90:
            icon = "🟡"
        else:
            icon = "🔴"
        
        print(f"{icon} {language:<13} {completion:<12} {strings_info:<15} {untranslated_info:<15} {identical_count}")
    
    print("\n" + "=" * 80)
    
    # Show details of problematic files
    problematic_files = [r for r in reports if r['untranslated_count'] > 0 or r['completion_percentage'] < 100]
    
    if problematic_files:
        print("📋 DETAILS OF FILES THAT NEED ATTENTION:")
        print()
        
        for report in problematic_files:
            language = report['file'].replace('.json', '')
            print(f"🔍 {language.upper()}:")
            
            if report['completion_percentage'] < 100:
                missing_count = total_reference_strings - report['total_strings']
                print(f"   • Missing {missing_count} strings ({100 - report['completion_percentage']:.1f}%)")
            
            if report['untranslated_count'] > 0:
                print(f"   • {report['untranslated_count']} strings marked as [TO_TRANSLATE]")
                
                if report['untranslated_count'] <= 10:
                    print("   • Untranslated keys:")
                    for key in report['untranslated_keys']:
                        print(f"     - {key}")
                else:
                    print("   • First 10 untranslated keys:")
                    for key in report['untranslated_keys'][:10]:
                        print(f"     - {key}")
                    print(f"     ... and {report['untranslated_count'] - 10} more")
            
            if report['identical_strings']:
                identical_count = len(report['identical_strings'])
                print(f"   • {identical_count} strings identical to English (possibly untranslated)")
                
                if identical_count <= 5:
                    for key in report['identical_strings']:
                        value = reference_strings.get(key, '')[:50]
                        print(f"     - {key}: \"{value}...\"")
                else:
                    for key in report['identical_strings'][:5]:
                        value = reference_strings.get(key, '')[:50]
                        print(f"     - {key}: \"{value}...\"")
                    print(f"     ... and {identical_count - 5} more")
            
            print()
    
    else:
        print("🎉 All translations are complete!")
    
    print("=" * 80)
    print("💡 TIPS:")
    print("• Use 'python3 sync_translations.py --dry-run' to see what would be added")
    print("• Use 'python3 sync_translations.py' to synchronize all translations")
    print("• Strings marked with [TO_TRANSLATE] need manual translation")
    print("• Strings identical to English may need translation")


def main():
    parser = argparse.ArgumentParser(
        description='Check translation status and identify strings that need translation'
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
    
    args = parser.parse_args()
    
    if not args.messages_dir.exists():
        print(f"Directory not found: {args.messages_dir}")
        return 1
    
    generate_translation_report(args.messages_dir, args.reference)
    return 0


if __name__ == '__main__':
    exit(main()) 