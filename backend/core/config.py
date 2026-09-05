"""
Core Application Configuration
Provides centralized, validated configuration loading from environment variables.
"""
import os
from typing import List, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables from workspace root and backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"), override=True)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"), override=True)


class Settings(BaseModel):
    # System & Server
    APP_NAME: str = "MyHealthChain Emergency Infrastructure"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    PORT: int = Field(default_factory=lambda: int(os.getenv("PORT", 8000)))
    DEBUG: bool = Field(default_factory=lambda: os.getenv("DEBUG", "true").lower() in ("true", "1", "yes"))

    # CORS
    ALLOWED_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            o.strip()
            for o in os.getenv(
                "ALLOWED_ORIGINS",
                "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000",
            ).split(",")
            if o.strip()
        ]
    )

    # Database & Supabase
    SUPABASE_URL: str = Field(default_factory=lambda: os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", "")))
    SUPABASE_KEY: str = Field(default_factory=lambda: os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("VITE_SUPABASE_ANON_KEY", ""))))
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY", os.getenv("VITE_SUPABASE_ANON_KEY", ""))))

    # AI & ML
    GEMINI_API_KEY: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    LANGFUSE_PUBLIC_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("LANGFUSE_PUBLIC_KEY"))
    LANGFUSE_SECRET_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("LANGFUSE_SECRET_KEY"))

    # Integrations
    STRIPE_SECRET_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("STRIPE_SECRET_KEY"))
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field(default_factory=lambda: os.getenv("STRIPE_WEBHOOK_SECRET"))
    PINATA_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("PINATA_API_KEY"))
    PINATA_SECRET_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("PINATA_SECRET_KEY"))
    TWILIO_ACCOUNT_SID: Optional[str] = Field(default_factory=lambda: os.getenv("TWILIO_ACCOUNT_SID"))
    TWILIO_AUTH_TOKEN: Optional[str] = Field(default_factory=lambda: os.getenv("TWILIO_AUTH_TOKEN"))
    TWILIO_PHONE_NUMBER: Optional[str] = Field(default_factory=lambda: os.getenv("TWILIO_PHONE_NUMBER"))
    ELEVENLABS_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("ELEVENLABS_API_KEY"))
    WHATSAPP_GATEWAY_URL: str = Field(default_factory=lambda: os.getenv("WHATSAPP_GATEWAY_URL", "http://localhost:3001"))

    # Helpers to detect live external service availability
    @property
    def has_supabase(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_KEY)

    @property
    def has_gemini(self) -> bool:
        return bool(self.GEMINI_API_KEY and len(self.GEMINI_API_KEY) > 10)

    @property
    def has_stripe(self) -> bool:
        return bool(self.STRIPE_SECRET_KEY and self.STRIPE_SECRET_KEY.startswith("sk_"))

    @property
    def has_pinata(self) -> bool:
        return bool(self.PINATA_API_KEY and self.PINATA_SECRET_KEY)

    @property
    def has_twilio(self) -> bool:
        return bool(self.TWILIO_ACCOUNT_SID and self.TWILIO_AUTH_TOKEN)


# Singleton settings instance
settings = Settings()
