FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create static directory for FastAPI StaticFiles mount
RUN mkdir -p static/assets && echo '<html><body>LegalFlow API</body></html>' > static/index.html

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
