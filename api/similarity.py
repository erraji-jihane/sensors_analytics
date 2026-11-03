"""Vercel Python function: /api/similarity (see python/web.py)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "python"))

from web import make_handler  # noqa: E402

class handler(make_handler("similarity")):
    """Vercel looks for a top-level class named `handler`."""
