"use client";

import { CaseForm, type Member } from "../case-form";

export function NewCaseForm({
  members,
  currentUserId,
  isOwner,
}: {
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
}) {
  return (
    <CaseForm
      mode="create"
      members={members}
      currentUserId={currentUserId}
      isOwner={isOwner}
    />
  );
}
