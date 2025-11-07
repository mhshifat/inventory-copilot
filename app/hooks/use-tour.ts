import { useState, useEffect } from "react";

const TOUR_COMPLETED_KEY = "inventory-copilot-tour-completed";

export default function useTour() {
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [tourCompleted, setTourCompleted] = useState(false);

    useEffect(() => {
        const completed = localStorage.getItem(TOUR_COMPLETED_KEY) === "true";
        setTourCompleted(completed);
    }, []);

    const startTour = () => {
        setIsTourOpen(true);
    };

    const closeTour = () => {
        setIsTourOpen(false);
    };

    const completeTour = () => {
        localStorage.setItem(TOUR_COMPLETED_KEY, "true");
        setTourCompleted(true);
        setIsTourOpen(false);
    };

    const resetTour = () => {
        localStorage.removeItem(TOUR_COMPLETED_KEY);
        setTourCompleted(false);
    };

    return {
        isTourOpen,
        tourCompleted,
        startTour,
        closeTour,
        completeTour,
        resetTour,
    };
}