import { Check, Edit3, X } from "lucide-react";
import { type ReactNode } from "react";

import { m } from "@tsu-stack/i18n/messages";
import { Button } from "@tsu-stack/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@tsu-stack/ui/components/empty";
import { Spinner } from "@tsu-stack/ui/components/spinner";

type RecordListProps = {
  children: ReactNode;
  count: number;
  emptyDescription: string;
  emptyTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
};

type ListItemProps = {
  children: ReactNode;
  isEditing: boolean;
  meta: string;
  onCancel: () => void;
  onEdit?: () => void;
  renderEditForm?: () => ReactNode;
};

export function UpdateButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" size="sm" disabled={isPending}>
      {isPending ? (
        <Spinner data-icon aria-hidden="true" />
      ) : (
        <Check data-icon aria-hidden="true" />
      )}
      {m.school_setup_page__save_changes()}
    </Button>
  );
}

export function RecordList({
  children,
  count,
  emptyDescription,
  emptyTitle,
  icon: Icon,
  title
}: RecordListProps) {
  return (
    <section className="rounded-md border bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <h2 className="truncate text-sm font-medium">{title}</h2>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{count}</span>
      </div>
      {count > 0 ? (
        <ul className="divide-y">{children}</ul>
      ) : (
        <Empty className="border-0 p-8">
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}

export function ListItem({
  children,
  isEditing,
  meta,
  onCancel,
  onEdit,
  renderEditForm
}: ListItemProps) {
  if (isEditing && renderEditForm) {
    return (
      <li className="px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm font-medium">{children}</div>
          <Button
            aria-label={m.school_setup_page__cancel_edit()}
            onClick={onCancel}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        {renderEditForm()}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 text-sm font-medium">{children}</div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="text-xs text-muted-foreground">{meta}</div>
        {onEdit && (
          <Button
            aria-label={m.school_setup_page__edit()}
            onClick={onEdit}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Edit3 aria-hidden="true" />
          </Button>
        )}
      </div>
    </li>
  );
}
