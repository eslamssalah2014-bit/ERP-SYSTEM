"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { CustomerStatementContent } from "../../statement/page";
import TableSkeleton from "@/components/ui/TableSkeleton";

function DynamicNestedStatementPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined;

  return <CustomerStatementContent paramId={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} columns={7} summaryCards={4} isAr={true} />}>
      <DynamicNestedStatementPage />
    </Suspense>
  );
}
