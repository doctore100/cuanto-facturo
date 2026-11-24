"""Servidor local para desarrollo (npm run dev).

Es `python3 -m http.server`, pero le dice al navegador que no guarde copias: sin eso,
Chrome a veces sigue enseñando un archivo viejo después de cambiarlo.
Sirve la carpeta desde la que se arranca y solo escucha en este equipo.
"""
import http.server
import sys


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
print(f'Sirviendo en http://localhost:{puerto} (Ctrl+C para parar)', flush=True)
http.server.ThreadingHTTPServer(('127.0.0.1', puerto), SinCache).serve_forever()
