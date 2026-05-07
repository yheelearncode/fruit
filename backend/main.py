from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def home():
    return {"message": "FastAPI 시작 완료"}