import * as React from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { useIsMobile } from '@/hooks/use-mobile';
import type { DateRange, DayPickerProps } from 'react-day-picker';

interface MobileDatePickerProps {
    trigger: React.ReactNode;
    mode: 'single';
    selected?: Date;
    onSelect: (date: Date | undefined) => void;
    className?: string;
    align?: 'start' | 'center' | 'end';
}

interface MobileDateRangePickerProps {
    trigger: React.ReactNode;
    mode: 'range';
    selected?: DateRange;
    onSelect: (range: DateRange | undefined) => void;
    numberOfMonths?: number;
    className?: string;
    align?: 'start' | 'center' | 'end';
}

type Props = MobileDatePickerProps | MobileDateRangePickerProps;

export function MobileDatePicker(props: Props) {
    const isMobile = useIsMobile();
    const [open, setOpen] = React.useState(false);

    const handleSingleSelect = (date: Date | undefined) => {
        (props as MobileDatePickerProps).onSelect(date);
        if (date) setOpen(false);
    };

    const handleRangeSelect = (range: DateRange | undefined) => {
        (props as MobileDateRangePickerProps).onSelect(range);
        if (range?.from && range?.to) setOpen(false);
    };

    const calendarProps =
        props.mode === 'range'
            ? {
                  mode: 'range' as const,
                  selected: props.selected,
                  onSelect: handleRangeSelect,
                  numberOfMonths: props.numberOfMonths || 2,
              }
            : {
                  mode: 'single' as const,
                  selected: props.selected,
                  onSelect: handleSingleSelect,
                  numberOfMonths: 1,
              };

    // Desktop: use Popover
    if (!isMobile) {
        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>{props.trigger}</PopoverTrigger>
                <PopoverContent
                    className="w-auto p-0 max-sm:max-w-[calc(100vw-2rem)]"
                    align={props.align || 'start'}
                >
                    <Calendar
                        {...(calendarProps as DayPickerProps)}
                        captionLayout="dropdown"
                        initialFocus
                        className={props.className}
                    />
                </PopoverContent>
            </Popover>
        );
    }

    // Mobile: use Bottom Sheet
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{props.trigger}</SheetTrigger>
            <SheetContent side="bottom" className="p-0 rounded-t-2xl h-auto max-h-[85vh]">
                <div className="pt-2 pb-1 flex justify-center">
                    <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>
                <div className="px-2 pb-6 overflow-y-auto">
                    <Calendar
                        {...(calendarProps as DayPickerProps)}
                        captionLayout="dropdown"
                        initialFocus
                        className={cn('w-full max-w-full', props.className)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
