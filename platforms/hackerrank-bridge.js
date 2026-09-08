(function () {

    if (window.__DSA_GRINDHUB_HR_BRIDGE__) {
        return;
    }

    window.__DSA_GRINDHUB_HR_BRIDGE__ = true;

    console.log(
        "PushHub: HackerRank bridge loaded."
    );


    const originalFetch =
        window.fetch.bind(window);

    const originalOpen =
        XMLHttpRequest.prototype.open;

    const originalSend =
        XMLHttpRequest.prototype.send;


    // ========================================
    // HELPERS
    // ========================================

    function isHackerRank(url) {

        return String(url || "")
            .includes("hackerrank.com");
    }


    function isSubmissionUrl(url) {

        const text =
            String(url || "");

        return (
            text.includes("/rest/contests/") &&
            text.includes("/challen")
        );
    }


    function getProblemSlug() {

        const match =
            window.location.pathname.match(
                /\/challenges\/([^/?#]+)/
            );

        return match
            ? match[1]
            : "";
    }


    function getProblemTitle() {

        const headings =
            document.querySelectorAll(
                "h1, h2"
            );


        for (
            const heading
            of headings
        ) {

            const text =
                heading.textContent.trim();


            if (
                text &&
                text.length > 3 &&
                !text
                    .toLowerCase()
                    .includes("hackerrank")
            ) {

                return text;
            }
        }


        const title =
            document.title
                .replace(
                    /\s*\|\s*HackerRank.*$/i,
                    ""
                )
                .trim();


        if (title) {
            return title;
        }


        const slug =
            getProblemSlug();


        if (slug) {

            return slug
                .replace(/-/g, " ")
                .replace(
                    /\b\w/g,
                    char =>
                        char.toUpperCase()
                );
        }


        return "HackerRank Problem";
    }


    // ========================================
    // TOPICS
    // ========================================

    function getTopics(data) {

        const topics = [];


        const trackName =
            data?.model?.track_name;


        if (trackName) {
            topics.push(trackName);
        }


        const breadcrumbTexts = [

            ...document.querySelectorAll(
                "nav a, nav span, " +
                "[class*='breadcrumb'] a, " +
                "[class*='breadcrumb'] span"
            )

        ]
            .map(
                element =>
                    element.textContent.trim()
            )
            .filter(
                text =>
                    text &&
                    text.length > 1 &&
                    text.length < 50
            );


        topics.push(
            ...breadcrumbTexts
        );


        return [
            ...new Set(topics)
        ].slice(
            0,
            10
        );
    }


    // ========================================
    // LANGUAGE
    // ========================================

    function normalizeLanguage(language) {

        const value =
            String(language || "")
                .toLowerCase()
                .trim();


        if (
            value.includes("python") ||
            value.includes("pypy")
        ) {
            return "Python";
        }


        if (
            value === "cpp" ||
            value.includes("c++")
        ) {
            return "C++";
        }


        if (
            value === "java"
        ) {
            return "Java";
        }


        if (
            value.includes("javascript") ||
            value === "js"
        ) {
            return "JavaScript";
        }


        if (
            value.includes("typescript") ||
            value === "ts"
        ) {
            return "TypeScript";
        }


        if (
            value.includes("golang") ||
            value === "go"
        ) {
            return "Go";
        }


        if (
            value.includes("rust")
        ) {
            return "Rust";
        }


        if (
            value === "c"
        ) {
            return "C";
        }


        return language || "Unknown";
    }


    // ========================================
    // PROBLEM DESCRIPTION
    // ========================================

    function cleanProblemDescription(
        element
    ) {

        if (!element) {
            return "";
        }


        const clone =
            element.cloneNode(true);


        /*
         * Remove UI elements.
         */

        clone.querySelectorAll(
            "script, style, button, input, " +
            "textarea, select, svg"
        )
            .forEach(
                element =>
                    element.remove()
            );


        /*
         * Preserve line breaks.
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
            "p, div, li, pre, blockquote, " +
            "h2, h3, h4"
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
         * HackerRank has changed its DOM
         * structure several times, so use
         * multiple possible selectors.
         */

        const selectors = [

            "[class*='challenge-body']",

            "[class*='challengeBody']",

            "[class*='problem-statement']",

            "[class*='problemStatement']",

            "[class*='challenge-description']",

            "[class*='challengeDescription']",

            "[class*='description']",

            "article"
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
         * ------------------------------------
         * HEADING FALLBACK
         * ------------------------------------
         */

        const headings =
            document.querySelectorAll(
                "h2, h3, h4"
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
                !(
                    headingText.includes(
                        "problem"
                    ) ||
                    headingText.includes(
                        "description"
                    ) ||
                    headingText.includes(
                        "task"
                    )
                )
            ) {

                continue;
            }


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
                result.length >= 100 &&
                result.length <= 30000
            ) {

                return result;
            }
        }


        /*
         * ------------------------------------
         * CONTENT-BASED FALLBACK
         * ------------------------------------
         */

        const candidates =
            document.querySelectorAll(
                "div"
            );


        let bestCandidate =
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
                lower.includes("input") ||
                lower.includes("output") ||
                lower.includes("constraints") ||
                lower.includes("given") ||
                lower.includes("return") ||
                lower.includes("sample input") ||
                lower.includes("sample output");


            if (
                looksLikeProblem &&
                text.length > bestCandidate.length
            ) {

                bestCandidate =
                    text;
            }
        }


        return bestCandidate;
    }


    // ========================================
    // BUILD SUBMISSION
    // ========================================

    function buildSubmission(data) {

        const model =
            data?.model || {};


        const submissionId =
            model.id;


        if (!submissionId) {

            console.warn(
                "PushHub: HackerRank submission has no ID."
            );

            return null;
        }


        const problemDescription =
            getProblemDescription();


        const submission = {

            problemNumber:
                String(
                    model.challenge_id ||
                    model.hackerrank_id ||
                    submissionId
                ),


            problemTitle:
                getProblemTitle(),


            problemSlug:
                getProblemSlug(),


            problemDescription:
                problemDescription,


            submissionId:
                String(
                    submissionId
                ),


            challengeId:
                String(
                    model.challenge_id || ""
                ),


            hackerRankId:
                String(
                    model.hackerrank_id || ""
                ),


            language:
                normalizeLanguage(
                    model.language
                ),


            code:
                model.code || "",


            status:
                model.status || "",


            score:
                model.score ?? null,


            topics:
                getTopics(data),


            platform:
                "hackerrank",


            url:
                window.location.href
        };


        console.log(
            "PushHub: HackerRank submission captured:",
            submission
        );


        console.log(
            "PushHub: HackerRank problem description length:",
            problemDescription.length
        );


        return submission;
    }


    // ========================================
    // ACCEPTED SUBMISSION HANDLER
    // ========================================

    function handleSubmissionResponse(
        url,
        data
    ) {

        const model =
            data?.model;


        if (!model) {
            return;
        }


        const status =
            String(
                model.status || ""
            )
                .toLowerCase();


        console.log(
            "PushHub: HackerRank submission status:",
            model.status
        );


        /*
         * Only accepted submissions.
         */

        if (
            status !== "accepted"
        ) {

            return;
        }


        let submission =
            buildSubmission(data);


        if (!submission) {
            return;
        }


        /*
         * Code may not be available
         * immediately.
         */

        if (
            !submission.code ||
            submission.code.trim().length < 5
        ) {

            console.warn(
                "PushHub: HackerRank accepted submission found, but code is empty."
            );


            setTimeout(
                () => {

                    const retry =
                        buildSubmission(data);


                    if (
                        retry &&
                        retry.code &&
                        retry.code.trim().length >= 5
                    ) {

                        window.postMessage(
                            {

                                type:
                                    "DSA_GRINDHUB_HACKERRANK_ACCEPTED",

                                submission:
                                    retry

                            },
                            "*"
                        );
                    }

                },
                1000
            );


            return;
        }


        /*
         * Problem description may render
         * slightly later than the submission.
         */

        if (
            !submission.problemDescription
        ) {

            console.log(
                "PushHub: HackerRank problem statement not found yet. Retrying..."
            );


            setTimeout(
                () => {

                    const retry =
                        buildSubmission(data);


                    if (
                        retry?.problemDescription
                    ) {

                        console.log(
                            "PushHub: HackerRank problem statement found on retry."
                        );
                    }


                    window.postMessage(
                        {

                            type:
                                "DSA_GRINDHUB_HACKERRANK_ACCEPTED",

                            submission:
                                retry || submission

                        },
                        "*"
                    );

                },
                1200
            );


            return;
        }


        console.log(
            "PushHub: HackerRank ACCEPTED submission captured:",
            submission
        );


        window.postMessage(
            {

                type:
                    "DSA_GRINDHUB_HACKERRANK_ACCEPTED",

                submission

            },
            "*"
        );
    }


    // ========================================
    // FETCH INTERCEPTOR
    // ========================================

    window.fetch =
        async function (...args) {

            const url =
                typeof args[0] === "string"
                    ? args[0]
                    : args[0]?.url || "";


            const response =
                await originalFetch(
                    ...args
                );


            if (
                isHackerRank(url) &&
                isSubmissionUrl(url)
            ) {

                try {

                    const clone =
                        response.clone();


                    clone
                        .json()
                        .then(
                            data => {

                                handleSubmissionResponse(
                                    url,
                                    data
                                );

                            }
                        )
                        .catch(
                            () => {}
                        );

                } catch (error) {

                    console.warn(
                        "PushHub: Could not inspect HackerRank response.",
                        error
                    );
                }
            }


            return response;
        };


    // ========================================
    // XHR INTERCEPTOR
    // ========================================

    XMLHttpRequest.prototype.open =
        function (
            method,
            url,
            ...rest
        ) {

            this.__dsaHrUrl =
                url;

            this.__dsaHrMethod =
                method;


            return originalOpen.call(
                this,
                method,
                url,
                ...rest
            );
        };


    XMLHttpRequest.prototype.send =
        function (...args) {

            this.addEventListener(
                "load",
                () => {

                    const url =
                        this.__dsaHrUrl;


                    if (
                        !isHackerRank(url) ||
                        !isSubmissionUrl(url)
                    ) {

                        return;
                    }


                    try {

                        const data =
                            JSON.parse(
                                this.responseText
                            );


                        handleSubmissionResponse(
                            url,
                            data
                        );

                    } catch (_) {

                        // Not JSON — ignore.
                    }
                }
            );


            return originalSend.apply(
                this,
                args
            );
        };

})();