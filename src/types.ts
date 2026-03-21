export interface CodeReviewReport {
    critical: string[];
    warnings: string[];
    info: string[];
}

export interface CodeReviewResult {
    status?: "pass" | "fail";
    launch_server?: boolean;
    file?: string;
    changes?: Array<{ type: "fix" | "improvement" | "none"; description: string }>;
    report?: CodeReviewReport;
}

export interface CodeReviewContext {
    spec: unknown;
    userMessage?: string;
}

export interface UIGeneratorRetryContext {
    report: CodeReviewReport;
    changes?: Array<{ type: string; description: string }>;
    userContext?: string;
}
