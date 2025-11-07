import { useLocation, useNavigate } from "@remix-run/react"
import { useCallback, useMemo } from "react"

export default function useFilter() {
    const location = useLocation();
    const navigate = useNavigate();

    const filter = useCallback(
        (property: string | Record<string, string>, value?: string) => {
            const searchParams = new URLSearchParams(location.search);

            // Case 1: property is a single string
            if (typeof property === "string") {
                if (!value) {
                    searchParams.delete(property);
                } else {
                    searchParams.set(property, value);
                }
            }

            // Case 2: property is an object (multiple filters)
            else {
                for (const key in property) {
                    const val = property[key];
                    if (!val) {
                        searchParams.delete(key);
                    } else {
                        searchParams.set(key, val);
                    }
                }
            }

            navigate({
                pathname: location.pathname,
                search: searchParams.toString(),
            });
        },
        [location.pathname, location.search, navigate]
    );
    const filterValues = useMemo(() => {
        const searchParams = new URLSearchParams(location.search);
        const values: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            values[key] = value;
        });
        return values;
    }, [location.search]);

    return {
        filter,
        filterValues
    };
}