import { promises as fs } from 'fs';
import * as path from 'path';

const TASK_PROMPT_TEMPLATE = `
You are an expert at writing validation rules for a tool called **Code Guardian**. Your task is to create a set of temporary validation rules that will act as "guardrails" to ensure the implementation of a given programming task is on the right track.

These rules are **not** meant to be strict unit or integration tests. Instead, they should capture the high-level intent of the task, verifying that the implementation is heading in the right direction by checking for key indicators in the modified code.

**Your Goal:** Generate the content for a single YAML file named \`task-validation-rule.cg.yaml\`.

---

### **Inputs**

**1. Task Description:** This is the description of the feature or fix to be implemented.

{{task_description}}

**2. Rule Writing Cheat Sheet:** This is your **only** reference for the available rule syntax and structure. Adhere to it strictly.

{{cheat_sheet}}

---

### **Instructions**

1.  **Analyze the Task:** Carefully read the **Task Description** to understand the core requirements. Identify which files are likely to be changed, what new code or logic fragments should appear, and what old logic might be removed.

2.  **Draft the Rules:** Using the **Cheat Sheet**, write a set of rules that validate the key indicators you identified.
    *   Focus on verifying the *approach*, not the perfect implementation.
    *   Use \`select_files\` with \`path_pattern\` and \`status: ['modified']\` to target the expected files.
    *   Use \`assert_match\` to look for the presence (or absence) of key imports, function calls, keywords, or configuration strings.
    *   Use combinators like \`all_of\` to ensure multiple conditions are met within a file, or \`any_of\` if there are several acceptable ways to implement a feature.
    *   Keep the patterns in \`assert_match\` specific enough to be useful but general enough to avoid being brittle. For example, check for \`from 'child_process'\` instead of the exact line \`import { exec } from 'child_process';\`.

3.  **Add Explanations:** For each rule or logical group of rules, add a YAML comment (\`#\') to explain its purpose and how it relates back to the task description. This is crucial for understanding the intent of the validation.

4.  **Format the Output:** Present the final output as the complete content for the \`task-validation-rule.cg.yaml\` file, wrapped in a single markdown YAML code block. Do not include any other text or explanation outside the code block.
`;

const RULE_PROMPT_TEMPLATE = `
You are an expert at writing validation rules for a tool called **Code Guardian**. Your task is to create a validation rule based on a given description.

**Your Goal:** Generate the content for a YAML file that implements the requested validation rule.

---

### **Inputs**

**1. Rule Description:** This describes what the rule should validate.

{{rule_description}}

**2. Rule Writing Cheat Sheet:** This is your **only** reference for the available rule syntax and structure. Adhere to it strictly.

{{cheat_sheet}}

---

### **Instructions**

1.  **Analyze the Description:** Understand what needs to be validated. Identify:
    *   What files or code patterns to target
    *   What conditions should be checked
    *   Whether the rule should ensure something exists or doesn't exist

2.  **Design the Rule:** Using the **Cheat Sheet**, create a rule that:
    *   Uses appropriate selectors (file patterns, line patterns, or AST queries)
    *   Applies the right assertions (pattern matching, counting, or property checks)
    *   Combines rules logically if multiple conditions need to be checked

3.  **Add Metadata:** Include:
    *   A descriptive \`id\` for the rule
    *   A clear \`description\` explaining what the rule validates
    *   YAML comments explaining complex patterns or logic

4.  **Format the Output:** Present the final output as a complete, valid YAML file content. Do not include markdown code blocks or any other formatting - just the raw YAML content.

### **Examples to guide you:**

- If the description asks to prevent console.log: use file selector with assert_match to find console.log patterns
- If the description mentions architecture rules: use path patterns to enforce directory structure constraints  
- If the description requires multiple conditions: use combinators like all_of or any_of
- If the description mentions specific file types: use appropriate path_pattern globs
`;

export class PromptGenerator {
    private async getCheatSheetContent(): Promise<string> {
        // Use a path relative to the built file in the dist/ folder
        const cheatSheetPath = path.join(__dirname, '../../Cheat_Sheet.md');
        return fs.readFile(cheatSheetPath, 'utf-8');
    }

    public async generateTaskPrompt(taskDescription: string): Promise<string> {
        const cheatSheetContent = await this.getCheatSheetContent();

        let prompt = TASK_PROMPT_TEMPLATE.replace('{{task_description}}', taskDescription);
        prompt = prompt.replace('{{cheat_sheet}}', cheatSheetContent);

        return prompt;
    }

    public async generateRule(ruleDescription: string): Promise<string> {
        const cheatSheetContent = await this.getCheatSheetContent();

        let prompt = RULE_PROMPT_TEMPLATE.replace('{{rule_description}}', ruleDescription);
        prompt = prompt.replace('{{cheat_sheet}}', cheatSheetContent);

        return prompt;
    }

    // Backward compatibility
    public async generate(taskDescription: string): Promise<string> {
        return this.generateTaskPrompt(taskDescription);
    }
}
