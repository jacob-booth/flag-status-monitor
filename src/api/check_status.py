#!/usr/bin/env python3
import json
import logging
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FlagStatusChecker:
    def __init__(self):
        self.status_file = 'flag_status.json'
        self.docs_status_file = 'docs/flag_status.json'

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def check_whitehouse_proclamations(self):
        """Check White House proclamations for flag status."""
        try:
            # White House presidential actions page
            response = requests.get(
                'https://www.whitehouse.gov/presidential-actions/',
                timeout=10,
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for recent proclamations about flags
            proclamations = soup.find_all('article')
            for proc in proclamations:
                title = proc.find('h2').text.lower()
                if any(term in title for term in ['flag', 'honor', 'respect', 'memory']):
                    link = proc.find('a')['href']
                    date = proc.find(class_='posted-on').text.strip()
                    
                    # Get proclamation details
                    proc_response = requests.get(link, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
                    proc_soup = BeautifulSoup(proc_response.text, 'html.parser')
                    content = proc_soup.find(class_='entry-content').text.lower()
                    
                    if 'half-staff' in content or 'half staff' in content:
                        # Extract duration if available
                        status_data = {
                            'status': 'half-staff',
                            'last_updated': datetime.now(timezone.utc).isoformat(),
                            'source': 'PRESIDENTIAL PROCLAMATION',
                            'reason': title,
                            'proclamation_url': link
                        }
                        
                        # Look for duration/expiration
                        if 'until sunset' in content or 'until sundown' in content:
                            # Extract date logic here
                            status_data['expires'] = None  # Set based on extracted date
                            
                        return status_data
            
            # If no half-staff proclamations found, assume full-staff
            return {
                'status': 'full-staff',
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'source': 'White House Proclamations',
                'reason': 'No active half-staff proclamations found',
                'expires': None
            }
            
        except Exception as e:
            logger.error(f"Error checking White House proclamations: {str(e)}")
            return None

    def update_status(self):
        """Update and save current flag status."""
        try:
            status = self.check_whitehouse_proclamations()
            if not status:
                status = {
                    'status': 'full-staff',
                    'last_updated': datetime.now(timezone.utc).isoformat(),
                    'source': 'Default',
                    'reason': 'Unable to fetch current status',
                    'expires': None
                }
            
            # Save to both locations
            for file_path in [self.status_file, self.docs_status_file]:
                with open(file_path, 'w') as f:
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