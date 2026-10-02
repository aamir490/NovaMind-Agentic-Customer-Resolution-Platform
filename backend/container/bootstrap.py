"""Trusted startup configuration only. No provisioning, seeding, or model startup."""

import json
import os
from pathlib import Path

from backend.app.main import create_app
from backend.app.security import LocalAuthenticationProvider, LocalCredential


def _unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate configuration key")
        result[key] = value
    return result


def create_container_app():
    """Absent configuration stays default-deny; invalid configuration stops startup."""
    location = os.environ.get("NOVAMIND_AUTH_FILE", "")
    if not location:
        return create_app()
    try:
        path = Path(location)
        if not path.is_absolute():
            raise ValueError("Configuration path must be absolute")
        with path.open("rb") as source:
            raw = source.read(65537)
        if len(raw) > 65536:
            raise ValueError("Configuration is too large")
        records = json.loads(raw, object_pairs_hook=_unique)
        if not isinstance(records, list) or len(records) > 1000:
            raise ValueError("Invalid credential list")
        credentials = tuple(LocalCredential.model_validate(item) for item in records)
        provider = LocalAuthenticationProvider(credentials)
    except Exception:
        # Never put credentials, file paths, or Pydantic input excerpts in logs.
        raise RuntimeError("Container authentication configuration is invalid") from None
    return create_app(auth_provider=provider)
