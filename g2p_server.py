"""Serves the WebGPU demo + a /g2p endpoint (exact MeloTTS English g2p → phone-ids + tones).
The heavy TTS runs client-side on WebGPU; this only does the tiny text→phoneme step.
Run: <vitts py> g2p_server.py [port]   (from webgpu_demo/)"""
import sys, os, json, urllib.parse, warnings; warnings.filterwarnings("ignore")
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
P="/raid/agi-ds/data-sharing/common/sangnguyen/work/vi-tts-4m"
sys.path.insert(0, P+"/MeloTTS/melo")
from text.cleaner import clean_text
from text.symbols import symbols
SID={s:i for i,s in enumerate(symbols)}
WEB=os.path.dirname(os.path.abspath(__file__))

def g2p(text):
    norm,ph,to,w2p=clean_text(text,"EN")
    return {"norm":norm,"ph":[SID[x] for x in ph],"to":list(map(int,to))}

class H(SimpleHTTPRequestHandler):
    def __init__(self,*a,**k): super().__init__(*a,directory=WEB,**k)
    def do_GET(self):
        if self.path.startswith("/g2p"):
            try:
                q=urllib.parse.urlparse(self.path).query; text=urllib.parse.parse_qs(q).get("text",[""])[0]
                out=json.dumps(g2p(text)).encode()
                self.send_response(200); self.send_header("Content-Type","application/json")
                self.send_header("Access-Control-Allow-Origin","*"); self.send_header("Content-Length",str(len(out)))
                self.end_headers(); self.wfile.write(out)
            except Exception as e:
                self.send_response(500); self.end_headers(); self.wfile.write(str(e).encode())
            return
        return super().do_GET()
    def log_message(self,*a): pass

if __name__=="__main__":
    port=int(sys.argv[1]) if len(sys.argv)>1 else 8017
    print("warming g2p…",flush=True); g2p("warm up the phonemizer once.")
    print(f"serving {WEB} + /g2p on :{port}",flush=True)
    ThreadingHTTPServer(("0.0.0.0",port),H).serve_forever()
