import SuppliersHeader from "@/components/modules/suppliers/suppliers-header";
import SuppliersTable from "@/components/modules/suppliers/suppliers-table";
import useFilter from "@/hooks/use-filter";
import prisma from "@/lib/db.server";
import { authenticate, handleError } from "@/shopify.server";
import type { Prisma } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export interface SupplierData {
    id: number;
    name: string;
    contactEmail: string;
    leadTime: number;
    minOrderQty: number;
    notes: string;
    totalProductsLinked: number;
    createdAt?: Date;
}

export const loader = async (args: LoaderFunctionArgs) => {
  const response = {
    suppliers: {
        list: [] as SupplierData[],
        pagination: {
            page: 1,
            perPage: 10,
            totalItems: 0,
            hasNextPage: false,
            hasPreviousPage: false,
        },
    },
  }

  try {
    const { session, billing, redirect } = await authenticate.admin(args.request);

    const existingBilling = await billing.check({});
    const currentBilling = existingBilling.appSubscriptions?.[0];
    if (currentBilling?.status !== "ACTIVE") return redirect("/app/pricing", 303);

    const shop = await prisma.shop.findUnique({
      where: {
        domain: session.shop
      },
      select: {
        id: true,
      }
    });

    if (!shop?.id) {
      throw new Error(`Shop not found with domain: ${session.shop}`);
    }
    const searchParams = new URL(args.request.url).searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const perPage = response.suppliers.pagination.perPage;

    const query: Prisma.SupplierWhereInput = {
        shop_id: shop.id,
    };

    const [suppliersCount, suppliersRes] = await Promise.all([
        prisma.supplier.count({
            where: query
        }),
        prisma.supplier.findMany({
            where: query,
            skip: (page - 1) * perPage,
            take: perPage,
            orderBy: {
                created_at: 'desc',
            },
            include: {
                _count: {
                    select: {
                        products: true,
                    }
                }
            }
        }),
    ]);
    const suppliersCountNumber = Number((suppliersCount || "0"));
    const transformSupplier = (supplier: {
        id: number,
        name: string,
        contact_email: string,
        lead_time: number,
        min_order_qty: number,
        notes: string,
        created_at: Date,
        _count: { products: number }
    }): SupplierData => {
        return {
            id: supplier.id,
            name: supplier?.name || "Untitled Supplier",
            contactEmail: supplier?.contact_email || "",
            leadTime: supplier?.lead_time || 0,
            minOrderQty: supplier?.min_order_qty || 0,
            notes: supplier?.notes || "",
            totalProductsLinked: supplier._count?.products || 0,
            createdAt: supplier?.created_at,
        }
    }

    response.suppliers.list = (suppliersRes as []).map((s) => transformSupplier(s));
    response.suppliers.pagination = {
        page,
        perPage,
        totalItems: suppliersCountNumber,
        hasNextPage: suppliersCountNumber > page * perPage,
        hasPreviousPage: page > 1,
    }

    return response;
  } catch (err) {
    handleError(err);
    return response;
  }
}

export default function Suppliers() {
    const { filter: filterData } = useFilter();
    const loadersData = useLoaderData<typeof loader>();

    const suppliers = loadersData.suppliers.list as SupplierData[];
    const pagination = loadersData.suppliers.pagination;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <SuppliersHeader />

            {/* Suppliers Table */}
            <SuppliersTable
                data={suppliers}
                pagination={pagination}
                onPageChange={(page) => filterData({
                    page: page.toString()
                })}
            />
        </div>
    );
}