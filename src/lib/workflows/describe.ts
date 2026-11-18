import type { WorkflowStep } from "./steps";

export function describeStep(step: WorkflowStep) {
  if (step.type === "input") {
    return step.fields.map((field) => {
      const bounds =
        field.type === "number" && (field.min !== undefined || field.max !== undefined)
          ? ` · ${field.min ?? "no minimum"} to ${field.max ?? "no maximum"}`
          : field.maxLength
            ? ` · up to ${field.maxLength} characters`
            : "";
      return `${field.label} (${field.key}) · ${field.type}${field.required ? " · required" : ""}${bounds}`;
    });
  }

  if (step.type === "calculate") {
    return [`${step.outputKey} = ${step.expression}`];
  }

  if (step.type === "transform") {
    if (step.operation === "template") return [`Fill the template: ${step.template ?? ""}`];
    if (step.operation === "number_list") {
      return [`Split ${step.sourceKey ?? "the text"} on commas or new lines and number each item.`];
    }
    if (step.operation === "round") {
      return [`Round ${step.sourceKey ?? "the number"} to ${step.decimals ?? 0} decimal places.`];
    }
    return [`${step.operation.replaceAll("_", " ")} ${step.sourceKey ?? ""}`.trim()];
  }

  return [
    `After a separate approval, save ${step.includeKeys.join(", ")} on Ripple under “${step.formTitle}”. Nothing is emailed.`,
  ];
}
