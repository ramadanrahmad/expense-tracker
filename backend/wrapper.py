from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import traceback

try:
    from real_main import app
except Exception as e:
    app = FastAPI()
    error_trace = traceback.format_exc()
    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH", "TRACE"])
    async def catch_all(request: Request, path_name: str):
        return JSONResponse(status_code=500, content={"error": "Initialization Failed", "traceback": error_trace})
