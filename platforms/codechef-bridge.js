(function () {

    if (window.__DSA_GRINDHUB_CODECHEF_BRIDGE__) {
        return;
    }

    window.__DSA_GRINDHUB_CODECHEF_BRIDGE__ = true;

    console.log(
        "PushHub: CodeChef bridge loaded."
    );


    const originalFetch =
        window.fetch.bind(window);

    const originalOpen =
        XMLHttpRequest.prototype.open;

    const originalSend =
        XMLHttpRequest.prototype.send;


    let latestSourceCode = "";

    let latestProblemCode = "";

    let latestLanguageId = "";

    let currentSubmissionId = null;

    let acceptedDetected = false;

    let acceptedSubmissionSent = false;


    /* =========================================
       HELPERS
    ========================================= */

    function isCodeChef(url) {

        return String(url || "")
            .includes("codechef.com");
    }


    function getProblemCode() {

        const path =
            window.location.pathname;


        /*
         * Normal CodeChef problem URL
         */

        const directMatch =
            path.match(
                /\/problems\/([^/?#]+)/i
            );


        if (directMatch) {
            return directMatch[1];
        }


        /*
         * Course URL:
         *
         * /practice/course/strings/STRINGS/problems/DDMMORMMDD
         */

        const courseMatch =
            path.match(
                /\/problems\/([^/?#]+)$/i
            );


        if (courseMatch) {
            return courseMatch[1];
        }


        return "";
    }


    /* =========================================
       PROBLEM TITLE
    ========================================= */

    function getProblemTitle() {

        /*
         * CodeChef can place a generic
         * "Welcome to the CodeChef AI Tutor"
         * heading before the actual problem title.
         *
         * Therefore, we do NOT simply return the
         * first h1/h2 on the page.
         */


        const problemCode =
            String(
                latestProblemCode ||
                getProblemCode() ||
                ""
            )
                .trim()
                .toLowerCase();


        /*
         * -----------------------------------------
         * 1. EXPLICIT PROBLEM TITLE SELECTORS
         * -----------------------------------------
         */

        const explicitSelectors = [

            "[data-testid='problem-title']",

            "[data-testid='problem-name']",

            "[class*='problem-title']",

            "[class*='problemTitle']",

            "[class*='problem-name']",

            "[class*='problemName']"
        ];


        for (
            const selector
            of explicitSelectors
        ) {

            const elements =
                document.querySelectorAll(
                    selector
                );


            for (const element of elements) {

                const text =
                    (
                        element.innerText ||
                        element.textContent ||
                        ""
                    ).trim();


                if (
                    text &&
                    text.length > 2 &&
                    text.length < 200 &&
                    !/welcome to the codechef ai tutor/i.test(
                        text
                    )
                ) {

                    return text;
                }
            }
        }


        /*
         * -----------------------------------------
         * 2. INTELLIGENT HEADING SEARCH
         * -----------------------------------------
         *
         * Look through all headings instead of
         * blindly taking the first h1/h2.
         */

        const headings =
            document.querySelectorAll(
                "h1, h2, h3"
            );


        const candidates = [];


        for (const heading of headings) {

            const text =
                (
                    heading.innerText ||
                    heading.textContent ||
                    ""
                ).trim();


            if (
                !text ||
                text.length <= 2 ||
                text.length >= 200
            ) {
                continue;
            }


            /*
             * Ignore CodeChef promotional/UI headings.
             */

            if (
                /welcome to the codechef ai tutor/i
                    .test(text)
            ) {
                continue;
            }


            if (
                /ai tutor|codechef tutor|ask ai|chat with ai/i
                    .test(text)
            ) {
                continue;
            }


            /*
             * Ignore generic section headings.
             */

            if (
                /^(problem|solution|submissions|editorial|discuss|submit)$/i
                    .test(text)
            ) {
                continue;
            }


            let score = 0;

            const lower =
                text.toLowerCase();


            /*
             * VERY strong signal:
             *
             * FCTRL - Factorial
             *
             * contains FCTRL.
             */

            if (
                problemCode &&
                lower.includes(problemCode)
            ) {

                score += 100;
            }


            /*
             * Prefer headings inside problem-related
             * containers.
             */

            if (
                heading.closest(
                    "[data-testid*='problem']"
                )
            ) {

                score += 30;
            }


            if (
                heading.closest(
                    "article"
                )
            ) {

                score += 20;
            }


            /*
             * Short headings are generally more likely
             * to be actual problem titles.
             */

            if (
                text.length < 100
            ) {

                score += 10;
            }


            candidates.push({
                text,
                score
            });
        }


        candidates.sort(
            (a, b) =>
                b.score - a.score
        );


        if (
            candidates.length > 0
        ) {

            return candidates[0].text;
        }


        /*
         * -----------------------------------------
         * 3. DOCUMENT TITLE FALLBACK
         * -----------------------------------------
         *
         * CodeChef commonly exposes useful titles
         * through document.title.
         */

        let pageTitle =
            document.title
                .replace(
                    /\s*\|\s*CodeChef.*$/i,
                    ""
                )
                .trim();


        /*
         * Handle titles such as:
         *
         * FCTRL - Factorial
         * FCTRL: Factorial
         */

        if (
            problemCode &&
            pageTitle
        ) {

            const escapedCode =
                problemCode.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );


            pageTitle =
                pageTitle.replace(
                    new RegExp(
                        `^${escapedCode}\\s*[-:|]\\s*`,
                        "i"
                    ),
                    ""
                )
                .trim();
        }


        if (
            pageTitle &&
            pageTitle.length > 2 &&
            !/welcome to the codechef ai tutor/i
                .test(pageTitle)
        ) {

            return pageTitle;
        }


        /*
         * -----------------------------------------
         * 4. FINAL FALLBACK
         * -----------------------------------------
         */

        return (
            latestProblemCode ||
            getProblemCode() ||
            "CodeChef Problem"
        );
    }


    /* =========================================
       PROBLEM DESCRIPTION
    ========================================= */

    function cleanProblemDescription(text) {

        if (!text) {
            return "";
        }


        return String(text)
            .replace(/\r/g, "")
            .replace(/[ \t]+/g, " ")
            .replace(/\n\s*\n\s*\n+/g, "\n\n")
            .trim();
    }


    function getProblemDescription() {

        /*
         * CodeChef has changed its DOM structure
         * several times, so use multiple selectors.
         */

        const selectors = [

            /*
             * Common CodeChef problem statement
             * containers.
             */

            "[data-testid='problem-description']",

            "[data-testid='problem-statement']",

            "[class*='problem-description']",

            "[class*='problemDescription']",

            "[class*='problem-statement']",

            "[class*='problemStatement']",

            "[class*='ProblemDescription']",

            "[class*='ProblemStatement']",

            /*
             * Generic article/content containers.
             */

            "article",

            "main article"
        ];


        for (const selector of selectors) {

            const elements =
                document.querySelectorAll(
                    selector
                );


            for (const element of elements) {

                const text =
                    cleanProblemDescription(
                        element.innerText ||
                        element.textContent ||
                        ""
                    );


                /*
                 * Avoid grabbing the entire page.
                 *
                 * A useful problem statement should
                 * normally contain meaningful text.
                 */

                if (
                    text.length >= 100 &&
                    text.length <= 30000
                ) {

                    /*
                     * Reject obvious non-statement
                     * page containers.
                     */

                    const lower =
                        text.toLowerCase();


                    if (
                        lower.includes("submit") &&
                        lower.includes("codechef") &&
                        lower.length < 500
                    ) {

                        continue;
                    }


                    return text;
                }
            }
        }


        /*
         * =====================================
         * HEADING-BASED FALLBACK
         * =====================================
         *
         * Find headings such as:
         *
         * Problem
         * Problem Statement
         * Description
         *
         * and collect content below them.
         */

        const headings =
            document.querySelectorAll(
                "h1, h2, h3, h4, h5"
            );


        for (const heading of headings) {

            const headingText =
                cleanProblemDescription(
                    heading.innerText ||
                    heading.textContent ||
                    ""
                );


            if (
                !/problem|description|statement/i
                    .test(headingText)
            ) {
                continue;
            }


            let current =
                heading.nextElementSibling;

            let collected = [];


            let safety = 0;


            while (
                current &&
                safety < 30
            ) {

                const text =
                    cleanProblemDescription(
                        current.innerText ||
                        current.textContent ||
                        ""
                    );


                if (text) {
                    collected.push(text);
                }


                /*
                 * Stop at another major section.
                 */

                if (
                    current.matches(
                        "h1, h2"
                    )
                ) {
                    break;
                }


                current =
                    current.nextElementSibling;

                safety++;
            }


            const result =
                cleanProblemDescription(
                    collected.join("\n\n")
                );


            if (
                result.length >= 100 &&
                result.length <= 30000
            ) {

                return result;
            }
        }


        /*
         * =====================================
         * CONTENT FALLBACK
         * =====================================
         *
         * Last-resort search for a reasonably
         * sized content container.
         */

        const candidates =
            document.querySelectorAll(
                "div, section"
            );


        let bestCandidate =
            "";


        for (const element of candidates) {

            const text =
                cleanProblemDescription(
                    element.innerText ||
                    element.textContent ||
                    ""
                );


            if (
                text.length < 200 ||
                text.length > 30000
            ) {
                continue;
            }


            const lower =
                text.toLowerCase();


            /*
             * Problem statements commonly contain
             * these sections/keywords.
             */

            const score =
                [
                    "input",
                    "output",
                    "constraints",
                    "example",
                    "examples",
                    "sample",
                    "explanation"
                ]
                    .filter(
                        keyword =>
                            lower.includes(
                                keyword
                            )
                    )
                    .length;


            if (
                score >= 2 &&
                text.length >
                    bestCandidate.length
            ) {

                bestCandidate =
                    text;
            }
        }


        return bestCandidate;
    }


    /* =========================================
       TOPIC
    ========================================= */

    function getTopic() {

        const path =
            window.location.pathname;


        /*
         * Example:
         *
         * /practice/course/strings/STRINGS/problems/DDMMORMMDD
         */

        const courseMatch =
            path.match(
                /\/practice\/course\/([^/]+)\/([^/]+)\/problems\//i
            );


        if (courseMatch) {

            const topic =
                courseMatch[1]
                    .replace(
                        /[-_]+/g,
                        " "
                    )
                    .replace(
                        /\b\w/g,
                        character =>
                            character.toUpperCase()
                    );


            if (topic) {

                return topic;
            }
        }


        /*
         * Try breadcrumbs.
         */

        const breadcrumbSelectors = [
            "nav a",
            "nav span",
            "[aria-label='breadcrumb'] a",
            "[aria-label='breadcrumb'] span"
        ];


        for (
            const selector
            of breadcrumbSelectors
        ) {

            const elements =
                document.querySelectorAll(
                    selector
                );


            for (const element of elements) {

                const text =
                    element.textContent.trim();


                if (
                    text &&
                    text.length > 2 &&
                    text.length < 50 &&
                    !/home|codechef/i.test(
                        text
                    )
                ) {

                    return text;
                }
            }
        }


        return "CodeChef";
    }


    /* =========================================
       LANGUAGE
    ========================================= */

    function normalizeLanguage(
        languageId
    ) {

        const id =
            String(
                languageId || ""
            );


        const languageMap = {

            "42": {
                name: "C++",
                extension: "cpp"
            },

            "71": {
                name: "Python",
                extension: "py"
            },

            "70": {
                name: "Python",
                extension: "py"
            },

            "10": {
                name: "C",
                extension: "c"
            },

            "27": {
                name: "Java",
                extension: "java"
            },

            "17": {
                name: "Java",
                extension: "java"
            },

            "44": {
                name: "JavaScript",
                extension: "js"
            },

            "35": {
                name: "Go",
                extension: "go"
            },

            "48": {
                name: "Rust",
                extension: "rs"
            }
        };


        return (
            languageMap[id] || {
                name:
                    `CodeChef-${id || "Unknown"}`,

                extension:
                    "txt"
            }
        );
    }


    /* =========================================
       SOURCE REQUEST PARSER
    ========================================= */

    function captureSourceCode(
        body
    ) {

        if (!body) {
            return;
        }


        /*
         * -------------------------------------
         * String body
         * -------------------------------------
         */

        if (
            typeof body === "string"
        ) {

            /*
             * JSON
             */

            try {

                const data =
                    JSON.parse(body);


                processSourceObject(
                    data
                );

            } catch (_) {

                /*
                 * URL encoded body
                 */

                try {

                    const params =
                        new URLSearchParams(
                            body
                        );


                    const data = {

                        sourceCode:
                            params.get(
                                "sourceCode"
                            ) ||
                            params.get(
                                "source_code"
                            ) ||
                            "",

                        problemCode:
                            params.get(
                                "problemCode"
                            ) ||
                            params.get(
                                "problem_code"
                            ) ||
                            "",

                        languageId:
                            params.get(
                                "languageId"
                            ) ||
                            params.get(
                                "language_id"
                            ) ||
                            ""
                    };


                    processSourceObject(
                        data
                    );

                } catch (_) {}
            }


            return;
        }


        /*
         * -------------------------------------
         * URLSearchParams
         * -------------------------------------
         */

        if (
            body instanceof URLSearchParams
        ) {

            processSourceObject({

                sourceCode:
                    body.get(
                        "sourceCode"
                    ) ||
                    body.get(
                        "source_code"
                    ) ||
                    "",

                problemCode:
                    body.get(
                        "problemCode"
                    ) ||
                    body.get(
                        "problem_code"
                    ) ||
                    "",

                languageId:
                    body.get(
                        "languageId"
                    ) ||
                    body.get(
                        "language_id"
                    ) ||
                    ""
            });


            return;
        }


        /*
         * -------------------------------------
         * FormData
         * -------------------------------------
         */

        if (
            typeof FormData !==
                "undefined" &&
            body instanceof FormData
        ) {

            processSourceObject({

                sourceCode:
                    body.get(
                        "sourceCode"
                    ) ||
                    body.get(
                        "source_code"
                    ) ||
                    "",

                problemCode:
                    body.get(
                        "problemCode"
                    ) ||
                    body.get(
                        "problem_code"
                    ) ||
                    "",

                languageId:
                    body.get(
                        "languageId"
                    ) ||
                    body.get(
                        "language_id"
                    ) ||
                    ""
            });


            return;
        }


        /*
         * -------------------------------------
         * Plain object
         * -------------------------------------
         */

        if (
            typeof body === "object"
        ) {

            processSourceObject(
                body
            );
        }
    }


    function processSourceObject(
        data
    ) {

        if (
            !data ||
            typeof data !== "object"
        ) {
            return;
        }


        let source =
            data.sourceCode ||
            data.source_code ||
            data.code ||
            "";


        if (
            typeof source === "string" &&
            source.trim().length >= 5
        ) {

            latestSourceCode =
                source;


            console.log(
                "PushHub: CodeChef source code captured."
            );
        }


        const problemCode =
            data.problemCode ||
            data.problem_code ||
            data.problem ||
            "";


        if (
            problemCode
        ) {

            latestProblemCode =
                String(
                    problemCode
                );


            console.log(
                "PushHub: CodeChef problem code captured:",
                latestProblemCode
            );
        }


        const languageId =
            data.languageId ??
            data.language_id ??
            "";


        if (
            languageId !== ""
        ) {

            latestLanguageId =
                String(
                    languageId
                );


            console.log(
                "PushHub: CodeChef language ID captured:",
                latestLanguageId
            );
        }


        /*
         * If the verdict arrived before
         * source code, try again now.
         */

        trySendAcceptedSubmission();
    }


    /* =========================================
       BUILD SUBMISSION
    ========================================= */

    function buildSubmission() {

        const problemCode =
            latestProblemCode ||
            getProblemCode();


        const language =
            normalizeLanguage(
                latestLanguageId
            );


        const problemDescription =
            getProblemDescription();


        console.log(
            "PushHub: CodeChef problem description length:",
            problemDescription.length
        );


        return {

            problemNumber:
                problemCode,

            problemTitle:
                getProblemTitle(),

            problemSlug:
                problemCode,

            submissionId:
                String(
                    currentSubmissionId ||
                    ""
                ),

            language:
                language.name,

            languageExtension:
                language.extension,

            code:
                latestSourceCode,

            problemDescription:
                problemDescription,

            topics: [
                getTopic()
            ],

            platform:
                "codechef",

            url:
                window.location.href
        };
    }


    /* =========================================
       SEND ACCEPTED SUBMISSION
    ========================================= */

    function trySendAcceptedSubmission() {

        if (
            !acceptedDetected
        ) {
            return;
        }


        if (
            acceptedSubmissionSent
        ) {
            return;
        }


        if (
            !latestSourceCode ||
            latestSourceCode.trim().length < 5
        ) {

            console.log(
                "PushHub: CodeChef accepted detected, waiting for source code..."
            );

            return;
        }


        const submission =
            buildSubmission();


        if (
            !submission.problemNumber
        ) {

            console.warn(
                "PushHub: CodeChef problem code is missing."
            );

            return;
        }


        if (
            !submission.language ||
            submission.language ===
                "CodeChef-Unknown"
        ) {

            console.warn(
                "PushHub: CodeChef language is missing."
            );

            return;
        }


        acceptedSubmissionSent =
            true;


        console.log(
            "========================================"
        );

        console.log(
            "PushHub: CODECHEF ACCEPTED"
        );

        console.log(
            "Problem:",
            submission.problemNumber,
            submission.problemTitle
        );

        console.log(
            "Language:",
            submission.language
        );

        console.log(
            "Code length:",
            submission.code.length
        );

        console.log(
            "Problem description length:",
            submission.problemDescription.length
        );

        console.log(
            "========================================"
        );


        window.postMessage(
            {
                type:
                    "DSA_GRINDHUB_CODECHEF_ACCEPTED",

                submission:
                    submission
            },
            "*"
        );


        console.log(
            "PushHub: CodeChef accepted submission sent to content script."
        );
    }


    /* =========================================
       ACCEPTED RESULT DETECTION
    ========================================= */

    function handleErrorStatus(
        url,
        responseText
    ) {

        const match =
            String(url || "").match(
                /\/error_status_table\/(\d+)/i
            );


        if (!match) {
            return;
        }


        const submissionId =
            match[1];


        /*
         * New submission.
         */

        if (
            currentSubmissionId !==
            submissionId
        ) {

            currentSubmissionId =
                submissionId;

            acceptedDetected =
                false;

            acceptedSubmissionSent =
                false;

            /*
             * Do not erase source/problem
             * immediately because CodeChef can
             * send source and verdict requests
             * in either order.
             */
        }


        const html =
            String(
                responseText || ""
            );


        const text =
            html
                .replace(
                    /<[^>]*>/g,
                    " "
                )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim()
                .toLowerCase();


        const hasCorrect =
            /\bcorrect\b/.test(
                text
            );


        const hasFullScore =
            text.includes(
                "total score = 100%"
            ) ||
            text.includes(
                "total score=100%"
            ) ||
            text.includes(
                "100%"
            );


        console.log(
            "PushHub: CodeChef verdict checked:",
            {
                submissionId,
                hasCorrect,
                hasFullScore
            }
        );


        if (
            !hasCorrect ||
            !hasFullScore
        ) {

            return;
        }


        acceptedDetected =
            true;


        console.log(
            "PushHub: CodeChef ACCEPTED verdict detected."
        );


        trySendAcceptedSubmission();
    }


    /* =========================================
       FETCH INTERCEPTOR
    ========================================= */

    window.fetch =
        async function (...args) {

            const url =
                typeof args[0] ===
                    "string"

                    ? args[0]

                    : args[0]?.url ||
                        "";


            /*
             * Capture ANY CodeChef request
             * containing sourceCode/problemCode.
             */

            if (
                isCodeChef(url)
            ) {

                const body =
                    args[1]?.body ||
                    (
                        typeof args[0] ===
                            "object"

                            ? args[0]?.body

                            : null
                    );


                captureSourceCode(
                    body
                );
            }


            const response =
                await originalFetch(
                    ...args
                );


            /*
             * Verdict response.
             */

            if (
                isCodeChef(url) &&
                String(url).includes(
                    "/error_status_table/"
                )
            ) {

                try {

                    const clone =
                        response.clone();


                    clone
                        .text()
                        .then(
                            text => {

                                handleErrorStatus(
                                    url,
                                    text
                                );
                            }
                        );

                } catch (_) {}
            }


            return response;
        };


    /* =========================================
       XHR OPEN
    ========================================= */

    XMLHttpRequest.prototype.open =
        function (
            method,
            url,
            ...rest
        ) {

            this.__dsaCodeChefUrl =
                url;

            this.__dsaCodeChefMethod =
                method;


            return originalOpen.call(
                this,
                method,
                url,
                ...rest
            );
        };


    /* =========================================
       XHR SEND
    ========================================= */

    XMLHttpRequest.prototype.send =
        function (...args) {

            const url =
                this.__dsaCodeChefUrl;


            /*
             * Capture source/problem/language
             * from ANY CodeChef request.
             */

            if (
                isCodeChef(url)
            ) {

                const body =
                    args[0];


                captureSourceCode(
                    body
                );
            }


            this.addEventListener(
                "load",
                () => {

                    if (
                        !isCodeChef(url)
                    ) {

                        return;
                    }


                    /*
                     * --------------------------------
                     * Submission ID
                     * --------------------------------
                     */

                    const solutionMatch =
                        String(url).match(
                            /submit\?solution_id=(\d+)/i
                        );


                    if (
                        solutionMatch
                    ) {

                        const newSubmissionId =
                            solutionMatch[1];


                        if (
                            currentSubmissionId !==
                            newSubmissionId
                        ) {

                            currentSubmissionId =
                                newSubmissionId;

                            acceptedDetected =
                                false;

                            acceptedSubmissionSent =
                                false;
                        }


                        console.log(
                            "PushHub: CodeChef submission ID:",
                            currentSubmissionId
                        );


                        /*
                         * Sometimes the response itself
                         * contains source/problem/language.
                         */

                        captureSourceCode(
                            this.responseText
                        );
                    }


                    /*
                     * --------------------------------
                     * Verdict
                     * --------------------------------
                     */

                    if (
                        String(url).includes(
                            "/error_status_table/"
                        )
                    ) {

                        handleErrorStatus(
                            url,
                            this.responseText
                        );
                    }
                }
            );


            return originalSend.apply(
                this,
                args
            );
        };

})();