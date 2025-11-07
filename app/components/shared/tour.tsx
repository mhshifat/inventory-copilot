import { useCallback, useEffect, useState } from "react";
import { Card } from "../ui/card";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";

export interface TourStep {
    target: string; // CSS selector or data-tour-id
    title: string;
    description: string;
    position?: "top" | "bottom" | "left" | "right";
}

interface TourProps {
    steps: TourStep[];
    isOpen: boolean;
    onClose: () => void;
    onComplete?: () => void;
}

export default function Tour({ steps, isOpen, onClose, onComplete }: TourProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const [effectivePosition, setEffectivePosition] = useState<TourStep["position"]>("bottom");

    const updatePositions = useCallback(() => {
        const step = steps[currentStep];
        if (!step) return;

        const element = document.querySelector(step.target);
        if (!element) return;

        element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

        const rect = element.getBoundingClientRect();

        // Set highlight position relative to viewport
        setHighlightPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
        });

        // Calculate tooltip position with better viewport constraints
        const position = step.position || "bottom";
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipWidth = 384; // max-w-sm = 24rem = 384px
        const tooltipHeight = 250; // estimated tooltip height with padding
        const margin = 16;
        const gap = 12; // gap between element and tooltip

        let tooltipTop = 0;
        let tooltipLeft = 0;
        let finalPosition = position;

        // Calculate initial position
        switch (position) {
            case "top":
                tooltipTop = rect.top - tooltipHeight - gap;
                tooltipLeft = rect.left + rect.width / 2;
                if (tooltipTop < margin) {
                    finalPosition = "bottom";
                    tooltipTop = rect.bottom + gap;
                }
                break;
            case "bottom":
                tooltipTop = rect.bottom + gap;
                tooltipLeft = rect.left + rect.width / 2;
                if (tooltipTop + tooltipHeight > viewportHeight - margin) {
                    finalPosition = "top";
                    tooltipTop = rect.top - tooltipHeight - gap;
                }
                break;
            case "left":
                tooltipTop = rect.top + rect.height / 2;
                tooltipLeft = rect.left - gap;
                if (tooltipLeft < margin) {
                    finalPosition = "right";
                    tooltipLeft = rect.right + gap;
                }
                break;
            case "right":
                tooltipTop = rect.top + rect.height / 2;
                tooltipLeft = rect.right + gap;
                if (tooltipLeft + tooltipWidth > viewportWidth - margin) {
                    finalPosition = "left";
                    tooltipLeft = rect.left - tooltipWidth - gap;
                }
                break;
        }

        // Constrain to viewport based on final position
        if (finalPosition === "top" || finalPosition === "bottom") {
            // Tooltip is centered horizontally, so we need to account for the transform
            const minLeft = margin + tooltipWidth / 2;
            const maxLeft = viewportWidth - margin - tooltipWidth / 2;
            tooltipLeft = Math.max(minLeft, Math.min(maxLeft, tooltipLeft));
        } else {
            // Tooltip is centered vertically
            const minTop = margin + tooltipHeight / 2;
            const maxTop = viewportHeight - margin - tooltipHeight / 2;
            tooltipTop = Math.max(minTop, Math.min(maxTop, tooltipTop));
        }

        // Final safety clamp for all positions
        tooltipTop = Math.max(margin, Math.min(viewportHeight - tooltipHeight - margin, tooltipTop));

        setEffectivePosition(finalPosition);
        setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
    }, [currentStep, steps]);

    useEffect(() => {
        if (isOpen) {
            // Prevent all scrolling during tour
            const originalOverflow = document.body.style.overflow;
            const originalHtmlOverflow = document.documentElement.style.overflow;
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';

            // Small delay to ensure DOM is ready
            setTimeout(() => {
                updatePositions();
            }, 50);

            window.addEventListener("resize", updatePositions);

            return () => {
                // Restore scrolling when tour closes
                document.body.style.overflow = originalOverflow;
                document.documentElement.style.overflow = originalHtmlOverflow;
                window.removeEventListener("resize", updatePositions);
            };
        }
    }, [isOpen, updatePositions]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFinish = () => {
        setCurrentStep(0);
        onComplete?.();
        onClose();
    };

    if (!isOpen || !steps[currentStep]) return null;

    const step = steps[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === steps.length - 1;

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Dark overlay */}
            <div
                className="absolute inset-0 bg-black/60 pointer-events-auto animate-fade-in"
                onClick={onClose}
            />

            {/* Highlight spotlight */}
            <div
                className="absolute pointer-events-none transition-all duration-300 ease-out"
                style={{
                    top: `${highlightPosition.top - 4}px`,
                    left: `${highlightPosition.left - 4}px`,
                    width: `${highlightPosition.width + 8}px`,
                    height: `${highlightPosition.height + 8}px`,
                }}
            >
                <div className="w-full h-full rounded-lg ring-4 ring-primary/50 bg-background/5 shadow-2xl animate-pulse" />
            </div>

            {/* Tooltip */}
            <Card
                className={cn(
                    "absolute pointer-events-auto shadow-2xl border-2 border-primary/20 max-w-sm animate-scale-in",
                    effectivePosition === "top" && "-translate-x-1/2 -translate-y-full",
                    effectivePosition === "bottom" && "-translate-x-1/2",
                    effectivePosition === "left" && "-translate-x-full -translate-y-1/2",
                    effectivePosition === "right" && "-translate-y-1/2"
                )}
                style={{
                    top: `${tooltipPosition.top}px`,
                    left: `${tooltipPosition.left}px`,
                }}
            >
                <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Step {currentStep + 1} of {steps.length}
                                </span>
                            </div>
                            <h3 className="text-lg font-semibold! text-foreground">
                                {step.title}
                            </h3>
                        </div>
                        <Button
                            // @ts-ignore
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -mr-2 -mt-2"
                            onClick={onClose}
                        >
                            <XIcon className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                    </p>

                    {/* Progress indicator */}
                    <div className="flex gap-1">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "h-1 rounded-full transition-all duration-300",
                                    index === currentStep
                                        ? "bg-primary flex-1"
                                        : index < currentStep
                                            ? "bg-primary/50 w-8"
                                            : "bg-muted w-8"
                                )}
                            />
                        ))}
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                        <Button
                            // @ts-ignore
                            variant="outline"
                            size="sm"
                            onClick={handleBack}
                            disabled={isFirst}
                            className="gap-1"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                            Back
                        </Button>

                        <div className="flex gap-2">
                            {isLast ? (
                                <Button
                                    size="sm"
                                    onClick={handleFinish}
                                    className="gap-1"
                                >
                                    Finish Tour
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={handleNext}
                                    className="gap-1"
                                >
                                    Next
                                    <ChevronRightIcon className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Arrow indicator */}
                <div
                    className={cn(
                        "absolute w-4 h-4 bg-background border-2 border-primary/20 rotate-45",
                        effectivePosition === "top" && "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-t-0 border-l-0",
                        effectivePosition === "bottom" && "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-b-0 border-r-0",
                        effectivePosition === "left" && "right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-t-0 border-r-0",
                        effectivePosition === "right" && "left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-b-0 border-l-0"
                    )}
                />
            </Card>
        </div>
    );
}