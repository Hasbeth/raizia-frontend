import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolRunner } from "@/components/tools/ToolRunner";
import { TOOL_LIST, toolBySlug } from "@/lib/tools-config";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TOOL_LIST.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: toolBySlug(slug)?.name || "Herramienta" };
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = toolBySlug(slug);
  if (!tool) notFound();
  return (
    <div className="container-page pt-8 pb-8 md:pt-12">
      <ToolRunner key={tool.kind} kind={tool.kind} />
    </div>
  );
}
