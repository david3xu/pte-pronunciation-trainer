#!/usr/bin/env python3
import os
import re
import glob

def clean_dialogue_file(filepath):
    """Clean a single dialogue file to match the target format."""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract title line (should be at the beginning)
    title_match = re.match(r'(#\d+\. .+ - .+)', content)
    if not title_match:
        print(f"Warning: Could not find title in {filepath}")
        return False
    
    title = title_match.group(1)
    
    # Extract dialogue exchanges using regex
    # Look for pattern: number. speaker:text (translation)
    dialogue_pattern = r'(\d+)\. ([^：\n]+)：([^\n]+)\n\(([^)]+)\)'
    
    exchanges = []
    
    # Split content by lines and process
    lines = content.split('\n')
    current_exchange = {}
    exchange_number = 0
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines, briefing, tips, etc.
        if (not line or 
            line.startswith('Briefing:') or 
            line.startswith('— End of Dialogue —') or
            i += 1
            continue
        
        # Check if this is a numbered dialogue line
        dialogue_match = re.match(r'(\d+)\. (.+)：(.+)', line)
        if dialogue_match:
            exchange_number = int(dialogue_match.group(1))
            speaker = dialogue_match.group(2)
            text = dialogue_match.group(3)
            
            # Look for the translation on next few lines
            translation = ""
            j = i + 1
            while j < len(lines) and j < i + 5:  # Look ahead max 5 lines
                next_line = lines[j].strip()
                
                # Skip tips and other unwanted content
                    'Tips】' in next_line or 
                    next_line.startswith('【') or
                    not next_line):
                    j += 1
                    continue
                
                # Check if it's a translation in parentheses
                if next_line.startswith('(') and next_line.endswith(')'):
                    translation = next_line[1:-1]  # Remove parentheses
                    i = j  # Skip to this line
                    break
                # Or if it's just the translation without parentheses
                elif not re.match(r'\d+\.', next_line) and translation == "":
                    translation = next_line
                    i = j
                    break
                else:
                    break
                
            if speaker in ['Manager', 'Mediator', 'Ombudsman', 'Jessica', 'Officer', 'John'] or text.startswith(('Hello', 'Hi', 'Yes', 'No', 'We ', 'I ', 'You ', 'That', 'Please', 'Okay')):
                # English first
                exchanges.append({
                    'number': exchange_number,
                    'english': text,
                    'chinese': translation
                })
            else:
                # Chinese first  
                exchanges.append({
                    'number': exchange_number,
                    'chinese': text,
                    'english': translation
                })
        i += 1
    
    # Generate clean content
    clean_content = title + '\n\n'
    
    for exchange in exchanges:
        clean_content += f"{exchange['number']}.\n"
        if 'english' in exchange and 'chinese' in exchange:
            if exchange.get('english'):
                clean_content += f"{exchange['english']}\n"
            if exchange.get('chinese'):
                clean_content += f"{exchange['chinese']}\n"
        clean_content += '\n'
    
    # Remove trailing newlines and ensure single trailing newline
    clean_content = clean_content.rstrip() + '\n'
    
    # Write cleaned content back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(clean_content)
    
    return True

def main():
    # Find all markdown files in the dialogue directory
    dialogue_dir = "/app/ccl-pronunciation-trainer/data-processing/extractors/pdf-to-md-dialogue"
    files_to_clean = []
    
    for filepath in glob.glob(os.path.join(dialogue_dir, "*.md")):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            # Check if file needs cleaning
            if ('Briefing:' in content or 
                re.search(r'\([^)]+\)', content)):
                files_to_clean.append(filepath)
    
    print(f"Found {len(files_to_clean)} files that need cleaning")
    
    cleaned_count = 0
    for filepath in files_to_clean:
        print(f"Cleaning {os.path.basename(filepath)}...")
        if clean_dialogue_file(filepath):
            cleaned_count += 1
        else:
            print(f"Failed to clean {filepath}")
    
    print(f"Successfully cleaned {cleaned_count} files")

if __name__ == "__main__":
    main()