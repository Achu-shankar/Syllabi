from supabase import create_client, Client
from app.core.config import settings

# Initialize the client when the module is imported.
# Explicitly convert SUPABASE_URL to string for create_client.
_supabase_client: Client = create_client(str(settings.SUPABASE_URL), settings.SUPABASE_KEY)

def get_supabase_client() -> Client:
    """
    Returns the initialized Supabase client instance.
    """
    return _supabase_client

# You can also directly export the client if you prefer,
# though the getter function is a common pattern:
# supabase_client = _supabase_client


