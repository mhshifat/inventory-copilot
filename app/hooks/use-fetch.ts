import { useCallback, useState } from "react";

export default function useFetch(url: string) {
    const [error, setError] = useState("");

    const callApi = useCallback((payload: RequestInit = { method: "POST" }) => {
        return fetch(url, payload)
            .then(async (response) => {
                if (!response.ok) {
                    const text = await response.text();
                    if (text) setError(text);
                    throw new Error(response.statusText || "Network response was not ok");
                }
                return response.json();
            })
            .then((data) => {
                if (!data?.success) {
                    throw new Error(data?.message || "API response indicated failure");
                }

                return data;
            })
    }, [url])

    return { error, fetch: callApi };
}