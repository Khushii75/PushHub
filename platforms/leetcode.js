/* =========================================
   PUSHHUB - LEETCODE
========================================= */

console.log(
    "PushHub: LeetCode integration loaded."
);


const SUBMISSION_RESULT_SELECTOR =
    '[data-e2e-locator="submission-result"]';


const SYNC_BUTTON_ID =
    "dsa-grindhub-sync-button";


/* =========================================
   COOKIE HELPER
========================================= */

function getCookie(name) {

    const cookies =
        document.cookie.split(";");


    for (
        const cookie of cookies
    ) {

        const [
            key,
            ...valueParts
        ] =
            cookie.trim().split("=");


        if (
            key === name
        ) {

            return decodeURIComponent(
                valueParts.join("=")
            );
        }
    }


    return null;
}


/* =========================================
   GET PROBLEM SLUG
========================================= */

function getProblemSlug() {

    const parts =
        window.location.pathname
            .split("/")
            .filter(Boolean);


    const index =
        parts.indexOf(
            "problems"
        );


    if (
        index === -1
    ) {

        return null;
    }


    return (
        parts[index + 1] ||
        null
    );
}


/* =========================================
   GET SUBMISSION ID
========================================= */

function getSubmissionIdFromUrl() {

    const match =
        window.location.pathname.match(
            /\/submissions\/(\d+)/
        );


    return match
        ? match[1]
        : null;
}


/* =========================================
   GRAPHQL
========================================= */

async function leetCodeGraphQL(
    query,
    variables,
    operationName
) {

    const csrfToken =
        getCookie(
            "csrftoken"
        );


    if (
        !csrfToken
    ) {

        throw new Error(
            "LeetCode CSRF token not found."
        );
    }


    const response =
        await fetch(
            "https://leetcode.com/graphql/",
            {

                method:
                    "POST",

                credentials:
                    "include",

                headers: {

                    "Content-Type":
                        "application/json",

                    "x-csrftoken":
                        csrfToken
                },

                body:
                    JSON.stringify({

                        operationName,

                        variables,

                        query
                    })
            }
        );


    if (
        !response.ok
    ) {

        throw new Error(
            `LeetCode API request failed: ${response.status}`
        );
    }


    const data =
        await response.json();


    if (
        data.errors
    ) {

        throw new Error(
            data.errors
                .map(
                    error =>
                        error.message
                )
                .join("; ")
        );
    }


    return data.data;
}


/* =========================================
   GET PROBLEM DESCRIPTION FROM PAGE
========================================= */

function cleanProblemDescription(
    element
) {

    if (!element) {
        return "";
    }


    const clone =
        element.cloneNode(true);


    /*
     * Remove buttons, navigation,
     * editors and other UI elements.
     */

    clone.querySelectorAll(
        "button, input, textarea, select, script, style, svg"
    )
        .forEach(
            element =>
                element.remove()
        );


    /*
     * Preserve useful line breaks.
     */

    clone.querySelectorAll(
        "br"
    )
        .forEach(
            br =>
                br.replaceWith(
                    "\n"
                )
        );


    clone.querySelectorAll(
        "p, div, li, pre, blockquote, h2, h3, h4"
    )
        .forEach(
            element => {

                element.insertAdjacentText(
                    "afterend",
                    "\n"
                );
            }
        );


    let text =
        clone.textContent || "";


    text =
        text
            .replace(
                /\u00a0/g,
                " "
            )
            .replace(
                /\r/g,
                ""
            )
            .replace(
                /[ \t]+\n/g,
                "\n"
            )
            .replace(
                /\n[ \t]+/g,
                "\n"
            )
            .replace(
                /\n{3,}/g,
                "\n\n"
            )
            .trim();


    return text;
}


function getProblemDescription() {

    /*
     * LeetCode currently renders the problem
     * description inside the question area.
     *
     * We try several selectors because
     * LeetCode's DOM changes between versions.
     */

    const selectors = [

        '[data-track-load="description_content"]',

        '[data-key="description-content"]',

        '[class*="description__"]',

        '[class*="question-content"]',

        '[class*="questionContent"]',

        '[class*="description-content"]',

        '[class*="descriptionContent"]'
    ];


    for (
        const selector
        of selectors
    ) {

        const elements =
            document.querySelectorAll(
                selector
            );


        for (
            const element
            of elements
        ) {

            const text =
                cleanProblemDescription(
                    element
                );


            if (
                text.length >= 100 &&
                text.length <= 30000
            ) {

                return text;
            }
        }
    }


    /*
     * ---------------------------------------
     * HEADING-BASED FALLBACK
     * ---------------------------------------
     */

    const headings =
        document.querySelectorAll(
            "h1, h2, h3, h4"
        );


    for (
        const heading
        of headings
    ) {

        const headingText =
            heading.textContent
                .trim()
                .toLowerCase();


        if (
            headingText.includes(
                "description"
            )
        ) {

            let current =
                heading.nextElementSibling;


            const collected = [];


            while (
                current
            ) {

                if (
                    /^H[1-4]$/.test(
                        current.tagName
                    )
                ) {

                    break;
                }


                const text =
                    cleanProblemDescription(
                        current
                    );


                if (text) {

                    collected.push(
                        text
                    );
                }


                current =
                    current.nextElementSibling;
            }


            const result =
                collected
                    .join("\n\n")
                    .trim();


            if (
                result.length >= 100
            ) {

                return result;
            }
        }
    }


    /*
     * ---------------------------------------
     * LARGE-CONTAINER FALLBACK
     * ---------------------------------------
     */

    const candidates =
        document.querySelectorAll(
            "div"
        );


    let best =
        "";


    for (
        const element
        of candidates
    ) {

        const text =
            cleanProblemDescription(
                element
            );


        if (
            text.length < 150 ||
            text.length > 30000
        ) {

            continue;
        }


        const lower =
            text.toLowerCase();


        const looksLikeProblem =
            lower.includes(
                "given"
            ) ||
            lower.includes(
                "return"
            ) ||
            lower.includes(
                "example"
            ) ||
            lower.includes(
                "constraints"
            );


        if (
            looksLikeProblem &&
            text.length > best.length
        ) {

            best =
                text;
        }
    }


    return best;
}


/* =========================================
   GET SUBMISSION
========================================= */

async function getSubmissionDetails(
    submissionId
) {

    const query = `
        query submissionDetails(
            $submissionId: Int!
        ) {
            submissionDetails(
                submissionId: $submissionId
            ) {
                runtime
                runtimeDisplay
                runtimePercentile

                memory
                memoryDisplay
                memoryPercentile

                code

                timestamp

                statusCode

                lang {
                    name
                    verboseName
                }

                question {
                    questionId
                    questionFrontendId
                    title
                    titleSlug
                    difficulty

                    topicTags {
                        name
                        slug
                    }
                }
            }
        }
    `;


    const data =
        await leetCodeGraphQL(
            query,

            {
                submissionId:
                    Number(
                        submissionId
                    )
            },

            "submissionDetails"
        );


    const submission =
        data?.submissionDetails;


    if (
        !submission
    ) {

        throw new Error(
            "LeetCode returned no submission details."
        );
    }


    return submission;
}


/* =========================================
   EXTRACT ACCEPTED SUBMISSION
========================================= */

async function extractAcceptedSubmission() {

    const problemSlug =
        getProblemSlug();


    if (
        !problemSlug
    ) {

        throw new Error(
            "Could not determine the LeetCode problem."
        );
    }


    const submissionId =
        getSubmissionIdFromUrl();


    if (
        !submissionId
    ) {

        throw new Error(
            "Please open the specific accepted submission page first."
        );
    }


    const submission =
        await getSubmissionDetails(
            submissionId
        );


    if (
        submission.statusCode !== 10 &&
        submission.statusCode !== "10"
    ) {

        throw new Error(
            `This submission is not accepted. Status code: ${submission.statusCode}`
        );
    }


    if (
        !submission.code
    ) {

        throw new Error(
            "LeetCode returned an empty submission."
        );
    }


    /*
     * Get the actual problem statement
     * from the currently rendered page.
     */

    let problemDescription =
        getProblemDescription();


    /*
     * LeetCode can render the description
     * slightly after the submission page loads.
     *
     * Give it a moment and retry.
     */

    if (
        !problemDescription
    ) {

        console.log(
            "PushHub: LeetCode problem description not found yet. Retrying..."
        );


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    800
                )
        );


        problemDescription =
            getProblemDescription();
    }


    console.log(
        "PushHub: LeetCode problem description length:",
        problemDescription.length
    );


    return {

        problemNumber:
            submission.question
                ?.questionFrontendId,

        problemTitle:
            submission.question
                ?.title ||
            "Unknown Problem",

        problemSlug:
            submission.question
                ?.titleSlug ||
            problemSlug,

        problemDescription:
            problemDescription,

        questionId:
            submission.question
                ?.questionId ||
            null,

        submissionId:
            submissionId,

        language:
            submission.lang
                ?.name ||
            "Unknown",

        statusCode:
            submission.statusCode,

        code:
            submission.code,

        runtime:
            submission.runtimeDisplay ||
            submission.runtime,

        runtimePercentile:
            submission.runtimePercentile,

        memory:
            submission.memoryDisplay ||
            submission.memory,

        memoryPercentile:
            submission.memoryPercentile,

        timestamp:
            submission.timestamp,

        difficulty:
            submission.question
                ?.difficulty ||
            null,

        topics:
            submission.question
                ?.topicTags ||
            [],

        platform:
            "leetcode"
    };
}


/* =========================================
   SEND TO BACKGROUND
========================================= */

async function syncSubmissionToGitHub(
    submission
) {

    const response =
        await chrome.runtime.sendMessage({

            type:
                "SYNC_LEETCODE_SUBMISSION",

            submission:
                submission
        });


    if (
        !response ||
        !response.success
    ) {

        throw new Error(
            response?.message ||
            "GitHub sync failed."
        );
    }


    return response;
}


/* =========================================
   BUTTON CLICK
========================================= */

async function handleSyncClick(
    button
) {

    try {

        button.disabled =
            true;


        button.textContent =
            "Fetching submission...";


        console.log(
            "PushHub: Sync button clicked."
        );


        /*
         * Get exact accepted submission
         * + problem statement.
         */

        const submission =
            await extractAcceptedSubmission();


        console.log(
            "PushHub: Submission extracted:",
            submission
        );


        button.textContent =
            "Syncing to GitHub...";


        const result =
            await syncSubmissionToGitHub(
                submission
            );


        console.log(
            "PushHub: GitHub sync successful:",
            result
        );


        button.textContent =
            "Synced to GitHub ✓";


        button.style.background =
            "#16a34a";


        button.disabled =
            true;


        setTimeout(
            () => {

                button.disabled =
                    false;

                button.textContent =
                    "Sync Again";

            },
            2500
        );


    } catch (error) {

        console.error(
            "PushHub: Sync failed:",
            error
        );


        button.disabled =
            false;


        button.textContent =
            "Sync Failed — Try Again";


        button.style.background =
            "#dc2626";


        setTimeout(
            () => {

                if (
                    !button.disabled
                ) {

                    button.textContent =
                        "Sync to GitHub";

                    button.style.background =
                        "#22c55e";
                }

            },
            3000
        );
    }
}


/* =========================================
   CREATE SYNC BUTTON
========================================= */

function createSyncButton(
    resultElement
) {

    if (
        document.getElementById(
            SYNC_BUTTON_ID
        )
    ) {

        return;
    }


    const button =
        document.createElement(
            "button"
        );


    button.id =
        SYNC_BUTTON_ID;


    button.type =
        "button";


    button.textContent =
        "Sync to GitHub";


    button.style.marginLeft =
        "10px";


    button.style.padding =
        "6px 12px";


    button.style.border =
        "none";


    button.style.borderRadius =
        "6px";


    button.style.background =
        "#22c55e";


    button.style.color =
        "#ffffff";


    button.style.fontSize =
        "13px";


    button.style.fontWeight =
        "600";


    button.style.cursor =
        "pointer";


    button.addEventListener(
        "mouseenter",
        () => {

            if (
                !button.disabled
            ) {

                button.style.background =
                    "#16a34a";
            }
        }
    );


    button.addEventListener(
        "mouseleave",
        () => {

            if (
                !button.disabled
            ) {

                button.style.background =
                    "#22c55e";
            }
        }
    );


    button.addEventListener(
        "click",
        () => {

            handleSyncClick(
                button
            );
        }
    );


    const parent =
        resultElement.parentElement;


    if (
        parent
    ) {

        parent.appendChild(
            button
        );
    }


    console.log(
        "PushHub: Sync button added."
    );
}


/* =========================================
   CHECK ACCEPTED
========================================= */

function checkSubmissionStatus() {

    const resultElement =
        document.querySelector(
            SUBMISSION_RESULT_SELECTOR
        );


    if (
        !resultElement
    ) {

        return;
    }


    const status =
        resultElement.textContent.trim();


    if (
        status === "Accepted"
    ) {

        createSyncButton(
            resultElement
        );
    }
}


/* =========================================
   INITIAL CHECK
========================================= */

checkSubmissionStatus();


/* =========================================
   DOM OBSERVER
========================================= */

const observer =
    new MutationObserver(
        () => {

            checkSubmissionStatus();

        }
    );


observer.observe(
    document.body,
    {
        childList:
            true,

        subtree:
            true
    }
);


console.log(
    "PushHub: LeetCode observer started."
);