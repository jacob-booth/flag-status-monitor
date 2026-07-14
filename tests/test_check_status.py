import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from src.api.check_status import FlagStatusChecker, parse_datetime


UTC = timezone.utc
NOW = datetime(2026, 7, 12, 18, 0, tzinfo=UTC)


class FakeResponse:
    def __init__(self, content=b"", payload=None):
        self.content = content
        self._payload = payload

    def json(self):
        return self._payload


def rss(*titles):
    items = "".join(
        f"""
        <item>
          <title>{title}</title>
          <link>https://www.bing.com/news/apiclick.aspx?url=https%3A%2F%2Fexample.com%2Fstory</link>
          <pubDate>Sun, 12 Jul 2026 17:30:00 GMT</pubDate>
        </item>
        """
        for title in titles
    )
    return f"<?xml version='1.0'?><rss><channel>{items}</channel></rss>".encode()


class KnownOrderTests(unittest.TestCase):
    def test_active_known_order_wins_over_provider_none(self):
        with tempfile.TemporaryDirectory() as directory:
            order_file = Path(directory) / "orders.json"
            order_file.write_text(
                json.dumps(
                    {
                        "orders": [
                            {
                                "starts": "2026-07-12T17:00:00Z",
                                "expires": "2026-07-18T22:00:00Z",
                                "reason": "Verified national order",
                                "source": "Official order",
                                "source_url": "https://example.gov/order",
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            checker = FlagStatusChecker(now=NOW)
            checker.known_orders_file = str(order_file)
            checker.check_whitehouse_actions = lambda: None
            checker.check_news_orders = lambda: None
            checker.check_halfstaff_api = lambda: checker._signal(
                "full-staff", "No notice", "HalfStaff.org", checker.halfstaff_url, priority=10
            )

            status = checker.get_current_status()

            self.assertEqual(status["status"], "half-staff")
            self.assertEqual(status["verification"], "verified-order")

    def test_expired_known_order_is_ignored(self):
        with tempfile.TemporaryDirectory() as directory:
            order_file = Path(directory) / "orders.json"
            order_file.write_text(
                json.dumps(
                    {
                        "orders": [
                            {
                                "starts": "2026-07-01T00:00:00Z",
                                "expires": "2026-07-02T00:00:00Z",
                                "reason": "Old order",
                                "source": "Official order",
                                "source_url": "https://example.gov/order",
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            checker = FlagStatusChecker(now=NOW)
            checker.known_orders_file = str(order_file)
            self.assertIsNone(checker.check_known_orders())


class BreakingNewsTests(unittest.TestCase):
    def test_detects_only_explicit_nationwide_order_and_parses_expiry(self):
        checker = FlagStatusChecker(now=NOW)
        response = FakeResponse(
            rss(
                "Trump orders all American flags in US lowered to half-mast "
                "until Saturday at 6pm to honor Graham"
            )
        )
        with patch.object(checker, "_get", return_value=response):
            signal = checker.check_news_orders()

        self.assertEqual(signal["status"], "half-staff")
        self.assertEqual(parse_datetime(signal["expires"]), datetime(2026, 7, 18, 22, 0, tzinfo=UTC))
        self.assertIn("Graham", signal["reason"])

    def test_rejects_state_only_order(self):
        checker = FlagStatusChecker(now=NOW)
        response = FakeResponse(
            rss("Governor orders South Carolina flags at half-staff to honor Senator Graham")
        )
        with patch.object(checker, "_get", return_value=response):
            self.assertIsNone(checker.check_news_orders())

    def test_rejects_old_nationwide_headline(self):
        old = b"""
        <rss><channel><item>
          <title>President orders all American flags lowered to half-staff</title>
          <link>https://example.com/old</link>
          <pubDate>Wed, 01 Jul 2026 12:00:00 GMT</pubDate>
        </item></channel></rss>
        """
        checker = FlagStatusChecker(now=NOW)
        with patch.object(checker, "_get", return_value=FakeResponse(old)):
            self.assertIsNone(checker.check_news_orders())


class FailureSafetyTests(unittest.TestCase):
    def test_refuses_to_invent_full_staff_when_every_source_is_down(self):
        checker = FlagStatusChecker(now=NOW)
        checker.check_known_orders = lambda: None
        checker.check_whitehouse_actions = lambda: None
        checker.check_news_orders = lambda: None
        checker.check_halfstaff_api = lambda: None
        checker._read_existing_status = lambda: None

        with self.assertRaisesRegex(RuntimeError, "refusing to invent full-staff"):
            checker.get_current_status()

    def test_retains_unexpired_half_staff_order_during_source_outage(self):
        checker = FlagStatusChecker(now=NOW)
        checker.check_known_orders = lambda: None
        checker.check_whitehouse_actions = lambda: None
        checker.check_news_orders = lambda: None
        checker.check_halfstaff_api = lambda: None
        checker._read_existing_status = lambda: {
            "status": "half-staff",
            "reason": "Existing verified order",
            "source": "Official",
            "source_url": "https://example.gov",
            "expires": "2026-07-18T22:00:00Z",
        }

        status = checker.get_current_status()
        self.assertEqual(status["status"], "half-staff")
        self.assertEqual(status["verification"], "retained-active-order")


class WhiteHouseTests(unittest.TestCase):
    def test_rejects_historical_order_without_future_expiration(self):
        checker = FlagStatusChecker(now=NOW)
        historical = """
        The President ordered flags throughout the United States to be flown
        at half-staff for Memorial Day.
        """
        with patch.object(
            checker,
            "_get",
            return_value=type("Response", (), {"text": historical})(),
        ):
            self.assertIsNone(checker._whitehouse_article_signal("https://example.gov/old"))

    def test_accepts_official_order_with_future_expiration(self):
        checker = FlagStatusChecker(now=NOW)
        current = """
        The President ordered all American flags throughout the United States
        to be flown at half-staff until sunset, July 18, 2026.
        """
        with patch.object(
            checker,
            "_get",
            return_value=type("Response", (), {"text": current})(),
        ):
            signal = checker._whitehouse_article_signal("https://example.gov/current")

        self.assertEqual(signal["status"], "half-staff")
        self.assertEqual(parse_datetime(signal["expires"]).date().isoformat(), "2026-07-19")

    def test_parses_time_before_date_in_official_proclamation(self):
        checker = FlagStatusChecker(now=NOW)
        expires = checker._parse_expiration(
            "The flag shall be flown at half-staff until 6:00 p.m. on July 18, 2026."
        )
        self.assertEqual(parse_datetime(expires), datetime(2026, 7, 18, 22, 0, tzinfo=UTC))


class HistoryTests(unittest.TestCase):
    def test_same_status_enriches_existing_record_without_duplication(self):
        with tempfile.TemporaryDirectory() as directory:
            checker = FlagStatusChecker(now=NOW)
            checker.history_file = str(Path(directory) / "history.json")
            Path(checker.history_file).write_text(
                json.dumps(
                    {
                        "history": [
                            {
                                "date": "2026-07-12T17:30:00Z",
                                "status": "half-staff",
                                "reason": "Initial report",
                                "source": "News",
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            checker._append_history(
                {
                    "order_id": "verified-order",
                    "last_updated": "2026-07-12T17:30:00Z",
                    "status": "half-staff",
                    "reason": "Official reason",
                    "source": "The White House",
                    "source_url": "https://example.gov/order",
                    "expires": "2026-07-18T22:00:00Z",
                    "verification": "official-presidential-action",
                }
            )

            history = json.loads(Path(checker.history_file).read_text(encoding="utf-8"))["history"]
            self.assertEqual(len(history), 1)
            self.assertEqual(history[0]["date"], "2026-07-12T17:30:00Z")
            self.assertEqual(history[0]["source"], "The White House")
            self.assertEqual(history[0]["ends"], "2026-07-18T22:00:00Z")


if __name__ == "__main__":
    unittest.main()
