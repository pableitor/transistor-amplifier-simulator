import http.server
import socketserver

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    PORT = 8000
    # Permitir reutilización de dirección para evitar error "Address already in use"
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()
