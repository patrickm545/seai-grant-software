declare module 'markdownlint-cli2/markdownlint/promise' {
  export type MarkdownlintError = {
    lineNumber: number;
    ruleNames: string[];
    ruleDescription: string;
    errorDetail: string | null;
    errorContext: string | null;
    errorRange: number[] | null;
  };

  export function lint(options: {
    files: string[];
    config?: Record<string, unknown>;
  }): Promise<Record<string, MarkdownlintError[]>>;
}
