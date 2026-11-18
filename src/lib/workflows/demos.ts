import type { WorkflowStep } from "./steps";

export const DEMO_PUBLISHED_AT = "2026-11-18T20:00:00.000Z";

export const DEMO_USER = {
  id: "usr_ripple_demo",
  handle: "ripple.demo",
  displayName: "Ripple Demo",
  kind: "demo" as const,
};

type DemoWorkflow = {
  id: string;
  versionId: string;
  slug: string;
  title: string;
  summary: string;
  category: "everyday-math" | "text-tools" | "demo-forms";
  estimatedMinutes: number;
  prerequisites: string;
  successCriteria: string;
  risks: string;
  permissions: string[];
  steps: WorkflowStep[];
};

export const DEMO_WORKFLOWS: DemoWorkflow[] = [
  {
    id: "wf_split_bill",
    versionId: "ver_split_bill_v1",
    slug: "split-a-bill",
    title: "Split a bill fairly",
    summary: "Type a total, a tip percent, and how many people. Ripple shows what each person pays.",
    category: "everyday-math",
    estimatedMinutes: 1,
    prerequisites: "You need the bill total, the tip percent, and a party size of at least 1.",
    successCriteria:
      "Each person pays (bill + bill × tip percent / 100) / people, rounded to cents.",
    risks: "Rounding can differ by one cent from some receipt apps. Ripple does not pay anyone.",
    permissions: [
      "Uses the numbers you type in this run",
      "Adds and multiplies them on Ripple's server",
      "Does not send them to another service",
    ],
    steps: [
      {
        type: "input",
        title: "Collect the bill",
        fields: [
          {
            key: "bill",
            label: "Bill total",
            type: "number",
            required: true,
            min: 0,
            max: 1000000,
            placeholder: "80",
          },
          {
            key: "tipPercent",
            label: "Tip percent",
            type: "number",
            required: true,
            min: 0,
            max: 100,
            placeholder: "20",
          },
          {
            key: "people",
            label: "People",
            type: "number",
            required: true,
            min: 1,
            max: 100,
            placeholder: "4",
          },
        ],
      },
      {
        type: "calculate",
        title: "Work out the tip",
        label: "Tip",
        expression: "bill * tipPercent / 100",
        outputKey: "tip",
      },
      {
        type: "calculate",
        title: "Add the tip to the bill",
        label: "Total",
        expression: "bill + tip",
        outputKey: "total",
      },
      {
        type: "calculate",
        title: "Divide by the party",
        label: "Each person",
        expression: "total / people",
        outputKey: "each",
      },
      {
        type: "transform",
        title: "Round to cents",
        label: "Each person, in cents",
        operation: "round",
        sourceKey: "each",
        outputKey: "eachRounded",
        decimals: 2,
      },
      {
        type: "transform",
        title: "Write the result",
        label: "Message",
        operation: "template",
        outputKey: "message",
        template: "Each person pays ${{eachRounded}}.",
      },
    ],
  },
  {
    id: "wf_pack_list",
    versionId: "ver_pack_list_v1",
    slug: "pack-a-list",
    title: "Pack a list",
    summary: "Turn a messy comma-separated list into a numbered checklist.",
    category: "text-tools",
    estimatedMinutes: 1,
    prerequisites: "A list of items separated by commas or new lines.",
    successCriteria: "Each non-empty item appears once, numbered from 1.",
    risks: "Ripple does not buy the items or check them against a store.",
    permissions: [
      "Reads the text you type",
      "Reformats it on Ripple's server",
      "Can save the checklist on Ripple after a separate approval",
      "Does not email anyone",
    ],
    steps: [
      {
        type: "input",
        title: "Collect the items",
        fields: [
          {
            key: "items",
            label: "Items",
            type: "text",
            required: true,
            maxLength: 2000,
            placeholder: "passport, charger, toothbrush",
            help: "Separate items with commas or new lines.",
          },
        ],
      },
      {
        type: "transform",
        title: "Number the items",
        label: "Checklist",
        operation: "number_list",
        sourceKey: "items",
        outputKey: "checklist",
      },
      {
        type: "demo_form",
        title: "Save on Ripple",
        label: "Saved checklist",
        formTitle: "Save this checklist on Ripple",
        includeKeys: ["checklist"],
        requiresApproval: true,
      },
    ],
  },
  {
    id: "wf_celsius",
    versionId: "ver_celsius_v1",
    slug: "celsius-to-fahrenheit",
    title: "Celsius to Fahrenheit",
    summary: "Convert a Celsius temperature with the standard formula.",
    category: "everyday-math",
    estimatedMinutes: 1,
    prerequisites: "A Celsius number. Absolute zero is the lower bound.",
    successCriteria: "Fahrenheit equals Celsius × 9 / 5 + 32.",
    risks: "This is not a medical or weather service.",
    permissions: [
      "Uses the number you type",
      "Calculates on Ripple's server",
      "Does not call a weather service",
    ],
    steps: [
      {
        type: "input",
        title: "Collect the temperature",
        fields: [
          {
            key: "celsius",
            label: "Celsius",
            type: "number",
            required: true,
            min: -273.15,
            max: 10000,
            placeholder: "20",
          },
        ],
      },
      {
        type: "calculate",
        title: "Convert",
        label: "Fahrenheit",
        expression: "celsius * 9 / 5 + 32",
        outputKey: "fahrenheit",
      },
      {
        type: "transform",
        title: "Round to one decimal",
        label: "Fahrenheit, rounded",
        operation: "round",
        sourceKey: "fahrenheit",
        outputKey: "fahrenheitRounded",
        decimals: 1,
      },
      {
        type: "transform",
        title: "Write the result",
        label: "Message",
        operation: "template",
        outputKey: "message",
        template: "{{celsius}}°C is {{fahrenheitRounded}}°F.",
      },
    ],
  },
];
