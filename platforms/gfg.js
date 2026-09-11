console.log(
    "DSA GrindHub: GFG content script loaded."
);


/* ==================================================
   STATE
================================================== */

let latestAcceptedSubmission = null;
let syncButton = null;


/* ==================================================
   SAFE EXTENSION MESSAGE
================================================== */

/*
 * Content scripts can become stale when Chrome reloads
 * or replaces the extension.
 *
 * Instead of making the user manually Ctrl+R the page,
 * automatically reload the current GFG page when the
 * extension context has been invalidated.
 */
async function pushHubSendMessage(
    message
) {

    try {

        return await chrome.runtime.sendMessage(
            message
        );

    } catch (error) {

        const errorMessage =
            String(
                error?.message ||
                error ||
                ""
            );


        if (
            /Extension context invalidated/i.test(
                errorMessage
            ) ||

            /message port closed/i.test(
                errorMessage
            ) ||

            /Receiving end does not exist/i.test(
                errorMessage
            )
        ) {

            console.warn(
                "DSA GrindHub: Extension context is stale."
            );

            console.warn(
                "DSA GrindHub: Reloading GFG page to recover..."
            );


            /*
             * Prevent multiple reload requests.
             */
            if (
                !window.__dsaGrindHubReloading
            ) {

                window.__dsaGrindHubReloading =
                    true;


                setTimeout(
                    () => {

                        window.location.reload();

                    },
                    100
                );
            }


            return {

                success:
                    false,

                contextRecovered:
                    true,

                message:
                    "PushHub is refreshing the page to restore the extension context."
            };
        }


        throw error;
    }
}


/* ==================================================
   CREATE SYNC BUTTON
================================================== */

function createSyncButton() {

    /*
     * Do not create duplicates.
     */
    if (syncButton) {

        return;
    }


    /*
     * Also check the DOM in case our local reference
     * was lost but the button is already present.
     */
    const existingButton =
        document.getElementById(
            "dsa-grindhub-gfg-sync"
        );


    if (existingButton) {

        syncButton =
            existingButton;

        return;
    }


    syncButton =
        document.createElement(
            "button"
        );


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


    if (document.body) {

        document.body.appendChild(
            syncButton
        );
    }


    console.log(
        "DSA GrindHub: GFG Sync button created."
    );
}


/* ==================================================
   SYNC TO GITHUB
================================================== */

async function syncToGitHub() {

    if (
        !latestAcceptedSubmission
    ) {

        console.warn(
            "DSA GrindHub: No accepted GFG submission available."
        );

        return;
    }


    if (!syncButton) {

        createSyncButton();
    }


    /*
     * If the extension context is already known to be
     * stale, let the safe messaging function recover it.
     */
    try {

        syncButton.disabled =
            true;


        syncButton.textContent =
            "Syncing to GitHub...";


        syncButton.style.background =
            "#16a34a";


        console.log(
            "DSA GrindHub: Sending GFG submission to background."
        );


        const response =
            await pushHubSendMessage({

                type:
                    "SYNC_LEETCODE_SUBMISSION",

                submission:
                    latestAcceptedSubmission
            });


        /*
         * Context recovery is already happening.
         * Don't display a misleading "Sync Failed".
         */
        if (
            response?.contextRecovered
        ) {

            console.log(
                "DSA GrindHub: Page reload started for extension recovery."
            );

            return;
        }


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


        /*
         * SUCCESS
         */
        syncButton.textContent =
            "Synced to GitHub ✓";


        syncButton.style.background =
            "#16a34a";


        console.log(
            "DSA GrindHub: GFG sync successful."
        );


        setTimeout(
            () => {

                if (!syncButton) {
                    return;
                }


                /*
                 * The button may have been removed
                 * by the GFG SPA.
                 */
                if (
                    !document.body.contains(
                        syncButton
                    )
                ) {

                    syncButton =
                        null;

                    createSyncButton();

                    return;
                }


                syncButton.disabled =
                    false;


                syncButton.textContent =
                    "Sync Again";


                syncButton.style.background =
                    "#22c55e";

            },
            2500
        );


    } catch (error) {

        console.error(
            "DSA GrindHub: GFG sync failed:",
            error
        );


        /*
         * Context invalidation can also occur outside
         * the safe-message catch in some Chrome cases.
         */
        const errorMessage =
            String(
                error?.message ||
                error ||
                ""
            );


        if (
            /Extension context invalidated/i.test(
                errorMessage
            ) ||

            /message port closed/i.test(
                errorMessage
            ) ||

            /Receiving end does not exist/i.test(
                errorMessage
            )
        ) {

            console.warn(
                "DSA GrindHub: Stale extension context detected."
            );


            if (
                !window.__dsaGrindHubReloading
            ) {

                window.__dsaGrindHubReloading =
                    true;


                setTimeout(
                    () => {

                        window.location.reload();

                    },
                    100
                );
            }


            return;
        }


        /*
         * Normal GitHub/API error.
         */
        if (syncButton) {

            syncButton.disabled =
                false;


            syncButton.textContent =
                "Sync Failed — Try Again";


            syncButton.style.background =
                "#dc2626";
        }


        setTimeout(
            () => {

                if (!syncButton) {
                    return;
                }


                syncButton.textContent =
                    "Sync to GitHub";


                syncButton.style.background =
                    "#22c55e";

            },
            3000
        );
    }
}


/* ==================================================
   ACCEPTED SUBMISSION LISTENER
================================================== */

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


/* ==================================================
   SPA MUTATION OBSERVER
================================================== */

/*
 * GFG is a SPA and can replace sections of the page.
 *
 * If GFG removes our button, recreate it as long as
 * we still have an accepted submission.
 */
const observer =
    new MutationObserver(
        () => {

            if (
                latestAcceptedSubmission &&

                (
                    !syncButton ||

                    !document.body.contains(
                        syncButton
                    )
                )
            ) {

                /*
                 * Clear stale DOM reference first.
                 */
                syncButton =
                    null;


                createSyncButton();
            }
        }
    );


/*
 * document.body may not exist immediately on extremely
 * early script execution.
 */
function startObserver() {

    if (!document.body) {

        setTimeout(
            startObserver,
            100
        );

        return;
    }


    observer.observe(
        document.body,
        {
            childList:
                true,

            subtree:
                true
        }
    );
}


startObserver();


console.log(
    "DSA GrindHub: GFG content script initialized."
);