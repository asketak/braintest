from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import logging
import pprint

from fastapi import FastAPI, WebSocket

app = FastAPI()

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app's address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    messages: list
    model: str

openai_api_key = os.getenv("OPENAI_API_KEY")



if not openai_api_key:
    raise Exception("No OpenAI API key found")
client = OpenAI(api_key=openai_api_key)

@app.post("/get_response/")
async def get_response(chat_request: ChatRequest):
    try:
        async def event_generator():
            for response in client.chat.completions.create(
                model=chat_request.model,
                messages=chat_request.messages,
                stream=True
            ):
                yield response.choices[0].delta.content or ""

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        try:
            data = await websocket.receive_text()
            websocket.receive_json
            pprint.pprint(data)
            response = client.chat.completions.create(
                        model="gpt-4-1106-preview",
                        messages=[
            # {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": data},
                        ],
                        stream=True
                    )

            for chunk in response:
                    # print(chunk)
                    await websocket.send_text( chunk.choices[0].delta.content or ".")

                    # await websocket.send_text( response.choices[0].delta.content or "")

                # return StreamingResponse(event_generator(), media_type="text/event-stream")
        except Exception as e:
            logging.error(f"WebSocket error: {e}")
            await websocket.close(code=1001)
            raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws-test")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Process the data
            response = f"Echo: {data}"
            await websocket.send_text(response)
            # Simulate a delay
            await asyncio.sleep(1)
            await websocket.send_text(response + " 2")
            await asyncio.sleep(1)
            await websocket.send_text(response + " 3")
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
        await websocket.close(code=1001)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
