import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkflowDetail } from "@/components/product/workflow-detail";
import { getDb } from "@/lib/db/client";
import { getPublicWorkflow } from "@/lib/workflows/detail";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const detail = getPublicWorkflow(getDb(), slug);
  if (detail.status !== "ok") return { title: "Recipe" };
  return { title: detail.title, description: detail.summary };
}

export default async function WorkflowPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const detail = getPublicWorkflow(getDb(), slug);
  if (detail.status === "not-found") notFound();
  return <WorkflowDetail detail={detail} />;
}
