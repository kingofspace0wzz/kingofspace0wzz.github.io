(function () {
    "use strict";

    const publications = [
        {
            selector: "#paper-when-simulation-lies",
            tags: ["Agentic Systems", "Evaluation & Safety"]
        },
        {
            selector: "#paper-prime",
            tags: ["Human-Centric Agents", "Agentic Systems"]
        },
        {
            selector: "#paper-slearl",
            tags: ["Post-Training", "Agentic Systems"]
        },
        {
            selector: "#paper-weclawarena",
            tags: ["Agentic Systems", "Evaluation & Safety", "Multi-Agent"]
        },
        {
            selector: "#paper-agentsocialbench",
            tags: ["Agentic Systems", "Human-Centric Agents", "Evaluation & Safety", "Multi-Agent"]
        },
        {
            selector: "#paper-gen-dfl",
            tags: ["Generative Models", "Optimization"]
        },
        {
            selector: "#paper-coupled-vae",
            tags: ["Generative Models", "Text Generation"]
        },
        {
            selector: "#paper-copula-vae",
            tags: ["Generative Models", "Text Generation"]
        },
        {
            selector: "#paper-wae-rnf",
            tags: ["Generative Models", "Text Generation"]
        }
    ];

    const slugify = (value) => value
        .toLowerCase()
        .replace(/&/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const cards = publications.map((publication) => {
        const title = document.querySelector(publication.selector);
        const card = title ? title.closest(".work-block") : null;
        const details = card ? card.querySelector(".col-xs-9") : null;

        if (!card || !details) {
            return null;
        }

        card.classList.add("publication-item");
        card.dataset.tags = publication.tags.map(slugify).join(" ");

        const topics = document.createElement("div");
        topics.className = "paper-topics";
        topics.setAttribute("aria-label", "Paper topics");

        publication.tags.forEach((tag) => {
            const topic = document.createElement("span");
            topic.className = "paper-topic";
            topic.textContent = tag;
            topics.appendChild(topic);
        });

        details.prepend(topics);
        return card;
    }).filter(Boolean);

    const buttons = Array.from(document.querySelectorAll(".filter-button"));
    const status = document.querySelector(".publication-filter-status");

    const applyFilter = (filter, label) => {
        let visibleCount = 0;

        cards.forEach((card) => {
            const tags = card.dataset.tags.split(" ");
            const isVisible = filter === "all" || tags.includes(filter);
            card.classList.toggle("is-hidden", !isVisible);
            card.setAttribute("aria-hidden", String(!isVisible));
            if (isVisible) visibleCount += 1;
        });

        if (status) {
            const paperLabel = visibleCount === 1 ? "publication" : "publications";
            status.textContent = filter === "all"
                ? `Showing all ${visibleCount} ${paperLabel}`
                : `Showing ${visibleCount} ${paperLabel} tagged ${label}`;
        }

        const section = document.querySelector("#publication");
        if (section) section.dataset.visibleCount = String(visibleCount);
    };

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            buttons.forEach((candidate) => {
                const isActive = candidate === button;
                candidate.classList.toggle("is-active", isActive);
                candidate.setAttribute("aria-pressed", String(isActive));
            });

            applyFilter(button.dataset.filter, button.textContent.trim());
        });
    });

    const query = new URLSearchParams(window.location.search);
    const requestedFilter = query.get("topic");
    const initialButton = buttons.find((button) => button.dataset.filter === requestedFilter) || buttons[0];

    buttons.forEach((button) => {
        const isActive = button === initialButton;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    applyFilter(initialButton.dataset.filter, initialButton.textContent.trim());

}());
