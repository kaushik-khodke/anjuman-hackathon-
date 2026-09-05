"""
Centralized Structured Logging Module
Provides standardized log formatting with log levels, ISO timestamps, event tracking, and PII protection.
"""
import logging
import json
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class StructuredLogger:
    def __init__(self, service_name: str = "MyHealthChain"):
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)
        self.logger.setLevel(logging.INFO)
        
        # Configure stdout handler if not already configured
        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(logging.Formatter("%(message)s"))
            self.logger.addHandler(handler)

    def _sanitize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Strip sensitive credentials or long binary content from log dicts."""
        sensitive_keys = {"password", "secret", "token", "api_key", "key", "authorization", "ssn"}
        sanitized = {}
        for k, v in data.items():
            if any(s in k.lower() for s in sensitive_keys):
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, dict):
                sanitized[k] = self._sanitize(v)
            else:
                sanitized[k] = v
        return sanitized

    def log_event(
        self,
        event: str,
        level: str = "INFO",
        context: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
        error: Optional[Exception] = None,
    ):
        """Emit a structured JSON log entry."""
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": self.service_name,
            "level": level.upper(),
            "event": event,
        }
        if correlation_id:
            log_entry["correlation_id"] = correlation_id
        if context:
            log_entry["context"] = self._sanitize(context)
        if error:
            log_entry["error"] = {
                "type": type(error).__name__,
                "message": str(error),
            }

        message_str = json.dumps(log_entry)
        
        if level.upper() == "ERROR":
            self.logger.error(message_str)
        elif level.upper() == "WARNING" or level.upper() == "WARN":
            self.logger.warning(message_str)
        elif level.upper() == "DEBUG":
            self.logger.debug(message_str)
        else:
            self.logger.info(message_str)

    def info(self, event: str, **kwargs):
        self.log_event(event, level="INFO", context=kwargs if kwargs else None)

    def warning(self, event: str, **kwargs):
        self.log_event(event, level="WARNING", context=kwargs if kwargs else None)

    def error(self, event: str, error: Optional[Exception] = None, **kwargs):
        self.log_event(event, level="ERROR", context=kwargs if kwargs else None, error=error)


# Singleton logger instance
logger = StructuredLogger()
