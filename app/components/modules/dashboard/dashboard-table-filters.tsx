import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useFilter from "@/hooks/use-filter";
import { SearchIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface DashboardTableFiltersProps {
    vendors: { label: string, value: string }[];
    collections: { label: string, value: string }[];
}

export default function DashboardTableFilters({ vendors, collections }: DashboardTableFiltersProps) {
    const { filter: filterData, filterValues } = useFilter();
    const [searchQuery, setSearchQuery] = useState<string>("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
        filterData({
            page: "1",
            q: query,
        })
        }, 500);
    }, [filterData]);

    useEffect(() => {
        const searchParams = new URL(window.location.href).searchParams;
        const search = searchParams.get("q");
        if (search) {
        setSearchQuery(search);
        }
    }, []);

    useEffect(() => {
        return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);
    
    return (
        <Card className="shadow-md">
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="pl-10!"
                            data-tour-id="search-input"
                        />
                    </div>

                    <Select
                        value={filterValues?.["stockStatus"] || "all"} 
                        onValueChange={(value) => filterData({
                            page: "1",
                            stockStatus: value === "all" ? '' : value,
                        })}
                    >
                        <SelectTrigger data-tour-id="status-filter" className='w-full'>
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="IN_STOCK">In Stock</SelectItem>
                            <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                            <SelectItem value="STOCK_OUT">Stock Out</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filterValues?.["vendor"] || "all"} 
                        onValueChange={(value) => filterData({
                            page: "1",
                            vendor: value === "all" ? '' : value,
                        })}
                    >
                        <SelectTrigger data-tour-id="vendor-filter" className='w-full'>
                            <SelectValue placeholder="Filter by vendor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Vendors</SelectItem>
                            {vendors.map((vendor) => (
                                <SelectItem key={vendor.value} value={vendor.value}>
                                    {vendor.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filterValues?.["collection"] || "all"} 
                        onValueChange={(value) => filterData({
                            page: "1",
                            collection: value === "all" ? '' : value,
                        })}
                    >
                        <SelectTrigger data-tour-id="collection-filter" className='w-full'>
                            <SelectValue placeholder="Filter by collection" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Collections</SelectItem>
                            {collections.map((collection) => (
                                <SelectItem key={collection.value} value={collection.value}>
                                    {collection.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    )
}