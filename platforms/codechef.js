(function () {

    if (
        window.__DSA_GRINDHUB_CODECHEF_CONTENT__
    ) {
        return;
    }

    window.__DSA_GRINDHUB_CODECHEF_CONTENT__ =
        true;


    console.log(
        "DSA GrindHub: CodeChef content script loaded."
    );


    let latestAcceptedSubmission =
        null;


    let syncButton =
        null;


    let currentProblemUrl =
        window.location.href;


    /* =========================================
       RESET STATE
    ========================================= */

    function resetState() {

        latestAcceptedSubmission =
            null;


        if (syncButton) {

            syncButton.remove();

            syncButton =
                null;
        }


        const existing =
            document.getElementById(
                "dsa-grindhub-codechef-sync"
            );


        if (existing) {

            existing.remove();
        }


        console.log(
            "DSA GrindHub: CodeChef problem changed. State reset."
        );
    }


    /* =========================================
       NAVIGATION
    ========================================= */

    function checkNavigation() {

        const newUrl =
            window.location.href;


        if (
            newUrl ===
            currentProblemUrl
        ) {
            return;
        }


        currentProblemUrl =
            newUrl;


        resetState();
    }


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
                checkNavigation,
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
                checkNavigation,
                50
            );


            return result;
        };


    window.addEventListener(
        "popstate",
        () => {

            setTimeout(
                checkNavigation,
                50
            );
        }
    );


    setInterval(
        checkNavigation,
        500
    );


    /* =========================================
       ACCEPTED SUBMISSION
    ========================================= */

    window.addEventListener(
        "message",
        event => {

            if (
                event.source !==
                window
            ) {
                return;
            }


            const message =
                event.data;


            if (
                !message ||
                message.type !==
                    "DSA_GRINDHUB_CODECHEF_ACCEPTED"
            ) {
                return;
            }


            const submission =
                message.submission;


            if (!submission) {
                return;
            }


            console.log(
                "DSA GrindHub: CodeChef accepted submission received:",
                submission
            );


            latestAcceptedSubmission =
                submission;


            createSyncButton();
        }
    );


    /* =========================================
       CREATE SYNC BUTTON
    ========================================= */

    function createSyncButton() {

        if (
            syncButton
        ) {
            return;
        }


        const existing =
            document.getElementById(
                "dsa-grindhub-codechef-sync"
            );


        if (existing) {

            syncButton =
                existing;

            return;
        }


        syncButton =
            document.createElement(
                "button"
            );


        syncButton.id =
            "dsa-grindhub-codechef-sync";


        syncButton.textContent =
            "Sync to GitHub";


        Object.assign(
            syncButton.style,
            {

                position:
                    "fixed",

                top:
                    "90px",

                right:
                    "25px",

                zIndex:
                    "999999",

                padding:
                    "11px 18px",

                border:
                    "none",

                borderRadius:
                    "8px",

                background:
                    "#22c55e",

                color:
                    "#ffffff",

                fontSize:
                    "14px",

                fontWeight:
                    "600",

                cursor:
                    "pointer",

                boxShadow:
                    "0 4px 12px rgba(0,0,0,0.3)"
            }
        );


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
            "DSA GrindHub: CodeChef Sync button created."
        );
    }


    /* =========================================
       SYNC
    ========================================= */

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
                "DSA GrindHub: CodeChef GitHub response:",
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


                console.log(
                    "DSA GrindHub: CodeChef solution synced successfully."
                );


                setTimeout(
                    () => {

                        if (
                            !syncButton
                        ) {
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
                "DSA GrindHub: CodeChef sync failed:",
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


    /* =========================================
       KEEP BUTTON ALIVE
    ========================================= */

    const observer =
        new MutationObserver(
            () => {

                checkNavigation();


                if (
                    latestAcceptedSubmission &&
                    !document.getElementById(
                        "dsa-grindhub-codechef-sync"
                    )
                ) {

                    syncButton =
                        null;


                    createSyncButton();
                }
            }
        );


    observer.observe(
        document.documentElement,
        {
            childList:
                true,

            subtree:
                true
        }
    );

})();