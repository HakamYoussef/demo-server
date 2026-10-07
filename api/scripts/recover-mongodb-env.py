"""Recover this deployment's previous MongoDB URI locally; never print it."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile


def recover(ref):
    if not re.fullmatch(r"[0-9a-fA-F]{7,40}", ref):
        raise ValueError("Use a known commit SHA for --from-ref")
    api_dir = Path(__file__).resolve().parents[1]
    env_file = api_dir / ".env"
    content = env_file.read_text() if env_file.exists() else ""
    entries = re.findall(r"^\s*(?:export\s+)?MONGODB_URI\s*=\s*(.*?)\s*$", content, re.MULTILINE)
    if any(value.strip("\"'").strip() for value in entries):
        print("MONGODB_URI already exists in api/.env; nothing changed.")
        return
    result = subprocess.run(["git", "show", f"{ref}:api/app.mjs"], cwd=api_dir.parent, capture_output=True, text=True)
    if result.returncode != 0:
        raise ValueError("Historical commit unavailable; fetch the repository history first")
    match = re.search(r'''mongodb(?:\+srv)?://[^'"\s]+''', result.stdout)
    if not match:
        raise ValueError("No previous MongoDB URI found in this commit")
    # Keep all other environment settings; remove empty duplicate assignments.
    content = re.sub(r"^\s*(?:export\s+)?MONGODB_URI\s*=.*$", "", content, flags=re.MULTILINE)
    updated = content.rstrip() + "\nMONGODB_URI=" + json.dumps(match.group(0)) + "\n"
    descriptor, temporary = tempfile.mkstemp(prefix=".mongo-recovery-", dir=api_dir)
    try:
        with os.fdopen(descriptor, "w") as output:
            output.write(updated)
        os.chmod(temporary, 0o600)
        os.replace(temporary, env_file)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print("MONGODB_URI restored to api/.env. Existing settings preserved; credential not displayed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from-ref", required=True, help="Known commit containing this deployment's previous connection string")
    args = parser.parse_args()
    try:
        recover(args.from_ref)
    except (ValueError, OSError) as error:
        parser.exit(1, str(error) + "\n")
