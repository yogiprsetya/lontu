"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { SelectContent } from "@/components/ui/select";
import { createSelectOpenChangeHandler } from "@/components/layout/responsive-select-state";
import { cn } from "cn";

type ResponsiveSelectProps<
  Value,
  Multiple extends boolean | undefined = false,
> = SelectPrimitive.Root.Props<Value, Multiple> & {
  trigger: React.ReactNode;
  children: React.ReactNode;
  popupClassName?: string;
};

type SelectPresentationProps = {
  open: boolean;
  children: React.ReactNode;
  popupClassName?: string;
  actionsRef: React.RefObject<SelectPrimitive.Root.Actions | null>;
};

const desktopPresentation = {
  modal: true,
  Content: DesktopSelectContent,
};

const mobilePresentation = {
  modal: false,
  Content: MobileSelectContent,
};

/** Uses an anchored Select popup on desktop and a Drawer on smaller screens. */
export function ResponsiveSelect<Value, Multiple extends boolean | undefined = false>({
  trigger,
  children,
  popupClassName,
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  ...props
}: ResponsiveSelectProps<Value, Multiple>) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const presentation = isDesktop ? desktopPresentation : mobilePresentation;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const open = controlledOpen ?? uncontrolledOpen;
  const selectActionsRef = React.useRef<SelectPrimitive.Root.Actions>(null);

  const handleOpenChange = createSelectOpenChangeHandler<Value, Multiple>(
    controlledOpen !== undefined,
    setUncontrolledOpen,
    onOpenChange,
  );

  return (
    <SelectPrimitive.Root
      {...props}
      open={open}
      onOpenChange={handleOpenChange}
      actionsRef={selectActionsRef}
      modal={presentation.modal}
    >
      {trigger}
      <presentation.Content
        open={open}
        actionsRef={selectActionsRef}
        popupClassName={popupClassName}
      >
        {children}
      </presentation.Content>
    </SelectPrimitive.Root>
  );
}

function DesktopSelectContent({ children, popupClassName }: SelectPresentationProps) {
  return (
    <SelectContent alignOffset={12} sideOffset={4} className={popupClassName}>
      {children}
    </SelectContent>
  );
}

function MobileSelectContent({
  open,
  children,
  popupClassName,
  actionsRef,
}: SelectPresentationProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => !next && actionsRef.current?.close()}
      showSwipeHandle
    >
      <DrawerContent variant="select">
        <SelectPrimitive.Positioner
          positionMethod="fixed"
          className="static! h-auto! w-full! transform-none! pt-4"
        >
          <SelectPrimitive.List
            className={cn("max-h-[calc(100dvh-16rem)] overflow-y-auto p-2", popupClassName)}
          >
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Positioner>
      </DrawerContent>
    </Drawer>
  );
}
