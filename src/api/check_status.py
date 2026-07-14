#!/usr/bin/env python3
"""Resolve the current federal U.S. flag position from multiple sources.

HalfStaff.org is useful, but its widget can lag breaking presidential orders.
This checker therefore treats "none" as one negative signal—not proof—and
checks active verified orders, White House actions, and fresh national-order
news before publishing full-staff.
"""

import json
import logging
import os
import re
import urllib.parse
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

UTC = timezone.utc
EASTERN = ZoneInfo("America/New_York")
HALF_STAFF_TERMS = re.compile(r"\bhalf[\s-]?(?:staff|mast)\b", re.I)
NATIONAL_ORDER_TERMS = re.compile(
    r"(?:all\s+american\s+flags|throughout\s+the\s+united\s+states|"
    r"all\s+flags\s+(?:in|across)\s+(?:the\s+)?u\.?s\.?|nationwide)",
    re.I,
)
ORDER_TERMS = re.compile(r"\b(?:order(?:s|ed|ing)?|direct(?:s|ed|ing)?)\b", re.I)


def parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)
    except (TypeError, ValueError):
        return None


def direct_news_url(url: str) -> str:
    """Unwrap Bing's RSS redirect URL without making another request."""
    query = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    return query.get("url", [url])[0]


class FlagStatusChecker:
    def __init__(self, now: Optional[datetime] = None):
        self.now = (now or datetime.now(UTC)).astimezone(UTC)
        self.api_status_file = os.path.join("public", "api", "status.json")
        self.history_file = os.path.join("public", "api", "history.json")
        self.badge_file = os.path.join("public", "badge.json")
        self.known_orders_file = os.path.join("src", "api", "known_orders.json")
        self.halfstaff_url = "https://halfstaff.org/wp-json/halfstaff/v1/widget"
        self.whitehouse_url = "https://www.whitehouse.gov/presidential-actions/proclamations/"
        self.news_url = "https://www.bing.com/news/search"
        self.max_history_entries = 200
        self.headers = {
            "User-Agent": (
                "FlagStatusMonitor/3.1 "
                "(+https://github.com/jacob-booth/flag-status-monitor)"
            )
        }

    def _get(self, url: str, **kwargs):
        headers = {**self.headers, **kwargs.pop("headers", {})}
        response = requests.get(url, headers=headers, timeout=15, **kwargs)
        response.raise_for_status()
        return response

    def _signal(
        self,
        status: str,
        reason: str,
        source: str,
        source_url: str,
        expires: Optional[str] = None,
        priority: int = 0,
        verification: str = "provider",
        order_id: Optional[str] = None,
    ) -> Dict:
        return {
            "status": status,
            "reason": reason,
            "source": source,
            "source_url": source_url,
            "expires": expires,
            "priority": priority,
            "verification": verification,
            "order_id": order_id,
        }

    def _is_active(self, signal: Dict) -> bool:
        expires = parse_datetime(signal.get("expires"))
        return signal.get("status") == "half-staff" and (not expires or expires > self.now)

    def _read_existing_status(self) -> Optional[Dict]:
        try:
            with open(self.api_status_file, encoding="utf-8") as handle:
                return json.load(handle)
        except (OSError, json.JSONDecodeError):
            return None

    def check_known_orders(self) -> Optional[Dict]:
        """Read reviewed, time-bounded orders used to bridge provider lag.

        Orders expire automatically. This is also a safe emergency path when a
        presidential order is published on social media before official sites
        and third-party APIs update.
        """
        try:
            with open(self.known_orders_file, encoding="utf-8") as handle:
                orders = json.load(handle).get("orders", [])
        except (OSError, json.JSONDecodeError) as error:
            logger.warning("Known-order registry unavailable: %s", error)
            return None

        active = []
        for order in orders:
            starts = parse_datetime(order.get("starts"))
            expires = parse_datetime(order.get("expires"))
            if starts and starts <= self.now and expires and expires > self.now:
                active.append(order)

        if not active:
            return None

        order = max(active, key=lambda item: parse_datetime(item["starts"]))
        return self._signal(
            "half-staff",
            order["reason"],
            order["source"],
            order["source_url"],
            order["expires"],
            priority=100,
            verification="official-presidential-action"
            if order["source"] == "The White House"
            else "verified-order",
            order_id=order.get("id"),
        )

    def check_halfstaff_api(self) -> Optional[Dict]:
        """Read HalfStaff.org, retaining `none` only as a negative signal."""
        try:
            data = self._get(self.halfstaff_url).json()
            notice_type = data.get("type")
            if notice_type and notice_type != "none":
                return self._signal(
                    "half-staff",
                    data.get("title") or data.get("reason") or "Active half-staff notice",
                    "HalfStaff.org",
                    self.halfstaff_url,
                    data.get("expires"),
                    priority=70,
                )
            return self._signal(
                "full-staff",
                "No active notice reported by HalfStaff.org",
                "HalfStaff.org",
                self.halfstaff_url,
                priority=10,
                verification="negative-provider-signal",
            )
        except (requests.RequestException, ValueError) as error:
            logger.error("HalfStaff.org check failed: %s", error)
            return None

    def _parse_expiration(self, text: str, published: Optional[datetime] = None) -> Optional[str]:
        """Extract common order expiration wording from a headline/body."""
        base = (published or self.now).astimezone(EASTERN)

        explicit_date = re.search(
            r"until\s+(?:sunset\s*,?\s*(?:on\s+)?)?"
            r"(january|february|march|april|may|june|july|august|september|"
            r"october|november|december)\s+(\d{1,2})(?:,\s*(\d{4}))?",
            text,
            re.I,
        )
        if explicit_date:
            month = datetime.strptime(explicit_date.group(1), "%B").month
            year = int(explicit_date.group(3) or base.year)
            end = datetime(year, month, int(explicit_date.group(2)), 23, 59, tzinfo=EASTERN)
            return end.astimezone(UTC).isoformat()

        time_then_date = re.search(
            r"until\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\s+on\s+"
            r"(january|february|march|april|may|june|july|august|september|"
            r"october|november|december)\s+(\d{1,2})(?:,\s*(\d{4}))?",
            text,
            re.I,
        )
        if time_then_date:
            hour = int(time_then_date.group(1))
            if "p" in time_then_date.group(3).lower() and hour != 12:
                hour += 12
            if "a" in time_then_date.group(3).lower() and hour == 12:
                hour = 0
            month = datetime.strptime(time_then_date.group(4), "%B").month
            year = int(time_then_date.group(6) or base.year)
            end = datetime(
                year,
                month,
                int(time_then_date.group(5)),
                hour,
                int(time_then_date.group(2) or 0),
                tzinfo=EASTERN,
            )
            return end.astimezone(UTC).isoformat()

        weekday_time = re.search(
            r"until\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)"
            r"(?:\s+(?:morning|afternoon|evening))?\s+at\s+"
            r"(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)",
            text,
            re.I,
        )
        if weekday_time:
            weekdays = {
                name: index
                for index, name in enumerate(
                    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
                )
            }
            target = weekdays[weekday_time.group(1).lower()]
            days_ahead = (target - base.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            hour = int(weekday_time.group(2))
            if "p" in weekday_time.group(4).lower() and hour != 12:
                hour += 12
            if "a" in weekday_time.group(4).lower() and hour == 12:
                hour = 0
            end = (base + timedelta(days=days_ahead)).replace(
                hour=hour,
                minute=int(weekday_time.group(3) or 0),
                second=0,
                microsecond=0,
            )
            return end.astimezone(UTC).isoformat()

        return None

    def _reason_from_text(self, text: str) -> str:
        match = re.search(r"\bto honor\s+(.+?)(?:\s*[|–—-]\s*|$)", text, re.I)
        return f"Honoring {match.group(1).strip()}" if match else "Presidential half-staff order"

    def check_news_orders(self) -> Optional[Dict]:
        """Detect breaking nationwide orders that provider APIs have missed.

        Bing News RSS exposes direct result URLs and publication timestamps.
        Only headlines containing all three safeguards—an order verb, an
        explicit nationwide scope, and half-staff/half-mast—qualify.
        State-only notices cannot change the federal status.
        """
        candidates = []
        items = []
        queries = (
            "all American flags lowered half mast",
            "all American flags lowered half staff",
            "president orders all American flags lowered",
        )
        for query in queries:
            try:
                response = self._get(
                    self.news_url,
                    params={"q": query, "format": "rss"},
                )
                items.extend(ET.fromstring(response.content).findall(".//item"))
            except (requests.RequestException, ET.ParseError) as error:
                logger.error("Breaking-order news query failed (%s): %s", query, error)

        for item in items:
            title = item.findtext("title", default="").strip()
            try:
                published = parsedate_to_datetime(item.findtext("pubDate")).astimezone(UTC)
            except (TypeError, ValueError):
                continue
            if self.now - published > timedelta(days=3) or published > self.now + timedelta(hours=1):
                continue
            if not (
                HALF_STAFF_TERMS.search(title)
                and NATIONAL_ORDER_TERMS.search(title)
                and ORDER_TERMS.search(title)
            ):
                continue

            expires = self._parse_expiration(title, published)
            # A headline without an end time is useful as an alert but unsafe
            # to publish indefinitely. Keep it active for 24 hours while each
            # subsequent run searches for a more precise order.
            if not expires:
                expires = (published + timedelta(hours=24)).isoformat()
            if parse_datetime(expires) <= self.now:
                continue

            candidates.append(
                self._signal(
                    "half-staff",
                    self._reason_from_text(title),
                    f"Breaking order report: {title.rsplit(' - ', 1)[-1]}",
                    direct_news_url(item.findtext("link", default="")),
                    expires,
                    priority=80,
                    verification="national-order-headline",
                )
            )

        return max(candidates, key=lambda signal: signal["expires"], default=None)

    def _whitehouse_article_signal(self, url: str) -> Optional[Dict]:
        try:
            text = BeautifulSoup(self._get(url).text, "html.parser").get_text(" ", strip=True)
        except requests.RequestException:
            return None
        if not (
            HALF_STAFF_TERMS.search(text)
            and NATIONAL_ORDER_TERMS.search(text)
            and ORDER_TERMS.search(text)
        ):
            return None
        expires = self._parse_expiration(text)
        # A historical proclamation can still contain the same order words.
        # Without a machine-readable future end time, it is not safe to call
        # that page an active order.
        if not expires or parse_datetime(expires) <= self.now:
            return None
        return self._signal(
            "half-staff",
            self._reason_from_text(text),
            "The White House",
            url,
            expires,
            priority=95,
            verification="official-presidential-action",
        )

    def check_whitehouse_actions(self) -> Optional[Dict]:
        """Scan the newest official proclamations for an active order."""
        try:
            soup = BeautifulSoup(self._get(self.whitehouse_url).text, "html.parser")
        except requests.RequestException as error:
            logger.error("White House check failed: %s", error)
            return None

        links = []
        for anchor in soup.select('a[href*="/presidential-actions/20"]'):
            url = urllib.parse.urljoin(self.whitehouse_url, anchor.get("href"))
            if url not in links:
                links.append(url)
            if len(links) >= 12:
                break

        with ThreadPoolExecutor(max_workers=6) as pool:
            signals = [signal for signal in pool.map(self._whitehouse_article_signal, links) if signal]
        return max(signals, key=lambda signal: signal.get("expires") or "", default=None)

    def get_current_status(self) -> Dict:
        """Resolve positive signals before considering a full-staff signal."""
        checks = [
            ("known-orders", self.check_known_orders),
            ("white-house", self.check_whitehouse_actions),
            ("breaking-news", self.check_news_orders),
            ("halfstaff-org", self.check_halfstaff_api),
        ]
        signals: List[Dict] = []
        checked_sources = []
        for name, check in checks:
            signal = check()
            checked_sources.append({"name": name, "available": signal is not None})
            if signal:
                signals.append(signal)

        active = [signal for signal in signals if self._is_active(signal)]
        if active:
            chosen = max(active, key=lambda signal: signal["priority"])
        else:
            existing = self._read_existing_status()
            if existing and self._is_active(existing):
                chosen = {
                    **existing,
                    "priority": 60,
                    "verification": "retained-active-order",
                }
            else:
                full_staff = [signal for signal in signals if signal["status"] == "full-staff"]
                if full_staff:
                    chosen = max(full_staff, key=lambda signal: signal["priority"])
                elif existing:
                    chosen = {
                        **existing,
                        "priority": 0,
                        "verification": "retained-source-outage",
                    }
                else:
                    raise RuntimeError("No status source available; refusing to invent full-staff")

        chosen.pop("priority", None)
        chosen["last_checked"] = self.now.isoformat()
        chosen["checked_sources"] = checked_sources
        return chosen

    def _append_history(self, status: Dict) -> None:
        os.makedirs(os.path.dirname(self.history_file), exist_ok=True)
        existing = {"history": []}
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, encoding="utf-8") as handle:
                    existing = json.load(handle)
            except (json.JSONDecodeError, OSError) as error:
                logger.warning("History unreadable, starting fresh: %s", error)

        history = existing.get("history", [])
        last_entry = history[0] if history else None
        history_entry = {
            "id": status.get("order_id"),
            "date": status["last_updated"],
            "status": status["status"],
            "reason": status.get("reason", ""),
            "source": status.get("source", ""),
            "source_url": status.get("source_url"),
            "ends": status.get("expires"),
            "verification": status.get("verification"),
        }
        history_entry = {key: value for key, value in history_entry.items() if value is not None}

        if not last_entry or last_entry.get("status") != status.get("status"):
            history.insert(
                0,
                history_entry,
            )
        else:
            # Enrich the existing transition when a stronger source appears;
            # do not manufacture a second event or move its original date.
            history[0] = {**last_entry, **history_entry, "date": last_entry["date"]}

        deduplicated = []
        seen = set()
        for entry in history:
            fingerprint = entry.get("id") or (
                entry.get("status"),
                entry.get("date"),
                entry.get("reason"),
                entry.get("source"),
            )
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            deduplicated.append(entry)
        history = deduplicated[: self.max_history_entries]

        with open(self.history_file, "w", encoding="utf-8") as handle:
            json.dump(
                {
                    "history": history,
                    "total": len(history),
                    "page": 1,
                    "per_page": len(history),
                },
                handle,
                indent=2,
            )
            handle.write("\n")

    def _write_status(self, status: Dict) -> None:
        existing = self._read_existing_status() or {}
        semantic_fields = ("status", "reason", "source", "source_url", "expires", "verification")
        changed = any(existing.get(field) != status.get(field) for field in semantic_fields)
        status_changed = existing.get("status") != status.get("status")
        status["last_updated"] = self.now.isoformat() if status_changed else existing.get(
            "last_updated", self.now.isoformat()
        )

        # Round unchanged heartbeats to the hour. A status transition still
        # commits immediately, while routine 15-minute checks create at most
        # one heartbeat/deploy commit per hour.
        if not changed:
            status["last_checked"] = self.now.replace(minute=0, second=0, microsecond=0).isoformat()

        os.makedirs(os.path.dirname(self.api_status_file), exist_ok=True)
        with open(self.api_status_file, "w", encoding="utf-8") as handle:
            json.dump(status, handle, indent=2)
            handle.write("\n")
        self._append_history(status)

        half_staff = status["status"] == "half-staff"
        badge = {
            "schemaVersion": 1,
            "label": "flag status",
            "message": "half-staff" if half_staff else "full-staff",
            "color": "orange" if half_staff else "brightgreen",
        }
        with open(self.badge_file, "w", encoding="utf-8") as handle:
            json.dump(badge, handle, indent=2)
            handle.write("\n")

    def update_status(self) -> Dict:
        status = self.get_current_status()
        self._write_status(status)
        logger.info(
            "Flag status resolved: %s (source=%s, verification=%s)",
            status["status"],
            status["source"],
            status["verification"],
        )
        return status


def main():
    FlagStatusChecker().update_status()


if __name__ == "__main__":
    main()
