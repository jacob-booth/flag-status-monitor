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
                'https://www.whitehouse.gov/briefing-room/presidential-actions/',
                timeout=10,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                }
            )
            response.raise_for_status()
            logger.info(f"Successfully fetched White House page, status code: {response.status_code}")
            
            soup = BeautifulSoup(response.text, 'html.parser')
            logger.info(f"Successfully parsed White House page HTML")
            
            # Look for recent proclamations
            # First try the main content area
            main_content = soup.find('main', {'id': 'main-content'})
            if not main_content:
                main_content = soup
            
            # Find all links that might be proclamations
            proclamations = main_content.find_all(['h2', 'h3'], class_=lambda x: x is None or 'screen-reader' not in x)
            logger.info(f"Found {len(proclamations)} potential proclamations to analyze")
            
            for proc in proclamations:
                try:
                    # Get the title and clean it up
                    title = proc.get_text(strip=True).lower()
                    logger.info(f"Analyzing proclamation: {title}")
                    
                    # Look for flag-related keywords in title
                    if any(term in title for term in ['flag', 'honor', 'respect', 'memory', 'proclamation', 'death']):
                        # Find the closest link
                        link_elem = proc.find_parent('a') or proc.find('a')
                        if not link_elem:
                            # Try finding the next sibling or parent that contains a link
                            link_elem = (
                                proc.find_next_sibling('a') or 
                                proc.find_next('a') or 
                                proc.find_parent().find('a')
                            )
                        
                        if not link_elem:
                            logger.warning(f"Could not find link for proclamation: {title}")
                            continue
                            
                        link = link_elem.get('href', '')
                        if not link:
                            continue
                            
                        if not link.startswith('http'):
                            link = f"https://www.whitehouse.gov{link}"
                            
                        logger.info(f"Found relevant proclamation, fetching details from: {link}")
                        
                        # Get proclamation details
                        proc_response = requests.get(
                            link, 
                            timeout=10, 
                            headers={
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.5',
                            }
                        )
                        proc_response.raise_for_status()
                        
                        proc_soup = BeautifulSoup(proc_response.text, 'html.parser')
                        
                        # Try different content areas
                        content = (
                            proc_soup.find('div', class_='body-content') or
                            proc_soup.find('article') or
                            proc_soup.find('main', {'id': 'main-content'})
                        )
                        
                        if content:
                            content_text = content.get_text(' ', strip=True).lower()
                            if 'half-staff' in content_text or 'half staff' in content_text:
                                logger.info("Found half-staff proclamation")
                                
                                # Extract duration if available
                                status_data = {
                                    'status': 'half-staff',
                                    'last_updated': datetime.now(timezone.utc).isoformat(),
                                    'source': 'PRESIDENTIAL PROCLAMATION',
                                    'reason': proc.get_text(strip=True),
                                    'proclamation_url': link
                                }
                                
                                # Look for duration/expiration
                                if 'until sunset' in content_text or 'until sundown' in content_text:
                                    logger.info("Found duration information")
                                    status_data['expires'] = None  # We'll leave this as None for now
                                
                                return status_data
                except Exception as proc_error:
                    logger.error(f"Error processing proclamation: {str(proc_error)}")
                    continue
            
            logger.info("No half-staff proclamations found, setting status to full-staff")
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
            if hasattr(e, 'response'):
                logger.error(f"Response status code: {e.response.status_code}")
                logger.error(f"Response text: {e.response.text[:500]}")  # Log first 500 chars of response
            return None

    def update_status(self):
        """Update and save current flag status."""
        try:
            status = self.check_whitehouse_proclamations()
            if not status:
                logger.warning("Failed to get status from White House, using default")
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
                logger.info(f"Successfully wrote status to {file_path}")
            
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