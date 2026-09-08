(function () {

    if (window.__DSA_GRINDHUB_HR_CONTENT__) {
        return;
    }

    window.__DSA_GRINDHUB_HR_CONTENT__ = true;

    console.log(
        "DSA GrindHub: HackerRank content script loaded."
    );


    let latestAcceptedSubmission = null;
    let syncButton = null;

    // Remember which challenge the current submission belongs to
    let currentChallengeUrl = window.location.href;


    // --------------------------------------------------
    // Remove old button + submission
    // --------------------------------------------------

    function resetChallengeState() {

        latestAcceptedSubmission = null;

        if (syncButton) {
            syncButton.remove();
            syncButton = null;
        }

        const existingButton =
            document.getElementById(
                "dsa-grindhub-hackerrank-sync"
            );

        if (existingButton) {
            existingButton.remove();
        }

        console.log(
            "DSA GrindHub: HackerRank challenge changed. State reset."
        );
    }


    // --------------------------------------------------
    // Detect HackerRank SPA navigation
    // --------------------------------------------------

    function checkForChallengeChange() {

        const newUrl =
            window.location.href;

        if (newUrl === currentChallengeUrl) {
            return;
        }

        console.log(
            "DSA GrindHub: HackerRank URL changed:"
        );

        console.log(
            "OLD:",
            currentChallengeUrl
        );

        console.log(
            "NEW:",
            newUrl
        );

        currentChallengeUrl = newUrl;

        resetChallengeState();
    }


    // --------------------------------------------------
    // Hook browser navigation
    // --------------------------------------------------

    const originalPushState =
        history.pushState;

    history.pushState =
        function (...args) {

            const result =
                originalPushState.apply(
                    this,
                    args
                );

            setTimeout(
                checkForChallengeChange,
                50
            );

            return result;
        };


    const originalReplaceState =
        history.replaceState;

    history.replaceState =
        function (...args) {

            const result =
                originalReplaceState.apply(
                    this,
                    args
                );

            setTimeout(
                checkForChallengeChange,
                50
            );

            return result;
        };


    window.addEventListener(
        "popstate",
        () => {

            setTimeout(
                checkForChallengeChange,
                50
            );
        }
    );


    // --------------------------------------------------
    // Backup URL watcher
    // --------------------------------------------------

    setInterval(
        checkForChallengeChange,
        500
    );


    // --------------------------------------------------
    // Receive accepted submission
    // --------------------------------------------------

    window.addEventListener(
        "message",
        event => {

            if (
                event.source !== window
            ) {
                return;
            }


            const message =
                event.data;


            if (
                !message ||
                message.type !==
                    "DSA_GRINDHUB_HACKERRANK_ACCEPTED"
            ) {
                return;
            }


            const submission =
                message.submission;


            if (!submission) {
                return;
            }


            // Make sure the submission belongs
            // to the currently opened challenge
            if (
                submission.url &&
                submission.url !==
                    window.location.href
            ) {

                console.log(
                    "DSA GrindHub: Ignoring submission from another URL."
                );

                return;
            }


            console.log(
                "DSA GrindHub: HackerRank accepted submission received.",
                submission
            );


            latestAcceptedSubmission =
                submission;


            createSyncButton();
        }
    );


    // --------------------------------------------------
    // Create Sync button
    // --------------------------------------------------

    function createSyncButton() {

        if (syncButton) {
            return;
        }


        // Extra protection against duplicate buttons
        const existingButton =
            document.getElementById(
                "dsa-grindhub-hackerrank-sync"
            );

        if (existingButton) {
            syncButton =
                existingButton;

            return;
        }


        syncButton =
            document.createElement("button");


        syncButton.id =
            "dsa-grindhub-hackerrank-sync";


        syncButton.textContent =
            "Sync to GitHub";


        syncButton.style.position =
            "fixed";

        syncButton.style.top =
            "90px";

        syncButton.style.right =
            "25px";

        syncButton.style.zIndex =
            "999999";

        syncButton.style.padding =
            "11px 18px";

        syncButton.style.border =
            "none";

        syncButton.style.borderRadius =
            "8px";

        syncButton.style.background =
            "#22c55e";

        syncButton.style.color =
            "#ffffff";

        syncButton.style.fontSize =
            "14px";

        syncButton.style.fontWeight =
            "600";

        syncButton.style.cursor =
            "pointer";

        syncButton.style.boxShadow =
            "0 4px 12px rgba(0,0,0,0.3)";


        syncButton.addEventListener(
            "mouseenter",
            () => {

                if (
                    !syncButton.disabled
                ) {
                    syncButton.style.background =
                        "#16a34a";
                }
            }
        );


        syncButton.addEventListener(
            "mouseleave",
            () => {

                if (
                    !syncButton.disabled
                ) {
                    syncButton.style.background =
                        "#22c55e";
                }
            }
        );


        syncButton.addEventListener(
            "click",
            syncToGitHub
        );


        document.body.appendChild(
            syncButton
        );


        console.log(
            "DSA GrindHub: HackerRank Sync button created."
        );
    }


    // --------------------------------------------------
    // Sync to GitHub
    // --------------------------------------------------

    async function syncToGitHub() {

        if (
            !latestAcceptedSubmission ||
            !syncButton
        ) {
            return;
        }


        syncButton.disabled =
            true;


        syncButton.textContent =
            "Syncing to GitHub...";


        syncButton.style.background =
            "#16a34a";


        console.log(
            "DSA GrindHub: Sending HackerRank submission to background."
        );


        try {

            const response =
                await chrome.runtime.sendMessage(
                    {
                        type:
                            "SYNC_LEETCODE_SUBMISSION",

                        submission:
                            latestAcceptedSubmission
                    }
                );


            console.log(
                "DSA GrindHub: HackerRank GitHub response:",
                response
            );


            if (
                response &&
                response.success
            ) {

                syncButton.textContent =
                    "Synced to GitHub ✓";


                syncButton.style.background =
                    "#16a34a";


                setTimeout(
                    () => {

                        if (!syncButton) {
                            return;
                        }


                        syncButton.disabled =
                            false;


                        syncButton.textContent =
                            "Sync Again";

                    },
                    2500
                );

            } else {

                throw new Error(
                    response?.message ||
                    "GitHub sync failed."
                );
            }


        } catch (error) {

            console.error(
                "DSA GrindHub: HackerRank sync failed:",
                error
            );


            syncButton.disabled =
                false;


            syncButton.textContent =
                "Sync Failed — Try Again";


            syncButton.style.background =
                "#dc2626";
        }
    }


    // --------------------------------------------------
    // Keep button alive if HackerRank removes it
    // --------------------------------------------------

    const observer =
        new MutationObserver(() => {

            checkForChallengeChange();


            if (
                latestAcceptedSubmission &&
                !document.getElementById(
                    "dsa-grindhub-hackerrank-sync"
                )
            ) {

                syncButton = null;

                createSyncButton();
            }
        });


    observer.observe(
        document.documentElement,
        {
            childList: true,
            subtree: true
        }
    );

})();