document.addEventListener(
    "DOMContentLoaded",
    async () => {

        // ==================================================
        // ELEMENTS
        // ==================================================

        const statusElement =
            document.getElementById(
                "github-status"
            );

        const connectButton =
            document.getElementById(
                "connect-github"
            );

        const repositorySelect =
            document.getElementById(
                "repository"
            );

        const repositoryDisplay =
            document.getElementById(
                "repository-display"
            );

        const settingsButton =
            document.getElementById(
                "settings-button"
            );

        const settingsPanel =
            document.getElementById(
                "settings-panel"
            );

        const closeSettings =
            document.getElementById(
                "close-settings"
            );

        const refreshButton =
            document.getElementById(
                "refresh-stats"
            );

        const totalSolved =
            document.getElementById(
                "total-solved"
            );

        const currentStreak =
            document.getElementById(
                "current-streak"
            );

        const bestStreak =
            document.getElementById(
                "best-streak"
            );


        const platformCounters = {

            leetcode:
                document.getElementById(
                    "leetcode-count"
                ),

            gfg:
                document.getElementById(
                    "gfg-count"
                ),

            hackerrank:
                document.getElementById(
                    "hackerrank-count"
                ),

            codechef:
                document.getElementById(
                    "codechef-count"
                ),

            codeforces:
                document.getElementById(
                    "codeforces-count"
                )
        };


        function resetStatsDisplay() {

            totalSolved.textContent =
                "0";


            currentStreak.textContent =
                "0 days";


            bestStreak.textContent =
                "0 days";


            Object.values(
                platformCounters
            ).forEach(
                element => {

                    if (element) {

                        element.textContent =
                            "0";
                    }
                }
            );
        }


        settingsButton.addEventListener(
            "click",
            () => {

                settingsPanel.classList.toggle(
                    "hidden"
                );
            }
        );


        closeSettings.addEventListener(
            "click",
            () => {

                settingsPanel.classList.add(
                    "hidden"
                );
            }
        );


        async function loadRepositories() {

            if (!repositorySelect) {
                return;
            }


            repositorySelect.innerHTML = `
                <option value="">
                    Loading repositories...
                </option>
            `;


            try {

                const response =
                    await chrome.runtime.sendMessage({

                        type:
                            "GET_REPOSITORIES"
                    });


                if (
                    !response ||
                    !response.success
                ) {

                    throw new Error(
                        response?.message ||
                        "Could not load repositories."
                    );
                }


                const repositories =
                    response.repositories || [];


                repositorySelect.innerHTML =
                    "";


                if (
                    repositories.length === 0
                ) {

                    repositorySelect.innerHTML = `
                        <option value="">
                            No repositories found
                        </option>
                    `;

                    return;
                }


                repositories.forEach(
                    repo => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            repo.fullName;


                        option.textContent =
                            repo.private
                                ? `${repo.name} 🔒`
                                : repo.name;


                        option.dataset.repositoryId =
                            repo.id;


                        option.dataset.defaultBranch =
                            repo.defaultBranch;


                        repositorySelect.appendChild(
                            option
                        );
                    }
                );


                const saved =
                    await chrome.storage.local.get([
                        "githubRepository"
                    ]);


                if (
                    saved.githubRepository
                ) {

                    repositorySelect.value =
                        saved.githubRepository;
                }


                updateRepositoryDisplay();

            } catch (error) {

                console.error(
                    "PushHub: Repository loading error:",
                    error
                );


                repositorySelect.innerHTML = `
                    <option value="">
                        Failed to load repositories
                    </option>
                `;
            }
        }


        async function updateRepositoryDisplay() {

            if (!repositoryDisplay) {
                return;
            }


            const saved =
                await chrome.storage.local.get([
                    "githubUsername",
                    "githubRepository"
                ]);


            const username =
                saved.githubUsername ||
                "";


            const repository =
                saved.githubRepository ||
                "";


            let repositoryName =
                repository;


            if (
                repository.includes("/")
            ) {

                repositoryName =
                    repository
                        .split("/")
                        .pop();
            }


            if (
                username &&
                repositoryName
            ) {

                repositoryDisplay.textContent =
                    `${username} / ${repositoryName}`;

            } else if (
                repositoryName
            ) {

                repositoryDisplay.textContent =
                    repositoryName;

            } else if (
                username
            ) {

                repositoryDisplay.textContent =
                    username;

            } else {

                repositoryDisplay.textContent =
                    "GitHub / DSA";
            }
        }


        async function loadGitHubStatus() {

            try {

                const result =
                    await chrome.storage.local.get([
                        "githubAuthenticated",
                        "githubUsername",
                        "githubRepository"
                    ]);


                if (
                    result.githubAuthenticated &&
                    result.githubUsername
                ) {

                    statusElement.innerHTML = `
                        <span class="status-dot"></span>
                        <span class="status-text">
                            Connected
                        </span>
                    `;


                    statusElement.classList.remove(
                        "disconnected"
                    );


                    statusElement.classList.add(
                        "connected"
                    );


                    connectButton.textContent =
                        "GitHub Connected";


                    connectButton.disabled =
                        true;


                    await updateRepositoryDisplay();


                    await loadRepositories();


                } else {

                    statusElement.innerHTML = `
                        <span class="status-dot"></span>
                        <span class="status-text">
                            Not connected
                        </span>
                    `;


                    statusElement.classList.remove(
                        "connected"
                    );


                    statusElement.classList.add(
                        "disconnected"
                    );


                    connectButton.textContent =
                        "Connect GitHub";


                    connectButton.disabled =
                        false;


                    repositorySelect.innerHTML = `
                        <option value="">
                            Connect GitHub first
                        </option>
                    `;


                    if (repositoryDisplay) {

                        repositoryDisplay.textContent =
                            "GitHub / DSA";
                    }
                }

            } catch (error) {

                console.error(
                    "PushHub: GitHub status error:",
                    error
                );
            }
        }


        connectButton.addEventListener(
            "click",
            async () => {

                try {

                    connectButton.disabled =
                        true;


                    connectButton.textContent =
                        "Connecting...";


                    statusElement.innerHTML = `
                        <span class="status-dot"></span>
                        <span class="status-text">
                            Connecting...
                        </span>
                    `;


                    const response =
                        await chrome.runtime.sendMessage({

                            type:
                                "CONNECT_GITHUB"
                        });


                    if (
                        !response ||
                        !response.success
                    ) {

                        throw new Error(
                            response?.message ||
                            "GitHub connection failed."
                        );
                    }


                    statusElement.innerHTML = `
                        <span class="status-dot"></span>
                        <span class="status-text">
                            Connected
                        </span>
                    `;


                    statusElement.classList.remove(
                        "disconnected"
                    );


                    statusElement.classList.add(
                        "connected"
                    );


                    connectButton.textContent =
                        "GitHub Connected";


                    connectButton.disabled =
                        true;


                    await loadRepositories();


                    await updateRepositoryDisplay();


                    await loadStats();


                } catch (error) {

                    console.error(
                        "PushHub: GitHub connection error:",
                        error
                    );


                    statusElement.innerHTML = `
                        <span class="status-dot"></span>
                        <span class="status-text">
                            Not connected
                        </span>
                    `;


                    statusElement.classList.remove(
                        "connected"
                    );


                    statusElement.classList.add(
                        "disconnected"
                    );


                    connectButton.disabled =
                        false;


                    connectButton.textContent =
                        "Connect GitHub";


                    alert(
                        "GitHub connection failed.\n\n" +
                        error.message
                    );
                }
            }
        );


        repositorySelect.addEventListener(
            "change",
            async () => {

                const selectedOption =
                    repositorySelect.options[
                        repositorySelect.selectedIndex
                    ];


                if (
                    !selectedOption ||
                    !selectedOption.value
                ) {

                    return;
                }


                const repository =
                    selectedOption.value;


                const repositoryId =
                    selectedOption.dataset.repositoryId;


                const defaultBranch =
                    selectedOption.dataset.defaultBranch;


                await chrome.storage.local.set({

                    githubRepository:
                        repository,

                    githubRepositoryId:
                        repositoryId,

                    githubRepositoryBranch:
                        defaultBranch
                });


                await updateRepositoryDisplay();


                await loadStats();
            }
        );


        async function loadStats() {

            if (
                refreshButton
            ) {

                refreshButton.disabled =
                    true;


                refreshButton.innerHTML = `
                    <span class="refresh-icon">
                        ↻
                    </span>
                    <span>
                        Loading Stats...
                    </span>
                `;
            }


            try {

                const response =
                    await chrome.runtime.sendMessage({

                        type:
                            "GET_PUSHHUB_STATS"
                    });


                if (
                    !response ||
                    !response.success
                ) {

                    throw new Error(
                        response?.message ||
                        "Could not load statistics."
                    );
                }


                const stats =
                    response.stats || {};


                totalSolved.textContent =
                    Number(
                        stats.total ||
                        0
                    );


                const platforms =
                    stats.platforms || {};


                platformCounters.leetcode.textContent =
                    Number(
                        platforms.leetcode ||
                        0
                    );


                platformCounters.gfg.textContent =
                    Number(
                        platforms.gfg ||
                        0
                    );


                platformCounters.hackerrank.textContent =
                    Number(
                        platforms.hackerrank ||
                        0
                    );


                platformCounters.codechef.textContent =
                    Number(
                        platforms.codechef ||
                        0
                    );


                platformCounters.codeforces.textContent =
                    Number(
                        platforms.codeforces ||
                        0
                    );


                const current =
                    Number(
                        stats.currentStreak ||
                        0
                    );

                const best =
                    Number(
                        stats.bestStreak ||
                        0
                    );


                currentStreak.textContent =
                    `${current} ${current === 1 ? "day" : "days"}`;


                bestStreak.textContent =
                    `${best} ${best === 1 ? "day" : "days"}`;


            } catch (error) {

                console.error(
                    "PushHub: Statistics loading error:",
                    error
                );


                resetStatsDisplay();


            } finally {

                if (
                    refreshButton
                ) {

                    refreshButton.disabled =
                        false;


                    refreshButton.innerHTML = `
                        <span class="refresh-icon">
                            ↻
                        </span>
                        <span>
                            Refresh Stats
                        </span>
                    `;
                }
            }
        }


        /* =========================================
           AUTOMATIC STATS REFRESH AFTER SYNC
        ========================================= */

        chrome.runtime.onMessage.addListener(
            message => {

                if (
                    message?.type ===
                    "PUSHHUB_STATS_UPDATED"
                ) {

                    loadStats();
                }
            }
        );


        refreshButton.addEventListener(
            "click",
            async () => {

                await loadStats();

                await updateRepositoryDisplay();
            }
        );


        document
            .querySelectorAll(
                ".social-link"
            )
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();


                            const url =
                                link.href;


                            if (
                                url
                            ) {

                                chrome.tabs.create({
                                    url
                                });
                            }
                        }
                    );
                }
            );


        document
            .querySelectorAll(
                ".feedback-footer a"
            )
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        event => {

                            if (
                                link.href.startsWith(
                                    "mailto:"
                                )
                            ) {

                                return;
                            }
                        }
                    );
                }
            );


        resetStatsDisplay();


        await loadGitHubStatus();


        await loadStats();

    }
);