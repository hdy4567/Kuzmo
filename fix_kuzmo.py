import os
import re

def fix_content(content):
    # Fix Imports
    # This might have been partially fixed, but let's be thorough.
    replacements = {
        r"'\.\./\.\./state/kzm_reactive_store'": "'../../store/kzm_store'",
        r"'\.\./state/kzm_reactive_store'": "'../store/kzm_store'",
        r"'\.\./\.\./core/kzm_domain'": "'../../domain/kzm_entities'",
        r"'\.\./core/kzm_domain'": "'../domain/kzm_entities'",
        r"'\.\./\.\./db/kzm_persistence'": "'../../persistence/kzm_indexeddb'",
        r"'\.\./db/kzm_persistence'": "'../persistence/kzm_indexeddb'",
        r"'\.\./ai/kzm_side_monitor'": "'../ai/ui/kzm_side_monitor'",
        r"'\.\./state/kzm_graph_engine'": "'./kzm_graph_engine'", # if in store
    }
    
    for old, new in replacements.items():
        content = re.sub(old, new, content)

    # Fix corrupted emojis (common ones seen in Kuzmo logs)
    # Note: These are rough guesses based on the '?' and context.
    # It's better to manually replace the headers where needed but let's try some.
    content = content.replace("?뱤", "📊")
    content = content.replace("?렗", "🎬")
    content = content.replace("?룛截", "🏗️")
    content = content.replace("?뿺截", "🎨")
    content = content.replace("?룺", "🏭")
    content = content.replace("?뱾", "📤")
    content = content.replace("?봽", "🔄")
    content = content.replace("??", "✅")
    
    return content

def main():
    root_dir = r"C:\YOON\CSrepos\Kuzmo\Kuzmo\src"
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(".ts") or filename.endswith(".css"):
                filepath = os.path.join(dirpath, filename)
                try:
                    # Try reading with utf-8-sig first to handle BOM
                    with open(filepath, 'r', encoding='utf-8-sig') as f:
                        content = f.read()
                except UnicodeDecodeError:
                    # Fallback to normal utf-8 or cp949 if needed
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()
                    except:
                        with open(filepath, 'r', encoding='cp949', errors='ignore') as f:
                            content = f.read()
                
                new_content = fix_content(content)
                
                # Always write back as clean UTF-8 without BOM for Vite/tsc
                with open(filepath, 'w', encoding='utf-8', newline='') as f:
                    f.write(new_content)
                #print(f"Fixed {filepath}")

if __name__ == "__main__":
    main()
