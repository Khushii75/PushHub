(function () {
    if (window.__DSA_GRINDHUB_CODEFORCES__) {
        return;
    }

    window.__DSA_GRINDHUB_CODEFORCES__ = true;

    console.log(
        "DSA GrindHub: Codeforces content script loaded."
    );

    let lastSyncedSubmissionId = null;
    let syncingSubmission = false;

    // ==================================================
    // RECEIVE ACCEPTED SUBMISSION FROM BRIDGE
    // ==================================================

    window.addEventListener(
        "message",
        async event => {
            if (event.source !== window) {
                return;
            }

            const data = event.data;

            if (
                !data ||
                data.type !==
                    "DSA_GRINDHUB_CODEFORCES_ACCEPTED"
            ) {
                return;
            }

            const submission =
                data.submission;

            if (!submission) {
                console.warn(
                    "DSA GrindHub: Codeforces submission data missing."
                );

                return;
            }

            console.log(
                "DSA GrindHub: Codeforces accepted submission received.",
                submission
            );

            // ------------------------------------------
            // Prevent duplicate sync
            // ------------------------------------------

            if (
                lastSyncedSubmissionId ===
                String(submission.submissionId)
            ) {
                console.log(
                    "DSA GrindHub: Codeforces submission already synced."
                );

                return;
            }

            if (syncingSubmission) {
                console.log(
                    "DSA GrindHub: Codeforces sync already in progress."
                );

                return;
            }

            syncingSubmission = true;

            try {
                // --------------------------------------
                // DIRECTLY SEND TO BACKGROUND
                // --------------------------------------

                console.log(
                    "DSA GrindHub: Directly syncing Codeforces submission to GitHub..."
                );

                const response =
                    await chrome.runtime.sendMessage({
                        type:
                            "SYNC_LEETCODE_SUBMISSION",

                        submission
                    });

                console.log(
                    "DSA GrindHub: Codeforces GitHub response:",
                    response
                );

                if (
                    response &&
                    response.success
                ) {
                    lastSyncedSubmissionId =
                        String(
                            submission.submissionId
                        );

                    console.log(
                        "DSA GrindHub: Codeforces submission synced to GitHub successfully."
                    );

                    console.log(
                        "DSA GrindHub: GitHub action:",
                        response.action
                    );

                    console.log(
                        "DSA GrindHub: GitHub path:",
                        response.path
                    );

                    console.log(
                        "DSA GrindHub: GitHub topic:",
                        response.topic
                    );

                } else {
                    console.error(
                        "DSA GrindHub: Codeforces GitHub sync failed:",
                        response?.message ||
                            "Unknown error."
                    );
                }

            } catch (error) {
                console.error(
                    "DSA GrindHub: Codeforces direct GitHub sync error:",
                    error
                );

            } finally {
                syncingSubmission = false;
            }
        }
    );

})();