import os
import pathlib

# Base directory - assumes the script is run from 'source_manager_backend/'
BASE_DIR = pathlib.Path(".")

# Define the directory structure
# Each key is a directory path relative to BASE_DIR
# Each value is a list of subdirectories or files to create in that directory
# If a value is a string ending with '.py', it's a file. Otherwise, it's a subdirectory.
STRUCTURE = {
    "app": {
        "__init__.py": None,
        "main.py": None,
        "core": {
            "__init__.py": None,
            "config.py": None,
            "supabase_client.py": None,
        },
        "api": {
            "__init__.py": None,
            "api_v1": {
                "__init__.py": None,
                "endpoints": {
                    "__init__.py": None,
                    "documents.py": None,
                    "indexing.py": None,
                    "urls.py": None,
                    "citations.py": None,
                    "tasks_status.py": None,
                },
                "router.py": None,
            },
        },
        "schemas": {
            "__init__.py": None,
            "document.py": None,
            "indexing.py": None,
            "url.py": None,
            "citation.py": None,
            "task.py": None,
        },
        "crud": {
            "__init__.py": None,
            "crud_reference.py": None,
            "crud_task.py": None,
        },
        "services": {
            "__init__.py": None,
            "document_processor.py": None,
            "indexer.py": None,
            "url_processor.py": None,
            "citation_resolver.py": None,
        },
        "worker": {
            "__init__.py": None,
            "celery_app.py": None,
            "tasks_document.py": None,
            "tasks_indexing.py": None,
            "tasks_url.py": None,
            "tasks_citation.py": None,
        },
    },
    "tests": {
        "__init__.py": None,
        "conftest.py": None,
        "api": {"__init__.py": None},
        "worker": {"__init__.py": None},
        "services": {"__init__.py": None},
    },
    ".env.example": None, # File at the root
    ".gitignore": None,    # File at the root
    "requirements.txt": None, # File at the root
    "Dockerfile": None,       # File at the root
    "docker-compose.yml": None, # File at the root
    "README.md": None         # File at the root
}

def create_structure(base_path, structure_dict):
    """
    Recursively creates directories and files based on the structure_dict.
    """
    for name, content in structure_dict.items():
        current_path = base_path / name
        if content is None:  # It's a file
            if not current_path.exists():
                current_path.touch()
                print(f"Created file: {current_path}")
            else:
                print(f"File already exists: {current_path}")
        else:  # It's a directory with content
            if not current_path.exists():
                current_path.mkdir(parents=True, exist_ok=True)
                print(f"Created directory: {current_path}")
            else:
                print(f"Directory already exists: {current_path}")
            create_structure(current_path, content) # Recursively create content

if __name__ == "__main__":
    print(f"Setting up project structure in: {BASE_DIR.resolve()}")
    create_structure(BASE_DIR, STRUCTURE)

    # Add some placeholder content to .gitignore as an example
    gitignore_content = """
# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# C extensions
*.so

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
pip-wheel-metadata/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# PyInstaller
#  Usually these files are written by a python script from a template
#  before PyInstaller builds the exe, so as to inject date/other infos into it.
*.manifest
*.spec

# Installer logs
pip-log.txt
pip-delete-this-directory.txt

# Unit test / coverage reports
htmlcov/
.tox/
.nox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.py,cover
.hypothesis/
.pytest_cache/

# Translations
*.mo
*.pot

# Django stuff:
*.log
local_settings.py
db.sqlite3
db.sqlite3-journal

# Flask stuff:
instance/
.webassets-cache

# Scrapy stuff:
.scrapy

# Sphinx documentation
docs/_build/

# PyBuilder
target/

# Jupyter Notebook
.ipynb_checkpoints

# IPython
profile_default/
ipython_config.py

# pyenv
.python-version

# pipenv
#   According to Python official guidance, this file is intended for local development,
#   so it should not be committed.
Pipfile.lock

# PEP 582; __pypackages__ directory
__pypackages__/

# Celery stuff
celerybeat-schedule
celerybeat.pid

# SageMath parsed files
*.sage.py

# Environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# Spyder project settings
.spyderproject
.spyproject

# Rope project settings
.ropeproject

# mkdocs documentation
/site

# mypy
.mypy_cache/
.dmypy.json
dmypy.json

# Pyre type checker
.pyre/
"""
    gitignore_path = BASE_DIR / ".gitignore"
    if not gitignore_path.exists() or gitignore_path.stat().st_size == 0:
        with open(gitignore_path, "w") as f:
            f.write(gitignore_content.strip())
        print(f"Populated .gitignore with common Python ignores")

    readme_content = """
# Source Manager Backend

This is the backend for the Source Manager application.

## Setup

1.  Create a virtual environment: `python -m venv venv`
2.  Activate it: `source venv/bin/activate` (Linux/macOS) or `venv\\Scripts\\activate` (Windows)
3.  Install dependencies: `pip install -r requirements.txt`
4.  Copy `.env.example` to `.env` and fill in your environment variables.
5.  Run the FastAPI server: `uvicorn app.main:app --reload --port 8000`
6.  Run Celery worker (in a separate terminal, after setting up Redis/RabbitMQ):
    `celery -A app.worker.celery_app worker -l info`

## Project Structure

(Refer to the generated structure)
"""
    readme_path = BASE_DIR / "README.md"
    if not readme_path.exists() or readme_path.stat().st_size == 0:
        with open(readme_path, "w") as f:
            f.write(readme_content.strip())
        print(f"Created a basic README.md")

    env_example_content = """
# Supabase
SUPABASE_URL="your_supabase_url_here"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key_here"

# Celery
CELERY_BROKER_URL="redis://localhost:6379/0" # Example for Redis
CELERY_RESULT_BACKEND="db+postgresql://user:pass@host:port/dbname" # Example for DB, or use Redis: "redis://localhost:6379/1"

# FastAPI (Optional - for JWT secret if verifying Clerk tokens directly)
# SECRET_KEY="your_very_secret_key_for_jwt_if_needed"
# ALGORITHM="HS256"
# ACCESS_TOKEN_EXPIRE_MINUTES=30

# Clerk (if verifying JWTs in FastAPI, you'll need Clerk's JWKS URL or public key)
# CLERK_JWKS_URL="https://your-clerk-instance/.well-known/jwks.json"
# CLERK_API_KEY="your_clerk_secret_key_if_needed_for_backend_ops"
# CLERK_JWT_ISSUER="https://your-clerk-issuer-url" # e.g., https://clerk.yourdomain.com or https://<instance_id>.clerk.accounts.dev

# Other settings
# API_V1_STR="/api/v1"
"""
    env_example_path = BASE_DIR / ".env.example"
    if not env_example_path.exists() or env_example_path.stat().st_size == 0:
        with open(env_example_path, "w") as f:
            f.write(env_example_content.strip())
        print(f"Created .env.example")


    requirements_content = """
fastapi
uvicorn[standard]
pydantic
pydantic-settings
celery
redis # Or your preferred Celery broker client, e.g., kombu for RabbitMQ
supabase
python-dotenv

# PDF Processing
PyMuPDF

# Web/HTTP
requests
beautifulsoup4
# weasyprint # Optional: for HTML to PDF conversion

# Embeddings (Example)
# sentence-transformers

# Add other dependencies as needed
# psycopg2-binary # If using PostgreSQL as Celery result backend directly
"""
    requirements_path = BASE_DIR / "requirements.txt"
    if not requirements_path.exists() or requirements_path.stat().st_size == 0:
        with open(requirements_path, "w") as f:
            f.write(requirements_content.strip())
        print(f"Created requirements.txt with common dependencies")

    print("\nProject structure setup complete!")
    print("Next steps:")
    print("1. Create and activate a virtual environment.")
    print("2. Install dependencies: pip install -r requirements.txt")
    print("3. Copy .env.example to .env and fill in your actual credentials.")
    print("4. Start developing!")

