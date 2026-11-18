import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-lime text-ink hover:bg-[#d7f78d]",
        secondary: "border border-ink/15 bg-card text-ink hover:border-ink",
        ghost: "bg-transparent text-ink hover:bg-ink/5",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}
