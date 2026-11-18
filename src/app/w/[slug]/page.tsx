import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkflowDetail } from "@/components/product/workflow-detail";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getPublicWorkflow } from "@/lib/workflows/detail";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const db = getDb();
  const user = await readSessionUser(db);
  const detail = getPublicWorkflow(db, slug, user?.id ?? null);
  if (detail.status !== "ok") return { title: "Recipe" };
  return { title: detail.title, description: detail.summary };
}

export default async function WorkflowPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const db = getDb();
  const user = await readSessionUser(db);
  const detail = getPublicWorkflow(db, slug, user?.id ?? null);
  if (detail.status === "not-found") notFound();
  return <WorkflowDetail detail={detail} />;
}
