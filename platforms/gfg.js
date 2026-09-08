console.log(
    "DSA GrindHub: GFG content script loaded."
);

let latestAcceptedSubmission = null;
let syncButton = null;

function createSyncButton() {
    if (syncButton) {
        return;
    }

    syncButton =
        document.createElement("button");

    syncButton.id =
        "dsa-grindhub-gfg-sync";

    syncButton.textContent =
        "Sync to GitHub";

    syncButton.style.cssText = `
        position: fixed;
        top: 115px;
        right: 25px;
        z-index: 2147483647;

        padding: 11px 18px;

        border: none;
        border-radius: 8px;

        background: #22c55e;
        color: #ffffff;

        font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

        font-size: 14px;
        font-weight: 600;

        cursor: pointer;

        box-shadow:
            0 4px 12px rgba(0, 0, 0, 0.25);

        transition:
            background 0.2s ease,
            transform 0.1s ease;
    `;

    syncButton.addEventListener(
        "mouseenter",
        () => {
            if (!syncButton.disabled) {
                syncButton.style.background =
                    "#16a34a";
            }
        }
    );

    syncButton.addEventListener(
        "mouseleave",
        () => {
            if (!syncButton.disabled) {
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
        "DSA GrindHub: GFG Sync button created."
    );
}

async function syncToGitHub() {
    if (
        !latestAcceptedSubmission
    ) {
        console.warn(
            "DSA GrindHub: No accepted GFG submission available."
        );

        return;
    }

    try {
        syncButton.disabled = true;

        syncButton.textContent =
            "Syncing to GitHub...";

        syncButton.style.background =
            "#16a34a";

        console.log(
            "DSA GrindHub: Sending GFG submission to background."
        );

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
            "DSA GrindHub: GitHub response:",
            response
        );

        if (
            !response ||
            !response.success
        ) {
            throw new Error(
                response?.message ||
                "GitHub sync failed."
            );
        }

        syncButton.textContent =
            "Synced to GitHub ✓";

        syncButton.style.background =
            "#16a34a";

        console.log(
            "DSA GrindHub: GFG sync successful."
        );

        setTimeout(() => {
            if (!syncButton) {
                return;
            }

            syncButton.disabled =
                false;

            syncButton.textContent =
                "Sync Again";

            syncButton.style.background =
                "#22c55e";

        }, 2500);

    } catch (error) {
        console.error(
            "DSA GrindHub: GFG sync failed:",
            error
        );

        syncButton.disabled =
            false;

        syncButton.textContent =
            "Sync Failed — Try Again";

        syncButton.style.background =
            "#dc2626";

        setTimeout(() => {
            if (!syncButton) {
                return;
            }

            syncButton.textContent =
                "Sync to GitHub";

            syncButton.style.background =
                "#22c55e";

        }, 3000);
    }
}

window.addEventListener(
    "message",
    event => {
        if (
            event.source !== window
        ) {
            return;
        }

        if (
            event.data?.type !==
            "DSA_GRINDHUB_GFG_ACCEPTED"
        ) {
            return;
        }

        const submission =
            event.data.submission;

        if (!submission) {
            return;
        }

        latestAcceptedSubmission =
            submission;

        console.log(
            "DSA GrindHub: GFG submission received.",
            submission
        );

        createSyncButton();
    }
);

// Recreate the button if GFG's SPA
// removes it during a UI update.
const observer =
    new MutationObserver(() => {
        if (
            latestAcceptedSubmission &&
            (
                !syncButton ||
                !document.body.contains(
                    syncButton
                )
            )
        ) {
            createSyncButton();
        }
    });

observer.observe(
    document.body,
    {
        childList: true,
        subtree: true
    }
);