import re

def analyze_templates(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by examples
    examples = re.split(r'## Example (\d+):', content)

    # Skip preamble (index 0)
    results = {}

    for i in range(1, len(examples), 2):
        ex_num = examples[i].strip()
        ex_text = examples[i+1]

        # Find Para 3 (Starts with "However,")
        match = re.search(r'(However, .*?)\n', ex_text)
        if match:
            para3_start = match.group(1)

            # Check type
            if "may also give rise to certain challenges" in para3_start:
                Type = "A (Challenges)"
            elif "also provides certain benefits" in para3_start:
                Type = "B (Alternative Benefits)"
            elif "demands specific solutions" in para3_start or "requires specific solutions" in para3_start:
                Type = "C (Solutions)"
            else:
                Type = f"Unknown/Deviant: {para3_start[:50]}..."
        else:
            Type = "No Para 3 found"

        results[ex_num] = Type

    # Option A examples from the table
    option_a_list = [
        "1", "2", "5", "9", "11", "12", "13", "14", "15", "16", "17", "18",
        "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31",
        "32", "33", "35", "36"
    ]

    print(f"{'Ex':<5} | {'Detected Type':<30} | {'Status'}")
    print("-" * 50)

    deviants = []
    for ex in option_a_list:
        detected = results.get(ex, "Not Found")
        status = "OK" if detected == "A (Challenges)" else "DEVIANT"
        print(f"{ex:<5} | {detected:<30} | {status}")
        if status == "DEVIANT":
            deviants.append(ex)

    print("\nDeviant Examples:", ", ".join(deviants))

if __name__ == "__main__":
    analyze_templates('./data/source/pte/essay-examples/vocabulary-based/essay-examples-template-b1.md')
