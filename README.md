# On-device English TTS — WebGPU demo

A 13.9M teacher-free TTS running **entirely in the browser** on WebGPU (onnxruntime-web).

## Run
```bash
cd webgpu_demo
python -m http.server 8000
# open http://localhost:8000 in Chrome/Edge 113+ (WebGPU on)
```
Pick a voice + sentence → **Generate**. First load compiles the models on the GPU (~10s); after that each line synthesizes in one network eval.

## Pipeline (all neural ops on WebGPU)
```
text → [phonemes, precomputed] → enc.onnx (encoder+duration)
     → [JS expand by durations] → cfm.onnx (1-step flow)
     → decmp.onnx (decoder → mag/phase) → [JS iSTFT] → 24kHz audio
```
- `models/enc.onnx` 11MB · `models/cfm.onnx` 37MB · `models/decmp.onnx` 6MB (fp32; int8 → ~14MB total).
- `assets/assets.json` — precomputed phonemes for 12 sentences, 10 speaker centroids, and the encoder reference speaker.

## Key design notes
- **Encoder uses a fixed clean speaker (F6); the CFM uses the target speaker.** This decoupling is the fix
  that took the hard voices from WER 0.37 → <0.05 (the text encoder's speaker-conditioning was corrupting
  phonetics for some embeddings).
- **iSTFT runs in JS** (verified bit-exact vs `torch.istft`) because ONNX can't export `aten::complex`/`istft`.
- Validated end-to-end in onnxruntime (Python): F5/M8 CER 0.000, F4 0.030 — identical to the PyTorch model.

## Free-text input (client-side g2p)
Type any English text — `g2p.js` phonemizes it **in the browser** (no server): text normalization + number
expansion + CMUdict lookup (`assets/cmudict.json`, 129k words) → the exact MeloTTS symbol/tone mapping, with a
letter-to-sound fallback for out-of-dictionary words. The CMUdict path is validated bit-exact vs the Python
`clean_text(text,"EN")`. So the whole thing — g2p + neural TTS + iSTFT — is fully client-side.
- **int8 quantize** the .onnx (`onnxruntime.quantization.quantize_dynamic`) to ship ~14MB and cache in-browser.
