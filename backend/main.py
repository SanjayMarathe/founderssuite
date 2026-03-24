import asyncio
import concurrent.futures
import json
import os
import uuid
from typing import Dict, Any
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Force load .env from the backend directory, overriding any stale shell env vars
_env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

from .schemas.models import BetaTestRequest, CompetitorRequest, TestStatus, Persona, SwarmRequest
from .agents.beta_tester import run_beta_test, load_persona
from .agents.competitor import run_competitor_analysis

app = FastAPI(title="FoundersSuite QA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store
jobs: Dict[str, Dict[str, Any]] = {}

# In-memory swarm store
swarms: Dict[str, Dict[str, Any]] = {}

# WebSocket connections per job
ws_connections: Dict[str, WebSocket] = {}


async def update_job(job_id: str, status: str, progress: int, step: str, result=None, error=None, screenshot: str = None):
    jobs[job_id] = {
        "job_id": job_id,
        "status": status,
        "progress": progress,
        "current_step": step,
        "result": result,
        "error": error,
        "screenshot": screenshot,
    }
    if job_id in ws_connections:
        try:
            await ws_connections[job_id].send_json(jobs[job_id])
        except Exception:
            pass


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/personas")
def list_personas():
    personas_dir = Path(__file__).parent / "schemas" / "personas"
    personas = []
    for f in personas_dir.glob("*.json"):
        data = json.loads(f.read_text())
        personas.append({
            "persona_id": data["persona_id"],
            "name": data["name"],
            "role": data["demographics"]["role"],
            "backstory": data["backstory"],
        })
    return personas


@app.post("/api/test/beta")
async def start_beta_test(req: BetaTestRequest):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "progress": 0,
        "current_step": "Queued",
        "result": None,
        "error": None,
    }

    async def run():
        async def progress_cb(pct: int, step: str, screenshot: str = None):
            await update_job(job_id, "running", pct, step, screenshot=screenshot)

        try:
            await update_job(job_id, "running", 5, "Starting browser agent...")
            result = await run_beta_test(
                url=req.url,
                persona_id=req.persona_id,
                max_steps=req.max_steps,
                custom_task=req.custom_task,
                progress_callback=progress_cb,
            )
            await update_job(job_id, "completed", 100, "Done", result=result.model_dump())
        except Exception as e:
            await update_job(job_id, "failed", 0, "Error", error=str(e))

    asyncio.create_task(run())
    return {"job_id": job_id}


@app.post("/api/test/competitor")
async def start_competitor_test(req: CompetitorRequest):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "progress": 0,
        "current_step": "Queued",
        "result": None,
        "error": None,
    }

    async def run():
        async def progress_cb(pct: int, step: str, screenshot: str = None):
            await update_job(job_id, "running", pct, step, screenshot=screenshot)

        try:
            await update_job(job_id, "running", 5, "Starting browser agent...")
            result = await run_competitor_analysis(
                your_url=req.your_url,
                competitor_url=req.competitor_url,
                persona_id=req.persona_id,
                max_steps=req.max_steps,
                progress_callback=progress_cb,
            )
            await update_job(job_id, "completed", 100, "Done", result=result.model_dump())
        except Exception as e:
            await update_job(job_id, "failed", 0, "Error", error=str(e))

    asyncio.create_task(run())
    return {"job_id": job_id}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@app.post("/api/test/swarm")
async def start_swarm_test(req: SwarmRequest):
    swarm_id = str(uuid.uuid4())
    job_ids = []

    # Create a job for each agent
    for agent_cfg in req.agents:
        job_id = str(uuid.uuid4())
        job_ids.append(job_id)
        jobs[job_id] = {
            "job_id": job_id,
            "status": "pending",
            "progress": 0,
            "current_step": "Queued",
            "result": None,
            "error": None,
            "persona_id": agent_cfg.persona_id,
        }

    swarms[swarm_id] = {
        "swarm_id": swarm_id,
        "url": req.url,
        "job_ids": job_ids,
        "total_agents": len(req.agents),
        "completed": 0,
        "failed": 0,
        "status": "running",
    }

    async def run_all():
        main_loop = asyncio.get_running_loop()

        def run_one_in_thread(job_id: str, agent_cfg):
            """Each agent gets its own thread + event loop — no shared Playwright contention."""
            async def run():
                async def progress_cb(pct: int, step: str, screenshot: str = None):
                    # Post back to the main FastAPI event loop for WebSocket sends
                    asyncio.run_coroutine_threadsafe(
                        update_job(job_id, "running", pct, step, screenshot=screenshot),
                        main_loop,
                    )

                try:
                    asyncio.run_coroutine_threadsafe(
                        update_job(job_id, "running", 5, "Starting..."),
                        main_loop,
                    )
                    result = await run_beta_test(
                        url=req.url,
                        persona_id=agent_cfg.persona_id,
                        max_steps=req.max_steps,
                        custom_task=agent_cfg.custom_task,
                        progress_callback=progress_cb,
                        headless=not req.show_browsers,
                    )
                    asyncio.run_coroutine_threadsafe(
                        update_job(job_id, "completed", 100, "Done", result=result.model_dump()),
                        main_loop,
                    )
                    swarms[swarm_id]["completed"] += 1
                except Exception as e:
                    asyncio.run_coroutine_threadsafe(
                        update_job(job_id, "failed", 0, "Error", error=str(e)),
                        main_loop,
                    )
                    swarms[swarm_id]["failed"] += 1
                finally:
                    total = swarms[swarm_id]["completed"] + swarms[swarm_id]["failed"]
                    if total >= swarms[swarm_id]["total_agents"]:
                        swarms[swarm_id]["status"] = "completed"

            asyncio.run(run())

        with concurrent.futures.ThreadPoolExecutor(max_workers=len(req.agents)) as executor:
            await asyncio.gather(*[
                main_loop.run_in_executor(executor, run_one_in_thread, jid, cfg)
                for jid, cfg in zip(job_ids, req.agents)
            ])

    asyncio.create_task(run_all())
    return {"swarm_id": swarm_id, "job_ids": job_ids}


@app.get("/api/swarms/{swarm_id}")
def get_swarm(swarm_id: str):
    if swarm_id not in swarms:
        raise HTTPException(status_code=404, detail="Swarm not found")
    swarm = swarms[swarm_id].copy()
    swarm["jobs"] = [jobs.get(jid, {}) for jid in swarm["job_ids"]]
    return swarm


@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    ws_connections[job_id] = websocket

    # Send current state immediately
    if job_id in jobs:
        await websocket.send_json(jobs[job_id])

    try:
        while True:
            # Keep alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_connections.pop(job_id, None)
