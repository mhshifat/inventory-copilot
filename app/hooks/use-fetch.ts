import { useCallback, useState } from "react";

export default function useFetch(url: string) {
    const [error, setError] = useState("");

    const callApi = useCallback(() => {
        return fetch(url, { method: "POST" })
            .then(async (response) => {
                if (!response.ok) {
                    const text = await response.text();
                    if (text) setError(text);
                    throw new Error(response.statusText || "Network response was not ok");
                }
                return response.json();
            });
    }, [url])

    return { error, fetch: callApi };
}