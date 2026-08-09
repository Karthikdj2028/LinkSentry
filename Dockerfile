# =============================================================================
# LinkSentry Production Backend Dockerfile
# Python 3.11 Slim container for FastAPI Threat Detection Engine
# Compatible with Google Cloud Run, Render, Railway, AWS App Runner, ECS
# =============================================================================

FROM python:3.11-slim

# Prevent Python bytecode generation and force unbuffered logging output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install dependencies in a single cached layer
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend application source files
COPY backend /app/backend

# Create a non-privileged system user for process isolation
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Execute uvicorn with environment-provided PORT and reverse proxy header forwarding
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --proxy-headers --forwarded-allow-ips='*'"]
