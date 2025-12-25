import argparse
import json
import time
import sys
import random
import os

def main():
    parser = argparse.ArgumentParser(description='Audio Classifier')
    parser.add_argument('--input', required=True, help='Path to input audio file')
    parser.add_argument('--threshold', type=float, default=0.45, help='Classification threshold')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(json.dumps({"status": "error", "message": "File not found"}))
        sys.exit(1)
        
    file_size = os.path.getsize(args.input)
    if file_size == 0:
        print(json.dumps({"status": "error", "message": "File is empty"}))
        sys.exit(1)

    # Simulate processing delay
    time.sleep(1)
    
    # Mock Logic:
    # In a real scenario, we would load a model (ONNX/PyTorch) and process the audio
    # For now, we generate a result based on a random seed or file size to be deterministic-ish?
    # No, let's just be random for the prototype or assume "halal" if filename contains "halal"
    
    is_safe = random.random() > 0.3
    
    result = {
        "status": "success",
        "file": args.input,
        "classification": {
            "is_safe": is_safe,
            "confidence": 0.98 if is_safe else 0.85,
            "details": "Speech detected" if is_safe else "Music detected"
        },
        "segments": [
            {"start": 0.0, "end": 10.0, "label": "speech"}
        ]
    }
    
    # Print JSON to stdout for Node.js to capture
    print(json.dumps(result))

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        error = {"status": "error", "message": str(e)}
        print(json.dumps(error))
        sys.exit(1)
