
import os
import time
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

client = genai.Client(api_key=api_key)

print("Testing Gemini...")
print("Model:", model)

start = time.time()

try:
    response = client.models.generate_content(
        model=model,
        contents="In one sentence, explain what a biscuit is."
    )

    print("SUCCESS")
    print("Response:", response.text)
    print("Time taken:", round(time.time() - start, 2), "seconds")

except Exception as error:
    print("FAILED:", repr(error))
    print("Time taken:", round(time.time() - start, 2), "seconds")
