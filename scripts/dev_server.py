#!/usr/bin/env python3
import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Configuration
PORT = 8080  # Changed to 8080 to avoid conflicts
DIRECTORY = str(Path(__file__).parent.parent)  # Project root directory

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    """Start the development server."""
    try:
        # Change to project root directory
        os.chdir(DIRECTORY)
        
        print(f"Starting development server at http://localhost:{PORT}")
        print(f"Serving files from: {DIRECTORY}")
        print("Press Ctrl+C to stop the server")
        
        # Start the server
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            # Open browser automatically
            webbrowser.open(f"http://localhost:{PORT}/index.html")
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nShutting down server...")
                httpd.shutdown()

    except Exception as e:
        print(f"Error starting server: {e}")
        raise

if __name__ == '__main__':
    main()