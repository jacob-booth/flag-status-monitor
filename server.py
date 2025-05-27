#!/usr/bin/env python3
"""
Simple development server for Flag Status Monitor
Provides API endpoints and serves static files for testing
"""

import json
import os
import sys
from datetime import datetime, timedelta
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import random

# Mock data for development
MOCK_FLAG_STATUS = {
    "status": "full-staff",
    "reason": "Normal operations",
    "source": "Development Server",
    "last_updated": datetime.now().isoformat(),
    "next_check": (datetime.now() + timedelta(hours=1)).isoformat(),
    "confidence": 100,
    "metadata": {
        "server": "development",
        "version": "1.0.0"
    }
}

MOCK_HISTORY = [
    {
        "date": (datetime.now() - timedelta(days=i)).isoformat(),
        "status": random.choice(["full-staff", "half-staff"]),
        "reason": random.choice([
            "Normal operations",
            "Memorial Day observance",
            "Mourning period declared",
            "State funeral",
            "National tragedy"
        ]),
        "source": "Development Server"
    }
    for i in range(30)
]

class FlagStatusHandler(SimpleHTTPRequestHandler):
    """Custom handler for Flag Status Monitor development server"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # API endpoints
        if path == '/api/status':
            self.handle_status_api()
        elif path == '/api/history':
            self.handle_history_api()
        elif path == '/api/health':
            self.handle_health_api()
        else:
            # Serve static files
            if path == '/':
                self.path = '/index.html'
            super().do_GET()
    
    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/api/status/override':
            self.handle_status_override()
        else:
            self.send_error(404, "Not Found")
    
    def handle_status_api(self):
        """Handle /api/status endpoint"""
        try:
            # Simulate occasional half-staff status
            if random.random() < 0.1:  # 10% chance
                status_data = MOCK_FLAG_STATUS.copy()
                status_data.update({
                    "status": "half-staff",
                    "reason": "Memorial observance",
                    "last_updated": datetime.now().isoformat()
                })
            else:
                status_data = MOCK_FLAG_STATUS.copy()
                status_data["last_updated"] = datetime.now().isoformat()
            
            self.send_json_response(status_data)
            
        except Exception as e:
            self.send_error_response(500, f"Internal server error: {str(e)}")
    
    def handle_history_api(self):
        """Handle /api/history endpoint"""
        try:
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            
            # Get pagination parameters
            page = int(query_params.get('page', [1])[0])
            limit = int(query_params.get('limit', [10])[0])
            
            # Calculate pagination
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit
            
            paginated_history = MOCK_HISTORY[start_idx:end_idx]
            
            response_data = {
                "history": paginated_history,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": len(MOCK_HISTORY),
                    "pages": (len(MOCK_HISTORY) + limit - 1) // limit
                }
            }
            
            self.send_json_response(response_data)
            
        except Exception as e:
            self.send_error_response(500, f"Internal server error: {str(e)}")
    
    def handle_health_api(self):
        """Handle /api/health endpoint"""
        health_data = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "uptime": "Development server",
            "services": {
                "flag_checker": "operational",
                "database": "operational",
                "cache": "operational"
            }
        }
        self.send_json_response(health_data)
    
    def handle_status_override(self):
        """Handle POST /api/status/override endpoint"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            if content_length > 0:
                data = json.loads(post_data.decode('utf-8'))
                
                # Validate override data
                if 'status' in data and data['status'] in ['full-staff', 'half-staff']:
                    global MOCK_FLAG_STATUS
                    MOCK_FLAG_STATUS.update({
                        "status": data['status'],
                        "reason": data.get('reason', 'Manual override'),
                        "last_updated": datetime.now().isoformat(),
                        "source": "Manual Override"
                    })
                    
                    self.send_json_response({
                        "success": True,
                        "message": "Status override applied",
                        "new_status": MOCK_FLAG_STATUS
                    })
                else:
                    self.send_error_response(400, "Invalid status value")
            else:
                self.send_error_response(400, "No data provided")
                
        except json.JSONDecodeError:
            self.send_error_response(400, "Invalid JSON data")
        except Exception as e:
            self.send_error_response(500, f"Internal server error: {str(e)}")
    
    def send_json_response(self, data, status_code=200):
        """Send JSON response with proper headers"""
        response_json = json.dumps(data, indent=2)
        
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_json)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        
        self.wfile.write(response_json.encode('utf-8'))
    
    def send_error_response(self, status_code, message):
        """Send error response"""
        error_data = {
            "error": True,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        self.send_json_response(error_data, status_code)
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """Custom log format"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {format % args}")

def main():
    """Main server function"""
    port = 8000
    
    # Check if port is specified as command line argument
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number. Using default port 8000.")
    
    server_address = ('', port)
    httpd = HTTPServer(server_address, FlagStatusHandler)
    
    print(f"""
🇺🇸 Flag Status Monitor Development Server
==========================================
Server running at: http://localhost:{port}
API endpoints:
  - GET  /api/status     - Current flag status
  - GET  /api/history    - Flag status history
  - GET  /api/health     - Server health check
  - POST /api/status/override - Manual status override

Press Ctrl+C to stop the server
""")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down server...")
        httpd.server_close()
        print("Server stopped.")

if __name__ == '__main__':
    main() 