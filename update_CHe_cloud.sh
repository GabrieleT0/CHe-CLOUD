                                 #!/bin/bash

# Get the absolute path to the project root (where this script lives)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Pull the new monitoring requests if any
cd "$PROJECT_ROOT" || exit 1
git pull

# Run the Python script
cd "$PROJECT_ROOT/CHe_cloud_generator/src" || exit 1
source venv/bin/activate
cd "$PROJECT_ROOT/CHe_cloud_generator/src" || exit 1
python3 update_CHe_cloud.py

# Run the cleanup and import script
cd "$PROJECT_ROOT/WebApp/backend" || exit 1
./clean_and_reimport_data_db.sh

# Remove the local clone of the CHe cloud repo
cd "$PROJECT_ROOT/WebApp/backend/src" || exit 1
rm -r local-clone


