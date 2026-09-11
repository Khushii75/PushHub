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


        // ==================================================
        // HELPERS
        // ==================================================

        function resetStatsDisplay() {

            if (totalSolved) {

                totalSolved.textContent =
                    "0";
            }


            if (currentStreak) {

                currentStreak.textContent =
                    "0 days";
            }


            if (bestStreak) {

                bestStreak.textContent =
                    "0 days";
            }


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


        function setConnectedUI(
            username
        ) {

            if (statusElement) {

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
            }


            if (connectButton) {

                connectButton.textContent =
                    "GitHub Connected";

                connectButton.disabled =
                    true;
            }
        }


        function setDisconnectedUI() {

            if (statusElement) {

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
            }


            if (connectButton) {

                connectButton.textContent =
                    "Connect GitHub";

                connectButton.disabled =
                    false;
            }


            if (repositorySelect) {

                repositorySelect.innerHTML = `
                    <option value="">
                        Connect GitHub first
                    </option>
                `;
            }


            if (repositoryDisplay) {

                repositoryDisplay.textContent =
                    "GitHub / DSA";
            }
        }


        // ==================================================
        // SETTINGS
        // ==================================================

        if (settingsButton) {

            settingsButton.addEventListener(
                "click",
                () => {

                    settingsPanel.classList.toggle(
                        "hidden"
                    );
                }
            );
        }


        if (closeSettings) {

            closeSettings.addEventListener(
                "click",
                () => {

                    settingsPanel.classList.add(
                        "hidden"
                    );
                }
            );
        }


        // ==================================================
        // UPDATE REPOSITORY DISPLAY
        // ==================================================

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


        // ==================================================
        // SAVE REPOSITORY
        // ==================================================

        async function saveRepository(
            selectedOption
        ) {

            if (
                !selectedOption ||
                !selectedOption.value
            ) {

                return false;
            }


            const repository =
                selectedOption.value;


            const repositoryId =
                selectedOption.dataset.repositoryId ||
                "";


            const defaultBranch =
                selectedOption.dataset.defaultBranch ||
                "main";


            await chrome.storage.local.set({

                githubRepository:
                    repository,

                githubRepositoryId:
                    repositoryId,

                githubRepositoryBranch:
                    defaultBranch
            });


            console.log(
                "PushHub: Repository saved:",
                {
                    repository,
                    repositoryId,
                    defaultBranch
                }
            );


            return true;
        }


        // ==================================================
        // LOAD REPOSITORIES
        // ==================================================

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


                // ------------------------------------------
                // NO REPOSITORIES
                // ------------------------------------------

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


                // ------------------------------------------
                // PLACEHOLDER
                // ------------------------------------------

                const placeholder =
                    document.createElement(
                        "option"
                    );


                placeholder.value =
                    "";


                placeholder.textContent =
                    "Select a repository";


                placeholder.disabled =
                    true;


                repositorySelect.appendChild(
                    placeholder
                );


                // ------------------------------------------
                // ADD REPOSITORIES
                // ------------------------------------------

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
                            String(
                                repo.id || ""
                            );


                        option.dataset.defaultBranch =
                            repo.defaultBranch ||
                            "main";


                        repositorySelect.appendChild(
                            option
                        );
                    }
                );


                // ------------------------------------------
                // GET SAVED REPOSITORY
                // ------------------------------------------

                const saved =
                    await chrome.storage.local.get([
                        "githubRepository",
                        "githubRepositoryId",
                        "githubRepositoryBranch"
                    ]);


                let selectedOption =
                    null;


                // ------------------------------------------
                // CASE 1:
                // SAVED REPOSITORY EXISTS
                // ------------------------------------------

                if (
                    saved.githubRepository
                ) {

                    selectedOption =
                        Array.from(
                            repositorySelect.options
                        ).find(
                            option =>
                                option.value ===
                                saved.githubRepository
                        );


                    if (selectedOption) {

                        repositorySelect.value =
                            saved.githubRepository;


                        /*
                         * Normalize repository ID and branch
                         * if older storage didn't contain them.
                         */
                        const repositoryId =
                            selectedOption.dataset.repositoryId ||
                            saved.githubRepositoryId ||
                            "";


                        const defaultBranch =
                            selectedOption.dataset.defaultBranch ||
                            saved.githubRepositoryBranch ||
                            "main";


                        if (
                            repositoryId !==
                                saved.githubRepositoryId ||
                            defaultBranch !==
                                saved.githubRepositoryBranch
                        ) {

                            await chrome.storage.local.set({

                                githubRepository:
                                    selectedOption.value,

                                githubRepositoryId:
                                    repositoryId,

                                githubRepositoryBranch:
                                    defaultBranch
                            });
                        }

                    } else {

                        /*
                         * Saved repository no longer exists.
                         */
                        await chrome.storage.local.remove([
                            "githubRepository",
                            "githubRepositoryId",
                            "githubRepositoryBranch"
                        ]);
                    }
                }


                // ------------------------------------------
                // CASE 2:
                // ONLY ONE REPOSITORY
                // ------------------------------------------

                if (
                    !selectedOption &&
                    repositories.length === 1
                ) {

                    selectedOption =
                        Array.from(
                            repositorySelect.options
                        ).find(
                            option =>
                                option.value ===
                                repositories[0].fullName
                        );


                    if (selectedOption) {

                        repositorySelect.value =
                            selectedOption.value;


                        /*
                         * IMPORTANT:
                         * The old version only visually selected
                         * the first repository.
                         *
                         * This explicitly saves it.
                         */
                        await saveRepository(
                            selectedOption
                        );
                    }
                }


                // ------------------------------------------
                // CASE 3:
                // MULTIPLE REPOSITORIES
                // ------------------------------------------

                if (
                    !selectedOption &&
                    repositories.length > 1
                ) {

                    repositorySelect.value =
                        "";

                    /*
                     * Do NOT automatically choose a random
                     * repository when several exist.
                     *
                     * User must choose.
                     */
                }


                await updateRepositoryDisplay();


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


                throw error;
            }
        }


        // ==================================================
        // LOAD GITHUB STATUS
        // ==================================================

        async function loadGitHubStatus() {

            try {

                /*
                 * Do NOT trust only:
                 *
                 * githubAuthenticated === true
                 *
                 * because an old/expired token can still have
                 * that value in storage.
                 *
                 * Ask background.js to validate GitHub.
                 */
                const response =
                    await chrome.runtime.sendMessage({

                        type:
                            "CHECK_GITHUB_STATUS"
                    });


                if (
                    response &&
                    response.success &&
                    response.authenticated
                ) {

                    setConnectedUI(
                        response.username
                    );


                    /*
                     * Background status check updates the username.
                     * Now load repositories using the valid token.
                     */
                    await loadRepositories();


                    await updateRepositoryDisplay();


                    return true;
                }


                setDisconnectedUI();


                return false;


            } catch (error) {

                console.error(
                    "PushHub: GitHub status error:",
                    error
                );


                setDisconnectedUI();


                return false;
            }
        }


        // ==================================================
        // CONNECT GITHUB
        // ==================================================

        if (connectButton) {

            connectButton.addEventListener(
                "click",
                async () => {

                    try {

                        connectButton.disabled =
                            true;


                        connectButton.textContent =
                            "Connecting...";


                        if (statusElement) {

                            statusElement.innerHTML = `
                                <span class="status-dot"></span>
                                <span class="status-text">
                                    Connecting...
                                </span>
                            `;
                        }


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


                        setConnectedUI(
                            response.username
                        );


                        /*
                         * Load repositories immediately after
                         * successful authentication.
                         */
                        await loadRepositories();


                        await updateRepositoryDisplay();


                        await loadStats();


                    } catch (error) {

                        console.error(
                            "PushHub: GitHub connection error:",
                            error
                        );


                        setDisconnectedUI();


                        alert(
                            "GitHub connection failed.\n\n" +
                            error.message
                        );
                    }
                }
            );
        }


        // ==================================================
        // REPOSITORY CHANGE
        // ==================================================

        if (repositorySelect) {

            repositorySelect.addEventListener(
                "change",
                async () => {

                    try {

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


                        await saveRepository(
                            selectedOption
                        );


                        await updateRepositoryDisplay();


                        await loadStats();


                    } catch (error) {

                        console.error(
                            "PushHub: Repository selection error:",
                            error
                        );


                        alert(
                            "Could not save repository.\n\n" +
                            error.message
                        );
                    }
                }
            );
        }


        // ==================================================
        // LOAD STATS
        // ==================================================

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


                if (totalSolved) {

                    totalSolved.textContent =
                        Number(
                            stats.total ||
                            0
                        );
                }


                const platforms =
                    stats.platforms || {};


                if (
                    platformCounters.leetcode
                ) {

                    platformCounters.leetcode.textContent =
                        Number(
                            platforms.leetcode ||
                            0
                        );
                }


                if (
                    platformCounters.gfg
                ) {

                    platformCounters.gfg.textContent =
                        Number(
                            platforms.gfg ||
                            0
                        );
                }


                if (
                    platformCounters.hackerrank
                ) {

                    platformCounters.hackerrank.textContent =
                        Number(
                            platforms.hackerrank ||
                            0
                        );
                }


                if (
                    platformCounters.codechef
                ) {

                    platformCounters.codechef.textContent =
                        Number(
                            platforms.codechef ||
                            0
                        );
                }


                if (
                    platformCounters.codeforces
                ) {

                    platformCounters.codeforces.textContent =
                        Number(
                            platforms.codeforces ||
                            0
                        );
                }


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


                if (currentStreak) {

                    currentStreak.textContent =
                        `${current} ${
                            current === 1
                                ? "day"
                                : "days"
                        }`;
                }


                if (bestStreak) {

                    bestStreak.textContent =
                        `${best} ${
                            best === 1
                                ? "day"
                                : "days"
                        }`;
                }


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


        // ==================================================
        // AUTOMATIC STATS REFRESH AFTER SYNC
        // ==================================================

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


        // ==================================================
        // MANUAL STATS REFRESH
        // ==================================================

        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                async () => {

                    await loadStats();

                    await updateRepositoryDisplay();
                }
            );
        }


        // ==================================================
        // SOCIAL LINKS
        // ==================================================

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


                            if (url) {

                                chrome.tabs.create({
                                    url
                                });
                            }
                        }
                    );
                }
            );


        // ==================================================
        // FEEDBACK LINKS
        // ==================================================

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


        // ==================================================
        // INITIAL STATE
        // ==================================================

        resetStatsDisplay();


        /*
         * First validate GitHub.
         *
         * loadGitHubStatus() will:
         *
         * 1. validate token
         * 2. refresh token if needed
         * 3. load repositories
         * 4. automatically save the only repository
         */
        const connected =
            await loadGitHubStatus();


        /*
         * Only request statistics when GitHub is actually
         * connected.
         */
        if (connected) {

            await loadStats();

        } else {

            resetStatsDisplay();
        }

    }
);