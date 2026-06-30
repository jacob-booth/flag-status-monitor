#!/usr/bin/env python3
import json
import logging
import os
from datetime import datetime, timezone
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
        "expires": {"type": ["string", "null"]}
    },
    "required": ["status", "last_updated", "source"]
}

class FlagStatusChecker:
    def __init__(self):
        # `public/` is the single source of truth for static data. Vite
        # copies it verbatim into `dist/` at build time, so there is no
        # separate "docs" copy to keep in sync.
        self.api_status_file = os.path.join('public', 'api', 'status.json')
        self.history_file = os.path.join('public', 'api', 'history.json')
        self.badge_file = os.path.join('public', 'badge.json')
        self.source_url = 'https://halfstaff.org/wp-json/halfstaff/v1/widget'
        self.max_history_entries = 200

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def check_halfstaff_api(self) -> Optional[Dict]:
        """Check HalfStaff.org widget API for current flag status."""
        try:
            response = requests.get(self.source_url, timeout=10)
            response.raise_for_status()
            data = response.json()

            is_half_staff = data.get('type') and data.get('type') != 'none'
            reason = data.get('title') or data.get('reason') or ''

            return {
                'status': 'half-staff' if is_half_staff else 'full-staff',
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'source': 'HalfStaff.org',
                'reason': reason or ('No active half-staff notices' if not is_half_staff else ''),
                'expires': None
            }
        except Exception as e:
            logger.error(f"Error checking HalfStaff API: {str(e)}")
            return None

    def scrape_government_website(self) -> Optional[Dict]:
        """Scrape government website for flag status (fallback method)."""
        try:
            response = requests.get(
                'https://www.usa.gov/flag-status',
                timeout=10
            )
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')

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
            self.check_halfstaff_api() or
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

    def _append_history(self, status: Dict) -> None:
        """Append a status entry to history.json only when the status actually
        changed, so the timeline reflects real transitions rather than every
        hourly poll."""
        os.makedirs(os.path.dirname(self.history_file), exist_ok=True)

        existing = {"history": []}
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file) as f:
                    existing = json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"Could not read existing history, starting fresh: {e}")

        history = existing.get("history", [])
        last_entry = history[0] if history else None

        if not last_entry or last_entry.get("status") != status.get("status"):
            history.insert(0, {
                "date": status.get("last_updated"),
                "status": status.get("status"),
                "reason": status.get("reason", ""),
                "source": status.get("source", "")
            })
            history = history[: self.max_history_entries]

        with open(self.history_file, 'w') as f:
            json.dump({
                "history": history,
                "total": len(history),
                "page": 1,
                "per_page": len(history)
            }, f, indent=2)

    def _write_status(self, status: Dict, badge_message: str, badge_color: str) -> None:
        os.makedirs(os.path.dirname(self.api_status_file), exist_ok=True)
        with open(self.api_status_file, 'w') as f:
            json.dump(status, f, indent=2)
        self._append_history(status)

        badge = {
            "schemaVersion": 1,
            "label": "flag status",
            "message": badge_message,
            "color": badge_color
        }
        os.makedirs(os.path.dirname(self.badge_file), exist_ok=True)
        with open(self.badge_file, 'w') as f:
            json.dump(badge, f, indent=2)

    def update_status(self):
        """Update and save current flag status."""
        try:
            status = self.get_current_status()
            is_half_staff = status.get("status") == "half-staff"
            self._write_status(
                status,
                badge_message="half-staff" if is_half_staff else "full-staff",
                badge_color="orange" if is_half_staff else "brightgreen"
            )
            logger.info(f"Flag status updated: {status['status']} (Source: {status['source']})")

        except Exception as e:
            logger.error(f"Error updating flag status: {str(e)}")
            default_status = self.get_default_status("Error updating status")
            self._write_status(default_status, badge_message="unknown", badge_color="lightgrey")
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