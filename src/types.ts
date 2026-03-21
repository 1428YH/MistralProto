export interface BRSpec {
    project_name: string;
    description: string;
    screens: Array<{
        id: string;
        title: string;
        purpose: string;
        components: Array<{
            type: string;
            label: string;
            fields?: string[];
            actions?: string[];
        }>;
        data_flow: string;
    }>;
    global: {
        theme: string;
        primary_color: string;
        font_style: string;
        responsive: boolean;
        animations: boolean;
    };
    constraints: string[];
}

export function isBRSpec(v: unknown): v is BRSpec {
    if (!v || typeof v !== "object") return false;
    const o = v as Record<string, unknown>;
    return (
        typeof o.project_name === "string" &&
        typeof o.description === "string" &&
        Array.isArray(o.screens) &&
        o.global !== null &&
        typeof o.global === "object" &&
        Array.isArray(o.constraints)
    );
}

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
    spec: BRSpec;
    userMessage?: string;
}

export interface UIGeneratorRetryContext {
    report: CodeReviewReport;
    changes?: Array<{ type: string; description: string }>;
    userContext?: string;
    currentHtml?: string;
}
