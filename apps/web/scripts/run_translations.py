#!/usr/bin/env python3
"""
Main script to run Palmr translation management operations.
Makes it easy to run scripts without remembering specific names.
"""

import sys
import subprocess
from pathlib import Path
import argparse


def run_command(script_name: str, args: list) -> int:
    """Execute a script with the provided arguments."""
    script_path = Path(__file__).parent / script_name
    cmd = [sys.executable, str(script_path)] + args
    return subprocess.run(cmd).returncode


def filter_args_for_script(script_name: str, args: list) -> list:
    """Filter arguments based on what each script accepts."""
    
    # Arguments that check_translations.py accepts
    check_args = ['--messages-dir', '--reference']
    
    # Arguments that sync_translations.py accepts  
    sync_args = ['--messages-dir', '--reference', '--no-mark-untranslated', '--dry-run']
    
    if script_name == 'check_translations.py':
        filtered = []
        skip_next = False
        for i, arg in enumerate(args):
            if skip_next:
                skip_next = False
                continue
            if arg in check_args:
                filtered.append(arg)
                # Add the value for the argument if it exists
                if i + 1 < len(args) and not args[i + 1].startswith('--'):
                    filtered.append(args[i + 1])
                    skip_next = True
        return filtered
    
    elif script_name == 'sync_translations.py':
        filtered = []
        skip_next = False
        for i, arg in enumerate(args):
            if skip_next:
                skip_next = False
                continue
            if arg in sync_args:
                filtered.append(arg)
                # Add the value for the argument if it exists
                if i + 1 < len(args) and not args[i + 1].startswith('--'):
                    filtered.append(args[i + 1])
                    skip_next = True
        return filtered
    
    return args


def main():
    parser = argparse.ArgumentParser(
        description='Main script to manage Palmr translations',
        epilog='Examples:\n'
               '  python3 run_translations.py check\n'
               '  python3 run_translations.py sync --dry-run\n'
               '  python3 run_translations.py all --dry-run\n',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        'command',
        choices=['check', 'sync', 'all', 'help'],
        help='Command to execute:\n'
             'check - Check translation status\n'
             'sync - Synchronize missing keys\n' 
             'all - Run complete workflow (sync + check)\n'
             'help - Show detailed help'
    )
    
    # Capture remaining arguments to pass to scripts
    args, remaining_args = parser.parse_known_args()
    
    if args.command == 'help':
        print("🌍 PALMR TRANSLATION MANAGER")
        print("=" * 50)
        print()
        print("📋 AVAILABLE COMMANDS:")
        print()
        print("🔍 check - Check translation status")
        print("   python3 run_translations.py check")
        print("   python3 run_translations.py check --reference pt-BR.json")
        print()
        print("🔄 sync - Synchronize missing keys")
        print("   python3 run_translations.py sync")
        print("   python3 run_translations.py sync --dry-run")
        print("   python3 run_translations.py sync --no-mark-untranslated")
        print()
        print("⚡ all - Complete workflow (sync + check)")
        print("   python3 run_translations.py all")
        print("   python3 run_translations.py all --dry-run")
        print()
        print("📁 STRUCTURE:")
        print("   apps/web/scripts/    - Management scripts")
        print("   apps/web/messages/   - Translation files")
        print()
        print("💡 TIPS:")
        print("• Use --dry-run on sync or all commands to test")
        print("• Use --help on any command for specific options")
        print("• Manually translate strings marked with [TO_TRANSLATE]")
        print("• Read documentation for complete translation guidelines")
        return 0
    
    elif args.command == 'check':
        print("🔍 Checking translation status...")
        filtered_args = filter_args_for_script('check_translations.py', remaining_args)
        return run_command('check_translations.py', filtered_args)
    
    elif args.command == 'sync':
        print("🔄 Synchronizing translation keys...")
        filtered_args = filter_args_for_script('sync_translations.py', remaining_args)
        return run_command('sync_translations.py', filtered_args)
    
    elif args.command == 'all':
        print("⚡ Running complete translation workflow...")
        print()
        
        # Determine if it's dry-run based on arguments
        is_dry_run = '--dry-run' in remaining_args
        
        # 1. Initial check
        print("1️⃣ Checking initial status...")
        check_args = filter_args_for_script('check_translations.py', remaining_args)
        result = run_command('check_translations.py', check_args)
        if result != 0:
            print("❌ Error in initial check")
            return result
        
        print("\n" + "="*50)
        
        # 2. Sync
        print("2️⃣ Synchronizing missing keys...")
        sync_args = filter_args_for_script('sync_translations.py', remaining_args)
        result = run_command('sync_translations.py', sync_args)
        if result != 0:
            print("❌ Error in synchronization")
            return result
        
        print("\n" + "="*50)
        
        # 3. Final check
        print("3️⃣ Final check...")
        check_args = filter_args_for_script('check_translations.py', remaining_args)
        result = run_command('check_translations.py', check_args)
        if result != 0:
            print("❌ Error in final check")
            return result
        
        print("\n🎉 Complete workflow executed successfully!")
        if is_dry_run:
            print("💡 Run without --dry-run to apply changes")
        else:
            print("💡 Review strings marked with [TO_TRANSLATE] and translate them manually")
        
        return 0
    
    return 0


if __name__ == '__main__':
    exit(main()) 