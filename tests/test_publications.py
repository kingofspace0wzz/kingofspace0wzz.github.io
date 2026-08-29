import re
import unittest
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]


def normalize(text):
    text = re.sub(r"\s+", " ", text).strip()
    return re.sub(r"\s*,\s*", ", ", text)


class PublicationPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.soup = BeautifulSoup(
            (ROOT / "index.html").read_text(encoding="utf-8"), "html.parser"
        )

    def publication(self, title):
        publication_section = self.soup.find(id="publication")
        link = publication_section.find(
            "a", string=lambda text: text is not None and title in normalize(text)
        )
        self.assertIsNotNone(link, f"Missing publication: {title}")
        row = link.find_parent("div", class_="work-block")
        self.assertIsNotNone(row, f"Publication has no work-block: {title}")
        return row, link

    def test_review_status_badges(self):
        expected = {
            "WeClawArena": "EMNLP 2026 (Findings)",
            "AgentSocialBench": "EMNLP 2026",
            "PRIME:": "Under Review",
            "SLEA-RL": "Under Review @ NeurIPS 2026",
            "When Simulation Lies": "Under Review @ NeurIPS 2026",
        }

        for title, status in expected.items():
            with self.subTest(title=title):
                row, _ = self.publication(title)
                badge = row.find("span", class_="badge")
                self.assertIsNotNone(badge, f"Missing status badge for {title}")
                self.assertEqual(normalize(badge.get_text()), status)

    def test_under_review_badges_use_light_orange_style(self):
        review_badges = [
            badge
            for badge in self.soup.select("#publication .badge")
            if normalize(badge.get_text()).startswith("Under Review")
        ]
        self.assertEqual(len(review_badges), 3)
        for badge in review_badges:
            self.assertIn("badge-under-review", badge.get("class", []))
            self.assertNotIn("background-color", badge.get("style", ""))

        stylesheet = (ROOT / "style.css").read_text(encoding="utf-8")
        self.assertRegex(
            stylesheet,
            r"\.badge-under-review\s*\{[^}]*background-color:\s*#FFF7ED;",
        )
        self.assertRegex(
            stylesheet,
            r"\.badge-under-review\s*\{[^}]*border:\s*1px solid #FED7AA;",
        )
        self.assertRegex(
            stylesheet,
            r"\.badge-under-review\s*\{[^}]*color:\s*#9A3412;",
        )

    def test_agentsocialbench_has_award_nomination_badge(self):
        row, _ = self.publication("AgentSocialBench")
        badge = row.find("span", class_="badge-award-nominee")
        self.assertIsNotNone(badge)
        self.assertEqual(
            normalize(badge.get_text()), "Outstanding Paper Award Nominee"
        )

        stylesheet = (ROOT / "style.css").read_text(encoding="utf-8")
        self.assertRegex(
            stylesheet,
            r"\.badge-award\s*\{[^}]*background-color:\s*#FFF8E1;",
        )
        self.assertRegex(
            stylesheet,
            r"\.badge-award\s*\{[^}]*border:\s*1px solid #F4C95D;",
        )

    def test_gen_dfl_has_iise_dais_award_badge(self):
        row, _ = self.publication("Gen-DFL")
        badge = row.find("span", class_="badge-award")
        self.assertIsNotNone(badge)
        self.assertEqual(
            normalize(badge.get_text()),
            "2026 IISE DAIS Best Track Paper Competition",
        )

    def test_iise_dais_appears_first_in_awards(self):
        awards = self.soup.find(id="awards")
        self.assertIsNotNone(awards)
        entries = [normalize(item.get_text()) for item in awards.find_all("li")]
        self.assertGreater(len(entries), 0)
        self.assertEqual(
            entries[0], "2026 IISE DAIS Best Track Paper Competition"
        )
        self.assertEqual(
            entries.count("2026 IISE DAIS Best Track Paper Competition"), 1
        )

    def test_recent_paper_links_and_anchor_ids(self):
        _, weclaw = self.publication("WeClawArena")
        self.assertEqual(weclaw.get("id"), "paper-weclawarena")
        self.assertEqual(weclaw.get("href"), "https://arxiv.org/abs/2608.03499")
        weclaw_row, _ = self.publication("WeClawArena")
        self.assertIsNotNone(
            weclaw_row.find(
                "a", href="https://github.com/kingofspace0wzz/WeClawArena"
            )
        )
        self.assertIsNotNone(
            weclaw_row.find("a", href="https://arxiv.org/abs/2608.03499")
        )

        _, prime = self.publication("PRIME:")
        self.assertEqual(prime.get("id"), "paper-prime")
        self.assertEqual(prime.get("href"), "https://arxiv.org/abs/2604.07645")

        when_row, when_link = self.publication("When Simulation Lies")
        self.assertEqual(when_link.get("id"), "paper-when-simulation-lies")
        self.assertEqual(when_link.get("href"), "https://arxiv.org/abs/2605.11928")
        self.assertIsNotNone(
            when_row.find(
                "a", href="https://github.com/WillChow66/robustbench-tc-release"
            )
        )
        self.assertIsNotNone(
            when_row.find("a", href="https://arxiv.org/pdf/2605.11928")
        )

        publication_section = self.soup.find(id="publication")
        ids = [
            element["id"]
            for element in publication_section.find_all(attrs={"id": True})
        ]
        self.assertEqual(len(ids), len(set(ids)), "HTML IDs must be unique")
        self.assertFalse(
            self.soup.find("a", href="..."), 'Placeholder href="..." remains'
        )

    def test_when_simulation_lies_authors(self):
        row, _ = self.publication("When Simulation Lies")
        expected = (
            "Xiaolin Zhou, Aojie Yuan, Zheng Luo, Zipeng Ling, Xixiao Pan, "
            "Yicheng Gao, Haiyue Zhang, Jiate Li, Shuli Jiang, "
            "Prince Zizhuang Wang, Zixuan Zhu, Jinbo Liu, Ryan A. Rossi, "
            "Hua Wei, Xiyang Hu"
        )
        self.assertIn(expected, normalize(row.get_text(" ", strip=True)))

    def test_recent_publication_order(self):
        titles = [
            normalize(link.get_text())
            for link in self.soup.select("#publication .work-block .col-xs-9 > a")
        ]

        positions = {}
        for prefix in (
            "When Simulation Lies",
            "PRIME:",
            "SLEA-RL",
            "WeClawArena",
            "AgentSocialBench",
        ):
            matching_positions = [
                index for index, title in enumerate(titles) if title.startswith(prefix)
            ]
            self.assertEqual(
                len(matching_positions), 1, f"Expected one publication starting with {prefix}"
            )
            positions[prefix] = matching_positions[0]

        self.assertEqual(
            [positions[prefix] for prefix in positions],
            sorted(positions.values()),
        )


if __name__ == "__main__":
    unittest.main()
