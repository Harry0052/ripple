import Decimal from "decimal.js";

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

type Expr =
  | { kind: "num"; value: string }
  | { kind: "name"; value: string }
  | { kind: "neg"; expr: Expr }
  | { kind: "bin"; op: "+" | "-" | "*" | "/"; left: Expr; right: Expr };

class Parser {
  private index = 0;

  constructor(private readonly source: string) {}

  parse() {
    const expr = this.parseExpression();
    this.skip();
    if (this.index !== this.source.length) {
      throw new EngineError("The formula has characters Ripple will not evaluate.");
    }
    return expr;
  }

  private parseExpression(): Expr {
    let left = this.parseTerm();
    for (;;) {
      const op = this.peekOp();
      if (op !== "+" && op !== "-") return left;
      this.index += 1;
      left = { kind: "bin", op, left, right: this.parseTerm() };
    }
  }

  private parseTerm(): Expr {
    let left = this.parseFactor();
    for (;;) {
      const op = this.peekOp();
      if (op !== "*" && op !== "/") return left;
      this.index += 1;
      left = { kind: "bin", op, left, right: this.parseFactor() };
    }
  }

  private parseFactor(): Expr {
    this.skip();
    if (this.source[this.index] === "-") {
      this.index += 1;
      return { kind: "neg", expr: this.parseFactor() };
    }
    if (this.source[this.index] === "(") {
      this.index += 1;
      const expr = this.parseExpression();
      this.skip();
      if (this.source[this.index] !== ")") throw new EngineError("The formula is missing a closing parenthesis.");
      this.index += 1;
      return expr;
    }
    const number = this.read(/^(\d+(?:\.\d+)?)/);
    if (number) return { kind: "num", value: number };
    const name = this.read(/^([A-Za-z][A-Za-z0-9_]*)/);
    if (name) return { kind: "name", value: name };
    throw new EngineError("The formula uses a symbol Ripple will not evaluate.");
  }

  private peekOp() {
    this.skip();
    return this.source[this.index];
  }

  private read(pattern: RegExp) {
    const match = pattern.exec(this.source.slice(this.index));
    if (!match?.[1]) return null;
    this.index += match[1].length;
    return match[1];
  }

  private skip() {
    while (this.source[this.index] === " " || this.source[this.index] === "\t") this.index += 1;
  }
}

function evaluateNode(expr: Expr, scope: Record<string, string>): Decimal {
  if (expr.kind === "num") return new Decimal(expr.value);
  if (expr.kind === "name") {
    const raw = scope[expr.value];
    if (raw === undefined) throw new EngineError(`The formula needs ${expr.value}, which is not available.`);
    if (!/^-?\d+(?:\.\d+)?$/.test(raw)) {
      throw new EngineError(`${expr.value} is not a number the formula can use.`);
    }
    return new Decimal(raw);
  }
  if (expr.kind === "neg") return evaluateNode(expr.expr, scope).neg();
  const left = evaluateNode(expr.left, scope);
  const right = evaluateNode(expr.right, scope);
  if (expr.op === "+") return left.plus(right);
  if (expr.op === "-") return left.minus(right);
  if (expr.op === "*") return left.times(right);
  if (right.isZero()) throw new EngineError("Cannot divide by zero.");
  return left.div(right);
}

export function evaluateExpression(expression: string, scope: Record<string, string>) {
  if (expression.length === 0 || expression.length > 200) {
    throw new EngineError("The formula is empty or too long.");
  }
  const value = evaluateNode(new Parser(expression).parse(), scope);
  if (!value.isFinite()) throw new EngineError("The formula did not produce a finite number.");
  return value.toFixed();
}
