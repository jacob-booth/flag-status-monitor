#!/usr/bin/env python3
import json
import logging
import os
from datetime import datetime
from typing import Dict, Optional

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
        "expires": {"type": "string", "format": "date-time", "nullable": True}
    },
    "required": ["status", "last_updated", "source"]
}

class FlagStatusChecker:
    def __init__(self):
        self.opm_api_key = os.getenv('OPM_API_KEY')
        self.third_party_api_key = os.getenv('THIRD_PARTY_API_KEY')
        self.status_file = 'data/flag_status.json'
        os.makedirs('data', exist_ok=True)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def check_opm_api(self) -> Optional[Dict]:
        """Check U.S. Office of Personnel Management API for flag status."""
        if not self.opm_api_key:
            logger.warning("OPM API key not configured")
            return None

        try:
            response = requests.get(
                'https://api.opm.gov/v1/flag-status',
                headers={'Authorization': f'Bearer {self.opm_api_key}'},
                timeout=5
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                'status': 'half-staff' if data.get('half_staff', False) else 'full-staff',
                'last_updated': datetime.utcnow().isoformat(),
                'source': 'OPM API',
                'reason': data.get('reason', ''),
                'expires': data.get('expiration_date')
            }
        except Exception as e:
            logger.error(f"Error checking OPM API: {str(e)}")
            return None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def check_third_party_api(self) -> Optional[Dict]:
        """Check third-party API for flag status."""
        if not self.third_party_api_key:
            logger.warning("Third-party API key not configured")
            return None

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
                'last_updated': datetime.utcnow().isoformat(),
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
                'last_updated': datetime.utcnow().isoformat(),
                'source': 'Government Website Scraping',
                'reason': status_element.get('data-reason', ''),
                'expires': None
            }
        except Exception as e:
            logger.error(f"Error scraping government website: {str(e)}")
            return None

    def get_current_status(self) -> Dict:
        """Get current flag status from all available sources."""
        # Try sources in order of priority
        status = (
            self.check_opm_api() or
            self.check_third_party_api() or
            self.scrape_government_website()
        )

        if not status:
            # If all sources fail, use last known status or default to full-staff
            try:
                with open(self.status_file, 'r') as f:
                    status = json.load(f)
                    logger.warning("Using last known status")
            except FileNotFoundError:
                status = {
                    'status': 'full-staff',
                    'last_updated': datetime.utcnow().isoformat(),
                    'source': 'Default',
                    'reason': 'All sources unavailable',
                    'expires': None
                }
                logger.warning("Using default status")

        # Validate status against schema
        try:
            validate(instance=status, schema=FLAG_STATUS_SCHEMA)
        except Exception as e:
            logger.error(f"Status validation failed: {str(e)}")
            raise

        return status

    def update_status(self):
        """Update and save current flag status."""
        try:
            status = self.get_current_status()
            
            # Create data directory if it doesn't exist
            os.makedirs(os.path.dirname(self.status_file), exist_ok=True)
            
            # Save status to file
            with open(self.status_file, 'w') as f:
                json.dump(status, f, indent=2)
            
            logger.info(f"Flag status updated: {status['status']} (Source: {status['source']})")
            
        except Exception as e:
            logger.error(f"Error updating flag status: {str(e)}")
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