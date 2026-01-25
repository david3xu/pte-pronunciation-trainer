import re
import os

file_path = './data/source/pte/vocabs/pte-essay-b1-examples-vocabulary-with-ipa.md'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
term_count = 0
term_pattern = re.compile(r'^\d+\.\s+(.*)')

# First pass: Filter out DELETE_ME and renumber
for line in lines:
    if 'DELETE_ME' in line:
        continue

    match = term_pattern.match(line)
    if match:
        term_count += 1
        # Reconstruct line with new number
        new_line = f"{term_count}. {match.group(1)}\n"
        new_lines.append(new_line)
    else:
        new_lines.append(line)

# Calculate unique terms
terms = []
for line in new_lines:
    match = term_pattern.match(line)
    if match:
        content = match.group(1).split('|')[0].strip().lower()
        terms.append(content)

unique_count = len(set(terms))

# Second pass: Update header count
final_lines = []
header_updated = False
for line in new_lines:
    if not header_updated and line.startswith('**Total Terms:**'):
        final_lines.append(f"**Total Terms:** {term_count} ({unique_count} unique after deduplication)\n")
        header_updated = True
    else:
        final_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print(f"Successfully renumbered {term_count} terms. Unique: {unique_count}")
