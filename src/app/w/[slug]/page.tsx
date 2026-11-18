import type { Metadata } from "next";
import { headers } from "next/headers";
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
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return <WorkflowDetail detail={detail} publicUrl={`${proto}://${host}/w/${detail.slug}`} />;
}
