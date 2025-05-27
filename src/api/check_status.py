#!/usr/bin/env python3
import json
import logging
import os
from datetime import datetime, timezone
from typing import Dict, Optional
import xml.etree.ElementTree as ET

import requests
from bs4 import BeautifulSoup
from jsonschema import validate
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Schema for flag status data
FLAG_STATUS_SCHEMA = {
    "type": "object",
    "properties": {
        "status": {"type": "string", "enum": ["full-staff", "half-staff"]},
        "last_updated": {"type": "string", "format": "date-time"},
        "source": {"type": "string"},
        "reason": {"type": "string"},
        "expires": {"type": ["string", "null"]}
    },
    "required": ["status", "last_updated", "source"]
}

class FlagStatusChecker:
    def __init__(self):
        self.third_party_api_key = os.getenv('THIRD_PARTY_API_KEY')
        # Write directly to docs directory for GitHub Pages
        self.status_file = os.path.join('docs', 'flag_status.json')

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def check_opm_api(self) -> Optional[Dict]:
        """Check U.S. Office of Personnel Management API for flag status."""
        try:
            response = requests.get(
                'https://www.opm.gov/xml/operatingstatus.xml',
                timeout=5
            )
            response.raise_for_status()
            
            # Parse XML response
            root = ET.fromstring(response.content)
            
            # Extract relevant information
            status_type = root.find('StatusType').text
            status_title = root.find('StatusTitle').text
            date_posted = root.find('DateStatusPosted').text
            message = root.find('LongStatusMessage').text
            
            # Map OPM status to flag status
            # This is a simplified mapping - you might want to adjust based on actual OPM statuses
            is_half_staff = 'closed' in status_type.lower() or 'emergency' in status_type.lower()
            
            return {
                'status': 'half-staff' if is_half_staff else 'full-staff',
                'last_updated': datetime.fromisoformat(date_posted).isoformat(),
                'source': 'OPM API',
                'reason': message,
                'expires': None  # OPM XML doesn't provide expiration date
            }
        except Exception as e:
            logger.error(f"Error checking OPM API: {str(e)}")
            return None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def check_third_party_api(self) -> Optional[Dict]:
        """Check third-party API for flag status."""
        if not self.third_party_api_key:
            logger.warning("Third-party API key not configured, using default status")
            return self.get_default_status("Third-party API key not configured")

        try:
            response = requests.get(
                'https://api.flagstatus.example.com/v1/status',  # Example URL
                headers={'X-API-Key': self.third_party_api_key},
                timeout=5
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                'status': data.get('status', 'full-staff'),
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'source': 'Third-party API',
                'reason': data.get('description', ''),
                'expires': data.get('valid_until')
            }
        except Exception as e:
            logger.error(f"Error checking third-party API: {str(e)}")
            return None

    def scrape_government_website(self) -> Optional[Dict]:
        """Scrape government website for flag status (fallback method)."""
        try:
            response = requests.get(
                'https://www.usa.gov/flag-status',  # Example URL
                timeout=5
            )
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Example scraping logic - would need to be adapted to actual website structure
            status_element = soup.find('div', {'class': 'flag-status'})
            if not status_element:
                return None
                
            status_text = status_element.text.lower()
            is_half_staff = 'half-staff' in status_text or 'half staff' in status_text
            
            return {
                'status': 'half-staff' if is_half_staff else 'full-staff',
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'source': 'Government Website Scraping',
                'reason': status_element.get('data-reason', ''),
                'expires': None
            }
        except Exception as e:
            logger.error(f"Error scraping government website: {str(e)}")
            return None

    def get_default_status(self, reason: str) -> Dict:
        """Get a default status when no sources are available."""
        return {
            'status': 'full-staff',  # Default to full-staff
            'last_updated': datetime.now(timezone.utc).isoformat(),
            'source': 'Default',
            'reason': reason,
            'expires': None
        }

    def get_current_status(self) -> Dict:
        """Get current flag status from all available sources."""
        # Try sources in order of priority
        status = (
            self.check_opm_api() or
            self.check_third_party_api() or
            self.scrape_government_website() or
            self.get_default_status("All sources unavailable")
        )

        # Validate status against schema
        try:
            validate(instance=status, schema=FLAG_STATUS_SCHEMA)
        except Exception as e:
            logger.error(f"Status validation failed: {str(e)}")
            status = self.get_default_status("Status validation failed")

        return status

    def update_status(self):
        """Update and save current flag status."""
        try:
            status = self.get_current_status()
            
            # Create docs directory if it doesn't exist
            os.makedirs(os.path.dirname(self.status_file), exist_ok=True)
            
            # Save status to file
            with open(self.status_file, 'w') as f:
                json.dump(status, f, indent=2)
            
            logger.info(f"Flag status updated: {status['status']} (Source: {status['source']})")
            
        except Exception as e:
            logger.error(f"Error updating flag status: {str(e)}")
            # Create a default status file if update fails
            default_status = self.get_default_status("Error updating status")
            with open(self.status_file, 'w') as f:
                json.dump(default_status, f, indent=2)
            raise

def main():
    """Main function to update flag status."""
    try:
        checker = FlagStatusChecker()
        checker.update_status()
    except Exception as e:
        logger.error(f"Flag status check failed: {str(e)}")
        raise

if __name__ == '__main__':
    main()