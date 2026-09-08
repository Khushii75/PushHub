(function () {

    if (window.__DSA_GRINDHUB_CODEFORCES_BRIDGE__) {
        return;
    }

    window.__DSA_GRINDHUB_CODEFORCES_BRIDGE__ = true;

    console.log(
        "PushHub: Codeforces bridge loaded."
    );


    let lastProcessedSubmissionId = null;

    let processingSubmission = false;


    // ==================================================
    // SUBMISSION FORM DETECTION
    // ==================================================

    function markSubmissionPending() {

        try {

            sessionStorage.setItem(
                "DSA_GRINDHUB_CF_PENDING",
                "true"
            );


            console.log(
                "PushHub: Codeforces submission marked as pending."
            );

        } catch (error) {

            console.warn(
                "PushHub: Could not store pending submission.",
                error
            );
        }
    }


    document.addEventListener(
        "submit",
        event => {

            const form =
                event.target;


            if (
                !(form instanceof HTMLFormElement)
            ) {
                return;
            }


            const action =
                form.getAttribute(
                    "action"
                ) || "";


            const isSubmitForm =
                action.includes(
                    "/submit"
                ) ||
                window.location.pathname.includes(
                    "/submit"
                );


            if (!isSubmitForm) {
                return;
            }


            console.log(
                "PushHub: Codeforces submit form detected."
            );


            markSubmissionPending();
        },
        true
    );


    // ==================================================
    // STATUS PAGE
    // ==================================================

    function isStatusPage() {

        const path =
            window.location.pathname;


        return (
            path.includes(
                "/problemset/status"
            ) ||
            (
                path.includes(
                    "/contest/"
                ) &&
                path.includes(
                    "/status"
                )
            )
        );
    }


    function isSubmissionPending() {

        try {

            return (
                sessionStorage.getItem(
                    "DSA_GRINDHUB_CF_PENDING"
                ) === "true"
            );

        } catch (_) {

            return false;
        }
    }


    function clearSubmissionPending() {

        try {

            sessionStorage.removeItem(
                "DSA_GRINDHUB_CF_PENDING"
            );

        } catch (_) {}
    }


    // ==================================================
    // SUBMISSION ID
    // ==================================================

    function extractSubmissionId(href) {

        const text =
            String(
                href || ""
            );


        /*
         * Supported formats:
         *
         * /contest/71/submission/389730544
         *
         * /problemset/submission/4/389732494
         */

        const match =
            text.match(
                /\/submission\/(?:\d+\/)?(\d+)(?:[/?#]|$)/i
            );


        if (match) {
            return match[1];
        }


        return null;
    }


    // ==================================================
    // EXTRACT SUBMISSION ROWS
    // ==================================================

    function extractSubmissionRows(
        documentObject
    ) {

        const rows = [
            ...documentObject.querySelectorAll(
                "tr"
            )
        ];


        return rows
            .map(
                row => {

                    const submissionLink =
                        row.querySelector(
                            'a[href*="/submission/"]'
                        );


                    if (!submissionLink) {
                        return null;
                    }


                    const href =
                        submissionLink.getAttribute(
                            "href"
                        ) || "";


                    const submissionId =
                        extractSubmissionId(
                            href
                        );


                    if (!submissionId) {
                        return null;
                    }


                    const cells = [
                        ...row.querySelectorAll(
                            "td"
                        )
                    ];


                    const problemLink =
                        row.querySelector(
                            'a[href*="/problem/"]'
                        );


                    const problemText =
                        problemLink
                            ?.textContent
                            ?.replace(
                                /\s+/g,
                                " "
                            )
                            ?.trim() || "";


                    const languageCell =
                        cells.find(
                            cell =>
                                /C\+\+|Python|Java|Kotlin|Rust|Go|JavaScript|TypeScript|C#/i
                                    .test(
                                        cell.textContent
                                    )
                        );


                    const language =
                        languageCell
                            ?.textContent
                            ?.replace(
                                /\s+/g,
                                " "
                            )
                            ?.trim() || "";


                    const verdictCell =
                        cells.find(
                            cell =>
                                /accepted|running|testing|processing|wrong answer|compilation error|runtime error|time limit|memory limit|skipped|hacked|failed/i
                                    .test(
                                        cell.textContent
                                    )
                        );


                    const verdict =
                        verdictCell
                            ?.textContent
                            ?.replace(
                                /\s+/g,
                                " "
                            )
                            ?.trim() || "";


                    return {

                        submissionId,

                        href,

                        verdict,

                        problemText,

                        problemHref:
                            problemLink?.getAttribute(
                                "href"
                            ) || "",

                        language,

                        rowText:
                            row.textContent
                                .replace(
                                    /\s+/g,
                                    " "
                                )
                                .trim()
                    };
                }
            )
            .filter(
                Boolean
            );
    }


    // ==================================================
    // FETCH FRESH STATUS PAGE
    // ==================================================

    async function fetchFreshStatusPage() {

        try {

            const response =
                await fetch(
                    window.location.href,
                    {
                        method: "GET",

                        credentials: "include",

                        cache: "no-store"
                    }
                );


            if (!response.ok) {

                console.warn(
                    "PushHub: Could not refresh Codeforces status. HTTP",
                    response.status
                );


                return [];
            }


            const html =
                await response.text();


            const parser =
                new DOMParser();


            const doc =
                parser.parseFromString(
                    html,
                    "text/html"
                );


            return extractSubmissionRows(
                doc
            );

        } catch (error) {

            console.warn(
                "PushHub: Fresh Codeforces status fetch failed.",
                error
            );


            return [];
        }
    }


    // ==================================================
    // PROBLEM INFORMATION
    // ==================================================

    function parseProblemInfo(
        problemHref,
        problemText
    ) {

        let contestId =
            null;


        let index =
            null;


        let match =
            String(
                problemHref || ""
            ).match(
                /\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/i
            );


        if (!match) {

            match =
                String(
                    problemHref || ""
                ).match(
                    /\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/i
                );
        }


        if (match) {

            contestId =
                match[1];


            index =
                match[2];
        }


        let title =
            String(
                problemText || ""
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();


        /*
         * Examples:
         *
         * 4A - Watermelon
         * 71A - Way Too Long Words
         * A - Team
         */

        title =
            title.replace(
                /^\s*[A-Z0-9]+\s*-\s*/i,
                ""
            );


        return {

            contestId,

            index,

            title
        };
    }


    // ==================================================
    // CLEAN PROBLEM DESCRIPTION
    // ==================================================

    function cleanProblemDescription(
        text
    ) {

        if (!text) {
            return "";
        }


        return String(
            text
        )
            .replace(
                /\r/g,
                ""
            )
            .replace(
                /[ \t]+/g,
                " "
            )
            .replace(
                /\n\s*\n\s*\n+/g,
                "\n\n"
            )
            .trim();
    }


    // ==================================================
    // FETCH PROBLEM DESCRIPTION
    // ==================================================

    async function fetchProblemDescription(
        problemHref
    ) {

        if (!problemHref) {

            console.warn(
                "PushHub: Codeforces problem URL missing."
            );


            return "";
        }


        try {

            /*
             * Make sure relative Codeforces URLs
             * become absolute URLs.
             */

            const absoluteUrl =
                new URL(
                    problemHref,
                    window.location.origin
                ).href;


            console.log(
                "PushHub: Fetching Codeforces problem statement:",
                absoluteUrl
            );


            const response =
                await fetch(
                    absoluteUrl,
                    {
                        method: "GET",

                        credentials: "include",

                        cache: "no-store"
                    }
                );


            if (!response.ok) {

                console.warn(
                    "PushHub: Codeforces problem page fetch failed. HTTP",
                    response.status
                );


                return "";
            }


            const html =
                await response.text();


            const parser =
                new DOMParser();


            const doc =
                parser.parseFromString(
                    html,
                    "text/html"
                );


            /*
             * ======================================
             * PRIMARY CODEFORCES SELECTOR
             * ======================================
             *
             * Classic Codeforces problem pages use:
             *
             * .problem-statement
             */

            const problemStatement =
                doc.querySelector(
                    ".problem-statement"
                );


            if (
                problemStatement
            ) {

                /*
                 * Remove the header because the
                 * problem title is already stored
                 * separately.
                 */

                const header =
                    problemStatement.querySelector(
                        ".header"
                    );


                if (header) {
                    header.remove();
                }


                const description =
                    cleanProblemDescription(
                        problemStatement.innerText ||
                        problemStatement.textContent ||
                        ""
                    );


                if (
                    description.length >= 50
                ) {

                    console.log(
                        "PushHub: Codeforces problem description captured:",
                        description.length,
                        "characters"
                    );


                    return description;
                }
            }


            /*
             * ======================================
             * FALLBACK SELECTORS
             * ======================================
             */

            const selectors = [

                "[class*='problem-statement']",

                "[class*='problemStatement']",

                "article",

                "main"
            ];


            for (
                const selector
                of selectors
            ) {

                const elements =
                    doc.querySelectorAll(
                        selector
                    );


                for (
                    const element
                    of elements
                ) {

                    const text =
                        cleanProblemDescription(
                            element.innerText ||
                            element.textContent ||
                            ""
                        );


                    if (
                        text.length >= 100 &&
                        text.length <= 30000
                    ) {

                        const lower =
                            text.toLowerCase();


                        /*
                         * Prefer content that actually
                         * looks like a competitive-programming
                         * problem statement.
                         */

                        const keywordScore =
                            [
                                "input",
                                "output",
                                "constraint",
                                "example",
                                "examples"
                            ]
                                .filter(
                                    keyword =>
                                        lower.includes(
                                            keyword
                                        )
                                )
                                .length;


                        if (
                            keywordScore >= 2
                        ) {

                            console.log(
                                "PushHub: Codeforces fallback description captured:",
                                text.length,
                                "characters"
                            );


                            return text;
                        }
                    }
                }
            }


            console.warn(
                "PushHub: Could not extract Codeforces problem description."
            );


            return "";

        } catch (error) {

            console.warn(
                "PushHub: Codeforces problem description fetch failed.",
                error
            );


            return "";
        }
    }


    // ==================================================
    // CSRF TOKEN
    // ==================================================

    function getCsrfToken() {

        const meta =
            document.querySelector(
                'meta[name="X-Csrf-Token"]'
            );


        return (
            meta?.getAttribute(
                "content"
            ) ||
            ""
        );
    }


    // ==================================================
    // FETCH EXACT SUBMITTED SOURCE
    // ==================================================

    async function fetchSubmissionSource(
        submissionId
    ) {

        console.log(
            "PushHub: Fetching Codeforces source for:",
            submissionId
        );


        const body =
            new URLSearchParams();


        body.set(
            "submissionId",
            String(
                submissionId
            )
        );


        const csrfToken =
            getCsrfToken();


        const headers = {

            "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8"
        };


        if (csrfToken) {

            headers[
                "X-Csrf-Token"
            ] =
                csrfToken;
        }


        const response =
            await fetch(
                "/data/submitSource",
                {
                    method: "POST",

                    credentials: "include",

                    headers,

                    body
                }
            );


        if (!response.ok) {

            throw new Error(
                "submitSource failed with HTTP " +
                response.status
            );
        }


        const data =
            await response.json();


        console.log(
            "PushHub: Codeforces source response:",
            data
        );


        if (!data.source) {

            throw new Error(
                "Codeforces returned no source code."
            );
        }


        return data;
    }


    // ==================================================
    // FETCH PROBLEM TAGS
    // ==================================================

    async function fetchProblemTags(
        problemHref
    ) {

        if (!problemHref) {
            return [];
        }


        try {

            const absoluteUrl =
                new URL(
                    problemHref,
                    window.location.origin
                ).href;


            const response =
                await fetch(
                    absoluteUrl,
                    {
                        credentials: "include",

                        cache: "no-store"
                    }
                );


            if (!response.ok) {
                return [];
            }


            const html =
                await response.text();


            const parser =
                new DOMParser();


            const doc =
                parser.parseFromString(
                    html,
                    "text/html"
                );


            const tags = [
                ...doc.querySelectorAll(
                    ".tag-box"
                )
            ]
                .map(
                    element =>
                        element.textContent
                            .trim()
                )
                .filter(
                    Boolean
                );


            return [
                ...new Set(
                    tags
                )
            ];

        } catch (error) {

            console.warn(
                "PushHub: Could not fetch Codeforces problem tags.",
                error
            );


            return [];
        }
    }


    // ==================================================
    // PROCESS ACCEPTED SUBMISSION
    // ==================================================

    async function processAcceptedSubmission(
        row
    ) {

        if (
            processingSubmission
        ) {
            return;
        }


        const submissionId =
            row.submissionId;


        if (!submissionId) {
            return;
        }


        if (
            String(
                submissionId
            ) ===
            String(
                lastProcessedSubmissionId
            )
        ) {

            return;
        }


        processingSubmission =
            true;


        lastProcessedSubmissionId =
            String(
                submissionId
            );


        console.log(
            "PushHub: Codeforces accepted submission detected:",
            submissionId
        );


        try {

            /*
             * --------------------------------------
             * Fetch submitted source
             * --------------------------------------
             */

            const sourceData =
                await fetchSubmissionSource(
                    submissionId
                );


            /*
             * --------------------------------------
             * Parse problem information
             * --------------------------------------
             */

            const problemInfo =
                parseProblemInfo(
                    row.problemHref,
                    row.problemText
                );


            /*
             * --------------------------------------
             * Fetch tags and statement
             * --------------------------------------
             */

            const tags =
                await fetchProblemTags(
                    row.problemHref
                );


            const problemDescription =
                await fetchProblemDescription(
                    row.problemHref
                );


            /*
             * --------------------------------------
             * Problem title
             * --------------------------------------
             */

            const problemTitle =
                (
                    sourceData.problemName ||
                    problemInfo.title ||
                    "Codeforces Problem"
                )
                    .replace(
                        /^\([A-Z0-9]+\)\s*/i,
                        ""
                    )
                    .trim();


            /*
             * --------------------------------------
             * Problem slug
             * --------------------------------------
             */

            const problemSlug =
                problemTitle
                    .replace(
                        /[^a-zA-Z0-9]+/g,
                        "-"
                    )
                    .replace(
                        /^-+|-+$/g,
                        "");


            /*
             * --------------------------------------
             * Codeforces identifier
             *
             * 4 + A   = 4A
             * 71 + A  = 71A
             * 231 + A = 231A
             * --------------------------------------
             */

            const problemNumber =
                problemInfo.contestId &&
                problemInfo.index

                    ? `${problemInfo.contestId}${problemInfo.index}`

                    : problemInfo.index;


            /*
             * --------------------------------------
             * Build final submission
             * --------------------------------------
             */

            const submission = {

                problemNumber,

                contestId:
                    problemInfo.contestId,

                problemTitle,

                problemSlug,

                submissionId:
                    String(
                        submissionId
                    ),

                language:
                    row.language ||
                    sourceData.prettifyClass ||
                    "Unknown",

                code:
                    sourceData.source,

                problemDescription:
                    problemDescription,

                topics:
                    tags,

                platform:
                    "codeforces",

                url:
                    window.location.origin +
                    (
                        sourceData.href ||
                        row.href
                    ),

                problemHref:
                    row.problemHref
            };


            console.log(
                "PushHub: Codeforces submission extracted:",
                submission
            );


            console.log(
                "PushHub: Codeforces problem description length:",
                problemDescription.length
            );


            /*
             * --------------------------------------
             * Send to content script
             * --------------------------------------
             */

            window.postMessage(
                {
                    type:
                        "DSA_GRINDHUB_CODEFORCES_ACCEPTED",

                    submission
                },
                "*"
            );


            console.log(
                "PushHub: Codeforces submission sent to extension."
            );


            clearSubmissionPending();

        } catch (error) {

            console.error(
                "PushHub: Codeforces extraction failed:",
                error
            );


            /*
             * Allow retry if extraction fails.
             */

            lastProcessedSubmissionId =
                null;

        } finally {

            processingSubmission =
                false;
        }
    }


    // ==================================================
    // CHECK FRESH SUBMISSION
    // ==================================================

    async function checkForAcceptedSubmission() {

        if (!isStatusPage()) {
            return;
        }


        if (!isSubmissionPending()) {
            return;
        }


        const rows =
            await fetchFreshStatusPage();


        if (!rows.length) {
            return;
        }


        const newest =
            rows[0];


        console.log(
            "PushHub: Fresh newest Codeforces submission:",
            newest
        );


        // ----------------------------------------------
        // ACCEPTED
        // ----------------------------------------------

        if (
            /accepted/i.test(
                newest.verdict
            )
        ) {

            await processAcceptedSubmission(
                newest
            );


            return;
        }


        // ----------------------------------------------
        // STILL RUNNING
        // ----------------------------------------------

        if (
            /running|testing|processing|queue/i.test(
                newest.verdict
            )
        ) {

            console.log(
                "PushHub: Codeforces submission is still being judged..."
            );


            return;
        }


        // ----------------------------------------------
        // FAILED
        // ----------------------------------------------

        if (
            /wrong answer|compilation error|runtime error|time limit|memory limit|skipped|hacked|failed/i.test(
                newest.verdict
            )
        ) {

            console.log(
                "PushHub: Codeforces submission finished without acceptance:",
                newest.verdict
            );


            clearSubmissionPending();
        }
    }


    // ==================================================
    // START WATCHING
    // ==================================================

    if (
        isStatusPage()
    ) {

        console.log(
            "PushHub: Watching Codeforces status page..."
        );


        setInterval(
            checkForAcceptedSubmission,
            2000
        );


        setTimeout(
            checkForAcceptedSubmission,
            500
        );
    }

})();